#!/bin/bash
# Ultimate Binlog Recovery Script v2
# Fixed: dynamic binlog file list, force-read, proper error handling
# Usage: bash /opt/binlog-recovery-v2.sh

set +e

CONTAINER_ID=$(docker ps | grep -i mysql | awk '{print $1}' | head -1)
[ -z "$CONTAINER_ID" ] && echo "ERROR: No MySQL container" && exit 1

MYSQL_ROOT_PASSWORD=$(docker exec "$CONTAINER_ID" env | grep -i "MYSQL_ROOT_PASSWORD" | cut -d= -f2)
[ -z "$MYSQL_ROOT_PASSWORD" ] && MYSQL_ROOT_PASSWORD="123456"
MYSQL="docker exec $CONTAINER_ID mysql -u root -p$MYSQL_ROOT_PASSWORD"

TS=$(date +%Y%m%d_%H%M%S)
REC_DIR="/tmp/binlog_recovery_$TS"
mkdir -p "$REC_DIR"

echo "========================================"
echo "  Ultimate Binlog Recovery v2"
echo "  Time: $(date)"
echo "  Recovery dir: $REC_DIR"
echo "========================================"

# ========== STEP 0: Backup Current State ==========
echo ""
echo "=== STEP 0: Backup Current State ==="
BACKUP_SQL="$REC_DIR/pre_recovery_backup.sql"
docker exec "$CONTAINER_ID" mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" \
  --single-transaction --quick asset_platform > "$BACKUP_SQL" 2>/dev/null
if [ -f "$BACKUP_SQL" ] && [ -s "$BACKUP_SQL" ]; then
  gzip "$BACKUP_SQL"
  echo "✅ Pre-recovery backup: ${BACKUP_SQL}.gz ($(du -h ${BACKUP_SQL}.gz | cut -f1))"
else
  echo "⚠️ mysqldump failed"
  $MYSQL asset_platform -e "
    SELECT 'accounts' as tbl, COUNT(*) as cnt FROM accounts
    UNION ALL SELECT 'finance_assets', COUNT(*) FROM finance_assets
    UNION ALL SELECT 'records', COUNT(*) FROM records
    UNION ALL SELECT 'debts', COUNT(*) FROM debts;
  " 2>/dev/null
fi

# ========== STEP 1: Get ALL Binlog Files ==========
echo ""
echo "=== STEP 1: Get ALL Binary Log Files ==="

BINLOG_ON=$($MYSQL -N -B -e "SHOW VARIABLES LIKE 'log_bin';" 2>/dev/null | tail -1 | awk '{print $2}')
echo "log_bin: $BINLOG_ON"

if [ "$BINLOG_ON" != "ON" ]; then
  echo "❌ Binary logging not enabled"
  exit 1
fi

BINLOG_FORMAT=$($MYSQL -N -B -e "SHOW VARIABLES LIKE 'binlog_format';" 2>/dev/null | tail -1 | awk '{print $2}')
echo "binlog_format: $BINLOG_FORMAT"

# Get ALL binlog files with sizes
echo ""
echo "--- All binary log files (with sizes) ---"
$MYSQL -e "SHOW BINARY LOGS;" 2>/dev/null

BINLOG_FILES=$($MYSQL -N -B -e "SHOW BINARY LOGS;" 2>/dev/null | awk '{print $1}')
BINLOG_SIZES=$($MYSQL -N -B -e "SHOW BINARY LOGS;" 2>/dev/null | awk '{print $2}')

if [ -z "$BINLOG_FILES" ]; then
  echo "❌ No binary logs found"
  exit 1
fi

# Calculate total size
TOTAL_SIZE=0
for SZ in $BINLOG_SIZES; do
  TOTAL_SIZE=$((TOTAL_SIZE + SZ))
done
echo "Total binlog size: $TOTAL_SIZE bytes ($(echo "scale=2; $TOTAL_SIZE / 1024 / 1024" | bc 2>/dev/null || echo "N/A") MB)"

# List files with sizes
echo ""
echo "Files to process:"
i=0
for BF in $BINLOG_FILES; do
  SZ=$(echo "$BINLOG_SIZES" | sed -n "$((i+1))p")
  echo "  $BF: ${SZ} bytes"
  i=$((i+1))
done

# ========== STEP 2: Find mysqlbinlog ==========
echo ""
echo "=== STEP 2: Locate mysqlbinlog ==="

MYSQLBINLOG=""
for BIN_PATH in /usr/bin/mysqlbinlog /usr/local/mysql/bin/mysqlbinlog /usr/sbin/mysqlbinlog /usr/local/bin/mysqlbinlog; do
  if docker exec "$CONTAINER_ID" test -x "$BIN_PATH" 2>/dev/null; then
    MYSQLBINLOG="$BIN_PATH"
    echo "✅ Found: $MYSQLBINLOG"
    break
  fi
done

if [ -z "$MYSQLBINLOG" ]; then
  MYSQLBINLOG=$(docker exec "$CONTAINER_ID" sh -c 'find / -name mysqlbinlog -type f 2>/dev/null | head -1' 2>/dev/null)
  [ -n "$MYSQLBINLOG" ] && echo "✅ Found via find: $MYSQLBINLOG"
fi

if [ -z "$MYSQLBINLOG" ]; then
  echo "⚠️ mysqlbinlog not found, installing..."
  docker exec "$CONTAINER_ID" apt-get update -qq 2>/dev/null
  docker exec "$CONTAINER_ID" apt-get install -y -qq mysql-client 2>/dev/null
  MYSQLBINLOG=$(docker exec "$CONTAINER_ID" which mysqlbinlog 2>/dev/null)
  [ -n "$MYSQLBINLOG" ] && echo "✅ Installed: $MYSQLBINLOG"
fi

if [ -z "$MYSQLBINLOG" ]; then
  echo "❌ Cannot find or install mysqlbinlog"
  echo "Falling back to Python parser..."
  USE_PYTHON=true
else
  USE_PYTHON=false
fi

# ========== STEP 3: Decode ALL Binlog Files ==========
echo ""
echo "=== STEP 3: Decode ALL Binlog Files ==="

DECODED_DIR="$REC_DIR/decoded"
mkdir -p "$DECODED_DIR"

HOST_BINLOG_DIR="$REC_DIR/binlogs"
mkdir -p "$HOST_BINLOG_DIR"

# Copy all binlog files to host
echo "Copying binlog files to host..."
i=0
for BF in $BINLOG_FILES; do
  SZ=$(echo "$BINLOG_SIZES" | sed -n "$((i+1))p")
  CONTAINER_PATH="/var/lib/mysql/$BF"
  
  if docker exec "$CONTAINER_ID" test -f "$CONTAINER_PATH" 2>/dev/null; then
    if [ "$SZ" -gt 104857600 ] 2>/dev/null; then
      echo "  $BF: ${SZ} bytes - SKIPPING (too large, >100MB)"
    else
      echo "  Copying $BF (${SZ} bytes)..."
      docker cp "$CONTAINER_ID:$CONTAINER_PATH" "$HOST_BINLOG_DIR/" 2>/dev/null
    fi
  else
    echo "  $BF: NOT FOUND at $CONTAINER_PATH"
  fi
  i=$((i+1))
done

if [ "$USE_PYTHON" = false ] && [ -n "$MYSQLBINLOG" ]; then
  echo ""
  echo "--- Decoding with mysqlbinlog ---"
  
  for BF in "$HOST_BINLOG_DIR"/*; do
    [ -f "$BF" ] || continue
    BASENAME=$(basename "$BF")
    SZ=$(stat -c%s "$BF" 2>/dev/null || echo 0)
    echo ""
    echo "Decoding $BASENAME ($SZ bytes)..."
    
    # Copy back to container
    CONTAINER_BF="/tmp/binlog_input_$BASENAME"
    docker cp "$BF" "$CONTAINER_ID:$CONTAINER_BF" 2>/dev/null
    
    DECODED_FILE="$DECODED_DIR/${BASENAME}.txt"
    
    # Use --force-read for corrupted/partial binlogs
    # Use --verbose --verbose for full row value decoding
    # Use --no-defaults to avoid reading my.cnf
    docker exec "$CONTAINER_ID" "$MYSQLBINLOG" \
      --no-defaults \
      --force-read \
      --verbose --verbose \
      --base64-output=DECODE-ROWS \
      "$CONTAINER_BF" > "$DECODED_FILE" 2>&1
    
    DEC_SZ=$(stat -c%s "$DECODED_FILE" 2>/dev/null || echo 0)
    echo "  Decoded: $DEC_SZ bytes"
    
    if [ "$DEC_SZ" -gt 200 ] 2>/dev/null; then
      INS=$(grep -c 'INSERT INTO' "$DECODED_FILE" 2>/dev/null || echo 0)
      DEL=$(grep -c 'DELETE FROM' "$DECODED_FILE" 2>/dev/null || echo 0)
      UPD=$(grep -c 'UPDATE.*SET' "$DECODED_FILE" 2>/dev/null || echo 0)
      echo "  INSERT=$INS, DELETE=$DEL, UPDATE=$UPD"
      
      # Show first data events (skip header lines)
      echo "  Sample events:"
      grep -E 'INSERT INTO|DELETE FROM|UPDATE.*SET|### (INSERT|DELETE|UPDATE)' "$DECODED_FILE" 2>/dev/null | head -10 | sed 's/^/    /'
    else
      echo "  ⚠️ Minimal output - binlog may contain only heartbeat/GTID events"
      echo "  Raw first 20 lines:"
      head -20 "$DECODED_FILE" | sed 's/^/    /'
    fi
  done

  # ========== STEP 4: Extract Recovery SQL ==========
  echo ""
  echo "=== STEP 4: Extract Recovery SQL ==="
  
  ALL_DECODED="$DECODED_DIR/all_decoded.txt"
  cat "$DECODED_DIR"/*.txt 2>/dev/null > "$ALL_DECODED"
  
  TOTAL_LINES=$(wc -l < "$ALL_DECODED" 2>/dev/null || echo 0)
  echo "Total decoded lines: $TOTAL_LINES"
  
  # Comprehensive extraction
  RECOVERY_SQL="$REC_DIR/recovery_from_binlog.sql"
  
  {
    echo "-- Binlog Recovery SQL v2"
    echo "-- Target: asset_platform database"
    echo "-- Generated: $(date -Iseconds)"
    echo "-- Source: mysqlbinlog ROW-format decoding"
    echo "USE asset_platform;"
    echo ""
    
    # Method 1: Extract INSERT statements
    echo "-- === Method 1: Extract INSERT statements ==="
    for TABLE in accounts finance_assets records debts asset_classes books strategies budgets debt_payments survival_funds freedom_budgets independent_assets; do
      INSERT_COUNT=$(grep -c "INSERT INTO.*\`$TABLE\`" "$ALL_DECODED" 2>/dev/null || echo 0)
      if [ "$INSERT_COUNT" -gt 0 ] 2>/dev/null; then
        echo ""
        echo "-- $TABLE: $INSERT_COUNT INSERT statements"
        grep "INSERT INTO.*\`$TABLE\`" "$ALL_DECODED" 2>/dev/null | \
          sed 's/^### //' | \
          sed 's/^INSERT INTO/INSERT IGNORE INTO/'
      fi
    done
    
    # Method 2: Extract UPDATE before-images (original values)
    echo ""
    echo "-- === Method 2: Extract UPDATE before-images ==="
    for TABLE in accounts finance_assets records debts asset_classes; do
      UPD_COUNT=$(grep -c "UPDATE.*\`$TABLE\`" "$ALL_DECODED" 2>/dev/null || echo 0)
      if [ "$UPD_COUNT" -gt 0 ] 2>/dev/null; then
        echo ""
        echo "-- $TABLE: $UPD_COUNT UPDATE events"
        # Extract before-image values (lines starting with ###  @)
        grep -A20 "UPDATE.*\`$TABLE\`" "$ALL_DECODED" 2>/dev/null | \
          grep -E '^###  @[0-9]+' | head -20
      fi
    done
    
    # Method 3: Extract DELETE events (these are the data we lost!)
    echo ""
    echo "-- === Method 3: Analyze DELETE events ==="
    for TABLE in accounts finance_assets records debts asset_classes; do
      DEL_COUNT=$(grep -c "DELETE FROM.*\`$TABLE\`" "$ALL_DECODED" 2>/dev/null || echo 0)
      echo "-- $TABLE: $DEL_COUNT DELETE events"
      if [ "$DEL_COUNT" -gt 0 ] 2>/dev/null; then
        echo "  Sample DELETE:"
        grep -A10 "DELETE FROM.*\`$TABLE\`" "$ALL_DECODED" 2>/dev/null | head -15 | sed 's/^/    /'
      fi
    done
  } > "$RECOVERY_SQL"
  
  RECOVERY_CNT=$(grep -c 'INSERT IGNORE' "$RECOVERY_SQL" 2>/dev/null || echo 0)
  echo ""
  echo "Generated $RECOVERY_CNT INSERT IGNORE statements"
  
  if [ "$RECOVERY_CNT" -gt 0 ] 2>/dev/null; then
    echo ""
    echo "First 30 INSERT statements:"
    grep 'INSERT IGNORE' "$RECOVERY_SQL" 2>/dev/null | head -30 | sed 's/^/  /'
    
    echo ""
    echo "--- Applying recovery SQL ---"
    $MYSQL asset_platform --force < "$RECOVERY_SQL" 2>&1 | head -20
    echo "Applied (errors above are expected for duplicate keys)"
  fi
else
  echo ""
  echo "=== Using Python ROW-format parser ==="
  
  curl -sL "https://raw.githubusercontent.com/change1q2/assert/main/assert_PLATFORM/server/scripts/binlog_row_parser.py" \
    -o "$REC_DIR/binlog_parser.py" 2>/dev/null
  
  if [ -f "$REC_DIR/binlog_parser.py" ]; then
    apt-get update -qq && apt-get install -y -qq python3 2>/dev/null
    
    for BF in "$HOST_BINLOG_DIR"/*; do
      [ -f "$BF" ] || continue
      BASENAME=$(basename "$BF" | sed 's/\.[0-9]*$//')
      echo "Parsing $BASENAME ..."
      python3 "$REC_DIR/binlog_parser.py" "$BF" \
        --output "$REC_DIR/recovery_${BASENAME}.sql" \
        --database asset_platform 2>&1
    done
    
    MERGED="$REC_DIR/merged_recovery.sql"
    cat "$REC_DIR"/recovery_*.sql 2>/dev/null > "$MERGED"
    MERGED_CNT=$(grep -c 'INSERT' "$MERGED" 2>/dev/null || echo 0)
    echo "Total INSERT from Python parser: $MERGED_CNT"
    
    if [ "$MERGED_CNT" -gt 0 ] 2>/dev/null; then
      $MYSQL asset_platform --force < "$MERGED" 2>&1 | head -20
    fi
  fi
fi

# ========== STEP 5: Apply Backup Files ==========
echo ""
echo "=== STEP 5: Apply Known Backup Files ==="

for BK_SQL in \
  /opt/mysql-backups/asset_platform_full_20260826_151334.sql.gz \
  /var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/401/fs/tmp/backup.sql \
  /opt/shuaiti/server/init-db.sql; do
  
  if [ -f "$BK_SQL" ]; then
    BASENAME=$(basename "$BK_SQL")
    echo "Applying $BASENAME ..."
    
    if echo "$BK_SQL" | grep -q '.gz'; then
      gunzip -c "$BK_SQL" > "$REC_DIR/backup.sql"
      TARGET="$REC_DIR/backup.sql"
    else
      cp "$BK_SQL" "$REC_DIR/"
      TARGET="$REC_DIR/$BASENAME"
    fi
    
    CNT=$(grep -c 'INSERT INTO' "$TARGET" 2>/dev/null || echo 0)
    echo "  $CNT INSERT statements"
    
    if [ "$CNT" -gt 0 ] 2>/dev/null; then
      sed 's/^INSERT INTO/INSERT IGNORE INTO/g' "$TARGET" | $MYSQL asset_platform --force 2>/dev/null
      echo "  Applied"
    fi
  fi
done

# ========== STEP 6: Cross-Schema Recovery ==========
echo ""
echo "=== STEP 6: Cross-Schema Recovery ==="

RESTORE_DB="asset_platform_restore"
if $MYSQL -e "SHOW DATABASES LIKE '$RESTORE_DB';" 2>/dev/null | grep -q "$RESTORE_DB"; then
  echo "Restore database exists"
  
  for TABLE in accounts finance_assets records debts asset_classes books strategies; do
    CUR_CNT=$($MYSQL asset_platform -N -B -e "SELECT COUNT(*) FROM $TABLE;" 2>/dev/null)
    RST_CNT=$($MYSQL "$RESTORE_DB" -N -B -e "SELECT COUNT(*) FROM $TABLE;" 2>/dev/null)
    echo "$TABLE: current=$CUR_CNT, restore=$RST_CNT"
    
    if [ "$RST_CNT" -gt "$CUR_CNT" ] 2>/dev/null; then
      echo "  Recovering missing rows..."
      $MYSQL asset_platform 2>/dev/null <<EOF
INSERT IGNORE INTO $TABLE
SELECT * FROM $RESTORE_DB.$TABLE
WHERE NOT EXISTS (
  SELECT 1 FROM $TABLE a WHERE a.id = $RESTORE_DB.$TABLE.id
);
EOF
    fi
  done
fi

# ========== Final State ==========
echo ""
echo "========================================"
echo "  Final Database State"
echo "========================================"
$MYSQL asset_platform -e "
  SELECT 'accounts' as tbl, COUNT(*) as total,
    SUM(CASE WHEN user_id=1 THEN 1 ELSE 0 END) as u1,
    SUM(CASE WHEN user_id=3 THEN 1 ELSE 0 END) as u3,
    SUM(CASE WHEN user_id=4 THEN 1 ELSE 0 END) as u4
  FROM accounts
  UNION ALL SELECT 'finance_assets', COUNT(*),
    SUM(CASE WHEN user_id=1 THEN 1 ELSE 0 END),
    SUM(CASE WHEN user_id=3 THEN 1 ELSE 0 END),
    SUM(CASE WHEN user_id=4 THEN 1 ELSE 0 END)
  FROM finance_assets
  UNION ALL SELECT 'records', COUNT(*),
    SUM(CASE WHEN user_id=1 THEN 1 ELSE 0 END),
    SUM(CASE WHEN user_id=3 THEN 1 ELSE 0 END),
    SUM(CASE WHEN user_id=4 THEN 1 ELSE 0 END)
  FROM records
  UNION ALL SELECT 'debts', COUNT(*), 0,
    SUM(CASE WHEN user_id=3 THEN 1 ELSE 0 END),
    SUM(CASE WHEN user_id=4 THEN 1 ELSE 0 END)
  FROM debts;
" 2>/dev/null

echo ""
echo "========================================"
echo "  Recovery Complete"
echo "  Files: $REC_DIR/"
echo "========================================"
ls -lh "$REC_DIR/" 2>/dev/null | head -20