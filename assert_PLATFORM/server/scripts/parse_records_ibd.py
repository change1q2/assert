#!/usr/bin/env python3
"""
InnoDB .ibd Parser for Records Table
Extracts deleted records from InnoDB page files
Based on InnoDB compressed row format parsing
"""
import struct
import sys
import re
from datetime import datetime

# Records table schema (as found in production)
# Column order and types based on SHOW CREATE TABLE output
RECORDS_COLUMNS = [
    ('user_id', 'INT', 4, False),
    ('id', 'VARCHAR', None, True),  # variable length, nullable
    ('type', 'VARCHAR', None, True),
    ('category', 'VARCHAR', None, True),
    ('subcategory', 'VARCHAR', None, True),
    ('tag', 'VARCHAR', None, True),
    ('book_id', 'VARCHAR', None, True),
    ('amount', 'DOUBLE', 8, False),
    ('currency', 'VARCHAR', None, True),
    ('account_id', 'VARCHAR', None, True),
    ('record_date', 'VARCHAR', None, True),
    ('recorder', 'VARCHAR', None, True),
    ('note', 'TEXT', None, True),
    ('created_at', 'VARCHAR', None, True),
    ('sort_order', 'INT', 4, False),
    ('sync_version', 'INT', 4, False),
    ('deleted_at', 'VARCHAR', None, True),
    ('origin_device_id', 'VARCHAR', None, True),
    ('client_op_id', 'VARCHAR', None, True),
]

PAGE_SIZE = 16384  # InnoDB default page size
INDEX_PAGE_TYPE = 0x45BF  # B-tree index leaf page


def read_innodb_page(data, page_offset):
    """Parse an InnoDB page header"""
    if page_offset + 40 > len(data):
        return None
    
    page = {}
    page['offset'] = page_offset
    
    # FIL header (8 bytes)
    page['space_id'] = struct.unpack('>I', data[page_offset+8:page_offset+12])[0]
    page['page_number'] = struct.unpack('>I', data[page_offset+4:page_offset+8])[0]
    page['prev_page'] = struct.unpack('>I', data[page_offset+12:page_offset+16])[0]
    page['next_page'] = struct.unpack('>I', data[page_offset+16:page_offset+20])[0]
    page['page_type'] = struct.unpack('>H', data[page_offset+24:page_offset+26])[0]
    page['flush_lsn'] = struct.unpack('>Q', data[page_offset+26:page_offset+34])[0]
    page['page_type_version'] = struct.unpack('>H', data[page_offset+34:page_offset+36])[0]
    page['space_version'] = struct.unpack('>H', data[page_offset+36:page_offset+38])[0]
    page['corrupt'] = struct.unpack('>H', data[page_offset+38:page_offset+40])[0]
    
    # For INDEX pages, parse the index header
    if page['page_type'] == INDEX_PAGE_TYPE:
        # Index page header starts at offset 40
        page['index_header'] = {}
        page['index_header']['n_dir_slots'] = struct.unpack('>H', data[page_offset+40:page_offset+42])[0]
        page['index_header']['heap_top'] = struct.unpack('>H', data[page_offset+42:page_offset+44])[0]
        page['index_header']['n_heap_recs'] = struct.unpack('>H', data[page_offset+44:page_offset+46])[0]
        # ... more fields
        
        # Record pointer array starts at offset 46
        # Each pointer is 2 bytes (offset within page)
        dir_slots_start = page_offset + 46
        dir_slots = []
        for i in range(page['index_header']['n_heap_recs']):
            ptr_offset = dir_slots_start + i * 2
            if ptr_offset + 2 <= page_offset + PAGE_SIZE:
                rec_offset = struct.unpack('>H', data[ptr_offset:ptr_offset+2])[0]
                if rec_offset > 0:
                    dir_slots.append(rec_offset)
        page['record_offsets'] = dir_slots
    
    return page


def parse_innodb_record(data, record_offset, next_record_offset):
    """Parse a single InnoDB compressed record"""
    record = {}
    
    if record_offset + 5 > len(data):
        return None
    
    # InnoDB record header (5 bytes for compressed format)
    # Byte 0-1: extra info (deleted flag, min max flag)
    # Byte 2-4: next record pointer (3 bytes)
    
    header = data[record_offset:record_offset+5]
    
    # Check delete flag
    extra_info = struct.unpack('>H', header[0:2])[0]
    deleted = (extra_info & 0x8000) != 0  # 15th bit = delete flag
    record['deleted'] = deleted
    record['extra_info'] = extra_info
    
    # Next record offset (3 bytes)
    if record_offset + 5 <= next_record_offset:
        record['next_offset'] = struct.unpack('>I', b'\x00' + header[2:5])[0]
    
    # After 5-byte header: variable field length list (backward)
    # Then: NULL flags
    # Then: column data
    
    # We need to read column by column
    pos = record_offset + 5
    
    # Variable lengths for VARCHAR columns (in reverse order)
    # We have 12 VARCHAR/TEXT columns
    varchar_cols = [col for col in RECORDS_COLUMNS if col[1] in ('VARCHAR', 'TEXT')]
    num_varchar = len(varchar_cols)
    
    # Read variable length bytes (each varchar column has 1 or 2 bytes length)
    # For InnoDB compressed format, each VARCHAR length is stored as 1 byte (< 256) or 2 bytes
    varchar_lengths = []
    for i in range(num_varchar):
        if pos + 1 <= len(data):
            length_byte = data[pos]
            if length_byte < 252:
                varchar_lengths.append(length_byte)
                pos += 1
            else:
                # 2-byte length
                if pos + 2 <= len(data):
                    length = struct.unpack('>H', data[pos:pos+2])[0]
                    varchar_lengths.append(length)
                    pos += 2
                else:
                    varchar_lengths.append(0)
                    pos += 1
        else:
            varchar_lengths.append(0)
    
    # Reverse because they're stored backwards
    varchar_lengths.reverse()
    
    # NULL flags (1 bit per nullable column)
    num_nullable = sum(1 for col in RECORDS_COLUMNS if col[3])
    null_bytes = (num_nullable + 7) // 8
    null_flags = data[pos:pos+null_bytes] if pos + null_bytes <= len(data) else b'\x00' * null_bytes
    pos += null_bytes
    
    # Now read actual column data
    varchar_idx = 0
    col_idx = 0
    
    for col_name, col_type, col_len, nullable in RECORDS_COLUMNS:
        if pos >= len(data) or pos >= next_record_offset:
            break
        
        is_null = False
        if nullable:
            byte_idx = col_idx // 8
            bit_idx = col_idx % 8
            if byte_idx < len(null_flags):
                is_null = (null_flags[byte_idx] & (1 << (7 - bit_idx))) != 0
        
        if is_null:
            record[col_name] = None
            col_idx += 1
            continue
        
        if col_type == 'INT' and col_len == 4:
            if pos + 4 <= len(data):
                val = struct.unpack('>i', data[pos:pos+4])[0]
                record[col_name] = val
                pos += 4
            col_idx += 1
            
        elif col_type == 'DOUBLE' and col_len == 8:
            if pos + 8 <= len(data):
                val = struct.unpack('>d', data[pos:pos+8])[0]
                record[col_name] = val
                pos += 8
            col_idx += 1
            
        elif col_type in ('VARCHAR', 'TEXT'):
            if varchar_idx < len(varchar_lengths):
                vlen = varchar_lengths[varchar_idx]
                if pos + vlen <= len(data):
                    raw = data[pos:pos+vlen]
                    try:
                        record[col_name] = raw.decode('utf-8', errors='replace')
                    except:
                        record[col_name] = raw.decode('latin-1', errors='replace')
                    pos += vlen
                varchar_idx += 1
            col_idx += 1
            
        else:
            col_idx += 1
    
    return record


def extract_records(ibd_path):
    """Extract all records from an InnoDB .ibd file"""
    print(f"Loading {ibd_path}...")
    
    with open(ibd_path, 'rb') as f:
        data = f.read()
    
    file_size = len(data)
    num_pages = file_size // PAGE_SIZE
    print(f"File size: {file_size} bytes, Pages: {num_pages}")
    
    all_records = []
    
    for page_idx in range(num_pages):
        page_offset = page_idx * PAGE_SIZE
        
        if page_offset + 40 > file_size:
            break
        
        # Check page type
        page_type = struct.unpack('>H', data[page_offset+24:page_offset+26])[0]
        
        if page_type == INDEX_PAGE_TYPE:
            page = read_innodb_page(data, page_offset)
            
            if page and 'record_offsets' in page:
                record_offsets = sorted(page['record_offsets'])
                
                for i, rec_off in enumerate(record_offsets):
                    next_off = record_offsets[i+1] if i+1 < len(record_offsets) else page_offset + PAGE_SIZE
                    
                    try:
                        record = parse_innodb_record(data, rec_off, next_off)
                        if record and record.get('id'):
                            record['_page'] = page_idx
                            record['_offset'] = rec_off
                            all_records.append(record)
                    except Exception as e:
                        pass
    
    print(f"Extracted {len(all_records)} records")
    return all_records


def generate_sql(records, output_file):
    """Generate INSERT SQL from extracted records"""
    with open(output_file, 'w') as f:
        f.write("-- Auto-generated from InnoDB .ibd recovery\n")
        f.write("-- Records table data extraction\n\n")
        
        # Group by user_id
        by_user = {}
        for r in records:
            uid = r.get('user_id', 0)
            if uid not in by_user:
                by_user[uid] = []
            by_user[uid].append(r)
        
        for uid, user_records in sorted(by_user.items()):
            f.write(f"-- === User {uid}: {len(user_records)} records ===\n")
            
            for r in user_records:
                if r.get('deleted'):
                    continue  # Skip deleted records
                
                cols = []
                vals = []
                
                for col_name, col_type, col_len, nullable in RECORDS_COLUMNS:
                    val = r.get(col_name)
                    if val is None:
                        cols.append(f"`{col_name}`")
                        vals.append("NULL")
                    elif isinstance(val, str):
                        cols.append(f"`{col_name}`")
                        escaped = val.replace("\\", "\\\\").replace("'", "\\'")
                        vals.append(f"'{escaped}'")
                    else:
                        cols.append(f"`{col_name}`")
                        vals.append(str(val))
                
                col_str = ', '.join(cols)
                val_str = ', '.join(vals)
                
                f.write(f"INSERT IGNORE INTO `records` ({col_str}) VALUES ({val_str});\n")
            
            f.write("\n")
    
    print(f"SQL written to {output_file}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python parse_records_ibd.py <records.ibd> [output.sql]")
        sys.exit(1)
    
    ibd_path = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'recovered_records.sql'
    
    records = extract_records(ibd_path)
    
    if records:
        # Print summary
        print("\nData summary:")
        by_user = {}
        for r in records:
            uid = r.get('user_id', '?')
            if uid not in by_user:
                by_user[uid] = {'total': 0, 'deleted': 0, 'dates': []}
            by_user[uid]['total'] += 1
            if r.get('deleted'):
                by_user[uid]['deleted'] += 1
            if r.get('record_date'):
                by_user[uid]['dates'].append(r['record_date'])
        
        for uid, info in sorted(by_user.items()):
            print(f"  User {uid}: {info['total']} records ({info['deleted']} deleted)")
            if info['dates']:
                print(f"    Dates: {min(info['dates'])} to {max(info['dates'])}")
        
        # Print sample records
        print("\nSample records (first 5):")
        for r in records[:5]:
            status = "[DELETED] " if r.get('deleted') else ""
            print(f"  {status}id={r.get('id')}, user={r.get('user_id')}, "
                  f"type={r.get('type')}, amount={r.get('amount')}, "
                  f"date={r.get('record_date')}, account={r.get('account_id')}")
        
        # Generate SQL
        generate_sql(records, output_file)
    else:
        print("No records extracted. The InnoDB format may need different parsing.")
        print("Trying alternative extraction method...")
        
        # Fallback: use strings to find patterns
        print("\nFallback: searching for ASCII patterns in .ibd file...")
        with open(ibd_path, 'rb') as f:
            data = f.read()
        
        # Find all date patterns
        dates = re.findall(rb'20[0-9]{2}-[0-9]{2}-[0-9]{2}', data)
        unique_dates = sorted(set(d.decode() for d in dates))
        print(f"Found {len(unique_dates)} unique dates")
        print(f"  Range: {min(unique_dates)} to {max(unique_dates)}")
        
        # Find account IDs
        account_ids = re.findall(rb'1785925406[0-9\-]+', data)
        unique_accounts = sorted(set(a.decode() for a in account_ids))
        print(f"Found {len(unique_accounts)} unique account IDs")
        
        # Find types
        for t in ['income', 'expense', 'transfer']:
            count = data.count(t.encode())
            print(f"  '{t}' occurrences: {count}")
        
        # Print surrounding context for date occurrences
        print("\nContext around dates:")
        for date_str in unique_dates[:20]:
            idx = data.find(date_str.encode())
            if idx >= 0:
                context = data[max(0,idx-30):idx+len(date_str)+30]
                try:
                    print(f"  {context.decode('latin-1', errors='replace')}")
                except:
                    pass


if __name__ == '__main__':
    main()
