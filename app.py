from flask import Flask, request, jsonify, g
from flask_cors import CORS
import random
import time
import sqlite3
import os

app = Flask(__name__)
CORS(app)

DATABASE = 'users.db'

# Больше предметов для кейсов с иконками
case_items = {
    "common": [
        "🍏 Обычный предмет",
        "🍎 Яблоко",
        "🛡️ Щит новичка",
        "🥾 Ботинки путешественника",
        "🪓 Деревянный топор",
        "🧢 Кепка новичка"
    ],
    "rare": [
        "⚔️ Редкий меч",
        "🧪 Зелье силы",
        "🏹 Лук охотника",
        "🛡️🟦 Синий щит",
        "🥋 Пояс бойца",
        "🧤 Перчатки скорости"
    ],
    "epic": [
        "🔥 Огненный клинок",
        "❄️ Ледяной посох",
        "💫 Плащ теней",
        "⚡ Молниеносный жезл",
        "🐉 Маска дракона",
        "🌪️ Ветряной амулет"
    ],
    "legendary": [
        "🌟 Легендарный артефакт",
        "☄️ Древний амулет",
        "👑 Корона повелителя",
        "🦄 Рог единорога",
        "🦾 Кибер-рука"
    ]
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
            last_active INTEGER
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

@app.before_first_request
def setup():
    init_db()

def get_user_from_db(user_id):
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE user_id=?', (user_id,)).fetchone()
    if user is None:
        # Если нового пользователя нет — создаём его
        db.execute('INSERT INTO users (user_id, balance, last_active) VALUES (?, ?, ?)',
                   (user_id, 0, int(time.time())))
        db.commit()
        inventory = []
        last_active = int(time.time())
        balance = 0
    else:
        inventory = [row['item'] for row in db.execute('SELECT item FROM inventory WHERE user_id=?', (user_id,))]
        last_active = user['last_active']
        balance = user['balance']
    return {
        "balance": balance,
        "inventory": inventory,
        "last_active": last_active
    }

def save_user_to_db(user_id, balance, inventory, last_active):
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE user_id=?', (user_id,)).fetchone()
    if user is None:
        db.execute('INSERT INTO users (user_id, balance, last_active) VALUES (?, ?, ?)',
                   (user_id, balance, last_active))
    else:
        db.execute('UPDATE users SET balance=?, last_active=? WHERE user_id=?',
                   (balance, last_active, user_id))
    # Обновляем инвентарь
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

    save_user_to_db(user_id, balance, inventory, last_active)
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

    # Выбор предмета с учетом редкости
    rarity = random.choices(
        ["common", "rare", "epic", "legendary"],
        weights=[70, 20, 8, 2]
    )[0]
    item = random.choice(case_items[rarity])

    # Обновляем данные пользователя
    user_data["balance"] -= 100
    user_data["inventory"].append(item)
    user_data["last_active"] = int(time.time())

    save_user_to_db(user_id, user_data["balance"], user_data["inventory"], user_data["last_active"])

    return jsonify({
        "success": True,
        "item": item,
        "rarity": rarity
    })

if __name__ == '__main__':
    app.run(debug=True)