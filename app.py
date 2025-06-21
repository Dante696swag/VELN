from flask import Flask, request, jsonify, g, send_file
from flask_cors import CORS
import time
import sqlite3
import os
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

DB_NAME = 'database.db'

# Конфигурация предметов
ITEMS = [
    {"id": 1, "name": "Common Skin", "rarity": "common", "priceVC": 5, "ico": "🛡️", "desc": "Обычный скин"},
    {"id": 2, "name": "Rare Skin", "rarity": "rare", "priceVC": 15, "ico": "🔮", "desc": "Редкий скин"},
    {"id": 3, "name": "Epic Skin", "rarity": "epic", "priceVC": 30, "ico": "🎭", "desc": "Эпический скин"},
    {"id": 4, "name": "Legendary Skin", "rarity": "legendary", "priceVC": 100, "ico": "👑", "desc": "Легендарный скин"},
    {"id": 5, "name": "NFT Art", "rarity": "nft", "priceVC": 500, "ico": "🖼️", "desc": "Уникальный NFT арт"}
]


def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DB_NAME)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def init_db():
    with app.app_context():
        db = get_db()
        db.execute('''
                   CREATE TABLE IF NOT EXISTS users
                   (
                       user_id
                       TEXT
                       PRIMARY
                       KEY,
                       balance
                       INTEGER
                       DEFAULT
                       300,
                       vc_balance
                       INTEGER
                       DEFAULT
                       10,
                       inventory
                       TEXT
                       DEFAULT
                       '[]',
                       last_active
                       INTEGER
                       DEFAULT
                       0,
                       username
                       TEXT
                       DEFAULT
                       '',
                       first_name
                       TEXT
                       DEFAULT
                       '',
                       last_name
                       TEXT
                       DEFAULT
                       '',
                       photo_url
                       TEXT
                       DEFAULT
                       '',
                       level
                       INTEGER
                       DEFAULT
                       1,
                       exp
                       INTEGER
                       DEFAULT
                       0
                   )
                   ''')
        db.execute('''
                   CREATE TABLE IF NOT EXISTS case_history
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       user_id
                       TEXT,
                       item_id
                       INTEGER,
                       timestamp
                       INTEGER,
                       FOREIGN
                       KEY
                   (
                       user_id
                   ) REFERENCES users
                   (
                       user_id
                   )
                   ''')
        db.execute('CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_users_level ON users(level)')
        db.commit()
        print("Database initialized successfully")


@app.route('/get_user', methods=['GET'])
def get_user():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    db = get_db()
    user = db.execute('SELECT * FROM users WHERE user_id = ?', (user_id,)).fetchone()

    if not user:
        inventory = []
        db.execute('''
                   INSERT INTO users (user_id, balance, vc_balance, inventory, last_active)
                   VALUES (?, ?, ?, ?, ?)
                   ''', (user_id, 300, 10, json.dumps(inventory), int(time.time())))
        db.commit()
        user = db.execute('SELECT * FROM users WHERE user_id = ?', (user_id,)).fetchone()

    return jsonify({
        "balance": user["balance"],
        "vcBalance": user["vc_balance"],
        "inventory": json.loads(user["inventory"]),
        "last_active": user["last_active"],
        "username": user["username"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "photo_url": user["photo_url"],
        "level": user["level"],
        "exp": user["exp"]
    })


@app.route('/save_data', methods=['POST'])
def save_data():
    data = request.json
    required_fields = ['user_id', 'balance', 'last_active']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    db = get_db()
    db.execute('''
               UPDATE users
               SET balance     = ?,
                   vc_balance  = ?,
                   inventory   = ?,
                   last_active = ?,
                   username    = ?,
                   first_name  = ?,
                   last_name   = ?,
                   photo_url   = ?,
                   level       = ?,
                   exp         = ?
               WHERE user_id = ?
               ''', (
                   data['balance'],
                   data.get('vcBalance', 0),
                   json.dumps(data.get('inventory', [])),
                   data['last_active'],
                   data.get('username', ''),
                   data.get('first_name', ''),
                   data.get('last_name', ''),
                   data.get('photo_url', ''),
                   data.get('level', 1),
                   data.get('exp', 0),
                   data['user_id']
               ))
    db.commit()
    return jsonify({"success": True})


@app.route('/open_case', methods=['POST'])
def open_case():
    data = request.json
    if 'user_id' not in data or 'item_idx' not in data:
        return jsonify({"error": "Missing required fields"}), 400

    item_idx = data['item_idx']
    if item_idx < 0 or item_idx >= len(ITEMS):
        return jsonify({"error": "Invalid item index"}), 400

    db = get_db()
    user = db.execute('SELECT * FROM users WHERE user_id = ?', (data['user_id'],)).fetchone()
    if not user:
        return jsonify({"error": "User not found"}), 404

    inventory = json.loads(user["inventory"])
    inventory.append(ITEMS[item_idx])

    db.execute('''
               UPDATE users
               SET inventory = ?
               WHERE user_id = ?
               ''', (json.dumps(inventory), data['user_id']))

    db.execute('''
               INSERT INTO case_history (user_id, item_id, timestamp)
               VALUES (?, ?, ?)
               ''', (data['user_id'], ITEMS[item_idx]["id"], int(time.time())))

    db.commit()
    return jsonify({"success": True, "item": ITEMS[item_idx]})


@app.route('/sell_item', methods=['POST'])
def sell_item():
    data = request.json
    if 'user_id' not in data or 'item_idx' not in data:
        return jsonify({"error": "Missing required fields"}), 400

    db = get_db()
    user = db.execute('SELECT * FROM users WHERE user_id = ?', (data['user_id'],)).fetchone()
    if not user:
        return jsonify({"error": "User not found"}), 404

    inventory = json.loads(user["inventory"])
    try:
        item = inventory[data['item_idx']]
    except IndexError:
        return jsonify({"error": "Invalid item index"}), 400

    price = item.get("priceVC", 1)
    del inventory[data['item_idx']]

    db.execute('''
               UPDATE users
               SET inventory  = ?,
                   vc_balance = vc_balance + ?
               WHERE user_id = ?
               ''', (json.dumps(inventory), price, data['user_id']))
    db.commit()

    return jsonify({
        "success": True,
        "vcBalance": user["vc_balance"] + price
    })


@app.route('/top_users', methods=['GET'])
def top_users():
    db = get_db()
    cur = db.execute('''
                     SELECT user_id,
                            balance,
                            vc_balance,
                            username,
                            first_name,
                            last_name,
                            photo_url,
                            level,
                            exp
                     FROM users
                     ORDER BY (balance + (level * 1000)) DESC LIMIT 10
                     ''')
    top = [dict(row) for row in cur.fetchall()]
    return jsonify(top)


@app.route('/get_case_history', methods=['GET'])
def get_case_history():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    db = get_db()
    cur = db.execute('''
                     SELECT ch.item_id, ch.timestamp, i.name, i.rarity
                     FROM case_history ch
                              JOIN (SELECT id, name, rarity
                                    FROM (SELECT *
                                          FROM (VALUES (1, 'Common Skin', 'common'),
                                                       (2, 'Rare Skin', 'rare'),
                                                       (3, 'Epic Skin', 'epic'),
                                                       (4, 'Legendary Skin', 'legendary'),
                                                       (5, 'NFT Art', 'nft'))) AS items(id, name, rarity)) i
                                   ON ch.item_id = i.id
                     WHERE ch.user_id = ?
                     ORDER BY ch.timestamp DESC LIMIT 7
                     ''', (user_id,))

    history = []
    for row in cur.fetchall():
        history.append({
            "name": row["name"],
            "rarity": row["rarity"],
            "timestamp": row["timestamp"]
        })

    return jsonify(history)


@app.route('/backup', methods=['GET'])
def backup():
    return send_file(DB_NAME, as_attachment=True)


if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == 'init_db':
        init_db()
    else:
        app.run(host='0.0.0.0', port=5000, debug=True)