const tg = window.Telegram.WebApp;
let userId = null;
let balance = 0;
let inventory = [];
let coinsInterval = null;
let lastActiveTime = Date.now();

// Инициализация приложения
async function initApp() {
    try {
        tg.ready();
        tg.expand();
        
        userId = tg.initDataUnsafe?.user?.id;
        if (!userId) {
            tg.showAlert("❌ Ошибка авторизации");
            return;
        }

        await loadUserData();
        setupEventListeners();
        startCoinTimer();
        
    } catch (e) {
        console.error("Ошибка инициализации:", e);
    }
}

// Загрузка данных пользователя
async function loadUserData() {
    try {
        const response = await fetch(`https://ваш-бекенд.herokuapp.com/get_user?user_id=${userId}`);
        const data = await response.json();
        
        balance = data.balance || 0;
        inventory = data.inventory || [];
        lastActiveTime = data.last_active || Date.now();
        
        updateUI();
    } catch (e) {
        console.error("Ошибка загрузки данных:", e);
    }
}

// Начисление очков только при активном приложении
function startCoinTimer() {
    if (coinsInterval) clearInterval(coinsInterval);
    
    coinsInterval = setInterval(async () => {
        if (!document.hidden) {
            const now = Date.now();
            const secondsActive = Math.floor((now - lastActiveTime) / 1000);
            
            if (secondsActive > 0) {
                balance += secondsActive;
                lastActiveTime = now;
                updateUI();
                
                // Синхронизация с сервером каждые 10 очков
                if (balance % 10 === 0) {
                    await saveToServer();
                }
            }
        }
    }, 1000);
}

// Открытие кейса
async function openCase() {
    if (balance < 100) {
        tg.showAlert("❌ Нужно 100 очков!");
        return;
    }

    try {
        const response = await fetch("https://ваш-бекенд.herokuapp.com/open_case", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            balance -= 100;
            inventory.push(result.item);
            await saveToServer();
            updateUI();
            tg.showAlert(`🎉 Вы получили: ${result.item}!`);
        } else {
            tg.showAlert(`⚠️ Ошибка: ${result.error || "Неизвестная ошибка"}`);
        }
    } catch (e) {
        console.error("Ошибка открытия кейса:", e);
    }
}

// Показать инвентарь
function showInventory() {
    const inventoryDiv = document.getElementById("inventory");
    inventoryDiv.innerHTML = `
        <h3>Ваши предметы (${inventory.length}):</h3>
        ${inventory.map(item => `<div class="item">${item}</div>`).join("")}
    `;
    inventoryDiv.classList.toggle("hidden");
}

// Сохранение данных
async function saveToServer() {
    try {
        await fetch("https://ваш-бекенд.herokuapp.com/save_data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId,
                balance: balance,
                inventory: inventory,
                last_active: lastActiveTime
            })
        });
    } catch (e) {
        console.error("Ошибка сохранения:", e);
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // При закрытии приложения
    tg.onEvent('viewportChanged', (event) => {
        if (!event.isStateStable) {
            saveToServer();
        }
    });

    // При закрытии вкладки
    window.addEventListener('beforeunload', () => {
        saveToServer();
        if (coinsInterval) clearInterval(coinsInterval);
    });
}

// Обновление интерфейса
function updateUI() {
    document.getElementById("balance").textContent = balance;
    document.querySelector(".btn-case").textContent = 
        `🎁 Открыть кейс (${balance}/100)`;
}

// Запуск приложения
document.addEventListener("DOMContentLoaded", initApp);