#!/bin/bash
# InnoDB .ibd Direct Recovery Script
# Extracts deleted records from InnoDB tablespace files
# Usage: bash /opt/ibd-recovery.sh

set +e

CONTAINER_ID=$(docker ps | grep -i mysql | awk '{print $1}' | head -1)
[ -z "$CONTAINER_ID" ] && echo "ERROR: No MySQL container" && exit 1

MYSQL_ROOT_PASSWORD=$(docker exec "$CONTAINER_ID" env | grep -i "MYSQL_ROOT_PASSWORD" | cut -d= -f2)
[ -z "$MYSQL_ROOT_PASSWORD" ] && MYSQL_ROOT_PASSWORD="123456"
MYSQL="docker exec $CONTAINER_ID mysql -u root -p$MYSQL_ROOT_PASSWORD"

TS=$(date +%Y%m%d_%H%M%S)
REC_DIR="/tmp/ibd_recovery_$TS"
mkdir -p "$REC_DIR"

echo "========================================"
echo "  InnoDB .ibd Data Recovery"
echo "  $TS"
echo "========================================"

# ========== STEP 1: Identify tables with missing data ==========
echo ""
echo "=== STEP 1: Identify Tables with Potential Missing Data ==="

echo ""
echo "Current data state:"
$MYSQL asset_platform -e "
  SELECT 'accounts' as tbl, COUNT(*) as total,
    SUM(CASE WHEN user_id=1 THEN 1 ELSE 0 END) as u1,
    SUM(CASE WHEN user_id=3 THEN 1 ELSE 0 END) as u3,
    SUM(CASE WHEN user_id=4 THEN 1 ELSE 0 END) as u4,
    ROUND(SUM(CHAR_LENGTH(CAST(id AS CHAR)) + CHAR_LENGTH(COALESCE(name,'') + COALESCE(type,'') + COALESCE(institution,'')))) as est_data_bytes
  FROM accounts
  UNION ALL
  SELECT 'finance_assets', COUNT(*),
    SUM(CASE WHEN user_id=1 THEN 1 ELSE 0 END),
    SUM(CASE WHEN user_id=3 THEN 1 ELSE 0 END),
    SUM(CASE WHEN user_id=4 THEN 1 ELSE 0 END),
    ROUND(SUM(CHAR_LENGTH(CAST(id AS CHAR)) + CHAR_LENGTH(COALESCE(name,'') + COALESCE(type,''))))
  FROM finance_assets
  UNION ALL
  SELECT 'records', COUNT(*),
    SUM(CASE WHEN user_id=1 THEN 1 ELSE 0 END),
    SUM(CASE WHEN user_id=3 THEN 1 ELSE 0 END),
    SUM(CASE WHEN user_id=4 THEN 1 ELSE 0 END),
    ROUND(SUM(CHAR_LENGTH(CAST(id AS CHAR)) + CHAR_LENGTH(COALESCE(title,'') + COALESCE(type,''))))
  FROM records
  UNION ALL
  SELECT 'debts', COUNT(*), 0,
    SUM(CASE WHEN user_id=3 THEN 1 ELSE 0 END),
    SUM(CASE WHEN user_id=4 THEN 1 ELSE 0 END),
    ROUND(SUM(CHAR_LENGTH(CAST(id AS CHAR)) + CHAR_LENGTH(COALESCE(name,''))))
  FROM debts;
" 2>/dev/null

# Check .ibd file sizes
echo ""
echo "=== .ibd File Sizes ==="
for TABLE in accounts finance_assets records debts asset_classes books strategies; do
  IBD_PATH="/var/lib/mysql/asset_platform/${TABLE}.ibd"
  if docker exec "$CONTAINER_ID" test -f "$IBD_PATH" 2>/dev/null; then
    IBD_SIZE=$(docker exec "$CONTAINER_ID" stat -c%s "$IBD_PATH" 2>/dev/null)
    ROW_COUNT=$($MYSQL asset_platform -N -B -e "SELECT COUNT(*) FROM $TABLE;" 2>/dev/null)
    AVG_SIZE=$((IBD_SIZE / (ROW_COUNT + 1)))
    echo "$TABLE: .ibd=${IBD_SIZE} bytes, rows=${ROW_COUNT}, avg_per_row=${AVG_SIZE}"
  fi
done

# ========== STEP 2: Install Python and required tools ==========
echo ""
echo "=== STEP 2: Setup Python Environment ==="

PYTHON_CMD="python3"
if ! command -v python3 &>/dev/null; then
  if ! command -v python &>/dev/null; then
    echo "Installing Python..."
    apt-get update -qq && apt-get install -y -qq python3 python3-pip 2>/dev/null
  fi
fi

if ! python3 -c "import struct" 2>/dev/null; then
  echo "Installing dependencies..."
  pip3 install --quiet progressbar2 2>/dev/null || true
fi

echo "Python available: $(python3 --version 2>&1)"

# ========== STEP 3: Copy .ibd Files to Host ==========
echo ""
echo "=== STEP 3: Copy .ibd Files ==="

IBD_DIR="$REC_DIR/ibd_files"
mkdir -p "$IBD_DIR"

for TABLE in accounts finance_assets records debts asset_classes; do
  IBD_PATH="/var/lib/mysql/asset_platform/${TABLE}.ibd"
  if docker exec "$CONTAINER_ID" test -f "$IBD_PATH" 2>/dev/null; then
    IBD_SIZE=$(docker exec "$CONTAINER_ID" stat -c%s "$IBD_PATH" 2>/dev/null)
    echo "Copying $TABLE.ibd ($IBD_SIZE bytes)..."
    docker cp "$CONTAINER_ID:$IBD_PATH" "$IBD_DIR/" 2>/dev/null
    if [ -f "$IBD_DIR/${TABLE}.ibd" ]; then
      echo "  ✅ Copied successfully"
    else
      echo "  ❌ Failed to copy"
    fi
  fi
done

# ========== STEP 4: Python .ibd Parser ==========
echo ""
echo "=== STEP 4: Parse InnoDB .ibd Files ==="

cat > "$REC_DIR/ibd_parser.py" << 'PYTHON_SCRIPT'
import struct
import sys
import os
import gzip

# InnoDB page types
FIL_PAGE_INDEX = 0x45BF  # B-tree node
FIL_PAGE_TYPE_ALLOCATOR = 0x0004  # File space header

def read_innodb_page(data, offset):
    """Read an InnoDB page header"""
    if offset + 38 > len(data):
        return None
    
    page_type = struct.unpack_from('>H', data, offset + 24)[0]
    page_level = struct.unpack_from('>H', data, offset + 26)[0]
    index_id = struct.unpack_from('>I', data, offset + 28)[0]
    num_records = struct.unpack_from('>H', data, offset + 34)[0]
    garbage_len = struct.unpack_from('>H', data, offset + 36)[0]
    
    return {
        'type': page_type,
        'level': page_level,
        'index_id': index_id,
        'num_records': num_records,
        'garbage_len': garbage_len,
    }

def parse_ibd_file(filepath, table_name):
    """Parse an InnoDB .ibd file and extract record data"""
    PAGE_SIZE = 16384  # 16KB
    
    file_size = os.path.getsize(filepath)
    num_pages = file_size // PAGE_SIZE
    
    print(f"\n  Parsing {table_name}.ibd: {file_size} bytes, {num_pages} pages")
    
    records_found = []
    
    with open(filepath, 'rb') as f:
        for page_num in range(num_pages):
            page_data = f.read(PAGE_SIZE)
            if len(page_data) < PAGE_SIZE:
                break
            
            page = read_innodb_page(page_data, 0)
            if not page:
                continue
            
            # Only process leaf pages (level 0) of B-tree
            if page['type'] == FIL_PAGE_INDEX and page['level'] == 0:
                num_records = page['num_records']
                
                if num_records > 0 and num_records < 10000:
                    # Try to extract record data
                    # InnoDB records have a complex format, but we can try
                    # to extract text patterns
                    
                    # Look for ASCII strings that might be record data
                    data_region = page_data[38:PAGE_SIZE-20]  # Skip header and footer
                    
                    # Find potential record data (sequences of printable ASCII)
                    current_string = b''
                    for byte in data_region:
                        if 32 <= byte <= 126 or byte in (9, 10, 13):  # Printable + whitespace
                            current_string += bytes([byte])
                        else:
                            if len(current_string) >= 4:
                                try:
                                    decoded = current_string.decode('ascii', errors='ignore')
                                    if len(decoded) >= 4:
                                        records_found.append(decoded)
                                except:
                                    pass
                            current_string = b''
                    
                    if len(current_string) >= 4:
                        try:
                            decoded = current_string.decode('ascii', errors='ignore')
                            if len(decoded) >= 4:
                                records_found.append(decoded)
                        except:
                            pass
    
    return records_found

def extract_sql_from_records(records, table_name, output_file):
    """Try to generate INSERT statements from extracted records"""
    if not records:
        return 0
    
    # Write all extracted strings for analysis
    with open(output_file.replace('.sql', '_raw.txt'), 'w') as f:
        for r in records:
            f.write(r + '\n')
    
    # Try to identify record patterns
    # Group records that look like they belong together
    sql_count = 0
    with open(output_file, 'w') as f:
        f.write(f"-- Extracted from {table_name}.ibd\n")
        f.write(f"-- Found {len(records)} text strings\n")
        f.write(f"-- Note: Manual verification required before applying\n\n")
        
        # Write all records as comments for analysis
        for i, r in enumerate(records):
            if len(r) > 10 and len(r) < 500:
                f.write(f"-- [{i}]: {r[:200]}\n")
                sql_count += 1
    
    return sql_count

# Main
if len(sys.argv) < 2:
    print("Usage: python3 ibd_parser.py <ibd_file> [table_name]")
    sys.exit(1)

filepath = sys.argv[1]
table_name = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(filepath, '.ibd')

output_dir = os.path.dirname(filepath)
output_file = os.path.join(output_dir, f"{table_name}_recovery.sql")

print(f"{'='*50}")
print(f"InnoDB .ibd Parser - {table_name}")
print(f"{'='*50}")

records = parse_ibd_file(filepath, table_name)
sql_count = extract_sql_from_records(records, table_name, output_file)

print(f"\n{'='*50}")
print(f"Results:")
print(f"  Text strings found: {len(records)}")
print(f"  Records written to: {output_file}")
print(f"  SQL count: {sql_count}")
print(f"{'='*50}")
PYTHON_SCRIPT

# Run parser for each table
for TABLE in accounts finance_assets records debts asset_classes; do
  IBD_FILE="$IBD_DIR/${TABLE}.ibd"
  if [ -f "$IBD_FILE" ]; then
    echo ""
    echo "--- Parsing $TABLE ---"
    python3 "$REC_DIR/ibd_parser.py" "$IBD_FILE" "$TABLE"
  fi
done

# ========== STEP 5: String-Based Deep Recovery ==========
echo ""
echo "=== STEP 5: String-Based Deep Recovery ==="

# Use grep to find INSERT-like patterns in .ibd files
for TABLE in accounts finance_assets records debts asset_classes; do
  IBD_FILE="$IBD_DIR/${TABLE}.ibd"
  if [ -f "$IBD_FILE" ]; then
    echo ""
    echo "--- $TABLE ---"
    
    # Extract strings that look like they could be field values
    STRINGS_FILE="$REC_DIR/${TABLE}_strings.txt"
    strings "$IBD_FILE" 2>/dev/null > "$STRINGS_FILE"
    
    TOTAL_STRINGS=$(wc -l < "$STRINGS_FILE" 2>/dev/null || echo 0)
    echo "  Total strings: $TOTAL_STRINGS"
    
    # Look for patterns that indicate deleted records
    # UUIDs, names, types, etc.
    echo "  UUID patterns:"
    grep -E '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' "$STRINGS_FILE" 2>/dev/null | head -5 | sed 's/^/    /'
    
    echo "  Possible names/descriptions (10-50 chars):"
    grep -E '^[A-Za-z\u4e00-\u9fff][A-Za-z\u4e00-\u9fff0-9 ]{5,49}$' "$STRINGS_FILE" 2>/dev/null | head -10 | sed 's/^/    /'
    
    echo "  JSON-like data:"
    grep -E '^\[.*\]$' "$STRINGS_FILE" 2>/dev/null | head -3 | sed 's/^/    /'
    
    # Look for INSERT patterns
    echo "  SQL patterns found:"
    grep -i "INSERT\|CREATE\|VALUES\|SELECT" "$STRINGS_FILE" 2>/dev/null | head -5 | sed 's/^/    /'
  fi
done

# ========== STEP 6: Cross-Reference with Restore DB ==========
echo ""
echo "=== STEP 6: Cross-Reference Verification ==="

RESTORE_DB="asset_platform_restore"
if $MYSQL -e "SHOW DATABASES LIKE '$RESTORE_DB';" 2>/dev/null | grep -q "$RESTORE_DB"; then
  echo "Checking restore database for comparison..."
  
  for TABLE in accounts finance_assets records debts; do
    echo ""
    echo "--- $TABLE Comparison ---"
    
    # Get column list
    COLUMNS=$($MYSQL asset_platform -N -B -e "SHOW COLUMNS FROM $TABLE;" 2>/dev/null | awk '{print $1}' | paste -sd ',' -)
    echo "  Columns: $COLUMNS"
    
    # Sample from current DB
    echo "  Current DB samples (user_id=3):"
    $MYSQL asset_platform -e "SELECT * FROM $TABLE WHERE user_id=3 LIMIT 3;" 2>/dev/null | head -5
    
    # Sample from restore DB
    echo "  Restore DB samples (user_id=3):"
    $MYSQL "$RESTORE_DB" -e "SELECT * FROM $TABLE WHERE user_id=3 LIMIT 3;" 2>/dev/null | head -5
  done
fi

# ========== Final Summary ==========
echo ""
echo "========================================"
echo "  Final Summary"
echo "========================================"

echo ""
echo "Database state:"
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
echo "Files generated: $REC_DIR/"
ls -lh "$REC_DIR/" 2>/dev/null | head -20

echo ""
echo "========================================"
echo "  Recovery Complete"
echo "========================================"