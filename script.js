// Конфигурация
const ITEMS = [
    {id: 1, name: "Common Skin", rarity: "common", priceVC: 5, ico: "🛡️", desc: "Обычный скин"},
    {id: 2, name: "Rare Skin", rarity: "rare", priceVC: 15, ico: "🔮", desc: "Редкий скин"},
    {id: 3, name: "Epic Skin", rarity: "epic", priceVC: 30, ico: "🎭", desc: "Эпический скин"},
    {id: 4, name: "Legendary Skin", rarity: "legendary", priceVC: 100, ico: "👑", desc: "Легендарный скин"},
    {id: 5, name: "NFT Art", rarity: "nft", priceVC: 500, ico: "🖼️", desc: "Уникальный NFT арт"}
];

const RARITY_CHANCES = [
    {rarity: "nft", chance: 0.5},
    {rarity: "legendary", chance: 1.5},
    {rarity: "epic", chance: 8},
    {rarity: "rare", chance: 20},
    {rarity: "common", chance: 70}
];

const RARITY_COLOR = {
    common: "#b9c8f9",
    rare: "#38ffda",
    epic: "#bc78ff",
    legendary: "#ffd700",
    nft: "#00ffd0"
};

// Состояние
let inventory = [];
let balancePoints = 0;
let balanceCoins = 0;
let caseDropsHistory = [];
const USER_ID = "user_" + Math.random().toString(36).substr(2, 9);

// API функции
async function apiGetUser() {
    const res = await fetch(`/get_user?user_id=${USER_ID}`);
    if (!res.ok) throw new Error("Failed to fetch user");
    return await res.json();
}

async function apiSaveUser() {
    const res = await fetch('/save_data', {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            user_id: USER_ID,
            balance: balancePoints,
            vcBalance: balanceCoins,
            inventory: inventory,
            last_active: Math.floor(Date.now()/1000)
        })
    });
    if (!res.ok) throw new Error("Failed to save user");
    return await res.json();
}

async function apiOpenCase(itemIdx) {
    const res = await fetch('/open_case', {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            user_id: USER_ID,
            item_idx: itemIdx
        })
    });
    if (!res.ok) throw new Error("Failed to open case");
    return await res.json();
}

async function apiSellItem(idx) {
    const res = await fetch('/sell_item', {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            user_id: USER_ID,
            item_idx: idx
        })
    });
    if (!res.ok) throw new Error("Failed to sell item");
    return await res.json();
}

async function apiTop() {
    const res = await fetch('/top_users');
    if (!res.ok) throw new Error("Failed to fetch top");
    return await res.json();
}

async function apiGetCaseHistory() {
    const res = await fetch(`/get_case_history?user_id=${USER_ID}`);
    if (!res.ok) throw new Error("Failed to fetch case history");
    return await res.json();
}

// DOM элементы
const panels = {
    inventory: document.getElementById('panel-inventory'),
    opencase: document.getElementById('panel-opencase'),
    addpoint: document.getElementById('panel-addpoint'),
    topplayers: document.getElementById('panel-topplayers'),
    upgrade: document.getElementById('panel-upgrade')
};

const sidebarBtns = document.querySelectorAll('.grok-sidebtn');
const caseModal = document.getElementById('case-modal');
const rouletteStrip = document.getElementById('roulette-strip');
const spinBtn = document.getElementById('spin-btn');
const caseResult = document.getElementById('case-result');
const closeCaseBtn = document.getElementById('close-case-btn');
const balancePointsEl = document.getElementById('balancePoints');
const balanceCoinsEl = document.getElementById('balanceCoins');

// Функции обновления интерфейса
function updateBalances() {
    balancePointsEl.textContent = balancePoints;
    balanceCoinsEl.textContent = balanceCoins;
    document.querySelectorAll('#balancePoints2, .balance-points').forEach(el => el.textContent = balancePoints);
    document.querySelectorAll('#balanceCoins2, .balance-coins').forEach(el => el.textContent = balanceCoins);
}

async function renderInventory() {
    let html = '<div class="grok-menu-list"></div>';
    
    if (inventory.length === 0) {
        html += `
            <div class="grok-inventory-empty">
                Нет предметов<br>
                <div style="opacity:.7;font-size:.97em;margin-top:1.1em;">
                    Подсказка: открывайте кейсы чтобы получить предметы!
                </div>
            </div>
        `;
    } else {
        html += `<div class="grok-inventory-grid">`;
        
        inventory.forEach((item, index) => {
            html += `
                <div class="grok-item-card">
                    <div class="grok-item-ico">${item.ico}</div>
                    <div class="grok-item-name">${item.name}</div>
                    <div class="grok-item-desc">${item.desc}</div>
                    <div class="grok-item-rarity" style="color: ${RARITY_COLOR[item.rarity]}">
                        ${item.rarity.toUpperCase()}
                    </div>
                    <button class="grok-item-sell" data-idx="${index}">
                        Продать за ${item.priceVC} VC
                    </button>
                </div>
            `;
        });
        
        html += `</div>`;
    }
    
    panels.inventory.innerHTML = html;
    
    // Добавляем обработчики для кнопок продажи
    document.querySelectorAll('.grok-item-sell').forEach(btn => {
        btn.addEventListener('click', async () => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            try {
                const result = await apiSellItem(idx);
                if (result.success) {
                    balanceCoins = result.vcBalance;
                    inventory.splice(idx, 1);
                    updateBalances();
                    await renderInventory();
                    await apiSaveUser();
                }
            } catch (error) {
                console.error("Error selling item:", error);
                alert("Ошибка при продаже предмета");
            }
        });
    });
}

async function renderCase() {
    panels.opencase.innerHTML = `
        <div class="grok-case-header">
            <h3>Открой кейс!</h3>
            <div class="grok-case-rates">
                NFT: 0.5% | Легендарный: 1.5% | Эпический: 8% | Редкий: 20% | Обычный: 70%
            </div>
        </div>
        <button class="grok-case-btn" id="open-case-btn">
            Открыть кейс<br>
            <span>100 очков / 10 VC</span>
        </button>
        <div class="grok-balance-display">
            <span>Очки: <span id="balancePoints2">${balancePoints}</span></span>
            <span>VC: <span id="balanceCoins2">${balanceCoins}</span></span>
        </div>
        <div class="grok-case-history">
            <h4>История:</h4>
            <div id="case-history-items"></div>
        </div>
    `;
    
    // Обновляем историю
    const historyItems = caseDropsHistory.map(item => `
        <div class="grok-history-item" style="color: ${RARITY_COLOR[item.rarity]}">
            ${item.name}
        </div>
    `).join('');
    
    document.getElementById('case-history-items').innerHTML = 
        historyItems.length ? historyItems : '<div>Нет истории</div>';
    
    // Обработчик открытия кейса
    document.getElementById('open-case-btn').addEventListener('click', async () => {
        if (balancePoints >= 100) {
            balancePoints -= 100;
        } else if (balanceCoins >= 10) {
            balanceCoins -= 10;
        } else {
            alert("Недостаточно средств!");
            return;
        }
        
        updateBalances();
        await apiSaveUser();
        showCaseModal();
    });
}

function showCaseModal() {
    caseModal.classList.add('active');
    drawRoulette();
    caseResult.innerHTML = '';
}

function drawRoulette() {
    // Генерируем 30 случайных предметов по шансам
    const items = [];
    for (let i = 0; i < 30; i++) {
        const roll = Math.random() * 100;
        let rarity;
        
        if (roll < 0.5) rarity = "nft";
        else if (roll < 2) rarity = "legendary";
        else if (roll < 10) rarity = "epic";
        else if (roll < 30) rarity = "rare";
        else rarity = "common";
        
        const pool = ITEMS.filter(item => item.rarity === rarity);
        items.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    
    // Победный предмет (всегда центральный)
    const winnerIdx = Math.floor(items.length / 2);
    const winnerItem = items[winnerIdx];
    
    // Рендерим рулетку
    rouletteStrip.innerHTML = items.map((item, index) => `
        <div class="roulette-item ${index === winnerIdx ? 'winner' : ''}" 
             style="color: ${RARITY_COLOR[item.rarity]}"
             data-idx="${index}">
            <div class="roulette-item-icon">${item.ico}</div>
            <div class="roulette-item-name">${item.name}</div>
        </div>
    `).join('');
    
    // Сбрасываем анимацию
    rouletteStrip.style.transition = 'none';
    rouletteStrip.style.transform = 'translateX(0)';
    setTimeout(() => {
        rouletteStrip.style.transition = '';
    }, 10);
    
    // Включаем кнопку вращения
    spinBtn.disabled = false;
    spinBtn.onclick = () => spinRoulette(items, winnerIdx);
}

function spinRoulette(items, winnerIdx) {
    spinBtn.disabled = true;
    caseResult.innerHTML = '';
    
    // Вычисляем конечную позицию (победный элемент по центру)
    const itemWidth = 120; // Ширина элемента рулетки
    const visibleItems = 5; // Количество видимых элементов
    const offset = (visibleItems * itemWidth) / 2 - itemWidth / 2;
    const targetX = -(winnerIdx * itemWidth) + offset;
    
    // Запускаем анимацию
    rouletteStrip.style.transition = 'transform 3s cubic-bezier(0.2, 0.8, 0.3, 1)';
    rouletteStrip.style.transform = `translateX(${targetX}px)`;
    
    // По завершении анимации
    setTimeout(async () => {
        // Подсвечиваем выигранный предмет
        const winnerElement = rouletteStrip.children[winnerIdx];
        winnerElement.classList.add('highlight');
        
        // Добавляем предмет в инвентарь
        const winnerItem = items[winnerIdx];
        inventory.push(winnerItem);
        caseDropsHistory.unshift({
            name: winnerItem.name,
            rarity: winnerItem.rarity,
            timestamp: Math.floor(Date.now()/1000)
        });
        
        // Обновляем UI
        caseResult.innerHTML = `
            <div class="case-result-title">Вам выпало:</div>
            <div class="case-result-item" style="color: ${RARITY_COLOR[winnerItem.rarity]}">
                ${winnerItem.ico} ${winnerItem.name}
            </div>
            <div class="case-result-desc">${winnerItem.desc}</div>
        `;
        
        // Сохраняем изменения
        await apiSaveUser();
        updateBalances();
        renderInventory();
        
        // Через 3 секунды разрешаем снова крутить
        setTimeout(() => {
            spinBtn.disabled = false;
            winnerElement.classList.remove('highlight');
        }, 3000);
    }, 3000);
}

async function renderTop() {
    try {
        const topPlayers = await apiTop();
        
        let html = `
            <div class="grok-leaderboard">
                <div class="grok-leaderboard-header">ТОП ИГРОКОВ</div>
                <div class="grok-leaderboard-list">
        `;
        
        if (topPlayers.length === 0) {
            html += `<div class="grok-no-players">Нет данных об игроках</div>`;
        } else {
            topPlayers.forEach((player, index) => {
                html += `
                    <div class="grok-leaderboard-item">
                        <div class="grok-leaderboard-rank">${index + 1}</div>
                        <div class="grok-leaderboard-avatar">
                            ${player.photo_url ? 
                                `<img src="${player.photo_url}" alt="${player.username}">` : 
                                '👤'}
                        </div>
                        <div class="grok-leaderboard-info">
                            <div class="grok-leaderboard-name">
                                ${player.username || player.first_name || 'Аноним'}
                            </div>
                            <div class="grok-leaderboard-stats">
                                <span>${player.balance} очков</span>
                                <span>${player.vcBalance} VC</span>
                                <span>LVL ${player.level}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
            </div>
            <div class="grok-leaderboard-footer">
                Обновлено: ${new Date().toLocaleTimeString()}
            </div>
        `;
        
        panels.topplayers.innerHTML = html;
    } catch (error) {
        console.error("Error loading top players:", error);
        panels.topplayers.innerHTML = `
            <div class="grok-error">
                Не удалось загрузить топ игроков. Попробуйте позже.
            </div>
        `;
    }
}

async function renderAddPoint() {
    panels.addpoint.innerHTML = `
        <div class="grok-addpoint-container">
            <div class="grok-addpoint-header">
                <h3>Фарм очков</h3>
                <div class="grok-addpoint-balance">
                    Текущий баланс: <span id="current-points">${balancePoints}</span>
                </div>
            </div>
            <button class="grok-addpoint-btn" id="start-farming-btn">
                +1 очко в секунду
            </button>
            <div class="grok-addpoint-info">
                Очки можно тратить на открытие кейсов или улучшения
            </div>
        </div>
    `;
    
    document.getElementById('start-farming-btn').addEventListener('click', () => {
        const btn = document.getElementById('start-farming-btn');
        btn.disabled = true;
        btn.textContent = "Фармим...";
        
        const interval = setInterval(async () => {
            balancePoints++;
            document.getElementById('current-points').textContent = balancePoints;
            updateBalances();
            
            // Автосохранение каждые 10 секунд
            if (balancePoints % 10 === 0) {
                await apiSaveUser();
            }
        }, 1000);
        
        // Остановка при смене страницы
        const stopFarming = () => {
            clearInterval(interval);
            btn.disabled = false;
            btn.textContent = "+1 очко в секунду";
            document.removeEventListener('pageChanged', stopFarming);
        };
        
        document.addEventListener('pageChanged', stopFarming);
    });
}

// Инициализация
async function loadUserData() {
    try {
        const userData = await apiGetUser();
        balancePoints = userData.balance;
        balanceCoins = userData.vcBalance;
        inventory = userData.inventory || [];
        
        const historyData = await apiGetCaseHistory();
        caseDropsHistory = historyData.map(item => ({
            name: item.name,
            rarity: item.rarity,
            timestamp: item.timestamp
        }));
        
        updateBalances();
    } catch (error) {
        console.error("Error loading user data:", error);
        alert("Ошибка загрузки данных пользователя");
    }
}

// Обработчики навигации
sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Снимаем активность со всех кнопок
        sidebarBtns.forEach(b => b.classList.remove('active'));
        // Добавляем активность текущей
        btn.classList.add('active');
        
        // Скрываем все панели
        Object.values(panels).forEach(p => p.classList.remove('active'));
        
        // Показываем нужную панель
        const page = btn.dataset.page;
        panels[page].classList.add('active');
        
        // Генерируем событие смены страницы
        document.dispatchEvent(new CustomEvent('pageChanged'));
        
        // Загружаем контент для страницы
        switch (page) {
            case 'inventory':
                renderInventory();
                break;
            case 'opencase':
                renderCase();
                break;
            case 'addpoint':
                renderAddPoint();
                break;
            case 'topplayers':
                renderTop();
                break;
            case 'upgrade':
                // renderUpgrade();
                break;
        }
    });
});

// Закрытие модальных окон
closeCaseBtn.addEventListener('click', () => {
    caseModal.classList.remove('active');
});

// Автосохранение каждые 30 секунд
setInterval(async () => {
    try {
        await apiSaveUser();
        console.log('Автосохранение выполнено');
    } catch (error) {
        console.error('Ошибка автосохранения:', error);
    }
}, 30000);

// Загрузка при старте
window.addEventListener('load', async () => {
    await loadUserData();
    sidebarBtns[0].click(); // Активируем первую вкладку
});