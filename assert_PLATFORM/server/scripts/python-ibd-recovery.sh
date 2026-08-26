#!/bin/bash
# Python IBD Parser Recovery Script
set +e

CONTAINER_ID=$(docker ps | grep -i mysql | awk '{print $1}' | head -1)
[ -z "$CONTAINER_ID" ] && echo "ERROR: No MySQL container" && exit 1

MYSQL_ROOT_PASSWORD=$(docker exec "$CONTAINER_ID" env | grep -i "MYSQL_ROOT_PASSWORD" | cut -d= -f2)
[ -z "$MYSQL_ROOT_PASSWORD" ] && MYSQL_ROOT_PASSWORD="123456"
MYSQL="docker exec $CONTAINER_ID mysql -u root -p$MYSQL_ROOT_PASSWORD"

TS=$(date +%Y%m%d_%H%M%S)
REC_DIR="/tmp/ibd_recovery_$TS"
mkdir -p "$REC_DIR"

echo "=== Python IBD Parser Recovery ==="

# Copy .ibd files
docker cp "$CONTAINER_ID":/var/lib/mysql/asset_platform/records.ibd "$REC_DIR/" 2>/dev/null
docker cp "$CONTAINER_ID":/var/lib/mysql/asset_platform/accounts.ibd "$REC_DIR/" 2>/dev/null

# Download Python parser
curl -sL "https://raw.githubusercontent.com/change1q2/assert/main/assert_PLATFORM/server/scripts/parse_records_ibd.py" -o "$REC_DIR/parse.py"

# Run Python parser
echo "Running InnoDB parser..."
python3 "$REC_DIR/parse.py" "$REC_DIR/records.ibd" "$REC_DIR/recovered.sql" 2>&1

# Apply if successful
if [ -f "$REC_DIR/recovered.sql" ] && [ -s "$REC_DIR/recovered.sql" ]; then
  CNT=$(grep -c INSERT "$REC_DIR/recovered.sql" 2>/dev/null || echo 0)
  echo "Generated $CNT INSERT statements"
  if [ "$CNT" -gt 0 ] 2>/dev/null; then
    echo "Applying recovered data..."
    $MYSQL asset_platform --force < "$REC_DIR/recovered.sql" 2>/dev/null
    echo "Applied"
  fi
fi

# Fallback: comprehensive grep extraction
echo ""
echo "=== Fallback: grep extraction ==="

if [ -f "$REC_DIR/records.ibd" ]; then
  echo "Unique dates in records.ibd:"
  grep -boa "20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]" "$REC_DIR/records.ibd" 2>/dev/null | cut -d: -f3 | sort -u | tee "$REC_DIR/dates.txt"
  
  echo ""
  echo "Unique account IDs:"
  grep -boa "1785925406[0-9\-]*" "$REC_DIR/records.ibd" 2>/dev/null | cut -d: -f3 | sort -u | tee "$REC_DIR/account_ids.txt"
  
  echo ""
  echo "Income/expense/transfer counts:"
  for WORD in income expense transfer; do
    CNT=$(grep -boa "$WORD" "$REC_DIR/records.ibd" 2>/dev/null | wc -l)
    echo "  $WORD: $CNT"
  done
  
  # Extract full record fragments
  echo ""
  echo "=== Extract record fragments ==="
  grep -boa "20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]" "$REC_DIR/records.ibd" 2>/dev/null | \
    while IFS=: read -r OFF REST; do
      if [ -n "$OFF" ]; then
        S=$((OFF - 80)); [ $S -lt 0 ] && S=0
        E=$((OFF + 120))
        FRAG=$(dd if="$REC_DIR/records.ibd" bs=1 skip=$S count=$((E - S)) 2>/dev/null | strings | tr '\n' ' ')
        echo "OFFSET=$OFF: $FRAG"
      fi
    done > "$REC_DIR/fragments.txt"
  
  echo "Fragments extracted: $(wc -l < "$REC_DIR/fragments.txt")"
  cat "$REC_DIR/fragments.txt" | head -50
fi

# Apply backup data
echo ""
echo "=== Apply Backup Data ==="
for BK in /opt/mysql-backups/asset_platform_full_20260826_151334.sql.gz /var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/401/fs/tmp/backup.sql; do
  if [ -f "$BK" ]; then
    BASENAME=$(basename "$BK" .gz)
    if echo "$BK" | grep -q '.gz'; then
      gunzip -c "$BK" > "$REC_DIR/${BASENAME}.sql"
    else
      cp "$BK" "$REC_DIR/"
    fi
    sed 's/^INSERT INTO/INSERT IGNORE INTO/g' "$REC_DIR/${BASENAME}.sql" > "$REC_DIR/apply_${BASENAME}.sql"
    $MYSQL asset_platform --force < "$REC_DIR/apply_${BASENAME}.sql" 2>/dev/null
    echo "Applied $BK"
  fi
done

# Final state
echo ""
echo "=== Final State ==="
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

echo "Recovery dir: $REC_DIR/"
echo "Done"
