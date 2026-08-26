#!/bin/bash
# Ultimate Binlog Recovery Script
# Can be run directly on the production server
# Usage: bash /opt/binlog-recovery.sh

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
echo "  Ultimate Binlog Recovery"
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
  echo "✅ Pre-recovery backup: ${BACKUP_SQL}.gz"
else
  echo "⚠️ mysqldump failed, trying alternative..."
  $MYSQL asset_platform -e "
    SELECT 'accounts' as tbl, COUNT(*) as cnt FROM accounts
    UNION ALL SELECT 'finance_assets', COUNT(*) FROM finance_assets
    UNION ALL SELECT 'records', COUNT(*) FROM records
    UNION ALL SELECT 'debts', COUNT(*) FROM debts;
  " 2>/dev/null
fi

# ========== STEP 1: Check Binlog Status ==========
echo ""
echo "=== STEP 1: Binary Log Status ==="
BINLOG_ON=$($MYSQL -N -B -e "SHOW VARIABLES LIKE 'log_bin';" 2>/dev/null | tail -1 | awk '{print $2}')
echo "log_bin: $BINLOG_ON"

if [ "$BINLOG_ON" != "ON" ]; then
  echo "❌ Binary logging is not enabled"
  echo "Cannot recover from binlog. Skipping..."
else
  BINLOG_FORMAT=$($MYSQL -N -B -e "SHOW VARIABLES LIKE 'binlog_format';" 2>/dev/null | tail -1 | awk '{print $2}')
  echo "binlog_format: $BINLOG_FORMAT"
  echo ""
  $MYSQL -e "SHOW BINARY LOGS;" 2>/dev/null
fi

# ========== STEP 2: Copy Binlog Files ==========
echo ""
echo "=== STEP 2: Copy Binlog Files ==="

HOST_BINLOG_DIR="$REC_DIR/binlogs"
mkdir -p "$HOST_BINLOG_DIR"

BINLOG_FILES=$($MYSQL -N -B -e "SHOW BINARY LOGS;" 2>/dev/null | awk '{print $1}')
for BF in $BINLOG_FILES; do
  CONTAINER_PATH="/var/lib/mysql/$BF"
  if docker exec "$CONTAINER_ID" test -f "$CONTAINER_PATH"; then
    docker cp "$CONTAINER_ID:$CONTAINER_PATH" "$HOST_BINLOG_DIR/" 2>/dev/null
    echo "Copied $BF"
  fi
done

# ========== STEP 3: Find mysqlbinlog ==========
echo ""
echo "=== STEP 3: Locate mysqlbinlog ==="

MYSQLBINLOG=""
for BIN_PATH in /usr/bin/mysqlbinlog /usr/local/mysql/bin/mysqlbinlog /usr/sbin/mysqlbinlog; do
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
  echo "⚠️ mysqlbinlog not in container, installing..."
  docker exec "$CONTAINER_ID" apt-get update -qq 2>/dev/null
  docker exec "$CONTAINER_ID" apt-get install -y -qq mysql-client 2>/dev/null
  MYSQLBINLOG=$(docker exec "$CONTAINER_ID" which mysqlbinlog 2>/dev/null)
  [ -n "$MYSQLBINLOG" ] && echo "✅ Installed: $MYSQLBINLOG"
fi

# ========== STEP 4: Decode Binlogs ==========
echo ""
echo "=== STEP 4: Decode Binlogs ==="

DECODED_DIR="$REC_DIR/decoded"
mkdir -p "$DECODED_DIR"

if [ -n "$MYSQLBINLOG" ]; then
  for BF in "$HOST_BINLOG_DIR"/*; do
    [ -f "$BF" ] || continue
    BASENAME=$(basename "$BF")
    echo "Decoding $BASENAME ..."
    
    CONTAINER_BF="/tmp/$BASENAME"
    docker cp "$BF" "$CONTAINER_ID:$CONTAINER_BF" 2>/dev/null
    
    DECODED_FILE="$DECODED_DIR/${BASENAME}.txt"
    
    docker exec "$CONTAINER_ID" "$MYSQLBINLOG" \
      --verbose --verbose \
      --base64-output=DECODE-ROWS \
      "$CONTAINER_BF" > "$DECODED_FILE" 2>&1
    
    SZ=$(stat -c%s "$DECODED_FILE" 2>/dev/null || echo 0)
    echo "  Size: $SZ bytes"
    
    if [ "$SZ" -gt 500 ] 2>/dev/null; then
      INS=$(grep -c 'INSERT INTO' "$DECODED_FILE" 2>/dev/null || echo 0)
      DEL=$(grep -c 'DELETE FROM' "$DECODED_FILE" 2>/dev/null || echo 0)
      echo "  INSERT=$INS, DELETE=$DEL"
      
      echo "  Sample events:"
      grep -E 'INSERT INTO|DELETE FROM|UPDATE.*SET' "$DECODED_FILE" 2>/dev/null | head -10 | sed 's/^/    /'
    fi
  done

  # ========== STEP 5: Extract INSERT Statements ==========
  echo ""
  echo "=== STEP 5: Extract Recovery SQL ==="
  
  ALL_DECODED="$DECODED_DIR/all.txt"
  cat "$DECODED_DIR"/*.txt 2>/dev/null > "$ALL_DECODED"
  
  RECOVERY_SQL="$REC_DIR/recovery.sql"
  {
    echo "-- Binlog Recovery SQL"
    echo "USE asset_platform;"
    
    for TABLE in accounts finance_assets records debts asset_classes books strategies; do
      echo ""
      echo "-- === $TABLE ==="
      grep "INSERT INTO.*\`$TABLE\`" "$ALL_DECODED" 2>/dev/null | \
        sed 's/^### //' | \
        sed 's/^INSERT INTO/INSERT IGNORE INTO/' | \
        grep -v DELETE
    done
  } > "$RECOVERY_SQL"
  
  RECOVERY_CNT=$(grep -c 'INSERT' "$RECOVERY_SQL" 2>/dev/null || echo 0)
  echo "Generated $RECOVERY_CNT INSERT statements"
  
  if [ "$RECOVERY_CNT" -gt 0 ] 2>/dev/null; then
    echo "Applying recovery SQL..."
    head -30 "$RECOVERY_SQL" | sed 's/^/  /'
    $MYSQL asset_platform --force < "$RECOVERY_SQL" 2>&1 | head -10
    echo "Applied"
  fi
else
  echo "❌ mysqlbinlog not available"
  echo "Cannot decode ROW-format binlogs without it"
  echo "Try: apt-get install mysql-client on the host"
fi

# ========== STEP 6: Apply Backup Files ==========
echo ""
echo "=== STEP 6: Apply Backup Files ==="

for BK_SQL in \
  /opt/mysql-backups/asset_platform_full_20260826_151334.sql.gz \
  /var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/401/fs/tmp/backup.sql \
  /opt/shuaiti/server/init-db.sql; do
  
  if [ -f "$BK_SQL" ]; then
    BASENAME=$(basename "$BK_SQL")
    echo "Applying $BASENAME ..."
    
    if echo "$BK_SQL" | grep -q '.gz'; then
      gunzip -c "$BK_SQL" > "$REC_DIR/backup.sql"
    else
      cp "$BK_SQL" "$REC_DIR/"
    fi
    
    TARGET="$REC_DIR/$(basename "$BK_SQL" .gz)"
    [ ! -f "$TARGET" ] && TARGET="$REC_DIR/$BASENAME"
    
    CNT=$(grep -c 'INSERT' "$TARGET" 2>/dev/null || echo 0)
    echo "  $CNT INSERT statements"
    
    if [ "$CNT" -gt 0 ] 2>/dev/null; then
      sed 's/^INSERT INTO/INSERT IGNORE INTO/g' "$TARGET" | $MYSQL asset_platform --force 2>/dev/null
      echo "  Applied"
    fi
  fi
done

# ========== STEP 7: Final State ==========
echo ""
echo "=== STEP 7: Final State ==="
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