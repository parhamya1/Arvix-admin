from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
import base64
import csv
import io
import zipfile
import xml.etree.ElementTree as ET
import re
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

HOST = os.getenv('BACKEND_HOST', '0.0.0.0')
PORT = int(os.getenv('BACKEND_PORT', '4000'))
DB_PATH = os.getenv('BACKEND_DB_PATH', './backend/arvix.db')

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
_db_lock = threading.Lock()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    columns = conn.execute(f'PRAGMA table_info({table})').fetchall()
    names = {row['name'] for row in columns}
    if column not in names:
        conn.execute(f'ALTER TABLE {table} ADD COLUMN {column} {definition}')




def migrate_dynamic_tables_schema(conn: sqlite3.Connection) -> None:
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='dynamic_tables'"
    ).fetchone()
    if not row or not row['sql']:
        return

    create_sql = row['sql'].upper()
    if 'NAME TEXT NOT NULL UNIQUE' not in create_sql:
        return

    conn.execute('PRAGMA foreign_keys = OFF')
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS dynamic_tables_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          columns_json TEXT NOT NULL,
          sidebar_item_id TEXT REFERENCES sidebar_items(id) ON DELETE SET NULL,
          page_id TEXT REFERENCES dynamic_pages(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL
        );

        INSERT INTO dynamic_tables_new (id, name, columns_json, sidebar_item_id, page_id, created_at)
        SELECT id, name, columns_json, sidebar_item_id, page_id, created_at FROM dynamic_tables;

        DROP TABLE dynamic_tables;
        ALTER TABLE dynamic_tables_new RENAME TO dynamic_tables;

        CREATE INDEX IF NOT EXISTS idx_dynamic_tables_page_id ON dynamic_tables(page_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_dynamic_tables_page_name ON dynamic_tables(page_id, name);
        """
    )
    conn.execute('PRAGMA foreign_keys = ON')


def init_db() -> None:
    with _db_lock:
        conn = get_conn()
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS sidebar_items (
              id TEXT PRIMARY KEY,
              group_title TEXT NOT NULL,
              parent_id TEXT REFERENCES sidebar_items(id) ON DELETE CASCADE,
              title TEXT NOT NULL,
              url TEXT,
              badge TEXT,
              sort_order INTEGER NOT NULL DEFAULT 0,
              display_mode TEXT NOT NULL DEFAULT 'hierarchy',
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS dynamic_tables (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL UNIQUE,
              columns_json TEXT NOT NULL,
              sidebar_item_id TEXT REFERENCES sidebar_items(id) ON DELETE SET NULL,
              page_id TEXT REFERENCES dynamic_pages(id) ON DELETE CASCADE,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS dynamic_pages (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL UNIQUE,
              sidebar_item_id TEXT REFERENCES sidebar_items(id) ON DELETE SET NULL,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS dynamic_table_rows (
              id TEXT PRIMARY KEY,
              table_id TEXT NOT NULL REFERENCES dynamic_tables(id) ON DELETE CASCADE,
              data_json TEXT NOT NULL,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sidebar_layout (
              id TEXT PRIMARY KEY,
              layout_json TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            """
        )
        ensure_column(conn, 'sidebar_items', 'display_mode', "TEXT NOT NULL DEFAULT 'hierarchy'")
        ensure_column(conn, 'dynamic_tables', 'sidebar_item_id', 'TEXT REFERENCES sidebar_items(id) ON DELETE SET NULL')
        ensure_column(conn, 'dynamic_tables', 'page_id', 'TEXT REFERENCES dynamic_pages(id) ON DELETE CASCADE')
        migrate_dynamic_tables_schema(conn)
        conn.execute('CREATE INDEX IF NOT EXISTS idx_dynamic_tables_page_id ON dynamic_tables(page_id)')
        conn.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_dynamic_tables_page_name ON dynamic_tables(page_id, name)')
        conn.commit()
        conn.close()


def parse_json(handler: BaseHTTPRequestHandler) -> dict:
    length = int(handler.headers.get('Content-Length', '0'))
    if length == 0:
        return {}
    raw = handler.rfile.read(length)
    return json.loads(raw.decode('utf-8'))


def send_json(handler: BaseHTTPRequestHandler, status: int, payload: dict | list | None = None) -> None:
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.send_header('Access-Control-Allow-Headers', 'Content-Type')
    handler.send_header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
    handler.end_headers()
    if payload is not None:
        handler.wfile.write(json.dumps(payload).encode('utf-8'))


def build_sidebar_tree(rows: list[sqlite3.Row]) -> list[dict]:
    groups: dict[str, dict] = {}
    items: dict[str, dict] = {}

    for row in rows:
        node = {
            'id': row['id'],
            'title': row['title'],
            **({'url': row['url']} if row['url'] else {}),
            **({'badge': row['badge']} if row['badge'] else {}),
            'displayMode': row['display_mode'],
            'parentId': row['parent_id'],
            'sortOrder': row['sort_order'],
            'items': [],
            'groupTitle': row['group_title'],
        }
        items[row['id']] = node
        groups.setdefault(row['group_title'], {'title': row['group_title'], 'items': []})

    for node in items.values():
        parent_id = node['parentId']
        if parent_id and parent_id in items:
            items[parent_id]['items'].append(node)
        else:
            groups[node['groupTitle']]['items'].append(node)

    def cleanup(node: dict) -> dict:
        children = sorted(node['items'], key=lambda x: x['sortOrder'])
        out = {
            'id': node['id'],
            'title': node['title'],
            'displayMode': node['displayMode'],
        }

        if children:
            out['items'] = [cleanup(child) for child in children]
            if 'badge' in node:
                out['badge'] = node['badge']
            return out

        if 'url' in node:
            out['url'] = node['url']
        if 'badge' in node:
            out['badge'] = node['badge']
        return out

    result = []
    for group_name in sorted(groups.keys()):
        root_items = sorted(groups[group_name]['items'], key=lambda x: x['sortOrder'])
        result.append({'title': group_name, 'items': [cleanup(item) for item in root_items]})
    return result


def flatten_sidebar(rows: list[sqlite3.Row]) -> list[dict]:
    return [
        {
            'id': row['id'],
            'groupTitle': row['group_title'],
            'parentId': row['parent_id'],
            'title': row['title'],
            'url': row['url'],
            'badge': row['badge'],
            'displayMode': row['display_mode'],
            'sortOrder': row['sort_order'],
        }
        for row in rows
    ]



def is_valid_sidebar_layout(payload: object) -> bool:
    if not isinstance(payload, dict):
        return False

    group_order = payload.get('groupOrder')
    item_order_by_group = payload.get('itemOrderByGroup')

    if not isinstance(group_order, list) or not all(isinstance(item, str) for item in group_order):
        return False

    if not isinstance(item_order_by_group, dict):
        return False

    for key, value in item_order_by_group.items():
        if not isinstance(key, str):
            return False
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            return False

    return True


def normalize_sidebar_layout(payload: dict) -> dict:
    return {
        'groupOrder': payload.get('groupOrder', []),
        'itemOrderByGroup': payload.get('itemOrderByGroup', {}),
    }


def upsert_sidebar_layout(payload: dict) -> None:
    with _db_lock:
        conn = get_conn()
        conn.execute(
            '''
            INSERT INTO sidebar_layout (id, layout_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              layout_json=excluded.layout_json,
              updated_at=excluded.updated_at
            ''',
            ('global', json.dumps(payload), utc_now()),
        )
        conn.commit()
        conn.close()


def normalize_column_key(label: str, index: int) -> str:
    normalized = re.sub(r'[^a-zA-Z0-9]+', '_', label.strip().lower()).strip('_')
    return normalized or f'field_{index + 1}'


def infer_column_type(values: list[object]) -> str:
    non_empty = [value for value in values if value not in ('', None)]
    if not non_empty:
        return 'text'

    if all(isinstance(value, bool) for value in non_empty):
        return 'boolean'

    def is_number(value: object) -> bool:
        if isinstance(value, bool):
            return False
        if isinstance(value, (int, float)):
            return True
        if isinstance(value, str):
            try:
                float(value.strip())
                return True
            except ValueError:
                return False
        return False

    if all(is_number(value) for value in non_empty):
        return 'number'

    def is_date(value: object) -> bool:
        if not isinstance(value, str):
            return False
        text = value.strip()
        if not text:
            return False
        if text.endswith('Z'):
            text = text[:-1] + '+00:00'
        try:
            datetime.fromisoformat(text)
            return True
        except ValueError:
            return False

    if all(is_date(value) for value in non_empty):
        return 'date'

    return 'text'


def parse_csv_content(content: bytes) -> tuple[list[str], list[dict[str, object]]]:
    decoded = content.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(decoded))
    headers = reader.fieldnames or []
    rows = []
    for row in reader:
        rows.append({header: (row.get(header) or '').strip() for header in headers})
    return headers, rows


def parse_xlsx_content(content: bytes) -> tuple[list[str], list[dict[str, object]]]:
    with zipfile.ZipFile(io.BytesIO(content)) as workbook:
        shared_strings: list[str] = []
        if 'xl/sharedStrings.xml' in workbook.namelist():
            shared_tree = ET.fromstring(workbook.read('xl/sharedStrings.xml'))
            ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for item in shared_tree.findall('s:si', ns):
                text_parts = [node.text or '' for node in item.findall('.//s:t', ns)]
                shared_strings.append(''.join(text_parts))

        sheet_name = 'xl/worksheets/sheet1.xml'
        if sheet_name not in workbook.namelist():
            return [], []

        tree = ET.fromstring(workbook.read(sheet_name))
        ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

        matrix: list[list[object]] = []
        for row_node in tree.findall('.//s:sheetData/s:row', ns):
            row_values: list[object] = []
            for cell in row_node.findall('s:c', ns):
                cell_type = cell.attrib.get('t')
                value_node = cell.find('s:v', ns)
                value: object = ''
                if value_node is not None and value_node.text is not None:
                    raw_value = value_node.text
                    if cell_type == 's':
                        value = shared_strings[int(raw_value)] if raw_value.isdigit() else ''
                    elif cell_type == 'b':
                        value = raw_value == '1'
                    else:
                        value = raw_value
                row_values.append(value)
            matrix.append(row_values)

    if not matrix:
        return [], []

    headers = [str(item).strip() for item in matrix[0] if str(item).strip()]
    rows: list[dict[str, object]] = []
    for raw_row in matrix[1:]:
        if len(raw_row) < len(headers):
            raw_row = raw_row + [''] * (len(headers) - len(raw_row))
        row_payload = {}
        for idx, header in enumerate(headers):
            row_payload[header] = raw_row[idx] if idx < len(raw_row) else ''
        rows.append(row_payload)
    return headers, rows


def build_columns_and_rows(headers: list[str], rows: list[dict[str, object]]) -> tuple[list[dict], list[dict]]:
    if not headers:
        return [], []

    unique_keys: set[str] = set()
    columns: list[dict] = []
    row_payloads: list[dict] = []

    for index, header in enumerate(headers):
        label = header.strip() or f'Column {index + 1}'
        key = normalize_column_key(label, index)
        while key in unique_keys:
            key = f'{key}_{index + 1}'
        unique_keys.add(key)

        values = [row.get(header, '') for row in rows]
        col_type = infer_column_type(values)
        columns.append({'key': key, 'label': label, 'type': col_type})

    for row in rows:
        mapped_row: dict[str, object] = {}
        for index, header in enumerate(headers):
            column = columns[index]
            value = row.get(header, '')
            if column['type'] == 'number' and value not in ('', None):
                try:
                    mapped_row[column['key']] = float(value)
                except (ValueError, TypeError):
                    mapped_row[column['key']] = value
            else:
                mapped_row[column['key']] = value
        row_payloads.append(mapped_row)

    return columns, row_payloads


def create_table_from_import_payload(page_id: str, payload: dict) -> tuple[int, dict]:
    name = (payload.get('name') or '').strip()
    file_name = (payload.get('fileName') or '').strip().lower()
    file_content = payload.get('fileContentBase64')

    if not name:
        return 400, {'message': 'name is required'}

    if not file_content or not isinstance(file_content, str):
        return 400, {'message': 'fileContentBase64 is required'}

    try:
        binary = base64.b64decode(file_content)
    except Exception:
        return 400, {'message': 'Invalid fileContentBase64'}

    try:
        if file_name.endswith('.csv'):
            headers, parsed_rows = parse_csv_content(binary)
        elif file_name.endswith('.xlsx'):
            headers, parsed_rows = parse_xlsx_content(binary)
        else:
            return 400, {'message': 'Only CSV and XLSX files are supported'}
    except Exception:
        return 400, {'message': 'Failed to parse import file'}

    columns, imported_rows = build_columns_and_rows(headers, parsed_rows)
    if len(columns) == 0:
        return 400, {'message': 'File has no usable header columns'}

    table_id = str(uuid.uuid4())
    try:
        with _db_lock:
            conn = get_conn()
            duplicate = conn.execute(
                'SELECT id FROM dynamic_tables WHERE page_id=? AND LOWER(name)=LOWER(?)',
                (page_id, name),
            ).fetchone()
            if duplicate:
                conn.close()
                return 409, {'message': 'Tab name must be unique within the selected page'}

            conn.execute(
                'INSERT INTO dynamic_tables (id, name, columns_json, sidebar_item_id, page_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                (table_id, name, json.dumps(columns), None, page_id, utc_now()),
            )

            for row in imported_rows:
                conn.execute(
                    'INSERT INTO dynamic_table_rows (id, table_id, data_json, created_at) VALUES (?, ?, ?, ?)',
                    (str(uuid.uuid4()), table_id, json.dumps(row), utc_now()),
                )
            conn.commit()
            conn.close()
    except sqlite3.IntegrityError:
        return 409, {'message': 'Tab name must be unique and page must be valid'}

    return 201, {'id': table_id, 'importedRows': len(imported_rows)}


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        send_json(self, 204)

    def do_GET(self):
        path = urlparse(self.path).path

        if path == '/health':
            send_json(self, 200, {'ok': True})
            return

        if path == '/api/sidebar-order':
            with _db_lock:
                conn = get_conn()
                row = conn.execute(
                    'SELECT layout_json FROM sidebar_layout WHERE id=?',
                    ('global',),
                ).fetchone()
                conn.close()

            if not row:
                send_json(self, 200, {'groupOrder': [], 'itemOrderByGroup': {}})
                return

            try:
                payload = json.loads(row['layout_json'])
            except json.JSONDecodeError:
                payload = {'groupOrder': [], 'itemOrderByGroup': {}}

            send_json(self, 200, normalize_sidebar_layout(payload if isinstance(payload, dict) else {}))
            return

        if path in ('/api/sidebar-config', '/api/sidebar-items'):
            with _db_lock:
                conn = get_conn()
                rows = conn.execute(
                    'SELECT id, group_title, parent_id, title, url, badge, sort_order, display_mode, created_at FROM sidebar_items ORDER BY group_title, sort_order, created_at'
                ).fetchall()
                conn.close()
            if path == '/api/sidebar-config':
                send_json(self, 200, {'navGroups': build_sidebar_tree(rows)})
            else:
                send_json(self, 200, flatten_sidebar(rows))
            return

        if path == '/api/dynamic-pages':
            with _db_lock:
                conn = get_conn()
                rows = conn.execute(
                    'SELECT id, name, sidebar_item_id, created_at FROM dynamic_pages ORDER BY created_at DESC'
                ).fetchall()
                conn.close()
            payload = [
                {
                    'id': row['id'],
                    'name': row['name'],
                    'sidebarItemId': row['sidebar_item_id'],
                    'createdAt': row['created_at'],
                }
                for row in rows
            ]
            send_json(self, 200, payload)
            return

        if path.startswith('/api/dynamic-pages/') and path.endswith('/tabs'):
            page_id = path.strip('/').split('/')[2]
            with _db_lock:
                conn = get_conn()
                rows = conn.execute(
                    'SELECT id, name, columns_json, page_id, created_at FROM dynamic_tables WHERE page_id=? ORDER BY created_at ASC',
                    (page_id,),
                ).fetchall()
                conn.close()
            send_json(
                self,
                200,
                [
                    {
                        'id': row['id'],
                        'name': row['name'],
                        'columns': json.loads(row['columns_json']),
                        'pageId': row['page_id'],
                        'createdAt': row['created_at'],
                    }
                    for row in rows
                ],
            )
            return

        if path == '/api/dynamic-tables':
            with _db_lock:
                conn = get_conn()
                rows = conn.execute(
                    'SELECT id, name, columns_json, sidebar_item_id, page_id, created_at FROM dynamic_tables ORDER BY created_at DESC'
                ).fetchall()
                conn.close()
            payload = [
                {
                    'id': row['id'],
                    'name': row['name'],
                    'columns': json.loads(row['columns_json']),
                    'sidebarItemId': row['sidebar_item_id'],
                    'pageId': row['page_id'],
                    'createdAt': row['created_at'],
                }
                for row in rows
            ]
            send_json(self, 200, payload)
            return

        if path.startswith('/api/dynamic-tables/') and not path.endswith('/rows'):
            parts = path.strip('/').split('/')
            if len(parts) == 3:
                table_id = parts[2]
                with _db_lock:
                    conn = get_conn()
                    row = conn.execute(
                        'SELECT id, name, columns_json, sidebar_item_id, page_id, created_at FROM dynamic_tables WHERE id=?',
                        (table_id,),
                    ).fetchone()
                    conn.close()
                if not row:
                    send_json(self, 404, {'message': 'Table not found'})
                    return
                send_json(
                    self,
                    200,
                    {
                        'id': row['id'],
                        'name': row['name'],
                        'columns': json.loads(row['columns_json']),
                        'sidebarItemId': row['sidebar_item_id'],
                        'pageId': row['page_id'],
                        'createdAt': row['created_at'],
                    },
                )
                return

        if path.startswith('/api/dynamic-tables/') and path.endswith('/rows'):
            parts = path.strip('/').split('/')
            if len(parts) == 4:
                table_id = parts[2]
                with _db_lock:
                    conn = get_conn()
                    rows = conn.execute(
                        'SELECT id, data_json, created_at FROM dynamic_table_rows WHERE table_id=? ORDER BY created_at DESC',
                        (table_id,),
                    ).fetchall()
                    conn.close()
                payload = [
                    {'id': row['id'], 'data': json.loads(row['data_json']), 'createdAt': row['created_at']}
                    for row in rows
                ]
                send_json(self, 200, payload)
                return

        send_json(self, 404, {'message': 'Not found'})

    def do_POST(self):
        path = urlparse(self.path).path
        normalized_path = path.rstrip('/') or '/'
        path_parts = normalized_path.strip('/').split('/') if normalized_path != '/' else []
        try:
            body = parse_json(self)
        except json.JSONDecodeError:
            send_json(self, 400, {'message': 'Invalid JSON'})
            return

        if path == '/api/sidebar-order':
            if not is_valid_sidebar_layout(body):
                send_json(self, 400, {'message': 'Invalid sidebar order payload'})
                return

            payload = normalize_sidebar_layout(body)
            upsert_sidebar_layout(payload)
            send_json(self, 200, {'ok': True})
            return

        if path == '/api/sidebar-items':
            required = ['groupTitle', 'title']
            if not all(body.get(field) for field in required):
                send_json(self, 400, {'message': 'groupTitle and title are required'})
                return
            display_mode = body.get('displayMode', 'hierarchy')
            if display_mode not in ('hierarchy', 'vertical'):
                send_json(self, 400, {'message': 'displayMode must be hierarchy or vertical'})
                return
            item_id = str(uuid.uuid4())
            with _db_lock:
                conn = get_conn()
                conn.execute(
                    'INSERT INTO sidebar_items (id, group_title, parent_id, title, url, badge, sort_order, display_mode, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    (
                        item_id,
                        body['groupTitle'],
                        body.get('parentId'),
                        body['title'],
                        body.get('url'),
                        body.get('badge'),
                        int(body.get('sortOrder', 0)),
                        display_mode,
                        utc_now(),
                    ),
                )
                conn.commit()
                conn.close()
            send_json(self, 201, {'id': item_id})
            return

        if path == '/api/dynamic-tables':
            if not body.get('name') or not isinstance(body.get('columns'), list) or len(body['columns']) == 0:
                send_json(self, 400, {'message': 'name and columns[] are required'})
                return
            if not body.get('pageId'):
                send_json(self, 400, {'message': 'pageId is required'})
                return
            table_id = str(uuid.uuid4())
            try:
                with _db_lock:
                    conn = get_conn()
                    duplicate = conn.execute(
                        'SELECT id FROM dynamic_tables WHERE page_id=? AND LOWER(name)=LOWER(?)',
                        (body['pageId'], body['name']),
                    ).fetchone()
                    if duplicate:
                        conn.close()
                        send_json(self, 409, {'message': 'Table name must be unique within the selected page'})
                        return
                    conn.execute(
                        'INSERT INTO dynamic_tables (id, name, columns_json, sidebar_item_id, page_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                        (
                            table_id,
                            body['name'],
                            json.dumps(body['columns']),
                            None,
                            body['pageId'],
                            utc_now(),
                        ),
                    )
                    conn.commit()
                    conn.close()
            except sqlite3.IntegrityError:
                send_json(self, 409, {'message': 'Table name must be unique and pageId must be valid'})
                return
            send_json(self, 201, {'id': table_id})
            return

        if path == '/api/dynamic-pages':
            if not body.get('name'):
                send_json(self, 400, {'message': 'name is required'})
                return
            page_id = str(uuid.uuid4())
            sidebar_item_id = body.get('sidebarItemId')
            try:
                with _db_lock:
                    conn = get_conn()
                    conn.execute(
                        'INSERT INTO dynamic_pages (id, name, sidebar_item_id, created_at) VALUES (?, ?, ?, ?)',
                        (page_id, body['name'], sidebar_item_id, utc_now()),
                    )
                    if sidebar_item_id:
                        conn.execute('UPDATE sidebar_items SET url=? WHERE id=?', (f'/dynamic-tables/{page_id}', sidebar_item_id))
                    conn.commit()
                    conn.close()
            except sqlite3.IntegrityError:
                send_json(self, 409, {'message': 'Page name must be unique and sidebarItemId must be valid'})
                return
            send_json(self, 201, {'id': page_id})
            return

        if len(path_parts) == 4 and path_parts[0] == 'api' and path_parts[1] == 'dynamic-pages' and path_parts[3] == 'tabs':
            page_id = path_parts[2]
            if isinstance(body.get('fileContentBase64'), str):
                status, payload = create_table_from_import_payload(page_id, body)
                send_json(self, status, payload)
                return
            if not body.get('name') or not isinstance(body.get('columns'), list) or len(body['columns']) == 0:
                send_json(self, 400, {'message': 'name and columns[] are required'})
                return
            table_id = str(uuid.uuid4())
            try:
                with _db_lock:
                    conn = get_conn()
                    duplicate = conn.execute(
                        'SELECT id FROM dynamic_tables WHERE page_id=? AND LOWER(name)=LOWER(?)',
                        (page_id, body['name']),
                    ).fetchone()
                    if duplicate:
                        conn.close()
                        send_json(self, 409, {'message': 'Tab name must be unique within the selected page'})
                        return
                    conn.execute(
                        'INSERT INTO dynamic_tables (id, name, columns_json, sidebar_item_id, page_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                        (table_id, body['name'], json.dumps(body['columns']), None, page_id, utc_now()),
                    )
                    conn.commit()
                    conn.close()
            except sqlite3.IntegrityError:
                send_json(self, 409, {'message': 'Tab name must be unique and page must be valid'})
                return
            send_json(self, 201, {'id': table_id})
            return

        if len(path_parts) == 5 and path_parts[0] == 'api' and path_parts[1] == 'dynamic-pages' and path_parts[3] == 'tabs' and path_parts[4] == 'import':
            page_id = path_parts[2]
            status, payload = create_table_from_import_payload(page_id, body)
            send_json(self, status, payload)
            return

        if normalized_path == '/api/dynamic-tables/import':
            page_id = (body.get('pageId') or '').strip() if isinstance(body.get('pageId'), str) else body.get('pageId')
            if not page_id:
                send_json(self, 400, {'message': 'pageId is required'})
                return
            status, payload = create_table_from_import_payload(page_id, body)
            send_json(self, status, payload)
            return

        if path.startswith('/api/dynamic-tables/') and path.endswith('/rows'):
            parts = path.strip('/').split('/')
            if len(parts) == 4:
                table_id = parts[2]
                if not isinstance(body.get('data'), dict):
                    send_json(self, 400, {'message': 'data object is required'})
                    return
                row_id = str(uuid.uuid4())
                with _db_lock:
                    conn = get_conn()
                    exists = conn.execute('SELECT id FROM dynamic_tables WHERE id=?', (table_id,)).fetchone()
                    if not exists:
                        conn.close()
                        send_json(self, 404, {'message': 'Table not found'})
                        return
                    conn.execute(
                        'INSERT INTO dynamic_table_rows (id, table_id, data_json, created_at) VALUES (?, ?, ?, ?)',
                        (row_id, table_id, json.dumps(body['data']), utc_now()),
                    )
                    conn.commit()
                    conn.close()
                send_json(self, 201, {'id': row_id})
                return

        send_json(self, 404, {'message': 'Not found'})

    def do_PATCH(self):
        path = urlparse(self.path).path
        try:
            body = parse_json(self)
        except json.JSONDecodeError:
            send_json(self, 400, {'message': 'Invalid JSON'})
            return

        if path == '/api/sidebar-order':
            if not is_valid_sidebar_layout(body):
                send_json(self, 400, {'message': 'Invalid sidebar order payload'})
                return

            payload = normalize_sidebar_layout(body)
            upsert_sidebar_layout(payload)
            send_json(self, 200, {'ok': True})
            return

        if path.startswith('/api/dynamic-tables/') and len(path.strip('/').split('/')) == 3:
            table_id = path.strip('/').split('/')[2]
            name = body.get('name')
            columns = body.get('columns')
            if not name or not isinstance(columns, list) or len(columns) == 0:
                send_json(self, 400, {'message': 'name and columns[] are required'})
                return
            try:
                with _db_lock:
                    conn = get_conn()
                    existing = conn.execute('SELECT id, page_id FROM dynamic_tables WHERE id=?', (table_id,)).fetchone()
                    if not existing:
                        conn.close()
                        send_json(self, 404, {'message': 'Table not found'})
                        return
                    duplicate = conn.execute(
                        'SELECT id FROM dynamic_tables WHERE page_id=? AND LOWER(name)=LOWER(?) AND id<>?',
                        (existing['page_id'], name, table_id),
                    ).fetchone()
                    if duplicate:
                        conn.close()
                        send_json(self, 409, {'message': 'Tab name must be unique within the selected page'})
                        return
                    conn.execute(
                        'UPDATE dynamic_tables SET name=?, columns_json=? WHERE id=?',
                        (name, json.dumps(columns), table_id),
                    )
                    conn.commit()
                    conn.close()
            except sqlite3.IntegrityError:
                send_json(self, 400, {'message': 'Invalid update payload'})
                return
            send_json(self, 200, {'ok': True})
            return

        if path.startswith('/api/dynamic-tables/') and path.endswith('/assignment'):
            parts = path.strip('/').split('/')
            if len(parts) == 4:
                table_id = parts[2]
                sidebar_item_id = body.get('sidebarItemId')
                try:
                    with _db_lock:
                        conn = get_conn()
                        cur = conn.execute(
                            'UPDATE dynamic_tables SET sidebar_item_id=? WHERE id=?',
                            (sidebar_item_id, table_id),
                        )
                        conn.commit()
                        conn.close()
                    if cur.rowcount == 0:
                        send_json(self, 404, {'message': 'Table not found'})
                        return
                except sqlite3.IntegrityError:
                    send_json(self, 400, {'message': 'Invalid sidebarItemId'})
                    return
                send_json(self, 200, {'ok': True})
                return

        if path.startswith('/api/dynamic-pages/') and path.endswith('/assignment'):
            page_id = path.strip('/').split('/')[2]
            sidebar_item_id = body.get('sidebarItemId')
            try:
                with _db_lock:
                    conn = get_conn()
                    previous = conn.execute('SELECT sidebar_item_id FROM dynamic_pages WHERE id=?', (page_id,)).fetchone()
                    if not previous:
                        conn.close()
                        send_json(self, 404, {'message': 'Page not found'})
                        return
                    old_sidebar_item_id = previous['sidebar_item_id']
                    conn.execute('UPDATE dynamic_pages SET sidebar_item_id=? WHERE id=?', (sidebar_item_id, page_id))
                    if old_sidebar_item_id:
                        conn.execute('UPDATE sidebar_items SET url=NULL WHERE id=?', (old_sidebar_item_id,))
                    if sidebar_item_id:
                        conn.execute('UPDATE sidebar_items SET url=? WHERE id=?', (f'/dynamic-tables/{page_id}', sidebar_item_id))
                    conn.commit()
                    conn.close()
            except sqlite3.IntegrityError:
                send_json(self, 400, {'message': 'Invalid sidebarItemId'})
                return
            send_json(self, 200, {'ok': True})
            return

        send_json(self, 404, {'message': 'Not found'})

    def do_DELETE(self):
        path = urlparse(self.path).path

        if path.startswith('/api/sidebar-items/'):
            item_id = path.split('/')[-1]
            with _db_lock:
                conn = get_conn()
                cur = conn.execute('DELETE FROM sidebar_items WHERE id=?', (item_id,))
                conn.commit()
                conn.close()
            if cur.rowcount == 0:
                send_json(self, 404, {'message': 'Sidebar item not found'})
            else:
                send_json(self, 204)
            return

        if path.startswith('/api/dynamic-tables/'):
            table_id = path.split('/')[-1]
            with _db_lock:
                conn = get_conn()
                cur = conn.execute('DELETE FROM dynamic_tables WHERE id=?', (table_id,))
                conn.commit()
                conn.close()
            if cur.rowcount == 0:
                send_json(self, 404, {'message': 'Table not found'})
            else:
                send_json(self, 204)
            return

        if path.startswith('/api/dynamic-pages/'):
            page_id = path.split('/')[-1]
            with _db_lock:
                conn = get_conn()
                previous = conn.execute('SELECT sidebar_item_id FROM dynamic_pages WHERE id=?', (page_id,)).fetchone()
                cur = conn.execute('DELETE FROM dynamic_pages WHERE id=?', (page_id,))
                if previous and previous['sidebar_item_id']:
                    conn.execute('UPDATE sidebar_items SET url=NULL WHERE id=?', (previous['sidebar_item_id'],))
                conn.commit()
                conn.close()
            if cur.rowcount == 0:
                send_json(self, 404, {'message': 'Page not found'})
            else:
                send_json(self, 204)
            return

        if path.startswith('/api/dynamic-table-rows/'):
            row_id = path.split('/')[-1]
            with _db_lock:
                conn = get_conn()
                cur = conn.execute('DELETE FROM dynamic_table_rows WHERE id=?', (row_id,))
                conn.commit()
                conn.close()
            if cur.rowcount == 0:
                send_json(self, 404, {'message': 'Row not found'})
            else:
                send_json(self, 204)
            return

        send_json(self, 404, {'message': 'Not found'})


if __name__ == '__main__':
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f'Backend API running on http://{HOST}:{PORT}')
    server.serve_forever()
