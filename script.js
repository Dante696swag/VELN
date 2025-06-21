// === VELN script.js: современный, фиксированный, с бургер-меню, красивой кнопкой, AR только в меню, плавная работа вкладок и топа ===
const tg = window.Telegram.WebApp;
let userId = null;
let balance = 0;
let vcBalance = 0;
let inventory = [];
let coinsInterval = null;
let lastActiveTime = Date.now();
let tgUser = null;
let caseItemsPreview = null;
let userLevel = 1;
let userExp = 0;
let refLink = '';
let clanId = null;
let username = '';
let photo_url = '';
let topExp = 0;

// --- DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", () => {
    // Скрыть все вкладки по умолчанию (нет активной!)
    document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
    document.querySelectorAll(".veln-nav-btn").forEach(btn => btn.classList.remove("active"));

    // Основная навигация (инвентарь/топ)
    document.querySelectorAll('.veln-nav-btn').forEach(btn => {
        btn.onclick = () => {
            let tab = btn.getAttribute("data-tab");
            document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
            document.querySelectorAll(".veln-nav-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("tab-" + tab).classList.remove("hidden");
            if (tab === 'top') showTopTab(
                document.querySelector('.top-tab-btn.active')?.dataset.topTab || "balance"
            );
            if (tab === 'inventory') updateUI();
        }
    });

    // Вкладки внутри топа
    document.querySelectorAll(".top-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".top-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            if (btn.dataset.topTab === "balance") {
                document.getElementById("top-list-balance").classList.remove("hidden");
                document.getElementById("top-list-vc").classList.add("hidden");
                showTopTab("balance");
            } else {
                document.getElementById("top-list-vc").classList.remove("hidden");
                document.getElementById("top-list-balance").classList.add("hidden");
                showTopTab("vc");
            }
        });
    });

    // Красивая кнопка "Открыть кейс"
    document.getElementById("open-case-btn").onclick = () => showCasePreview();

    // Бургер-меню функционал
    document.getElementById("menu-btn").onclick = function() {
        document.getElementById("side-menu").classList.add("active");
        document.getElementById("side-menu-backdrop").style.display = "block";
    };
    document.getElementById("side-menu-backdrop").onclick = closeSideMenu;
    function closeSideMenu() {
        document.getElementById("side-menu").classList.remove("active");
        document.getElementById("side-menu-backdrop").style.display = "none";
    }
    window.closeSideMenu = closeSideMenu;

    // Боковое меню: вкладки + AR-режим
    document.querySelectorAll('#side-menu nav button').forEach(btn=>{
        btn.onclick = function() {
            // Если это AR-режим (у кнопки нет data-tab), просто показываем алерт
            if (btn.id === "ar-case-btn") {
                closeSideMenu();
                alert("AR-режим: откройте кейсы в дополненной реальности! (скоро)");
                return;
            }
            let tab = btn.getAttribute("data-tab");
            if(tab) {
                document.querySelectorAll(".tab-content").forEach(t=>t.classList.add("hidden"));
                document.getElementById("tab-"+tab).classList.remove("hidden");
                closeSideMenu();
                document.querySelectorAll('#side-menu nav button').forEach(b=>b.classList.remove("active"));
                btn.classList.add("active");
                if (tab === 'tasks') showDailyTasks();
                if (tab === 'achv') showAchievements();
                if (tab === 'market') showMarket();
                if (tab === 'trade') showTradeUI();
                if (tab === 'clan') showClanUI();
                if (tab === 'feed') showFeed();
            }
        }
    });

    // Sheet: предпросмотр кейса
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

    // Удаляем AR-кнопку из основной части, если вдруг осталась после старого шаблона
    let arBtnMain = document.getElementById("ar-case-btn");
    if (arBtnMain && !arBtnMain.closest('#side-menu')) arBtnMain.style.display = 'none';

    initApp();
});

// --- Профиль ---
function updateProfileInfo() {
    document.getElementById("profile-username").textContent = username ? '@'+username : '';
    document.getElementById("profile-level").textContent = userLevel;
    document.getElementById("profile-exp-bar").innerHTML = `<progress value="${userExp}" max="${userLevel*100}"></progress> <span>${userExp}/${userLevel*100}</span>`;
    if (photo_url)
        document.getElementById("profile-avatar").innerHTML = `<img src="${photo_url}" alt="ava" style="width:48px;border-radius:50%;">`;
    else
        document.getElementById("profile-avatar").innerHTML = `<div style="width:48px;height:48px;background:#23262f;border-radius:50%;"></div>`;
    // Реферал
    if (refLink)
        document.getElementById("profile-referral").innerHTML = `Реф.ссылка: <input readonly value="${refLink}" style="width:120px;" onclick="this.select()">`;
    else
        document.getElementById("profile-referral").innerHTML = '';
}

// --- Sheet/modal по умолчанию скрыт и появляется только по клику ---
function showCasePreview() {
    fetch("/case_items_preview")
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
    let html = `<div class="case-sheet-scroll"><table>
      <tr><th>Редкость</th><th>Название</th><th>Шанс</th></tr>`;
    for (const rarity of caseItemsPreview) {
        for (const item of rarity.items) {
            let icon = (item.name.match(/^([\u{1F300}-\u{1F6FF}])/u) || [])[0] || '';
            html += `<tr>
                <td style="color:${rarity.color || "#fff"}">${rarity.rarity}</td>
                <td>${icon} ${item.name.replace(icon, '').trim()}${item.is_nft ? ' <span class="nft-badge">NFT</span>' : ''}</td>
                <td>${rarity.chance}%</td>
            </tr>`;
        }
    }
    html += "</table></div>";
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

// --- Эффект выпадения предмета ---
function showDropModal(item) {
    const modal = document.getElementById('drop-modal');
    const content = document.getElementById('drop-content');
    if (!item) return;
    let name = item.name || '';
    let desc = item.description ? `<div class="item-desc">${item.description}</div>` : '';
    let nft = item.is_nft ? '<span class="nft-badge">NFT</span>' : '';
    content.innerHTML = `
        <div class="drop-pop-anime">
            <span class="drop-emoji">🎉</span>
            <div class="item-name">${name}${nft}</div>
            ${desc}
        </div>
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

// --- Инициализация приложения ---
async function initApp() {
    try {
        tg.ready?.();
        tg.expand?.();
        tgUser = tg.initDataUnsafe?.user;
        userId = tgUser?.id || '';
        username = tgUser?.username || '';
        photo_url = tgUser?.photo_url || '';
        refLink = window.location.origin + "/?ref=" + userId;
        if (!userId) {
            alert("❌ Ошибка авторизации");
            return;
        }
        await loadUserData();
        setupEventListeners();
        handleVisibilityChange();
        updateProfileInfo();
    } catch (e) {
        console.error("Ошибка инициализации:", e);
    }
}
async function loadUserData() {
    try {
        const response = await fetch(`/get_user?user_id=${userId}`);
        const data = await response.json();
        balance = typeof data.balance === 'number' ? data.balance : balance;
        vcBalance = typeof data.vcBalance === 'number' ? data.vcBalance : 0;
        inventory = Array.isArray(data.inventory) ? data.inventory : inventory;
        userLevel = data.level || 1;
        userExp = data.exp || 0;
        clanId = data.clan_id || null;
        updateUI();
        updateProfileInfo();
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
async function openCase() {
    if (balance < 100) {
        alert("❌ Нужно 100 очков!");
        return;
    }
    try {
        const response = await fetch("/open_case", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId })
        });
        const result = await response.json();
        if (result.success) {
            balance -= 100;
            inventory.push(result.item);
            // userLevel и userExp можно обновлять, если сервер их возвращает (если нет - не трогаем)
            await saveToServer();
            updateUI(result.item);
            showDropModal(result.item);
            updateProfileInfo();
        } else {
            alert(`⚠️ Ошибка: ${result.error || "Неизвестная ошибка"}`);
        }
    } catch (e) {
        console.error("Ошибка открытия кейса:", e);
        alert("⚠️ Ошибка соединения с сервером");
    }
}
async function showTopTab(tab = "balance") {
    try {
        const response = await fetch("/top_users");
        const data = await response.json();
        let html = '';
        if (tab === "vc") {
            let sorted = [...data].sort((a, b) => (b.vc_balance || 0) - (a.vc_balance || 0));
            html = sorted.slice(0, 10).map((user, idx) => `
              <li>
                <span class="top-rank">${idx+1}</span>
                <img class="top-ava" src="${user.photo_url || '#'}" alt="ava" onerror="this.style.display='none'">
                <span class="top-name">@${user.username || user.user_id}</span>
                <span class="top-vc">${user.vc_balance || 0} VC</span>
                <span class="top-lvl">LVL ${user.level || 1}</span>
              </li>`).join('');
            document.getElementById("top-list-vc").innerHTML = html;
        } else {
            let sorted = [...data].sort((a, b) => (b.balance || 0) - (a.balance || 0));
            html = sorted.slice(0, 10).map((user, idx) => `
              <li>
                <span class="top-rank">${idx+1}</span>
                <img class="top-ava" src="${user.photo_url || '#'}" alt="ava" onerror="this.style.display='none'">
                <span class="top-name">@${user.username || user.user_id}</span>
                <span class="top-score">${user.balance || 0}</span>
                <span class="top-lvl">LVL ${user.level || 1}</span>
              </li>`).join('');
            document.getElementById("top-list-balance").innerHTML = html;
        }
    } catch (e) {
        alert("⚠️ Не удалось получить топ игроков");
        console.error("Ошибка загрузки топа:", e);
    }
}
async function saveToServer() {
    try {
        await fetch("/save_data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId,
                balance: balance,
                inventory: inventory,
                last_active: lastActiveTime,
                vcBalance: vcBalance,
                level: userLevel,
                exp: userExp,
                username: username,
                photo_url: photo_url
            })
        });
    } catch (e) {
        console.error("Ошибка сохранения:", e);
    }
}
function setupEventListeners() {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    tg.onEvent?.('viewportChanged', (event) => {
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
    // Запрос на сервер для продажи
    let res = await fetch("/sell_item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, item_idx: index })
    });
    let data = await res.json();
    if (data.success) {
        inventory.splice(index, 1);
        vcBalance += price;
        updateUI();
        saveToServer();
    }
};
function updateUI(newDrop = null) {
    document.getElementById("balance").textContent = balance;
    document.getElementById("vc-balance").textContent = vcBalance;
    document.getElementById("current-balance").textContent = balance;
    const inventoryDiv = document.getElementById("inventory");
    inventoryDiv.className = "inventory-list" + (inventory.length === 0 ? " empty" : "");
    if (inventory.length === 0) {
        inventoryDiv.innerHTML = `<div class="inventory-empty">Ваш инвентарь пуст</div>`;
    } else {
        let itemsHtml = inventory.map((item, i) => {
            let nameHtml = "", descHtml = "", nftHtml = "";
            if (typeof item === "object") {
                nameHtml = `<span class="item-name">${item.name ? item.name : ''}${item.is_nft ? '<span class="nft-badge">NFT</span>' : ''}</span>`;
                descHtml = item.description ? `<div class="item-desc">${item.description}</div>` : "";
            } else {
                nameHtml = `<span class="item-name">${item}</span>`;
            }
            return `<div class="item" data-index="${i}">
                ${nameHtml}${descHtml}
                <button class="sell-btn" onclick="sellItem(${i})">Продать за ${item.priceVC || 10} VC</button>
            </div>`;
        }).join("");
        inventoryDiv.innerHTML = itemsHtml;
    }
}

// ==== Новые вкладки ====

// --- Ежедневные задания ---
async function showDailyTasks() {
  const resp = await fetch(`/daily_tasks?user_id=${userId}`);
  const data = await resp.json();
  if (!data.success) return;
  let html = data.tasks.map(t =>
    `<div class="daily-task${t.completed ? ' done' : ''}">
      <span>${t.desc}</span>
      <span>${t.progress || 0}/${t.target}</span>
      <span>+${t.reward} очков</span>
      ${!t.completed && (t.progress >= t.target) ? `<button onclick="completeTask('${t.task}')">Завершить</button>` : (t.completed ? '✅' : '')}
    </div>`
  ).join('');
  document.getElementById("daily-tasks").innerHTML = html;
}
window.completeTask = async function(task) {
  await fetch('/complete_task', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:userId,task})});
  showDailyTasks();
};

// --- Ачивки ---
async function showAchievements() {
  const resp = await fetch(`/achievements?user_id=${userId}`);
  const data = await resp.json();
  if (!data.success) return;
  let html = data.achievements.map(a =>
      `<div class="achv${a.unlocked ? ' unlocked' : ''}">
         <b>${a.desc}</b>
         ${a.unlocked ? '✅' : ''}
       </div>`
  ).join('');
  document.getElementById("achievements").innerHTML = html;
}

// --- Маркетплейс ---
async function showMarket() {
  const resp = await fetch('/market');
  const data = await resp.json();
  let html = data.map(entry =>
    `<div class="market-item">
      <span class="item-name">${entry.item.name || ''}${entry.item.is_nft ? '<span class="nft-badge">NFT</span>' : ''}</span>
      <span class="item-desc">${entry.item.description||''}</span>
      <span class="market-price">${entry.price} VC</span>
      <button onclick="buyMarketItem(${entry.id})">Купить</button>
    </div>`
  ).join('');
  document.getElementById("market-list").innerHTML = html;
}
window.buyMarketItem = async function(marketId) {
    const resp = await fetch('/market/buy', {
        method: "POST",
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({buyer_id:userId,market_id:marketId})
    });
    const data = await resp.json();
    if (data.success) {
        alert("✅ Покупка успешна!");
        await loadUserData();
        showMarket();
    } else {
        alert("Ошибка покупки: " + (data.error || ''));
    }
};

// --- Обмен предметами (peer-to-peer, демо) ---
async function showTradeUI() {
    document.getElementById("trade-ui").innerHTML =
      `<div>Введите ID пользователя для обмена:<br>
      <input id="trade-user-id" placeholder="user_id">
      <div>Ваши предметы:<br>${inventory.map((item,i)=>`${i+1}: ${item.name||''}`).join('<br>')}</div>
      <input id="trade-item-idx" placeholder="Ваш предмет #">
      <input id="trade-offer-idx" placeholder="Его предмет #">
      <button onclick="doTrade()">Обменяться</button>
      </div>
      <div id="trade-result"></div>`;
}
window.doTrade = async function() {
    let to_id = document.getElementById("trade-user-id").value.trim();
    let item_idx = parseInt(document.getElementById("trade-item-idx").value)-1;
    let offer_idx = parseInt(document.getElementById("trade-offer-idx").value)-1;
    let resp = await fetch('/trade_offer',{
        method:"POST",
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({from_id:userId,to_id:item_idx>=0?to_id:'',item_idx,offer_item_idx:offer_idx})
    });
    let data = await resp.json();
    document.getElementById("trade-result").innerHTML = data.success ? "✅ Обмен успешно!" : "❌ Ошибка обмена";
    await loadUserData();
};

// --- Кланы ---
async function showClanUI() {
    let html = '';
    if (clanId) {
        let resp = await fetch(`/clan/members?clan_id=${clanId}`);
        let members = await resp.json();
        html = `<div>Ваш клан #${clanId}. Участники:<br>${members.map(m=>`<span>${m}</span>`).join(', ')}</div>`;
    } else {
        html = `<div>Вы не в клане.<br>
        <button onclick="createClan()">Создать клан</button>
        <input id="join-clan-id" placeholder="ID клана">
        <button onclick="joinClan()">Вступить</button>
        </div>`;
    }
    document.getElementById("clan-ui").innerHTML = html;
}
window.createClan = async function() {
    let name = prompt("Название клана?");
    if (!name) return;
    let resp = await fetch('/clan/create', {
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({name,owner_id:userId})
    });
    let data = await resp.json();
    if (data.success) {
        clanId = data.clan_id;
        showClanUI();
    }
};
window.joinClan = async function() {
    let clan_id = document.getElementById("join-clan-id").value;
    if (!clan_id) return;
    let resp = await fetch('/clan/join', {
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({clan_id,user_id:userId})
    });
    let data = await resp.json();
    if (data.success) {
        clanId = clan_id;
        showClanUI();
    }
};

// --- Лента событий ---
async function showFeed() {
    const resp = await fetch('/feed');
    const data = await resp.json();
    let html = data.map(entry =>
        `<div class="feed-item">
            <span class="feed-user">@${entry.user_id}</span>
            <span class="feed-event">${entry.event}</span>
            <span class="feed-time">${(new Date(entry.ts*1000)).toLocaleString()}</span>
        </div>`
    ).join('');
    document.getElementById("feed-list").innerHTML = html;
}