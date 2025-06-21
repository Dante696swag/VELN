const tg = window.Telegram.WebApp;
let userId = null;
let balance = 0;
let vcBalance = 0;
let inventory = [];
let coinsInterval = null;
let lastActiveTime = Date.now();
let tgUser = null;
let caseItemsPreview = null;

// --- Управление вкладками (по умолчанию скрыты, по клику показываются/скрываются) ---
document.addEventListener("DOMContentLoaded", () => {
    let activeTab = null;
    const tabBtns = document.querySelectorAll(".veln-nav-btn");
    tabBtns.forEach(btn => btn.addEventListener("click", () => {
        if (activeTab === btn.dataset.tab) {
            // Скрыть вкладку если она уже активна
            btn.classList.remove("active");
            document.getElementById("tab-inventory").classList.add("hidden");
            document.getElementById("tab-top").classList.add("hidden");
            activeTab = null;
            return;
        }
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("tab-inventory").classList.add("hidden");
        document.getElementById("tab-top").classList.add("hidden");
        if (btn.dataset.tab === "inventory") {
            document.getElementById("tab-inventory").classList.remove("hidden");
        }
        if (btn.dataset.tab === "top") {
            document.getElementById("tab-top").classList.remove("hidden");
            showTopTab();
        }
        activeTab = btn.dataset.tab;
    }));
    // Табы топа
    document.querySelectorAll(".top-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".top-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            showTopTab(btn.dataset.topTab);
        });
    });
    // По умолчанию все вкладки скрыты
    document.getElementById("tab-inventory").classList.add("hidden");
    document.getElementById("tab-top").classList.add("hidden");
    // sheet-свайп: backdrop
    document.getElementById("sheet-backdrop").onclick = hideCasePreview;
    document.getElementById("case-preview-close").onclick = hideCasePreview;
    // swipe down to close (на мобильных)
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

// --- Предпросмотр кейса снизу как sheet ---
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

// КРАСИВАЯ МОДАЛКА ВЫПАДЕНИЯ ПРЕДМЕТА
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

// ТОП ИГРОКОВ (с поддержкой табов)
async function showTopTab(tab = "balance") {
    try {
        const response = await fetch("https://Dante696swag.pythonanywhere.com/top_users");
        const data = await response.json();

        let html = '';
        if (tab === "vc") {
            html += '<h3>🏆 ТОП VC coin</h3><ol style="margin:0;padding-left:1.3em;text-align:left">';
            let sorted = [...data].sort((a, b) => (b.vc_balance || 0) - (a.vc_balance || 0));
            for (const user of sorted.slice(0, 10)) {
                html += `<li style="margin-bottom:8px;">
                  <img src="${user.photo_url || 'https://t.me/i/userpic/320/' + (user.username || '') + '.jpg'}" alt="avatar" onerror="this.style.display='none'">
                  <strong>@${user.username || user.user_id}</strong>
                  <span style="color:#ffd700;font-weight:700;margin-left:7px;">${user.vc_balance || 0} VC</span>
                </li>`;
            }
            html += '</ol>';
        } else {
            html += '<h3>🏆 ТОП по очкам</h3><ol style="margin:0;padding-left:1.3em;text-align:left">';
            let sorted = [...data].sort((a, b) => (b.balance || 0) - (a.balance || 0));
            for (const user of sorted.slice(0, 10)) {
                html += `<li style="margin-bottom:8px;">
                  <img src="${user.photo_url || 'https://t.me/i/userpic/320/' + (user.username || '') + '.jpg'}" alt="avatar" onerror="this.style.display='none'">
                  <strong>@${user.username || user.user_id}</strong>
                  <span style="color:#36a2ff;font-weight:700;margin-left:7px;">${user.balance || 0}</span>
                </li>`;
            }
            html += '</ol>';
        }

        const topListDiv = document.getElementById("top-list");
        topListDiv.innerHTML = html;
        topListDiv.classList.add('visible');
    } catch (e) {
        tg.showAlert("⚠️ Не удалось получить топ игроков");
        console.error("Ошибка загрузки топа:", e);
    }
}

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
    // Баланс очков
    const balanceEl = document.getElementById("balance");
    balanceEl.textContent = balance;
    // VC COIN
    document.getElementById("vc-balance").textContent = vcBalance;

    // Инвентарь с иконками и названиями
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