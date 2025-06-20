const tg = window.Telegram.WebApp;
let userId = null;
let balance = 0;
let vcBalance = 0;
let inventory = [];
let coinsInterval = null;
let lastActiveTime = Date.now();
let tgUser = null;

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
        vcBalance = typeof data.vcBalance === 'number' ? data.vcBalance : 0;
        inventory = Array.isArray(data.inventory) ? data.inventory : inventory;
        lastActiveTime = data.last_active ? data.last_active : Date.now();
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

function showDropModal(item) {
    const modal = document.getElementById('drop-modal');
    const content = document.getElementById('drop-content');
    if (!item) return;
    let img = '';
    let name = '';
    if (typeof item === 'object') {
        img = item.image ? `<img src="${item.image}" alt="${item.name}">` : '';
        name = item.name || '';
    } else { name = item; }
    content.innerHTML = `
        <span class="drop-emoji">🎉</span>
        ${img}
        <div class="item-name">${name}</div>
        <button class="drop-close" onclick="closeDropModal()">OK</button>
    `;
    modal.classList.add('active');
    setTimeout(() => { document.querySelector('.drop-close').focus(); }, 100);
}
window.closeDropModal = function() {
    document.getElementById('drop-modal').classList.remove('active');
};

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

async function showTop(animate = false) {
    try {
        const response = await fetch("https://Dante696swag.pythonanywhere.com/top_users");
        const data = await response.json();
        let html = '<h3>🏆 ТОП игроков</h3><ol style="margin:0;padding-left:1.3em;text-align:left">';
        for (const user of data) {
            let name = user.first_name || "";
            if (user.last_name) name += " " + user.last_name;
            if (user.username) name += ` (@${user.username})`;
            let avatar = user.photo_url
                ? `<img src="${user.photo_url}" alt="avatar">`
                : '';
            html += `<li style="margin-bottom:8px;">${avatar}<strong>${name}</strong>: ${user.balance} очков</li>`;
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

window.sellItem = async function(index) {
    if (typeof index !== "number" || index < 0 || index >= inventory.length) return;
    let item = inventory[index];
    let price = (typeof item === "object" && item.priceVC) ? item.priceVC : 10;
    inventory.splice(index, 1);
    vcBalance += price;
    await saveToServer();
    updateUI();
};

function updateUI(newDrop = null) {
    const balanceEl = document.getElementById("balance");
    if (balanceEl.textContent != balance) {
        balanceEl.textContent = balance;
        balanceEl.classList.add("balance-animate");
        setTimeout(() => balanceEl.classList.remove("balance-animate"), 500);
    } else {
        balanceEl.textContent = balance;
    }
    document.getElementById("vc-balance").textContent = vcBalance;
    const caseBtn = document.querySelector(".btn-case");
    if(caseBtn) caseBtn.textContent = `🎁 Открыть кейс (${balance}/100)`;
    const inventoryDiv = document.getElementById("inventory");
    if (inventory.length === 0) {
        inventoryDiv.innerHTML = "Ваш инвентарь пуст <span class=\"emoji\">😢</span>";
    } else {
        let itemsHtml = inventory.map((item, i) => {
            let isNew = newDrop && i === inventory.length - 1;
            let price = (typeof item === "object" && item.priceVC) ? item.priceVC : 10;
            let imgHtml = "", nameHtml = "";
            if (typeof item === "object") {
                imgHtml = item.image ? `<img src="${item.image}" alt="${item.name}" class="item-image">` : "";
                nameHtml = `<span class="item-name">${item.name || ''}</span>`;
            } else {
                nameHtml = `<span class="item-name">${item}</span>`;
            }
            return `<div class="item${isNew ? " new-drop" : ""}" data-index="${i}">
                ${imgHtml}
                ${nameHtml}
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
let inventoryOpened = true;

function toggleInventory() {
    inventoryOpened = !inventoryOpened;
    const tab = document.getElementById('tab-inventory');
    if (inventoryOpened) {
        tab.classList.remove('hidden');
        document.querySelector('.veln-nav-btn[data-tab="inventory"]').classList.add('active');
        document.getElementById('sidebar-inventory').classList.add('active');
    } else {
        tab.classList.add('hidden');
        document.querySelector('.veln-nav-btn[data-tab="inventory"]').classList.remove('active');
        document.getElementById('sidebar-inventory').classList.remove('active');
    }
}

function showTab(tab) {
    if (tab === 'inventory') {
        toggleInventory();
        return;
    }
    document.getElementById('tab-inventory').classList.add('hidden');
    document.getElementById('tab-top').classList.add('hidden');
    if (tab === 'top') {
        document.getElementById('tab-top').classList.remove('hidden');
        setTimeout(() => {
            if (typeof window.showTop === "function") window.showTop(true);
        }, 100);
        inventoryOpened = false;
    }
    document.querySelectorAll('.veln-nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
    if (tab === 'inventory') {
        document.querySelector('.veln-nav-btn[data-tab="inventory"]').classList.add('active');
        document.getElementById('sidebar-inventory').classList.add('active');
    } else if (tab === 'top') {
        document.querySelector('.veln-nav-btn[data-tab="top"]').classList.add('active');
        document.getElementById('sidebar-top').classList.add('active');
    }
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelector('.veln-nav-btn[data-tab="inventory"]').onclick = toggleInventory;
    document.getElementById('sidebar-inventory').onclick = toggleInventory;
    document.querySelector('.veln-nav-btn[data-tab="top"]').onclick = () => showTab('top');
    document.getElementById('sidebar-top').onclick = () => showTab('top');
    showTab('inventory');
});