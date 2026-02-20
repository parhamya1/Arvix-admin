from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
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
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS dynamic_table_rows (
              id TEXT PRIMARY KEY,
              table_id TEXT NOT NULL REFERENCES dynamic_tables(id) ON DELETE CASCADE,
              data_json TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            """
        )
        ensure_column(conn, 'sidebar_items', 'display_mode', "TEXT NOT NULL DEFAULT 'hierarchy'")
        ensure_column(conn, 'dynamic_tables', 'sidebar_item_id', 'TEXT REFERENCES sidebar_items(id) ON DELETE SET NULL')
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


def build_sidebar_tree(rows: list[sqlite3.Row], assigned_tables: list[sqlite3.Row]) -> list[dict]:
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

    # inject assigned table links as child menu items
    for table in assigned_tables:
        parent_id = table['sidebar_item_id']
        if not parent_id or parent_id not in items:
            continue
        items[parent_id]['items'].append(
            {
                'id': f"table-{table['id']}",
                'title': table['name'],
                'url': f"/dynamic-tables/{table['id']}",
                'displayMode': 'vertical',
                'parentId': parent_id,
                'sortOrder': 10_000,
                'items': [],
                'groupTitle': items[parent_id]['groupTitle'],
            }
        )

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


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        send_json(self, 204)

    def do_GET(self):
        path = urlparse(self.path).path

        if path == '/health':
            send_json(self, 200, {'ok': True})
            return

        if path in ('/api/sidebar-config', '/api/sidebar-items'):
            with _db_lock:
                conn = get_conn()
                rows = conn.execute(
                    'SELECT id, group_title, parent_id, title, url, badge, sort_order, display_mode, created_at FROM sidebar_items ORDER BY group_title, sort_order, created_at'
                ).fetchall()
                assigned_tables = conn.execute(
                    'SELECT id, name, sidebar_item_id FROM dynamic_tables WHERE sidebar_item_id IS NOT NULL ORDER BY created_at'
                ).fetchall()
                conn.close()
            if path == '/api/sidebar-config':
                send_json(self, 200, {'navGroups': build_sidebar_tree(rows, assigned_tables)})
            else:
                send_json(self, 200, flatten_sidebar(rows))
            return

        if path == '/api/dynamic-tables':
            with _db_lock:
                conn = get_conn()
                rows = conn.execute(
                    'SELECT id, name, columns_json, sidebar_item_id, created_at FROM dynamic_tables ORDER BY created_at DESC'
                ).fetchall()
                conn.close()
            payload = [
                {
                    'id': row['id'],
                    'name': row['name'],
                    'columns': json.loads(row['columns_json']),
                    'sidebarItemId': row['sidebar_item_id'],
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
                        'SELECT id, name, columns_json, sidebar_item_id, created_at FROM dynamic_tables WHERE id=?',
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
        try:
            body = parse_json(self)
        except json.JSONDecodeError:
            send_json(self, 400, {'message': 'Invalid JSON'})
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
            table_id = str(uuid.uuid4())
            try:
                with _db_lock:
                    conn = get_conn()
                    conn.execute(
                        'INSERT INTO dynamic_tables (id, name, columns_json, sidebar_item_id, created_at) VALUES (?, ?, ?, ?, ?)',
                        (
                            table_id,
                            body['name'],
                            json.dumps(body['columns']),
                            body.get('sidebarItemId'),
                            utc_now(),
                        ),
                    )
                    conn.commit()
                    conn.close()
            except sqlite3.IntegrityError:
                send_json(self, 409, {'message': 'Table name must be unique and sidebarItemId must be valid'})
                return
            send_json(self, 201, {'id': table_id})
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
