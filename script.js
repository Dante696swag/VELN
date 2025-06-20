const tg = window.Telegram.WebApp;
let userId = null;
let balance = 0;
let vcBalance = 0;
let inventory = [];
let coinsInterval = null;
let lastActiveTime = Date.now();
let tgUser = null;

// ИНИЦИАЛИЗАЦИЯ
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

// ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
async function loadUserData() {
    try {
        const response = await fetch(`https://Dante696swag.pythonanywhere.com/get_user?user_id=${userId}`);
        const data = await response.json();

        balance = typeof data.balance === 'number' ? data.balance : balance;
        vcBalance = typeof data.vcBalance === 'number' ? data.vcBalance : 0;
        inventory = Array.isArray(data.inventory) ? data.inventory : inventory;
        lastActiveTime = data.last_active ? data.last_active : Date.now();
        updateUI();
    } catch (e) {
        console.error("Ошибка загрузки данных:", e);
    }
}

// ТАЙМЕР МОНЕТ
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

// КРАСИВЫЙ МОДАЛ ВЫПАДЕНИЯ ПРЕДМЕТА
function showDropModal(item) {
    const modal = document.getElementById('drop-modal');
    const content = document.getElementById('drop-content');
    if (!item) return;
    let img = '';
    let name = '';
    let desc = '';
    // Если есть отдельное поле image -- используем картинку, иначе берем emoji из названия
    if (typeof item === 'object') {
        if (item.image && item.image.trim() !== '') {
            img = `<img src="${item.image}" alt="${item.name}" style="max-width:88px;max-height:88px;border-radius:13px;background:#23262f;margin-bottom:10px;">`;
        } else {
            img = `<span style="font-size:3rem;display:block;margin-bottom:10px;">${item.name ? item.name.split(' ')[0] : ''}</span>`;
        }
        name = item.name || '';
        desc = item.description ? `<div class="item-desc" style="margin-top:8px;font-size:1.06em;color:#b4bac8;">${item.description}</div>` : '';
    } else {
        name = item;
    }
    content.innerHTML = `
        <span class="drop-emoji">🎉</span>
        ${img}
        <div class="item-name">${name}</div>
        ${desc}
        <button class="drop-close" onclick="closeDropModal()">OK</button>
    `;
    modal.classList.add('active');
    setTimeout(() => {
        document.querySelector('.drop-close').focus();
    }, 100);
}
window.closeDropModal = function() {
    document.getElementById('drop-modal').classList.remove('active');
};

// ОТКРЫТИЕ КЕЙСА
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
            updateUI(result.item);
            showDropModal(result.item);
        } else {
            tg.showAlert(`⚠️ Ошибка: ${result.error || "Неизвестная ошибка"}`);
        }
    } catch (e) {
        console.error("Ошибка открытия кейса:", e);
        tg.showAlert("⚠️ Ошибка соединения с сервером");
    }
}

// ТОП ИГРОКОВ (с плавной анимацией)
async function showTop(animate = false) {
    try {
        const response = await fetch("https://Dante696swag.pythonanywhere.com/top_users");
        const data = await response.json();

        let html = '<h3>🏆 ТОП игроков</h3><ol style="margin:0;padding-left:1.3em;text-align:left">';
        for (const user of data) {
            let name = user.first_name || "";
            if (user.last_name) name += " " + user.last_name;
            if (user.username) name += ` (@${user.username})`;
            html += `<li style="margin-bottom:8px;"><strong>${name}</strong>: ${user.balance} очков, VC: ${user.vc_balance}</li>`;
        }
        html += '</ol>';

        const topListDiv = document.getElementById("top-list");
        topListDiv.innerHTML = html;
        if (animate) {
          topListDiv.classList.remove('visible');
          setTimeout(() => topListDiv.classList.add('visible'), 80);
        } else {
          topListDiv.classList.add('visible');
        }
    } catch (e) {
        tg.showAlert("⚠️ Не удалось получить топ игроков");
        console.error("Ошибка загрузки топа:", e);
    }
}
window.showTop = showTop;

// СОХРАНЕНИЕ НА СЕРВЕР
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
                vcBalance: vcBalance,
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

// СОБЫТИЯ
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

// ПРОДАТЬ ПРЕДМЕТ
window.sellItem = function(index) {
    if (typeof index !== "number" || index < 0 || index >= inventory.length) return;
    let item = inventory[index];
    let price = (typeof item === "object" && item.priceVC) ? item.priceVC : 10;
    inventory.splice(index, 1);
    vcBalance += price;
    saveToServer();
    updateUI();
};

// ОБНОВЛЕНИЕ UI (и анимация)
function updateUI(newDrop = null) {
    // Баланс
    const balanceEl = document.getElementById("balance");
    balanceEl.textContent = balance;
    // VC
    document.getElementById("vc-balance").textContent = vcBalance;

    document.querySelector(".btn-case").textContent =
        `🎁 Открыть кейс (${balance}/100)`;

    // Инвентарь с иконкой и названием
    const inventoryDiv = document.getElementById("inventory");
    if (inventory.length === 0) {
        inventoryDiv.innerHTML = "Ваш инвентарь пуст <span class=\"emoji\">😢</span>";
    } else {
        let itemsHtml = inventory.map((item, i) => {
            let isNew = newDrop && i === inventory.length - 1;
            let price = (typeof item === "object" && item.priceVC) ? item.priceVC : 10;
            let imgHtml = "", nameHtml = "", descHtml = "";
            if (typeof item === "object") {
                if (item.image && item.image.trim() !== '') {
                    imgHtml = `<img src="${item.image}" alt="${item.name}" class="item-image" style="width:32px;height:32px;vertical-align:middle;margin-right:8px;">`;
                } else {
                    imgHtml = `<span style="font-size:1.3em;margin-right:6px;vertical-align:middle;">${item.name ? item.name.split(' ')[0] : ''}</span>`;
                }
                nameHtml = `<span class="item-name">${item.name ? item.name.replace(/^./,'') : ''}</span>`;
                descHtml = item.description ? `<div class="item-desc" style="font-size:0.94em;color:#b4bac8;margin-top:4px;">${item.description}</div>` : "";
            } else {
                nameHtml = `<span class="item-name">${item}</span>`;
            }
            return `<div class="item${isNew ? " new-drop" : ""}" data-index="${i}">
                <div style="display:flex;align-items:center;gap:3px;">${imgHtml}${nameHtml}</div>
                ${descHtml}
                <button class="sell-btn" onclick="sellItem(${i})">Продать за ${price} VC</button>
            </div>`;
        }).join("");
        inventoryDiv.innerHTML = `<div class="item-list">${itemsHtml}</div>`;
        if (newDrop) {
            setTimeout(() => {
                let el = document.querySelector('#inventory .item.new-drop');
                if (el) el.classList.remove('new-drop');
            }, 1100);
            setTimeout(() => {
                let el = document.querySelector('#inventory .item.new-drop');
                if (el) el.classList.remove('new-drop');
            }, 1800);
            setTimeout(() => {
                inventoryDiv.scrollTo({top: inventoryDiv.scrollHeight, behavior: "smooth"});
            }, 400);
        }
    }
}

document.addEventListener("DOMContentLoaded", initApp);