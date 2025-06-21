from flask import Flask, request, jsonify, g
from flask_cors import CORS
import time
import sqlite3
import os
import json

app = Flask(__name__)
CORS(app)

DB_NAME = 'database.db'

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

# Инициализация БД (выполнить один раз!)
def init_db():
    db = sqlite3.connect(DB_NAME)
    db.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 300,
            vc_balance INTEGER DEFAULT 10,
            inventory TEXT DEFAULT '[]',
            last_active INTEGER DEFAULT 0,
            username TEXT DEFAULT '',
            first_name TEXT DEFAULT '',
            last_name TEXT DEFAULT '',
            photo_url TEXT DEFAULT '',
            level INTEGER DEFAULT 1,
            exp INTEGER DEFAULT 0
        )
    ''')
    db.commit()
    db.close()
    print('База данных и таблицы успешно созданы!')

# -------------------- USER LOAD/SAVE -----------------------
def get_user_from_db(user_id):
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE user_id=?', (user_id,)).fetchone()
    if user is None:
        # Новый пользователь
        inventory = []
        db.execute('INSERT INTO users (user_id, balance, vc_balance, inventory, last_active) VALUES (?, ?, ?, ?, ?)',
                   (user_id, 300, 10, json.dumps(inventory), int(time.time())))
        db.commit()
        return {
            "balance": 300,
            "vcBalance": 10,
            "inventory": inventory,
            "last_active": int(time.time()),
            "username": "",
            "first_name": "",
            "last_name": "",
            "photo_url": "",
            "level": 1,
            "exp": 0
        }
    else:
        return {
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
        }

def save_user_to_db(user_id, balance, inventory, last_active, vc_balance, username="", first_name="", last_name="", photo_url="", level=1, exp=0):
    db = get_db()
    db.execute(
        '''UPDATE users SET balance=?, vc_balance=?, inventory=?, last_active=?, 
            username=?, first_name=?, last_name=?, photo_url=?, level=?, exp=?
            WHERE user_id=?''',
        (balance, vc_balance, json.dumps(inventory), last_active, username, first_name, last_name, photo_url, level, exp, user_id)
    )
    db.commit()

@app.route('/get_user', methods=['GET'])
def get_user():
    user_id = request.args.get('user_id')
    user_data = get_user_from_db(user_id)
    return jsonify(user_data)

@app.route('/save_data', methods=['POST'])
def save_data():
    data = request.json
    user_id = data['user_id']
    balance = data['balance']
    inventory = data.get('inventory', [])
    last_active = data['last_active']
    vc_balance = data.get('vcBalance', 0)
    username = data.get('username', "")
    first_name = data.get('first_name', "")
    last_name = data.get('last_name', "")
    photo_url = data.get('photo_url', "")
    level = data.get('level', 1)
    exp = data.get('exp', 0)
    save_user_to_db(user_id, balance, inventory, last_active, vc_balance, username, first_name, last_name, photo_url, level, exp)
    return jsonify({"success": True})

@app.route('/sell_item', methods=['POST'])
def sell_item():
    data = request.json
    user_id = data['user_id']
    item_idx = data['item_idx']
    user_data = get_user_from_db(user_id)
    try:
        item = user_data["inventory"][item_idx]
    except IndexError:
        return jsonify({"success": False, "error": "Нет такого предмета"})
    price = item.get("priceVC", 1)
    user_data["vcBalance"] += price
    del user_data["inventory"][item_idx]
    save_user_to_db(user_id, user_data["balance"], user_data["inventory"], int(time.time()), user_data["vcBalance"])
    return jsonify({"success": True, "vcBalance": user_data["vcBalance"]})

@app.route('/top_users', methods=['GET'])
def top_users():
    db = get_db()
    cur = db.execute("SELECT user_id, balance, vc_balance, username, first_name, last_name, photo_url, level, exp FROM users ORDER BY balance DESC LIMIT 10")
    top = []
    for row in cur.fetchall():
        top.append({
            "user_id": row["user_id"],
            "balance": row["balance"],
            "vcBalance": row["vc_balance"],
            "username": row["username"],
            "first_name": row["first_name"],
            "last_name": row["last_name"],
            "photo_url": row["photo_url"],
            "level": row["level"],
            "exp": row["exp"]
        })
    return jsonify(top)

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'init_db':
        init_db()
    else:
        app.run(debug=True)