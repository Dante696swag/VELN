from flask import Flask, request, jsonify, g
from flask_cors import CORS
import random
import time
import sqlite3
import os

app = Flask(__name__)
CORS(app)

DATABASE = '/home/Dante696swag/users.db'

@app.route('/')
def index():
    return 'Backend работает! Используй /get_user, /open_case и т.д.'

@app.route('/top_users')
def top_users():
    db = get_db()
    users = db.execute(
        'SELECT user_id, balance, username, first_name, last_name, photo_url FROM users ORDER BY balance DESC LIMIT 10'
    ).fetchall()
    return jsonify([
        {
            "user_id": u['user_id'],
            "balance": u['balance'],
            "username": u['username'],
            "first_name": u['first_name'],
            "last_name": u['last_name'],
            "photo_url": u['photo_url']
        }
        for u in users
    ])

case_items = {
    "common": ["🍏 Обычный предмет", "🍎 Яблоко", "🛡️ Щит новичка"],
    "rare": ["⚔️ Редкий меч", "🧪 Зелье силы", "🏹 Лук охотника"],
    "epic": ["🔥 Огненный клинок", "❄️ Ледяной посох", "💫 Плащ теней"],
    "legendary": ["🌟 Легендарный артефакт", "☄️ Древний амулет"]
}

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
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            balance INTEGER,
            last_active INTEGER,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            photo_url TEXT
        )
    ''')
    db.execute('''
        CREATE TABLE IF NOT EXISTS inventory (
            user_id TEXT,
            item TEXT,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
    ''')
    db.commit()

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True)

def get_user_from_db(user_id):
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE user_id=?', (user_id,)).fetchone()
    if user is None:
        db.execute('INSERT INTO users (user_id, balance, last_active, username, first_name, last_name, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                   (user_id, 0, int(time.time()), "", "", "", ""))
        db.commit()
        inventory = []
        last_active = int(time.time())
        balance = 0
        username = ""
        first_name = ""
        last_name = ""
        photo_url = ""
    else:
        inventory = [row['item'] for row in db.execute('SELECT item FROM inventory WHERE user_id=?', (user_id,))]
        last_active = user['last_active']
        balance = user['balance']
        username = user['username']
        first_name = user['first_name']
        last_name = user['last_name']
        photo_url = user['photo_url']
    return {
        "balance": balance,
        "inventory": inventory,
        "last_active": last_active,
        "username": username,
        "first_name": first_name,
        "last_name": last_name,
        "photo_url": photo_url
    }

def save_user_to_db(user_id, balance, inventory, last_active, username="", first_name="", last_name="", photo_url=""):
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE user_id=?', (user_id,)).fetchone()
    if user is None:
        db.execute('INSERT INTO users (user_id, balance, last_active, username, first_name, last_name, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                   (user_id, balance, last_active, username, first_name, last_name, photo_url))
    else:
        db.execute('UPDATE users SET balance=?, last_active=?, username=?, first_name=?, last_name=?, photo_url=? WHERE user_id=?',
                   (balance, last_active, username, first_name, last_name, photo_url, user_id))
    db.execute('DELETE FROM inventory WHERE user_id=?', (user_id,))
    for item in inventory:
        db.execute('INSERT INTO inventory (user_id, item) VALUES (?, ?)', (user_id, item))
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
    username = data.get('username', "")
    first_name = data.get('first_name', "")
    last_name = data.get('last_name', "")
    photo_url = data.get('photo_url', "")

    save_user_to_db(user_id, balance, inventory, last_active, username, first_name, last_name, photo_url)
    return jsonify({"success": True})

@app.route('/open_case', methods=['POST'])
def open_case():
    data = request.json
    user_id = data['user_id']

    user_data = get_user_from_db(user_id)
    if user_data["balance"] < 100:
        return jsonify({
            "success": False,
            "error": "Недостаточно очков"
        })

    rarity = random.choices(
        ["common", "rare", "epic", "legendary"],
        weights=[70, 20, 8, 2]
    )[0]
    item = random.choice(case_items[rarity])
    user_data["balance"] -= 100
    user_data["inventory"].append(item)
    user_data["last_active"] = int(time.time())
    # Передаём и данные о пользователе (на всякий случай)
    save_user_to_db(
        user_id,
        user_data["balance"],
        user_data["inventory"],
        user_data["last_active"],
        user_data.get("username", ""),
        user_data.get("first_name", ""),
        user_data.get("last_name", ""),
        user_data.get("photo_url", "")
    )
    return jsonify({
        "success": True,
        "item": item,
        "rarity": rarity
    })