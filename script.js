const tg = window.Telegram.WebApp;
let userId = null;
let balance = 0;
let vcBalance = 0;
let inventory = [];
let coinsInterval = null;
let lastActiveTime = Date.now();
let tgUser = null;
let caseItemsPreview = null;

// Навигация, только одна вкладка видна, остальные скрыты
document.addEventListener("DOMContentLoaded", () => {
    let activeTab = null;
    const tabBtns = document.querySelectorAll(".veln-nav-btn");
    tabBtns.forEach(btn => btn.addEventListener("click", () => {
        if (activeTab === btn.dataset.tab) {
            btn.classList.remove("active");
            document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
            activeTab = null;
            return;
        }
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
        if (btn.dataset.tab === "inventory") {
            document.getElementById("tab-inventory").classList.remove("hidden");
        }
        if (btn.dataset.tab === "top-balance") {
            document.getElementById("tab-top-balance").classList.remove("hidden");
            showTopList("balance");
        }
        if (btn.dataset.tab === "top-vc") {
            document.getElementById("tab-top-vc").classList.remove("hidden");
            showTopList("vc");
        }
        activeTab = btn.dataset.tab;
    }));
    document.getElementById("sheet-backdrop").onclick = hideCasePreview;
    document.getElementById("case-preview-close").onclick = hideCasePreview;
    let startY = null;
    document.getElementById("case-preview-sheet").addEventListener("touchstart", e => {
        startY = e.touches[0].clientY;
    });
    document.getElementById("case-preview-sheet").addEventListener("touchmove", e => {
        if (!startY) return;
        let dy = e.touches[0].clientY - startY;
        if (dy > 50) hideCasePreview();
    });
    initApp();
});

// Кейсы sheet
function showCasePreview() {
    fetch("https://Dante696swag.pythonanywhere.com/case_items_preview")
        .then(r => r.json()).then(data => {
            if (data.success && data.case_items) {
                caseItemsPreview = data.case_items;
            }
            renderCasePreviewSheet();
        }).catch(() => renderCasePreviewSheet());
}
function renderCasePreviewSheet() {
    const sheet = document.getElementById("case-preview-sheet");
    const tableDiv = document.getElementById("case-preview-table");
    if (!caseItemsPreview) return;
    let html = `<table>
      <tr><th>Редкость</th><th>Название</th><th>Шанс</th></tr>`;
    for (const rarity of caseItemsPreview) {
        for (const item of rarity.items) {
            html += `<tr>
                <td style="color:${rarity.color || "#fff"}">${rarity.rarity}</td>
                <td>${item.name}</td>
                <td>${rarity.chance}%</td>
            </tr>`;
        }
    }
    html += "</table>";
    tableDiv.innerHTML = html;
    document.getElementById("sheet-backdrop").classList.add("active");
    sheet.classList.add("active");
    document.getElementById("case-preview-open").onclick = function() {
        hideCasePreview();
        openCase();
    };
}
function hideCasePreview() {
    document.getElementById("case-preview-sheet").classList.remove("active");
    document.getElementById("sheet-backdrop").classList.remove("active");
}

// Основная логика
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
    coinsInterval = setInterval(() => {
        if (!document.hidden) {
            balance += 1;
            lastActiveTime = Date.now();
            updateUI();
            if (balance % 10 === 0) {
                saveToServer();
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
    let desc = '';
    if (typeof item === 'object') {
        if (item.image && item.image.trim() !== '') {
            img = `<img src="${item.image}" alt="${item.name}">`;
        } else {
            img = `<span style="font-size:4rem;display:block;margin-bottom:10px;">${item.name ? item.name.split(' ')[0] : ''}</span>`;
        }
        name = item.name || '';
        desc = item.description ? `<div class="item-desc">${item.description}</div>` : '';
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
async function showTopList(type = "balance") {
    try {
        const response = await fetch("https://Dante696swag.pythonanywhere.com/top_users");
        const data = await response.json();
        let html = '';
        if (type === "vc") {
            let sorted = [...data].sort((a, b) => (b.vc_balance || 0) - (a.vc_balance || 0));
            html = sorted.slice(0, 10).map((user, idx) => `
              <li>
                <span class="top-rank">${idx+1}</span>
                <img class="top-ava" src="${user.photo_url || 'https://t.me/i/userpic/320/' + (user.username || '') + '.jpg'}" alt="ava" onerror="this.style.display='none'">
                <span class="top-name">@${user.username || user.user_id}</span>
                <span class="top-vc">${user.vc_balance || 0} VC</span>
              </li>`).join('');
            document.getElementById("top-list-vc").innerHTML = html;
        } else {
            let sorted = [...data].sort((a, b) => (b.balance || 0) - (a.balance || 0));
            html = sorted.slice(0, 10).map((user, idx) => `
              <li>
                <span class="top-rank">${idx+1}</span>
                <img class="top-ava" src="${user.photo_url || 'https://t.me/i/userpic/320/' + (user.username || '') + '.jpg'}" alt="ava" onerror="this.style.display='none'">
                <span class="top-name">@${user.username || user.user_id}</span>
                <span class="top-score">${user.balance || 0}</span>
              </li>`).join('');
            document.getElementById("top-list-balance").innerHTML = html;
        }
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
window.sellItem = function(index) {
    if (typeof index !== "number" || index < 0 || index >= inventory.length) return;
    let item = inventory[index];
    let price = (typeof item === "object" && item.priceVC) ? item.priceVC : 10;
    inventory.splice(index, 1);
    vcBalance += price;
    saveToServer();
    updateUI();
};
function updateUI(newDrop = null) {
    document.getElementById("balance").textContent = balance;
    document.getElementById("vc-balance").textContent = vcBalance;
    // Инвентарь
    const inventoryDiv = document.getElementById("inventory");
    inventoryDiv.className = "inventory-list" + (inventory.length === 0 ? " empty" : "");
    if (inventory.length === 0) {
        inventoryDiv.innerHTML = `<div class="inventory-empty">Ваш инвентарь пуст</div>`;
    } else {
        let itemsHtml = inventory.map((item, i) => {
            let isNew = newDrop && i === inventory.length - 1;
            let price = (typeof item === "object" && item.priceVC) ? item.priceVC : 10;
            let imgHtml = "", nameHtml = "", descHtml = "";
            if (typeof item === "object") {
                if (item.image && item.image.trim() !== '') {
                    imgHtml = `<img src="${item.image}" alt="${item.name}" class="item-image">`;
                } else {
                    imgHtml = `<span style="font-size:2.1em;display:block;">${item.name ? item.name.split(' ')[0] : ''}</span>`;
                }
                nameHtml = `<span class="item-name">${item.name ? item.name.replace(/^./,'') : ''}</span>`;
                descHtml = item.description ? `<div class="item-desc">${item.description}</div>` : "";
            } else {
                nameHtml = `<span class="item-name">${item}</span>`;
            }
            return `<div class="item${isNew ? " new-drop" : ""}" data-index="${i}">
                ${imgHtml}${nameHtml}${descHtml}
                <button class="sell-btn" onclick="sellItem(${i})">Продать за ${price} VC</button>
            </div>`;
        }).join("");
        inventoryDiv.innerHTML = itemsHtml;
    }
}