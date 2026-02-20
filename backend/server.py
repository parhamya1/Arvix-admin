from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

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
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS dynamic_tables (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL UNIQUE,
              columns_json TEXT NOT NULL,
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
    handler.send_header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
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
        out = {'id': node['id'], 'title': node['title']}
        if 'url' in node:
            out['url'] = node['url']
        if 'badge' in node:
            out['badge'] = node['badge']
        children = sorted(node['items'], key=lambda x: x['sortOrder'])
        if children:
            out['items'] = [cleanup(child) for child in children]
        return out

    result = []
    for group_name in sorted(groups.keys()):
        root_items = sorted(groups[group_name]['items'], key=lambda x: x['sortOrder'])
        result.append({'title': group_name, 'items': [cleanup(item) for item in root_items]})
    return result


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        send_json(self, 204)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/health':
            send_json(self, 200, {'ok': True})
            return

        if path == '/api/sidebar-config':
            with _db_lock:
                conn = get_conn()
                rows = conn.execute(
                    'SELECT * FROM sidebar_items ORDER BY group_title, sort_order, created_at'
                ).fetchall()
                conn.close()
            send_json(self, 200, {'navGroups': build_sidebar_tree(rows)})
            return

        if path == '/api/dynamic-tables':
            with _db_lock:
                conn = get_conn()
                rows = conn.execute('SELECT * FROM dynamic_tables ORDER BY created_at DESC').fetchall()
                conn.close()
            payload = [
                {
                    'id': row['id'],
                    'name': row['name'],
                    'columns': json.loads(row['columns_json']),
                    'createdAt': row['created_at'],
                }
                for row in rows
            ]
            send_json(self, 200, payload)
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

            item_id = str(uuid.uuid4())
            with _db_lock:
                conn = get_conn()
                conn.execute(
                    'INSERT INTO sidebar_items (id, group_title, parent_id, title, url, badge, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    (
                        item_id,
                        body['groupTitle'],
                        body.get('parentId'),
                        body['title'],
                        body.get('url'),
                        body.get('badge'),
                        int(body.get('sortOrder', 0)),
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
                        'INSERT INTO dynamic_tables (id, name, columns_json, created_at) VALUES (?, ?, ?, ?)',
                        (table_id, body['name'], json.dumps(body['columns']), utc_now()),
                    )
                    conn.commit()
                    conn.close()
            except sqlite3.IntegrityError:
                send_json(self, 409, {'message': 'Table name must be unique'})
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
