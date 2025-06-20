from flask import Flask, request, jsonify, g
from flask_cors import CORS
import random
import sqlite3
import os
import json

DATABASE = 'users.db'

app = Flask(__name__)
CORS(app)

# --- База данных ---
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    db = sqlite3.connect(DATABASE)
    db.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 0,
            inventory TEXT DEFAULT '[]',
            username TEXT,
            first_name TEXT,
            last_name TEXT
        )
    ''')
    db.commit()
    db.close()

# --- Утилиты ---
def user_row_to_dict(row):
    return {
        "balance": row["balance"],
        "inventory": json.loads(row["inventory"]),
        "username": row["username"] or "",
        "first_name": row["first_name"] or "",
        "last_name": row["last_name"] or ""
    }

def get_user_or_create(user_id):
    db = get_db()
    cur = db.execute("SELECT * FROM users WHERE user_id=?", (user_id,))
    row = cur.fetchone()
    if row:
        return user_row_to_dict(row)
    else:
        db.execute("INSERT INTO users (user_id, balance, inventory) VALUES (?, 0, ?)", (user_id, json.dumps([])))
        db.commit()
        return {"balance": 0, "inventory": [], "username": "", "first_name": "", "last_name": ""}

def update_user(user_id, balance=None, inventory=None, username=None, first_name=None, last_name=None):
    db = get_db()
    fields = []
    vals = []
    if balance is not None:
        fields.append("balance=?")
        vals.append(balance)
    if inventory is not None:
        fields.append("inventory=?")
        vals.append(json.dumps(inventory))
    if username is not None:
        fields.append("username=?")
        vals.append(username)
    if first_name is not None:
        fields.append("first_name=?")
        vals.append(first_name)
    if last_name is not None:
        fields.append("last_name=?")
        vals.append(last_name)
    if not fields:
        return
    vals.append(user_id)
    db.execute(f"UPDATE users SET {', '.join(fields)} WHERE user_id=?", vals)
    db.commit()

# --- Кейс предметы ---
items = {
    "common": ["Обычный меч", "Обычный щит", "Обычное зелье"],
    "rare": ["Редкий меч", "Редкий щит", "Редкое зелье"],
    "epic": ["Эпический меч", "Эпический щит"],
    "legendary": ["Легендарный меч"]
}

# --- Эндпоинты ---

@app.route('/get_user', methods=['GET'])
def get_user():
    user_id = str(request.args.get('user_id'))
    user = get_user_or_create(user_id)
    return jsonify(user)

@app.route('/add_coins', methods=['POST'])
def add_coins():
    data = request.json
    user_id = str(data['user_id'])
    coins = int(data['coins'])
    user = get_user_or_create(user_id)
    new_balance = user['balance'] + coins
    update_user(user_id, balance=new_balance)
    return jsonify({"success": True, "new_balance": new_balance})

@app.route('/save_data', methods=['POST'])
def save_data():
    data = request.json
    user_id = str(data.get('user_id'))
    user = get_user_or_create(user_id)
    balance = int(data.get('balance', user['balance']))
    inventory = data.get('inventory', user['inventory'])
    username = data.get('username', user['username'])
    first_name = data.get('first_name', user['first_name'])
    last_name = data.get('last_name', user['last_name'])
    update_user(user_id, balance=balance, inventory=inventory, username=username, first_name=first_name, last_name=last_name)
    return jsonify({"success": True})

@app.route('/open_case', methods=['POST'])
def open_case():
    data = request.json
    user_id = str(data['user_id'])
    user = get_user_or_create(user_id)
    if user["balance"] < 100:
        return jsonify({"success": False, "error": "not_enough_balance"})
    rarity = random.choices(
        ["common", "rare", "epic", "legendary"],
        weights=[60, 30, 8, 2]
    )[0]
    item = random.choice(items[rarity])
    inventory = user["inventory"] + [item]
    new_balance = user["balance"] - 100
    update_user(user_id, balance=new_balance, inventory=inventory)
    return jsonify({"success": True, "item": item, "rarity": rarity})

@app.route('/top_users', methods=['GET'])
def top_users():
    db = get_db()
    cur = db.execute("SELECT user_id, balance, username, first_name, last_name FROM users ORDER BY balance DESC LIMIT 10")
    top = [
        dict(row) for row in cur.fetchall()
    ]
    return jsonify(top)

# --- Инициализация БД и запуск ---
init_db()

if __name__ == '__main__':
    app.run(debug=True)