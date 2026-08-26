#!/bin/bash
# Comprehensive Data Recovery Script
# Extracts data from InnoDB .ibd files and binlog
# Usage: bash /opt/recovery-script.sh

set +e

CONTAINER_ID=$(docker ps | grep -i mysql | awk '{print $1}' | head -1)
[ -z "$CONTAINER_ID" ] && echo "ERROR: No MySQL container" && exit 1

MYSQL_ROOT_PASSWORD=$(docker exec "$CONTAINER_ID" env | grep -i "MYSQL_ROOT_PASSWORD" | cut -d= -f2)
[ -z "$MYSQL_ROOT_PASSWORD" ] && MYSQL_ROOT_PASSWORD="123456"
MYSQL="docker exec $CONTAINER_ID mysql -u root -p$MYSQL_ROOT_PASSWORD"

TS=$(date +%Y%m%d_%H%M%S)
REC_DIR="/tmp/recovery_$TS"
mkdir -p "$REC_DIR"

echo "========================================"
echo "  Comprehensive Data Recovery"
echo "  Time: $TS"
echo "========================================"

# ========== 1. Current State ==========
echo ""
echo "=== 1. Current Database State ==="
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

# ========== 2. IBD File Sizes ==========
echo ""
echo "=== 2. IBD File Analysis ==="
for TABLE in records accounts finance_assets debts; do
  IBD="/var/lib/mysql/asset_platform/${TABLE}.ibd"
  if docker exec "$CONTAINER_ID" test -f "$IBD"; then
    SZ=$(docker exec "$CONTAINER_ID" stat -c%s "$IBD" 2>/dev/null)
    echo ""
    echo "--- $TABLE.ibd ($SZ bytes) ---"
    
    # Copy to host for analysis
    docker cp "$CONTAINER_ID":"$IBD" "$REC_DIR/" 2>/dev/null
    
    # Hex dump first 1MB
    xxd -l 1048576 "$REC_DIR/${TABLE}.ibd" > "$REC_DIR/${TABLE}_hex.txt" 2>/dev/null
    
    # Search for patterns
    echo "  Searching for dates..."
    grep -oa "202[0-9]-[0-9][0-9]-[0-9][0-9]" "$REC_DIR/${TABLE}.ibd" 2>/dev/null | sort -u | head -10
    
    echo "  Searching for amounts..."
    grep -oa "[0-9]\{3,8\}\.[0-9][0-9]" "$REC_DIR/${TABLE}.ibd" 2>/dev/null | sort -rn | head -10
    
    echo "  Searching for text..."
    grep -aoP '[ -~]{6,}' "$REC_DIR/${TABLE}.ibd" 2>/dev/null | sort -u | head -30
  fi
done

# ========== 3. Deep IBD Analysis ==========
echo ""
echo "=== 3. Deep IBD Analysis ==="

# Analyze records.ibd in detail (10MB)
if [ -f "$REC_DIR/records.ibd" ]; then
  echo ""
  echo "--- records.ibd Deep Analysis ---"
  echo "File size: $(stat -c%s "$REC_DIR/records.ibd") bytes"
  
  # InnoDB page structure: 16KB pages
  # Page type at offset 24-25
  # 0x45BF = INDEX (leaf page with data)
  
  PAGE_SIZE=16384
  FILE_SIZE=$(stat -c%s "$REC_DIR/records.ibd")
  TOTAL_PAGES=$((FILE_SIZE / PAGE_SIZE))
  echo "Total pages: $TOTAL_PAGES"
  
  # Count INDEX pages
  INDEX_PAGES=0
  for ((i=0; i<TOTAL_PAGES; i++)); do
    OFFSET=$((i * PAGE_SIZE + 24))
    if [ $OFFSET -lt $FILE_SIZE ]; then
      PT=$(xxd -s +$OFFSET -l 2 -p "$REC_DIR/records.ibd" 2>/dev/null)
      if [ "$PT" = "45bf" ]; then
        INDEX_PAGES=$((INDEX_PAGES + 1))
      fi
    fi
  done
  echo "INDEX pages (type 0x45BF): $INDEX_PAGES"
  
  # Extract data from first 50 INDEX pages
  echo ""
  echo "--- Extracting data from INDEX pages ---"
  EXTRACTED=0
  for ((i=0; i<TOTAL_PAGES && EXTRACTED < 200; i++)); do
    OFFSET=$((i * PAGE_SIZE))
    if [ $OFFSET -ge $FILE_SIZE ]; then
      break
    fi
    
    # Check if INDEX page
    PT=$(xxd -s +$((OFFSET + 24)) -l 2 -p "$REC_DIR/records.ibd" 2>/dev/null)
    if [ "$PT" = "45bf" ]; then
      # Try to extract text from this page
      PAGE_DATA=$(dd if="$REC_DIR/records.ibd" bs=1 skip=$OFFSET count=$PAGE_SIZE 2>/dev/null)
      
      # Look for date+amount patterns
      while IFS= read -r line; do
        echo "  Page $i: $line"
        EXTRACTED=$((EXTRACTED + 1))
      done < <(echo "$PAGE_DATA" | grep -aoP '[ -~]{10,}' 2>/dev/null | head -5)
    fi
  done
  echo "Total extracted fragments: $EXTRACTED"
fi

# ========== 4. Backup Analysis ==========
echo ""
echo "=== 4. Backup SQL Analysis ==="

for BK in /opt/mysql-backups/asset_platform_full_20260826_151334.sql.gz /var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/401/fs/tmp/backup.sql /opt/shuaiti/server/init-db.sql; do
  if [ -f "$BK" ]; then
    echo ""
    echo "--- $BK ---"
    SZ=$(stat -c%s "$BK" 2>/dev/null)
    echo "Size: $SZ bytes"
    
    if echo "$BK" | grep -q '.gz'; then
      gunzip -c "$BK" > "$REC_DIR/backup_$(basename $BK .gz).sql" 2>/dev/null
    else
      cp "$BK" "$REC_DIR/" 2>/dev/null
    fi
    
    BASENAME=$(basename "$BK" .gz)
    if [ -f "$REC_DIR/$BASENAME" ] || [ -f "$REC_DIR/backup_$BASENAME" ]; then
      FNAME="${REC_DIR}/${BASENAME}"
      [ ! -f "$FNAME" ] && FNAME="${REC_DIR}/backup_${BASENAME}"
      
      echo "INSERT total: $(grep -c 'INSERT INTO' "$FNAME" 2>/dev/null)"
      echo "accounts: $(grep -c 'INSERT INTO.*accounts' "$FNAME" 2>/dev/null)"
      echo "finance_assets: $(grep -c 'INSERT INTO.*finance_assets' "$FNAME" 2>/dev/null)"
      echo "records: $(grep -c 'INSERT INTO.*records' "$FNAME" 2>/dev/null)"
      echo "debts: $(grep -c 'INSERT INTO.*debts' "$FNAME" 2>/dev/null)"
      
      # Show records data
      REC_CNT=$(grep -c 'INSERT INTO.*records' "$FNAME" 2>/dev/null)
      if [ "$REC_CNT" -gt 0 ] 2>/dev/null; then
        echo ""
        echo "--- Records INSERT statements ---"
        grep 'INSERT INTO.*records' "$FNAME" | while read line; do
          echo "  $line"
        done
      fi
    fi
  fi
done

# ========== 5. Apply Backups ==========
echo ""
echo "=== 5. Apply Backup Data ==="

for BK_SQL in "$REC_DIR"/*.sql; do
  if [ -f "$BK_SQL" ] && grep -q 'INSERT INTO' "$BK_SQL" 2>/dev/null; then
    echo ""
    echo "Applying $BK_SQL ..."
    
    # Convert to INSERT IGNORE
    sed 's/^INSERT INTO/INSERT IGNORE INTO/g' "$BK_SQL" > "${BK_SQL}.apply" 2>/dev/null
    $MYSQL asset_platform --force < "${BK_SQL}.apply" 2>/dev/null
    echo "Applied (errors ignored)"
  fi
done

# ========== 6. Try Binlog Decoding ==========
echo ""
echo "=== 6. Binlog Decoding ==="

for BF in /var/lib/mysql/binlog.000006 /var/lib/mysql/binlog.000010; do
  if docker exec "$CONTAINER_ID" test -f "$BF"; then
    BASENAME=$(basename "$BF")
    echo ""
    echo "--- $BASENAME ---"
    
    # Check file
    docker exec "$CONTAINER_ID" stat "$BF" 2>/dev/null
    
    # Try mysqlbinlog with various options
    docker exec "$CONTAINER_ID" mysqlbinlog \
      --verbose --verbose \
      --base64-output=DECODE-ROWS \
      "$BF" > "$REC_DIR/binlog_${BASENAME}.txt" 2>&1
    
    SZ=$(stat -c%s "$REC_DIR/binlog_${BASENAME}.txt" 2>/dev/null)
    echo "Decoded size: $SZ bytes"
    
    if [ "$SZ" -gt 200 ] 2>/dev/null; then
      echo "First 20 lines:"
      head -20 "$REC_DIR/binlog_${BASENAME}.txt"
      
      echo ""
      echo "Event counts:"
      echo "  INSERT: $(grep -c 'INSERT INTO' "$REC_DIR/binlog_${BASENAME}.txt" 2>/dev/null)"
      echo "  DELETE: $(grep -c 'DELETE FROM' "$REC_DIR/binlog_${BASENAME}.txt" 2>/dev/null)"
    else
      echo "mysqlbinlog produced minimal output - trying alternate methods..."
      
      # Try with --force-read
      docker exec "$CONTAINER_ID" mysqlbinlog --force-read "$BF" 2>&1 | head -10
      
      # Check if binlog is actually in ROW format
      echo "Binlog format check:"
      docker exec "$CONTAINER_ID" mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "
        SHOW VARIABLES LIKE 'binlog_format';
        SHOW MASTER STATUS;
      " 2>/dev/null
    fi
  fi
done

# ========== 7. InnoDB Recovery Options ==========
echo ""
echo "=== 7. InnoDB Recovery Options ==="

echo ""
echo "--- Option A: innodb_force_recovery ---"
echo "If normal recovery fails, try:"
echo "  1. docker stop \$CONTAINER_ID"
echo "  2. Add to MySQL config: innodb_force_recovery=4"
echo "  3. docker start \$CONTAINER_ID"
echo "  4. mysqldump -u root -p asset_platform > /tmp/dump.sql"
echo "  5. Stop MySQL, remove innodb_force_recovery"
echo "  6. Restart and reload dump"

echo ""
echo "--- Option B: Percona XtraBackup ---"
echo "  Percona XtraBackup can perform physical backup"
echo "  innobackupex --user=root --password=/data/backup"
echo "  xtrabackup --prepare --target-dir=/data/backup"
echo "  xtrabackup --copy-back --target-dir=/data/backup"

echo ""
echo "--- Option C: Offline IBD parsing ---"
echo "  Copy .ibd files and use undrop-for-innodb:"
echo "  https://github.com/twindb/undrop-for-innodb"
echo "  ./c_parser -6f records.frm records.ibd > records.sql"

# ========== 8. Final State ==========
echo ""
echo "========================================"
echo "  8. Final State"
echo "========================================"

$MYSQL asset_platform -e "
  SELECT 
    'accounts' as tbl, COUNT(*) as total,
      SUM(CASE WHEN user_id=1 THEN 1 ELSE 0 END) as u1,
      SUM(CASE WHEN user_id=3 THEN 1 ELSE 0 END) as u3,
      SUM(CASE WHEN user_id=4 THEN 1 ELSE 0 END) as u4
    FROM accounts
    UNION ALL
    SELECT 'finance_assets', COUNT(*),
      SUM(CASE WHEN user_id=1 THEN 1 ELSE 0 END),
      SUM(CASE WHEN user_id=3 THEN 1 ELSE 0 END),
      SUM(CASE WHEN user_id=4 THEN 1 ELSE 0 END)
    FROM finance_assets
    UNION ALL
    SELECT 'records', COUNT(*),
      SUM(CASE WHEN user_id=1 THEN 1 ELSE 0 END),
      SUM(CASE WHEN user_id=3 THEN 1 ELSE 0 END),
      SUM(CASE WHEN user_id=4 THEN 1 ELSE 0 END)
    FROM records
    UNION ALL
    SELECT 'debts', COUNT(*), 0,
      SUM(CASE WHEN user_id=3 THEN 1 ELSE 0 END),
      SUM(CASE WHEN user_id=4 THEN 1 ELSE 0 END)
    FROM debts;
" 2>/dev/null

echo ""
echo "Recovery directory: $REC_DIR/"
echo "Files extracted:"
ls -lh "$REC_DIR/" 2>/dev/null | head -30

echo ""
echo "========================================"
echo "  Recovery Complete"
echo "========================================"
