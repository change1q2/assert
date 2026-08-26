#!/usr/bin/env python3
"""
MySQL ROW-based Binary Log Parser
Extracts INSERT/UPDATE events from ROW-format binary logs
and generates replay SQL for data recovery.

Usage:
    python binlog_row_parser.py <binlog_file> [--output recovery.sql] [--database asset_platform]

This parser handles:
  - MySQL 8.0 ROW_FORMAT binlogs
  - WrittenRows and UpdatedRows events
  - Extracts before/after images to reconstruct original data
  - Filters by database and table name
"""

import struct
import sys
import os
import gzip
import re
from datetime import datetime
from collections import defaultdict

# ========== MySQL Binlog Constants ==========
BINLOG_MAGIC = b'\xfe\x62\x69\x6e'  # 0xfe + "bin"

# Event types (MySQL 8.0)
EVENT_WRITE_ROWS_V1 = 23
EVENT_UPDATE_ROWS_V1 = 24
EVENT_DELETE_ROWS_V1 = 25
EVENT_WRITE_ROWS_V2 = 30
EVENT_UPDATE_ROWS_V2 = 31
EVENT_DELETE_ROWS_V2 = 32
EVENT_TABLE_MAP = 19
EVENT_GTID = 33
EVENT_XID = 28
EVENT_QUERY = 4

# Event header size
EVENT_HEADER_SIZE = 19  # timestamp(4) + server_id(4) + event_size(4) + log_pos(4) + flags(2)

# Column type definitions (MySQL)
COLUMN_TYPES = {
    0x00: 'DECIMAL',
    0x01: 'TINY',
    0x02: 'SHORT',
    0x03: 'LONG',
    0x04: 'FLOAT',
    0x05: 'DOUBLE',
    0x06: 'NULL',
    0x07: 'TIMESTAMP',
    0x08: 'LONGLONG',
    0x09: 'INT24',
    0x0A: 'DATE',
    0x0B: 'TIME',
    0x0C: 'DATETIME',
    0x0D: 'YEAR',
    0x0E: 'NEWDATE',
    0x0F: 'VARCHAR',
    0x10: 'BIT',
    0x11: 'TIMESTAMP2',
    0x12: 'DATETIME2',
    0x13: 'TIME2',
    0xF6: 'JSON',
    0xF7: 'NEWDECIMAL',
    0xF8: 'ENUM',
    0xF9: 'SET',
    0xFA: 'BLOB',
    0xFB: 'GEOMETRY',
    0xFC: 'BIT',
    0xFD: 'VARCHAR',
    0xFE: 'JSON',
    0xFF: 'STRING',
    0x2C: 'VARCHAR',
    0xFC: 'BINARY',
}


class BinlogParser:
    def __init__(self, binlog_path):
        self.binlog_path = binlog_path
        self.table_map = {}  # table_id -> (database, table, columns)
        self.events = []
        self.current_gtid = None

    def read_uint8(self, data, offset):
        return struct.unpack('B', data[offset:offset+1])[0]

    def read_uint16(self, data, offset):
        return struct.unpack('<H', data[offset:offset+2])[0]

    def read_uint24(self, data, offset):
        return struct.unpack('<I', b'\x00' + data[offset:offset+3])[0]

    def read_uint32(self, data, offset):
        return struct.unpack('<I', data[offset:offset+4])[0]

    def read_uint64(self, data, offset):
        return struct.unpack('<Q', data[offset:offset+8])[0]

    def read_int8(self, data, offset):
        return struct.unpack('b', data[offset:offset+1])[0]

    def read_int16(self, data, offset):
        return struct.unpack('<h', data[offset:offset+2])[0]

    def read_int32(self, data, offset):
        return struct.unpack('<i', data[offset:offset+4])[0]

    def read_int64(self, data, offset):
        return struct.unpack('<q', data[offset:offset+8])[0]

    def read_string(self, data, offset, length):
        return data[offset:offset+length].decode('utf-8', errors='replace').rstrip('\x00')

    def read_length_encoded_int(self, data, offset):
        first = self.read_uint8(data, offset)
        if first < 251:
            return first, 1
        elif first == 251:
            return (self.read_uint16(data, offset + 1), 3)
        elif first == 252:
            return (self.read_uint24(data, offset + 1), 4)
        elif first == 253:
            return (self.read_uint32(data, offset + 1), 5)
        else:  # 254
            return (self.read_uint64(data, offset + 1), 9)

    def read_length_encoded_string(self, data, offset):
        length, bytes_read = self.read_length_encoded_int(data, offset)
        if length == 0:
            return '', bytes_read
        s = self.read_string(data, offset + bytes_read, length)
        return s, bytes_read + length

    def parse_column_value(self, col_type, data, offset, col_meta=None):
        """Parse a single column value based on its type."""
        type_byte = col_type

        if type_byte == 0x01:  # TINYINT
            return self.read_int8(data, offset), 1
        elif type_byte == 0x02:  # SMALLINT
            return self.read_int16(data, offset), 2
        elif type_byte == 0x03:  # INT
            return self.read_int32(data, offset), 4
        elif type_byte == 0x04:  # FLOAT
            val = struct.unpack('<f', data[offset:offset+4])[0]
            return val, 4
        elif type_byte == 0x05:  # DOUBLE
            val = struct.unpack('<d', data[offset:offset+8])[0]
            return val, 8
        elif type_byte == 0x08:  # BIGINT
            return self.read_int64(data, offset), 8
        elif type_byte == 0x09:  # MEDIUMINT
            return self.read_int32(data, offset), 3  # Note: 3 bytes
        elif type_byte == 0x0A:  # DATE
            year = self.read_uint16(data, offset)
            month = self.read_uint8(data, offset + 2)
            day = self.read_uint8(data, offset + 3)
            return f'{year:04d}-{month:02d}-{day:02d}', 4
        elif type_byte == 0x0B:  # TIME
            days = self.read_uint16(data, offset)
            hours = self.read_uint8(data, offset + 2)
            minutes = self.read_uint8(data, offset + 3)
            seconds = self.read_uint8(data, offset + 4)
            total_seconds = days * 24 * 3600 + hours * 3600 + minutes * 60 + seconds
            h = total_seconds // 3600
            m = (total_seconds % 3600) // 60
            s = total_seconds % 60
            return f'{h:02d}:{m:02d}:{s:02d}', 5
        elif type_byte == 0x0C:  # DATETIME
            year = self.read_uint16(data, offset)
            month = self.read_uint8(data, offset + 2)
            day = self.read_uint8(data, offset + 3)
            hour = self.read_uint8(data, offset + 4)
            minute = self.read_uint8(data, offset + 5)
            second = self.read_uint8(data, offset + 6)
            return f'{year:04d}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}:{second:02d}', 7
        elif type_byte == 0x0E or type_byte == 0x0F:  # VARCHAR
            # Length encoded
            length = self.read_uint8(data, offset)
            val = self.read_string(data, offset + 1, length)
            return val, 1 + length
        elif type_byte in (0xFB, 0xFC, 0xFD, 0xFE, 0xFF, 0x2C):  # BLOB/VARCHAR/JSON
            length, bytes_read = self.read_length_encoded_int(data, offset)
            if length == 0:
                return '', bytes_read
            val = self.read_string(data, offset + bytes_read, length)
            return val, bytes_read + length
        elif type_byte == 0xF6:  # JSON
            length, bytes_read = self.read_length_encoded_int(data, offset)
            if length == 0:
                return '', bytes_read
            val = self.read_string(data, offset + bytes_read, length)
            return val, bytes_read + length
        elif type_byte == 0x13:  # TIME2
            # hour(1 byte) + minute(1 byte) + second(1 byte) + microsecond(3 bytes)
            h = self.read_uint8(data, offset)
            m = self.read_uint8(data, offset + 1)
            s = self.read_uint8(data, offset + 2)
            us = self.read_uint24(data, offset + 3)
            return f'{h:02d}:{m:02d}:{s:02d}.{us:06d}', 6
        elif type_byte == 0x12:  # DATETIME2
            year = self.read_uint16(data, offset)
            month = self.read_uint8(data, offset + 2)
            day = self.read_uint8(data, offset + 3)
            hour = self.read_uint8(data, offset + 4)
            minute = self.read_uint8(data, offset + 5)
            second = self.read_uint8(data, offset + 6)
            us = self.read_uint24(data, offset + 7)
            return f'{year:04d}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}:{second:02d}.{us:06d}', 10
        elif type_byte == 0x11:  # TIMESTAMP2
            epoch = self.read_uint32(data, offset)
            us = self.read_uint24(data, offset + 4)
            try:
                dt = datetime.fromtimestamp(epoch)
                return f'{dt.strftime("%Y-%m-%d %H:%M:%S")}.{us:06d}', 7
            except:
                return f'UNKNOWN_TIMESTAMP', 7
        elif type_byte == 0x07:  # TIMESTAMP
            epoch = self.read_uint32(data, offset)
            try:
                dt = datetime.fromtimestamp(epoch)
                return dt.strftime('%Y-%m-%d %H:%M:%S'), 4
            except:
                return 'UNKNOWN_TIMESTAMP', 4
        elif type_byte == 0x0D:  # YEAR
            year = self.read_uint8(data, offset)
            if year == 0:
                return 0, 1
            if year <= 69:
                return 2000 + year, 1
            else:
                return 1900 + year, 1
        elif type_byte == 0x06:  # NULL
            return None, 0
        else:
            # Unknown type, try to read length-encoded
            try:
                length, bytes_read = self.read_length_encoded_int(data, offset)
                if length == 0:
                    return None, bytes_read
                val = self.read_string(data, offset + bytes_read, min(length, 1000))
                return val, bytes_read + length
            except:
                return f'<unknown_type_{type_byte:02x}>', 1

    def null_bitmap_length(self, num_columns):
        return (num_columns + 7 + 2) // 8  # +2 for ROW_FORMAT extra bits

    def read_null_bitmap(self, data, offset, num_columns):
        bitmap_len = self.null_bitmap_length(num_columns)
        null_bitmap = data[offset:offset + bitmap_len]
        is_null = []
        for i in range(num_columns):
            byte_idx = i // 8
            bit_idx = i % 8
            if byte_idx < len(null_bitmap):
                is_null.append((null_bitmap[byte_idx] & (1 << bit_idx)) != 0)
            else:
                is_null.append(False)
        return is_null, offset + bitmap_len

    def parse_table_map_event(self, data, offset, event_size):
        """Parse TABLE_MAP_EVENT to get column definitions."""
        event_end = offset + event_size
        if offset + 19 > len(data):
            return offset + event_size

        body_offset = offset + 19  # Skip header
        if body_offset + 2 > len(data):
            return offset + event_size

        table_id = self.read_uint16(data, body_offset)
        flags = self.read_uint16(data, body_offset + 2)
        body_offset += 4

        # database name
        db_name, bytes_read = self.read_length_encoded_string(data, body_offset)
        body_offset += bytes_read

        # table name
        tbl_name, bytes_read = self.read_length_encoded_string(data, body_offset)
        body_offset += bytes_read

        # Column count
        col_count, bytes_read = self.read_length_encoded_int(data, body_offset)
        body_offset += bytes_read

        # Column types
        col_types = []
        for i in range(col_count):
            if body_offset >= len(data):
                break
            col_types.append(self.read_uint8(data, body_offset))
            body_offset += 1

        # Read null bitmap
        null_bitmap_len = (col_count + 7) // 8
        body_offset += null_bitmap_len

        # Read metadata for specific column types
        col_meta = []
        for col_type in col_types:
            meta = None
            if col_type == 0x0F:  # VARCHAR
                if body_offset + 1 <= len(data):
                    length = self.read_uint8(data, body_offset)
                    meta = {'length': length * 256}
                    body_offset += 1
            elif col_type in (0x2C, 0xFB, 0xFD, 0xFE, 0xFF):  # BLOB/VARCHAR/JSON
                if body_offset + 1 <= len(data):
                    length = self.read_uint8(data, body_offset)
                    meta = {'length': length}
                    body_offset += 1
            elif col_type == 0xF7:  # NEWDECIMAL
                if body_offset + 2 <= len(data):
                    precision = self.read_uint8(data, body_offset)
                    scale = self.read_uint8(data, body_offset + 1)
                    meta = {'precision': precision, 'scale': scale}
                    body_offset += 2
            elif col_type == 0xF8:  # ENUM
                if body_offset + 2 <= len(data):
                    enum_count = self.read_uint16(data, body_offset)
                    meta = {'count': enum_count}
                    body_offset += 2
            elif col_type == 0xF9:  # SET
                if body_offset + 2 <= len(data):
                    set_count = self.read_uint16(data, body_offset)
                    meta = {'count': set_count}
                    body_offset += 2
            col_meta.append(meta)

        self.table_map[table_id] = {
            'database': db_name,
            'table': tbl_name,
            'column_count': col_count,
            'column_types': col_types,
            'column_meta': col_meta,
        }

        return offset + event_size

    def parse_write_rows_event(self, data, offset, event_size, event_type):
        """Parse WRITE_ROWS_EVENT (INSERT)"""
        event_end = offset + event_size
        if offset + 19 > len(data):
            return offset + event_size

        body_offset = offset + 19

        # Post-header for v2: extra 4 bytes
        if event_type >= 30:  # V2 events
            body_offset += 4  # Skip extra flags

        if body_offset + 8 > len(data):
            return offset + event_size

        table_id = self.read_uint64(data, body_offset)
        body_offset += 8

        # Find table
        if table_id not in self.table_map:
            return offset + event_size

        table_info = self.table_map[table_id]
        col_count = table_info['column_count']
        col_types = table_info['column_types']
        db = table_info['database']
        tbl = table_info['table']

        # Number of rows
        num_rows = self.read_uint16(data, body_offset)
        body_offset += 2

        rows = []
        for row_idx in range(num_rows):
            # Read after-image (full row for INSERT)
            # Read null bitmap
            null_bitmap_len = self.null_bitmap_length(col_count)
            is_null = []
            for i in range(col_count):
                byte_idx = i // 8
                bit_idx = i % 8
                if byte_idx < null_bitmap_len and body_offset + byte_idx < len(data):
                    byte_val = data[body_offset + byte_idx]
                    is_null.append((byte_val & (1 << bit_idx)) != 0)
                else:
                    is_null.append(False)
            body_offset += null_bitmap_len

            # Read column values
            row_data = {}
            for col_idx in range(col_count):
                col_name = f'col{col_idx}'
                if col_idx < len(col_types):
                    col_type = col_types[col_idx]
                else:
                    col_type = 0xFF

                if is_null[col_idx]:
                    row_data[col_name] = None
                else:
                    try:
                        value, bytes_read = self.parse_column_value(col_type, data, body_offset)
                        row_data[col_name] = value
                        body_offset += bytes_read
                    except Exception as e:
                        row_data[col_name] = f'<parse_error: {e}>'
                        body_offset += 1

            rows.append(row_data)

        self.events.append({
            'type': 'INSERT',
            'database': db,
            'table': tbl,
            'table_id': table_id,
            'rows': rows,
            'timestamp': self.read_uint32(data, offset),
        })

        return offset + event_size

    def parse_update_rows_event(self, data, offset, event_size, event_type):
        """Parse UPDATE_ROWS_EVENT"""
        event_end = offset + event_size
        if offset + 19 > len(data):
            return offset + event_size

        body_offset = offset + 19

        if event_type >= 31:  # V2
            body_offset += 4

        if body_offset + 8 > len(data):
            return offset + event_size

        table_id = self.read_uint64(data, body_offset)
        body_offset += 8

        if table_id not in self.table_map:
            return offset + event_size

        table_info = self.table_map[table_id]
        col_count = table_info['column_count']
        col_types = table_info['column_types']
        db = table_info['database']
        tbl = table_info['table']

        num_rows = self.read_uint16(data, body_offset)
        body_offset += 2

        before_rows = []
        after_rows = []

        for row_idx in range(num_rows):
            # Before image
            null_bitmap_len = self.null_bitmap_length(col_count)
            before_nulls = []
            for i in range(col_count):
                byte_idx = i // 8
                bit_idx = i % 8
                if byte_idx < null_bitmap_len and body_offset + byte_idx < len(data):
                    before_nulls.append((data[body_offset + byte_idx] & (1 << bit_idx)) != 0)
                else:
                    before_nulls.append(False)
            body_offset += null_bitmap_len

            before_data = {}
            for col_idx in range(col_count):
                col_name = f'col{col_idx}'
                if col_idx < len(col_types):
                    col_type = col_types[col_idx]
                else:
                    col_type = 0xFF

                if before_nulls[col_idx]:
                    before_data[col_name] = None
                else:
                    try:
                        value, bytes_read = self.parse_column_value(col_type, data, body_offset)
                        before_data[col_name] = value
                        body_offset += bytes_read
                    except:
                        before_data[col_name] = '<parse_error>'
                        body_offset += 1

            # After image
            after_nulls = []
            for i in range(col_count):
                byte_idx = i // 8
                bit_idx = i % 8
                if byte_idx < null_bitmap_len and body_offset + byte_idx < len(data):
                    after_nulls.append((data[body_offset + byte_idx] & (1 << bit_idx)) != 0)
                else:
                    after_nulls.append(False)
            body_offset += null_bitmap_len

            after_data = {}
            for col_idx in range(col_count):
                col_name = f'col{col_idx}'
                if col_idx < len(col_types):
                    col_type = col_types[col_idx]
                else:
                    col_type = 0xFF

                if after_nulls[col_idx]:
                    after_data[col_name] = None
                else:
                    try:
                        value, bytes_read = self.parse_column_value(col_type, data, body_offset)
                        after_data[col_name] = value
                        body_offset += bytes_read
                    except:
                        after_data[col_name] = '<parse_error>'
                        body_offset += 1

            before_rows.append(before_data)
            after_rows.append(after_data)

        self.events.append({
            'type': 'UPDATE',
            'database': db,
            'table': tbl,
            'table_id': table_id,
            'before_rows': before_rows,
            'after_rows': after_rows,
            'timestamp': self.read_uint32(data, offset),
        })

        return offset + event_size

    def parse_delete_rows_event(self, data, offset, event_size, event_type):
        """Parse DELETE_ROWS_EVENT"""
        event_end = offset + event_size
        if offset + 19 > len(data):
            return offset + event_size

        body_offset = offset + 19

        if event_type >= 32:  # V2
            body_offset += 4

        if body_offset + 8 > len(data):
            return offset + event_size

        table_id = self.read_uint64(data, body_offset)
        body_offset += 8

        if table_id not in self.table_map:
            return offset + event_size

        table_info = self.table_map[table_id]
        col_count = table_info['column_count']
        col_types = table_info['column_types']
        db = table_info['database']
        tbl = table_info['table']

        num_rows = self.read_uint16(data, body_offset)
        body_offset += 2

        rows = []
        for row_idx in range(num_rows):
            null_bitmap_len = self.null_bitmap_length(col_count)
            is_null = []
            for i in range(col_count):
                byte_idx = i // 8
                bit_idx = i % 8
                if byte_idx < null_bitmap_len and body_offset + byte_idx < len(data):
                    is_null.append((data[body_offset + byte_idx] & (1 << bit_idx)) != 0)
                else:
                    is_null.append(False)
            body_offset += null_bitmap_len

            row_data = {}
            for col_idx in range(col_count):
                col_name = f'col{col_idx}'
                if col_idx < len(col_types):
                    col_type = col_types[col_idx]
                else:
                    col_type = 0xFF

                if is_null[col_idx]:
                    row_data[col_name] = None
                else:
                    try:
                        value, bytes_read = self.parse_column_value(col_type, data, body_offset)
                        row_data[col_name] = value
                        body_offset += bytes_read
                    except:
                        row_data[col_name] = '<parse_error>'
                        body_offset += 1

            rows.append(row_data)

        self.events.append({
            'type': 'DELETE',
            'database': db,
            'table': tbl,
            'table_id': table_id,
            'rows': rows,
            'timestamp': self.read_uint32(data, offset),
        })

        return offset + event_size

    def parse(self):
        """Parse the entire binary log file."""
        with open(self.binlog_path, 'rb') as f:
            data = f.read()

        print(f"Loaded {len(data)} bytes from {self.binlog_path}")

        # Check magic number
        if data[:4] != BINLOG_MAGIC:
            print(f"Warning: Invalid binlog magic: {data[:4].hex()}")
            print("This might not be a valid MySQL binary log file.")
            print("Attempting to parse anyway...")

        offset = 4  # Skip magic number
        event_count = 0

        while offset < len(data) - EVENT_HEADER_SIZE:
            if offset + EVENT_HEADER_SIZE > len(data):
                break

            # Read event header
            timestamp = self.read_uint32(data, offset)
            server_id = self.read_uint32(data, offset + 4)
            event_size = self.read_uint32(data, offset + 8)
            log_pos = self.read_uint32(data, offset + 12)
            flags = self.read_uint16(data, offset + 16)

            if event_size < EVENT_HEADER_SIZE or offset + event_size > len(data):
                offset += 1
                continue

            # Read event type (stored in flags area... actually it's part of post-header)
            # Actually, the event type is determined by the event itself
            # Let me re-read: the header is timestamp(4) + server_id(4) + event_size(4) + log_pos(4) + flags(2)
            # After the header comes the event type byte (actually no)

            # The event type is embedded in the event data
            # Actually for MySQL binlog, there's no explicit event type in the header
            # We need to look at what follows

            # For TABLE_MAP_EVENT and row events, we need to parse the event body
            # But without knowing the event type, we can't parse it correctly

            # Actually, let me look at this differently. 
            # The MySQL binlog format stores events sequentially.
            # Each event has: header + body
            # The header contains: timestamp(4) + server_id(4) + event_size(4) + log_pos(4) + flags(2) = 19 bytes
            # The body starts after the header and its type is determined by...
            # Actually in MySQL binlog, the event type IS implicitly known by the context.
            # The first event after the magic is usually a FormatDescriptionEvent.

            # Let me try a different approach - scan for known patterns and try to identify events
            event_body = data[offset + EVENT_HEADER_SIZE:offset + event_size]
            
            # Try to identify event type based on content patterns
            identified = False
            
            # Check if this looks like a TABLE_MAP event (table_id followed by db/table names)
            if len(event_body) >= 8:
                table_id = self.read_uint16(event_body, 0)
                # Try to read as TABLE_MAP: flags(2) + db_name + table_name
                # For TABLE_MAP: after table_id(2) + flags(2), we have length-encoded strings
                if len(event_body) >= 4:
                    # Check for TABLE_MAP: the body starts with table_id(2) + flags(2)
                    # Then db name is length-encoded string
                    try:
                        # Peek ahead - TABLE_MAP usually has recognizable pattern
                        # The column count + column types follow table name
                        # This is hard to reliably detect without event type info
                        pass
                    except:
                        pass

                # Skip this event for now
                # We'll use a different parsing approach

            offset += event_size
            event_count += 1

        print(f"Parsed {event_count} events, identified {len(self.table_map)} table maps")
        print(f"Found {len(self.events)} row events")

    def parse_v2(self):
        """
        Enhanced parsing approach for MySQL 8.0 ROW_FORMAT binlogs.
        Uses event type detection based on body structure patterns.
        """
        with open(self.binlog_path, 'rb') as f:
            data = f.read()

        print(f"Loaded {len(data)} bytes from {self.binlog_path}")

        if data[:4] != BINLOG_MAGIC:
            print(f"Warning: Invalid binlog magic: {data[:4].hex()}")

        offset = 4
        event_count = 0
        skipped = 0

        while offset < len(data) - EVENT_HEADER_SIZE:
            if offset + EVENT_HEADER_SIZE > len(data):
                break

            timestamp = self.read_uint32(data, offset)
            server_id = self.read_uint32(data, offset + 4)
            event_size = self.read_uint32(data, offset + 8)
            log_pos = self.read_uint32(data, offset + 12)
            flags = self.read_uint16(data, offset + 16)

            if event_size < EVENT_HEADER_SIZE or event_size > 10000000:  # Sanity check
                offset += 1
                skipped += 1
                continue

            if offset + event_size > len(data):
                offset += 1
                skipped += 1
                continue

            event_body = data[offset + EVENT_HEADER_SIZE:offset + event_size]

            # Event type detection via heuristics:
            # 1. TABLE_MAP: usually smaller (< 200 bytes), has recognizable db/tbl names
            # 2. WRITE_ROWS/UPDATE_ROWS/DELETE_ROWS: larger, contains row data
            # 3. GTID: has UUID-like pattern
            # 4. XID: very small, just a transaction ID
            # 5. QUERY: contains SQL statement

            event_type = self._detect_event_type(event_body, event_size)

            try:
                if event_type == 'TABLE_MAP':
                    new_offset = self._parse_table_map(data, offset, event_size)
                    if new_offset:
                        offset = new_offset
                    else:
                        offset += event_size
                elif event_type == 'WRITE_ROWS':
                    self._parse_write_rows(data, offset, event_size)
                    offset += event_size
                elif event_type == 'UPDATE_ROWS':
                    self._parse_update_rows(data, offset, event_size)
                    offset += event_size
                elif event_type == 'DELETE_ROWS':
                    self._parse_delete_rows(data, offset, event_size)
                    offset += event_size
                else:
                    offset += event_size
                    skipped += 1
            except Exception as e:
                if skipped < 5:
                    print(f"  Parse error at offset {offset}: {e}")
                offset += event_size
                skipped += 1

            event_count += 1

        print(f"Parsed {event_count} events, skipped {skipped}")
        print(f"Identified {len(self.table_map)} table maps")
        print(f"Found {len(self.events)} row events")

    def _detect_event_type(self, body, event_size):
        """Heuristic detection of event type from body structure."""
        if len(body) < 4:
            return 'UNKNOWN'

        # XID event: 8 bytes of transaction ID, very small
        if len(body) <= 8 and len(body) >= 4:
            # Could be XID - check if it's a simple 8-byte value
            if len(body) == 8:
                return 'XID'

        # QUERY event: contains SQL statement (usually starts with "BEGIN", "COMMIT", etc.)
        # The body format: thread_id(4) + exec_time(4) + db_len(1) + flags(2) + query
        if len(body) > 11:
            db_len = body[8]
            if db_len > 0 and db_len < 64:
                query_start = 11 + db_len
                if query_start < len(body):
                    try:
                        query_part = body[query_start:query_start+50]
                        text = query_part.decode('ascii', errors='ignore')
                        if any(kw in text.upper() for kw in ['BEGIN', 'COMMIT', 'START', 'SET', 'USE']):
                            return 'QUERY'
                    except:
                        pass

        # TABLE_MAP: body has table_id(2) + flags(2) + db_name + table_name + column data
        # Typically 50-200 bytes
        if 50 < len(body) < 500:
            try:
                table_id = self.read_uint16(body, 0)
                flags = self.read_uint16(body, 2)
                # Read db name length-encoded string
                pos = 4
                db_name_len = body[pos]
                if db_name_len > 0 and db_name_len < 32 and pos + 1 + db_name_len < len(body):
                    db_name = body[pos+1:pos+1+db_name_len].decode('ascii', errors='ignore')
                    if db_name.isalpha() or '_' in db_name:
                        # Read table name
                        pos += 1 + db_name_len
                        tbl_name_len = body[pos]
                        if tbl_name_len > 0 and tbl_name_len < 64 and pos + 1 + tbl_name_len < len(body):
                            tbl_name = body[pos+1:pos+1+tbl_name_len].decode('ascii', errors='ignore')
                            if tbl_name.isalpha() or '_' in tbl_name:
                                # Check for column count after this
                                pos += 1 + tbl_name_len
                                col_count, bytes_read = self.read_length_encoded_int(body, pos)
                                if 1 <= col_count <= 1000:
                                    return 'TABLE_MAP'
            except:
                pass

        # Row events: typically larger (200+ bytes), start with table_id(8) + extra(4) + table_id(8) + flags
        # Actually: V2 row events have: extra_post_header(4) + table_id(8) + flags(2) + ...
        if len(body) > 20:
            try:
                # Check if starts with valid table_id (8 bytes for V2)
                table_id_v2 = self.read_uint64(body, 4)  # After 4 bytes of extra header
                # If table_id is in our table_map, it's a row event
                if table_id_v2 in self.table_map:
                    # Need to determine if it's INSERT/UPDATE/DELETE
                    # All three have similar structure - we determine by looking at
                    # what data follows
                    col_count = self.table_map[table_id_v2]['column_count']
                    null_bytes = self.null_bitmap_length(col_count)
                    
                    # For INSERT: after header comes one null bitmap + then row values
                    # For DELETE: same structure
                    # For UPDATE: before null bitmap + values, then after null bitmap + values
                    
                    # The difference between INSERT and DELETE is only known from context
                    # We'll classify as ROW_WRITE for now and determine later
                    return 'ROW_EVENT'

                # V1: table_id(2) + flags(2)
                table_id_v1 = self.read_uint16(body, 0)
                if table_id_v1 in self.table_map:
                    return 'ROW_EVENT'
            except:
                pass

        # GTID event: has UUID-like structure
        if len(body) >= 16:
            # GTID has: flags(1) + source_id(16) + transaction_id(8) + ...
            flags = body[0]
            if flags in (0, 1) and len(body) >= 24:
                source_id = body[1:17]
                # Check if source_id looks like a UUID (varies)
                return 'GTID'

        return 'UNKNOWN'

    def _parse_table_map(self, data, offset, event_size):
        """Parse TABLE_MAP_EVENT"""
        body = data[offset + EVENT_HEADER_SIZE:offset + event_size]
        
        if len(body) < 10:
            return offset + event_size

        # V1: table_id(2) + flags(2)
        # V2: extra_post_header(4) + table_id(8) + flags(2)
        # Try V2 first
        try:
            # V2 detection: extra 4 bytes + table_id(8) = 12 bytes before db name
            table_id_v2 = self.read_uint64(body, 4)
            if table_id_v2 > 0 and table_id_v2 < 10000:
                # Might be V2
                pos = 4 + 8  # Skip extra(4) + table_id(8)
                flags = self.read_uint16(body, pos)
                pos += 2
                
                db_name, br = self.read_length_encoded_string(body, pos)
                pos += br
                tbl_name, br = self.read_length_encoded_string(body, pos)
                pos += br
                
                if db_name and tbl_name:
                    col_count, br = self.read_length_encoded_int(body, pos)
                    pos += br
                    
                    col_types = []
                    for i in range(min(col_count, 1000)):
                        if pos >= len(body):
                            break
                        col_types.append(body[pos])
                        pos += 1
                    
                    null_bytes = (col_count + 7) // 8
                    pos += null_bytes
                    
                    col_meta = []
                    for ct in col_types:
                        meta = None
                        if ct == 0x0F:
                            if pos < len(body):
                                meta = {'length': body[pos]}
                                pos += 1
                        elif ct in (0x2C, 0xFB, 0xFD, 0xFE, 0xFF):
                            if pos < len(body):
                                meta = {'length': body[pos]}
                                pos += 1
                        elif ct == 0xF7:
                            if pos + 1 < len(body):
                                meta = {'precision': body[pos], 'scale': body[pos+1]}
                                pos += 2
                        col_meta.append(meta)
                    
                    self.table_map[table_id_v2] = {
                        'database': db_name,
                        'table': tbl_name,
                        'column_count': col_count,
                        'column_types': col_types,
                        'column_meta': col_meta,
                        'version': 2,
                    }
                    return offset + event_size
        except:
            pass

        # Try V1
        try:
            table_id_v1 = self.read_uint16(body, 0)
            if table_id_v1 > 0:
                pos = 2
                flags = self.read_uint16(body, pos)
                pos += 2
                
                db_name, br = self.read_length_encoded_string(body, pos)
                pos += br
                tbl_name, br = self.read_length_encoded_string(body, pos)
                pos += br
                
                if db_name and tbl_name:
                    col_count, br = self.read_length_encoded_int(body, pos)
                    pos += br
                    
                    col_types = []
                    for i in range(min(col_count, 1000)):
                        if pos >= len(body):
                            break
                        col_types.append(body[pos])
                        pos += 1
                    
                    null_bytes = (col_count + 7) // 8
                    pos += null_bytes
                    
                    col_meta = []
                    for ct in col_types:
                        meta = None
                        if ct == 0x0F:
                            if pos < len(body):
                                meta = {'length': body[pos]}
                                pos += 1
                        elif ct in (0x2C, 0xFB, 0xFD, 0xFE, 0xFF):
                            if pos < len(body):
                                meta = {'length': body[pos]}
                                pos += 1
                        col_meta.append(meta)
                    
                    self.table_map[table_id_v1] = {
                        'database': db_name,
                        'table': tbl_name,
                        'column_count': col_count,
                        'column_types': col_types,
                        'column_meta': col_meta,
                        'version': 1,
                    }
                    return offset + event_size
        except:
            pass

        return offset + event_size

    def _parse_write_rows(self, data, offset, event_size):
        """Parse WRITE_ROWS_EVENT"""
        body = data[offset + EVENT_HEADER_SIZE:offset + event_size]
        timestamp = self.read_uint32(data, offset)
        
        try:
            # V2: extra(4) + table_id(8) + ...
            if len(body) >= 12:
                table_id = self.read_uint64(body, 4)
                pos = 4 + 8
            else:
                table_id = self.read_uint16(body, 0)
                pos = 2
            
            if table_id not in self.table_map:
                return
            
            table_info = self.table_map[table_id]
            col_count = table_info['column_count']
            col_types = table_info['column_types']
            db = table_info['database']
            tbl = table_info['table']
            
            if pos + 2 > len(body):
                return
            
            num_rows = self.read_uint16(body, pos)
            pos += 2
            
            rows = []
            for row_idx in range(min(num_rows, 100)):
                null_bitmap_len = self.null_bitmap_length(col_count)
                is_null = []
                for i in range(col_count):
                    byte_idx = i // 8
                    bit_idx = i % 8
                    if pos + byte_idx < len(body):
                        is_null.append((body[pos + byte_idx] & (1 << bit_idx)) != 0)
                    else:
                        is_null.append(True)  # Assume null if beyond data
                pos += null_bitmap_len
                
                row_data = {}
                for col_idx in range(col_count):
                    col_name = f'col{col_idx}'
                    if col_idx < len(col_types):
                        col_type = col_types[col_idx]
                    else:
                        col_type = 0xFF
                    
                    if is_null[col_idx]:
                        row_data[col_name] = None
                    else:
                        try:
                            value, bytes_read = self.parse_column_value(col_type, body, pos)
                            row_data[col_name] = value
                            pos += bytes_read
                        except:
                            row_data[col_name] = '<parse_err>'
                            pos += 1
                
                rows.append(row_data)
            
            self.events.append({
                'type': 'INSERT',
                'database': db,
                'table': tbl,
                'table_id': table_id,
                'rows': rows,
                'timestamp': timestamp,
            })
        except Exception as e:
            pass

    def _parse_update_rows(self, data, offset, event_size):
        """Parse UPDATE_ROWS_EVENT"""
        body = data[offset + EVENT_HEADER_SIZE:offset + event_size]
        timestamp = self.read_uint32(data, offset)
        
        try:
            if len(body) >= 12:
                table_id = self.read_uint64(body, 4)
                pos = 4 + 8
            else:
                table_id = self.read_uint16(body, 0)
                pos = 2
            
            if table_id not in self.table_map:
                return
            
            table_info = self.table_map[table_id]
            col_count = table_info['column_count']
            col_types = table_info['column_types']
            db = table_info['database']
            tbl = table_info['table']
            
            if pos + 2 > len(body):
                return
            
            num_rows = self.read_uint16(body, pos)
            pos += 2
            
            before_rows = []
            after_rows = []
            null_bitmap_len = self.null_bitmap_length(col_count)
            
            for row_idx in range(min(num_rows, 100)):
                # Before image
                before_nulls = []
                for i in range(col_count):
                    byte_idx = i // 8
                    bit_idx = i % 8
                    if pos + byte_idx < len(body):
                        before_nulls.append((body[pos + byte_idx] & (1 << bit_idx)) != 0)
                    else:
                        before_nulls.append(True)
                pos += null_bitmap_len
                
                before_data = {}
                for col_idx in range(col_count):
                    col_name = f'col{col_idx}'
                    if col_idx < len(col_types):
                        col_type = col_types[col_idx]
                    else:
                        col_type = 0xFF
                    if before_nulls[col_idx]:
                        before_data[col_name] = None
                    else:
                        try:
                            value, br = self.parse_column_value(col_type, body, pos)
                            before_data[col_name] = value
                            pos += br
                        except:
                            before_data[col_name] = '<err>'
                            pos += 1
                
                # After image
                after_nulls = []
                for i in range(col_count):
                    byte_idx = i // 8
                    bit_idx = i % 8
                    if pos + byte_idx < len(body):
                        after_nulls.append((body[pos + byte_idx] & (1 << bit_idx)) != 0)
                    else:
                        after_nulls.append(True)
                pos += null_bitmap_len
                
                after_data = {}
                for col_idx in range(col_count):
                    col_name = f'col{col_idx}'
                    if col_idx < len(col_types):
                        col_type = col_types[col_idx]
                    else:
                        col_type = 0xFF
                    if after_nulls[col_idx]:
                        after_data[col_name] = None
                    else:
                        try:
                            value, br = self.parse_column_value(col_type, body, pos)
                            after_data[col_name] = value
                            pos += br
                        except:
                            after_data[col_name] = '<err>'
                            pos += 1
                
                before_rows.append(before_data)
                after_rows.append(after_data)
            
            self.events.append({
                'type': 'UPDATE',
                'database': db,
                'table': tbl,
                'table_id': table_id,
                'before_rows': before_rows,
                'after_rows': after_rows,
                'timestamp': timestamp,
            })
        except:
            pass

    def _parse_delete_rows(self, data, offset, event_size):
        """Parse DELETE_ROWS_EVENT"""
        body = data[offset + EVENT_HEADER_SIZE:offset + event_size]
        timestamp = self.read_uint32(data, offset)
        
        try:
            if len(body) >= 12:
                table_id = self.read_uint64(body, 4)
                pos = 4 + 8
            else:
                table_id = self.read_uint16(body, 0)
                pos = 2
            
            if table_id not in self.table_map:
                return
            
            table_info = self.table_map[table_id]
            col_count = table_info['column_count']
            col_types = table_info['column_types']
            db = table_info['database']
            tbl = table_info['table']
            
            if pos + 2 > len(body):
                return
            
            num_rows = self.read_uint16(body, pos)
            pos += 2
            
            rows = []
            null_bitmap_len = self.null_bitmap_length(col_count)
            
            for row_idx in range(min(num_rows, 100)):
                is_null = []
                for i in range(col_count):
                    byte_idx = i // 8
                    bit_idx = i % 8
                    if pos + byte_idx < len(body):
                        is_null.append((body[pos + byte_idx] & (1 << bit_idx)) != 0)
                    else:
                        is_null.append(True)
                pos += null_bitmap_len
                
                row_data = {}
                for col_idx in range(col_count):
                    col_name = f'col{col_idx}'
                    if col_idx < len(col_types):
                        col_type = col_types[col_idx]
                    else:
                        col_type = 0xFF
                    if is_null[col_idx]:
                        row_data[col_name] = None
                    else:
                        try:
                            value, br = self.parse_column_value(col_type, body, pos)
                            row_data[col_name] = value
                            pos += br
                        except:
                            row_data[col_name] = '<err>'
                            pos += 1
                
                rows.append(row_data)
            
            self.events.append({
                'type': 'DELETE',
                'database': db,
                'table': tbl,
                'table_id': table_id,
                'rows': rows,
                'timestamp': timestamp,
            })
        except:
            pass

    def generate_recovery_sql(self, output_path, target_database='asset_platform', filter_tables=None):
        """
        Generate recovery SQL from parsed events.
        Strategy: For every DELETE event, reconstruct INSERT from the row data.
        For every UPDATE event, reconstruct the original state (before image).
        """
        recovery_sql = []
        recovery_sql.append('-- ====================================================')
        recovery_sql.append('-- Binlog Data Recovery Script')
        recovery_sql.append('-- Generated from ROW-format binary log parsing')
        recovery_sql.append(f'-- Target database: {target_database}')
        recovery_sql.append(f'-- Generated at: {datetime.now().isoformat()}')
        recovery_sql.append('-- ====================================================')
        recovery_sql.append('')
        recovery_sql.append('USE ' + target_database + ';')
        recovery_sql.append('')

        # Group events by table
        events_by_table = defaultdict(list)
        for evt in self.events:
            table_key = f"{evt['database']}.{evt['table']}"
            if filter_tables and evt['table'] not in filter_tables:
                continue
            events_by_table[table_key].append(evt)

        total_inserts = 0
        total_updates = 0

        for table_key, evts in sorted(events_by_table.items()):
            db, tbl = table_key.split('.')
            recovery_sql.append(f'-- ========== {tbl} ({len(evts)} events) ==========')
            recovery_sql.append('')

            # Get column info from table_map
            table_info = None
            for tid, info in self.table_map.items():
                if info['database'] == db and info['table'] == tbl:
                    table_info = info
                    break

            if not table_info:
                recovery_sql.append(f'-- No table map info for {tbl}, skipping')
                continue

            col_count = table_info['column_count']
            col_types = table_info['column_types']

            for evt in evts:
                if evt['type'] == 'DELETE':
                    # Reconstruct INSERT from deleted rows
                    for row in evt.get('rows', []):
                        sql = self._row_to_insert_sql(tbl, row, col_count, col_types)
                        if sql:
                            recovery_sql.append(sql)
                            total_inserts += 1

                elif evt['type'] == 'UPDATE':
                    # Reconstruct INSERT from before-image (original data)
                    for row in evt.get('before_rows', []):
                        sql = self._row_to_insert_sql(tbl, row, col_count, col_types)
                        if sql:
                            recovery_sql.append(sql)
                            total_inserts += 1

                elif evt['type'] == 'INSERT':
                    # This is a normal INSERT - we can optionally re-insert
                    # (only if it's not already in the database)
                    for row in evt.get('rows', []):
                        sql = self._row_to_insert_sql(tbl, row, col_count, col_types)
                        if sql:
                            recovery_sql.append(sql)
                            total_inserts += 1

            recovery_sql.append('')

        # Summary
        recovery_sql.append('-- ====================================================')
        recovery_sql.append(f'-- Total INSERT statements: {total_inserts}')
        recovery_sql.append(f'-- Total UPDATE before-images: {total_updates}')
        recovery_sql.append('-- ====================================================')

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(recovery_sql))

        print(f"Generated {total_inserts} INSERT statements -> {output_path}")
        return total_inserts

    def _row_to_insert_sql(self, table_name, row, col_count, col_types):
        """Convert a row dict to an INSERT SQL statement."""
        if not row:
            return None

        cols = []
        vals = []

        for col_idx in range(col_count):
            col_name = f'col{col_idx}'
            col_type = col_types[col_idx] if col_idx < len(col_types) else 0xFF
            val = row.get(col_name)

            # Skip if no value
            if val is None and col_idx > 0:
                # Check if this is a NOT NULL column - if so, skip this row
                # For simplicity, we include NULL values
                pass

            cols.append(f'`col{col_idx}`')

            if val is None:
                vals.append('NULL')
            elif isinstance(val, str):
                escaped = val.replace("\\", "\\\\").replace("'", "\\'")
                vals.append(f"'{escaped}'")
            elif isinstance(val, (int, float)):
                vals.append(str(val))
            elif isinstance(val, bytes):
                escaped = val.decode('latin-1', errors='replace').replace("\\", "\\\\").replace("'", "\\'")
                vals.append(f"'{escaped}'")
            else:
                vals.append(f"'{str(val)}'")

        if not cols:
            return None

        col_str = ', '.join(cols)
        val_str = ', '.join(vals)

        # Use INSERT IGNORE to avoid conflicts with existing data
        return f'INSERT IGNORE INTO `{table_name}` ({col_str}) VALUES ({val_str});'

    def print_summary(self):
        """Print a summary of parsed events."""
        print("\n" + "=" * 60)
        print("BINLOG PARSING SUMMARY")
        print("=" * 60)
        print(f"Table Maps: {len(self.table_map)}")
        for tid, info in sorted(self.table_map.items()):
            print(f"  Table ID {tid}: {info['database']}.{info['table']} ({info['column_count']} columns)")

        print(f"\nRow Events: {len(self.events)}")
        events_by_type = defaultdict(int)
        events_by_table = defaultdict(int)
        for evt in self.events:
            events_by_type[evt['type']] += 1
            events_by_table[f"{evt['database']}.{evt['table']}"] += 1

        for etype, count in sorted(events_by_type.items()):
            print(f"  {etype}: {count} events")

        print("\nEvents by table:")
        for table, count in sorted(events_by_table.items(), key=lambda x: -x[1]):
            print(f"  {table}: {count} events")

        # Check for DELETE events (data loss indicators)
        deletes = [e for e in self.events if e['type'] == 'DELETE']
        if deletes:
            print(f"\n⚠️  Found {len(deletes)} DELETE events - potential data loss!")
            for d in deletes[:5]:
                print(f"  DELETE on {d['database']}.{d['table']}: {len(d.get('rows', []))} rows")
        else:
            print("\n✅ No DELETE events found")


def main():
    import argparse

    parser = argparse.ArgumentParser(description='MySQL ROW-format binary log parser')
    parser.add_argument('binlog_file', help='Path to binary log file')
    parser.add_argument('--output', '-o', default='recovery.sql', help='Output SQL file')
    parser.add_argument('--database', '-d', default='asset_platform', help='Target database')
    parser.add_argument('--tables', '-t', nargs='*', help='Filter tables (space-separated)')
    parser.add_argument('--summary-only', action='store_true', help='Only print summary, no SQL output')

    args = parser.parse_args()

    if not os.path.exists(args.binlog_file):
        print(f"Error: File not found: {args.binlog_file}")
        sys.exit(1)

    # Handle gzipped files
    if args.binlog_file.endswith('.gz'):
        import tempfile
        with gzip.open(args.binlog_file, 'rb') as gz:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.binlog') as tmp:
                tmp.write(gz.read())
                tmp_path = tmp.name
        print(f"Decompressed to: {tmp_path}")
        parser_obj = BinlogParser(tmp_path)
    else:
        parser_obj = BinlogParser(args.binlog_file)

    print(f"Parsing {args.binlog_file}...")
    parser_obj.parse_v2()
    parser_obj.print_summary()

    if not args.summary_only:
        tables_filter = set(args.tables) if args.tables else None
        total = parser_obj.generate_recovery_sql(args.output, args.database, tables_filter)
        print(f"\nRecovery SQL generated: {args.output}")
        print(f"Total statements: {total}")
        print("\nNote: Column names use col0, col1, ... placeholder names.")
        print("You may need to map these to actual column names before applying.")


if __name__ == '__main__':
    main()