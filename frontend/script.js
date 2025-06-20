const tg = window.Telegram.WebApp;
let userId = null;
let balance = 0;
let inventory = [];
let coinsInterval = null;
let lastActiveTime = Date.now();

let tgUser = null; // Новый объект

async function initApp() {
    try {
        tg.ready();
        tg.expand();

        tgUser = tg.initDataUnsafe?.user;
        userId = tgUser?.id;
        if (!userId) {
            tg.showAlert("❌ Ошибка авторизации");
            return;
        }

        await loadUserData();
        setupEventListeners();
        handleVisibilityChange();
    } catch (e) {
        console.error("Ошибка инициализации:", e);
    }
}

async function loadUserData() {
    try {
        const response = await fetch(`https://Dante696swag.pythonanywhere.com/get_user?user_id=${userId}`);
        const data = await response.json();

        balance = typeof data.balance === 'number' ? data.balance : balance;
        inventory = Array.isArray(data.inventory) ? data.inventory : inventory;
        lastActiveTime = data.last_active ? data.last_active : Date.now();
        // сохраним имя/фото если пришло
        updateUI();
    } catch (e) {
        console.error("Ошибка загрузки данных:", e);
    }
}

function startCoinTimer() {
    if (coinsInterval) clearInterval(coinsInterval);

    coinsInterval = setInterval(async () => {
        if (!document.hidden) {
            balance += 1;
            lastActiveTime = Date.now();
            updateUI();

            if (balance % 10 === 0) {
                await saveToServer();
            }
        }
    }, 1000);
}

function stopCoinTimerAndSave() {
    if (coinsInterval) clearInterval(coinsInterval);
    lastActiveTime = Date.now();
    saveToServer();
}

async function openCase() {
    if (balance < 100) {
        tg.showAlert("❌ Нужно 100 очков!");
        return;
    }

    try {
        const response = await fetch("https://Dante696swag.pythonanywhere.com/open_case", {
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
        tg.showAlert("⚠️ Ошибка соединения с сервером");
    }
}

function showInventory() {
    const inventoryDiv = document.getElementById("inventory");
    inventoryDiv.innerHTML = `
        <h3>Ваши предметы (${inventory.length}):</h3>
        ${inventory.map(item => `<div class="item">${item}</div>`).join("")}
    `;
    inventoryDiv.classList.toggle("hidden");
}

async function showTop() {
    try {
        const response = await fetch("https://Dante696swag.pythonanywhere.com/top_users");
        const data = await response.json();

        let html = '<h3>🏆 ТОП игроков</h3><ol>';
        for (const user of data) {
            let name = user.first_name || "";
            if (user.last_name) name += " " + user.last_name;
            if (user.username) name += ` (@${user.username})`;
            let avatar = user.photo_url
                ? `<img src="${user.photo_url}" alt="avatar" style="width:32px; height:32px; border-radius:50%; vertical-align:middle; margin-right:8px;">`
                : '';
            html += `<li style="margin-bottom:8px;">${avatar}<strong>${name}</strong>: ${user.balance} очков</li>`;
        }
        html += '</ol>';

        const topListDiv = document.getElementById("top-list");
        topListDiv.innerHTML = html;
        topListDiv.classList.toggle("hidden");
    } catch (e) {
        tg.showAlert("⚠️ Не удалось получить топ игроков");
        console.error("Ошибка загрузки топа:", e);
    }
}

async function saveToServer() {
    try {
        await fetch("https://Dante696swag.pythonanywhere.com/save_data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId,
                balance: balance,
                inventory: inventory,
                last_active: lastActiveTime,
                username: tgUser?.username || "",
                first_name: tgUser?.first_name || "",
                last_name: tgUser?.last_name || "",
                photo_url: tgUser?.photo_url || ""
            })
        });
    } catch (e) {
        console.error("Ошибка сохранения:", e);
    }
}

function setupEventListeners() {
    document.addEventListener('visibilitychange', handleVisibilityChange);

    tg.onEvent('viewportChanged', (event) => {
        if (!event.isStateStable) {
            stopCoinTimerAndSave();
        }
    });

    window.addEventListener('beforeunload', () => {
        stopCoinTimerAndSave();
    });
}

function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
        lastActiveTime = Date.now();
        startCoinTimer();
    } else {
        stopCoinTimerAndSave();
    }
}

function updateUI() {
    document.getElementById("balance").textContent = balance;
    document.querySelector(".btn-case").textContent =
        `🎁 Открыть кейс (${balance}/100)`;
}

document.addEventListener("DOMContentLoaded", initApp);
