from flask import Flask, request, jsonify
from flask_cors import CORS
import random
import time

app = Flask(__name__)
CORS(app)

# База данных в памяти (для продакшена используйте SQLite/PostgreSQL)
users_db = {}

# Предметы для кейсов
case_items = {
    "common": ["🍏 Обычный предмет", "🍎 Яблоко", "🛡️ Щит новичка"],
    "rare": ["⚔️ Редкий меч", "🧪 Зелье силы", "🏹 Лук охотника"],
    "epic": ["🔥 Огненный клинок", "❄️ Ледяной посох", "💫 Плащ теней"],
    "legendary": ["🌟 Легендарный артефакт", "☄️ Древний амулет"]
}

@app.route('/get_user', methods=['GET'])
def get_user():
    user_id = request.args.get('user_id')
    user_data = users_db.get(user_id, {
        "balance": 0,
        "inventory": [],
        "last_active": int(time.time())
    })
    return jsonify(user_data)

@app.route('/save_data', methods=['POST'])
def save_data():
    data = request.json
    user_id = data['user_id']
    
    users_db[user_id] = {
        "balance": data['balance'],
        "inventory": data.get('inventory', []),
        "last_active": data['last_active']
    }
    
    return jsonify({"success": True})

@app.route('/open_case', methods=['POST'])
def open_case():
    data = request.json
    user_id = data['user_id']
    
    if user_id not in users_db or users_db[user_id]["balance"] < 100:
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
    users_db[user_id]["balance"] -= 100
    users_db[user_id]["inventory"].append(item)
    users_db[user_id]["last_active"] = int(time.time())
    
    return jsonify({
        "success": True,
        "item": item,
        "rarity": rarity
    })

if __name__ == '__main__':
    app.run(debug=True)