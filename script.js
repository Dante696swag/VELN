// ========== КОНФИГ ==========
const ITEMS = [
  // Обычные (70%)
  { name: "Кружка", desc: "Белая кружка", ico: "☕", rarity: "common", priceVC: 2 },
  { name: "Пластиковый стакан", desc: "Лёгкий", ico: "🥤", rarity: "common", priceVC: 2 },
  { name: "Ложка", desc: "Маленькая ложка", ico: "🥄", rarity: "common", priceVC: 2 },
  { name: "Конфета", desc: "Сладкая награда", ico: "🍬", rarity: "common", priceVC: 2 },
  { name: "Лимонная тарелка", desc: "Летнее настроение", ico: "🍋", rarity: "common", priceVC: 2 },
  { name: "Стакан молока", desc: "Для молока", ico: "🥛", rarity: "common", priceVC: 2 },
  { name: "Пончик", desc: "С дыркой", ico: "🍩", rarity: "common", priceVC: 2 },
  { name: "Печенье", desc: "Хрустящее", ico: "🍪", rarity: "common", priceVC: 2 },
  { name: "Стаканчик", desc: "На вынос", ico: "🧃", rarity: "common", priceVC: 2 },
  { name: "Блюдце", desc: "Для чая", ico: "🍶", rarity: "common", priceVC: 2 },
  { name: "Мороженое", desc: "Охладись", ico: "🍨", rarity: "common", priceVC: 2 },
  { name: "Кекс", desc: "Сладкий", ico: "🧁", rarity: "common", priceVC: 2 },
  { name: "Бейгл", desc: "Традиция", ico: "🥯", rarity: "common", priceVC: 2 },
  { name: "Вилка", desc: "Не для супа", ico: "🍴", rarity: "common", priceVC: 2 },
  { name: "Зёрна кофе", desc: "Вари!", ico: "☕️", rarity: "common", priceVC: 2 },
  { name: "Стопка", desc: "Ничего особенного", ico: "🥃", rarity: "common", priceVC: 2 },
  { name: "Салфетка", desc: "Для чистоты", ico: "🧻", rarity: "common", priceVC: 2 },
  { name: "Пластинка", desc: "Включи музыку", ico: "💿", rarity: "common", priceVC: 2 },
  { name: "Зефир", desc: "Мягкий", ico: "🍡", rarity: "common", priceVC: 2 },
  { name: "Ромашковый чай", desc: "Успокойся", ico: "🌼", rarity: "common", priceVC: 2 },
  { name: "Сахар", desc: "Сделай слаще", ico: "🧂", rarity: "common", priceVC: 2 },
  // Редкие (20%)
  { name: "Рейв-кружка", desc: "Светится в темноте", ico: "✨", rarity: "rare", priceVC: 5 },
  { name: "Мини-бар", desc: "Твой бар", ico: "🍸", rarity: "rare", priceVC: 5 },
  { name: "Мраморная тарелка", desc: "Люкс", ico: "🍽️", rarity: "rare", priceVC: 5 },
  { name: "Pop Art кружка", desc: "Для творческих", ico: "🎨", rarity: "rare", priceVC: 5 },
  { name: "Геймерская кружка", desc: "Для игр", ico: "🎮", rarity: "rare", priceVC: 5 },
  { name: "Праздничный бокал", desc: "Праздник", ico: "🥂", rarity: "rare", priceVC: 5 },
  // Эпические (8%)
  { name: "Фиолетовый кубок", desc: "Чемпион", ico: "🏆", rarity: "epic", priceVC: 15 },
  { name: "Космическая кружка", desc: "Из космоса", ico: "🪐", rarity: "epic", priceVC: 15 },
  { name: "Глитч-шот", desc: "Сломай систему", ico: "⚡", rarity: "epic", priceVC: 15 },
  { name: "Эксклюзивный чайник", desc: "Очень редкий", ico: "🫖", rarity: "epic", priceVC: 15 },
  // Легендарные (1.5%)
  { name: "Мега-кружка", desc: "Всё влезет", ico: "🚗", rarity: "legendary", priceVC: 30 },
  { name: "Золотая кружка", desc: "Сияет", ico: "🌟", rarity: "legendary", priceVC: 30 },
  // NFT (0.5%)
  { name: "NFT: Кибер Кот", desc: "NFT котик", ico: "😺", rarity: "nft", priceVC: 100 },
  { name: "NFT: Энергия Grok", desc: "NFT Grok", ico: "🔮", rarity: "nft", priceVC: 100 }
];
const RARITY_CHANCES = [
  { rarity: "nft", chance: 0.5 },
  { rarity: "legendary", chance: 1.5 },
  { rarity: "epic", chance: 8 },
  { rarity: "rare", chance: 20 },
  { rarity: "common", chance: 70 }
];
const RARITY_LABEL = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпический",
  legendary: "Легендарный",
  nft: "NFT"
};
const RARITY_COLOR = {
  common: "#b9c8f9",
  rare: "#38ffda",
  epic: "#bc78ff",
  legendary: "#ffd700",
  nft: "#00ffd0"
};

// ========== СОСТОЯНИЕ ==========
let inventory = [];
let balancePoints = 0;
let balanceCoins = 0;
let topPlayers = [];
let caseDropsHistory = [];

// ========== API ==========
const USER_ID = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || "demo-user";
async function apiGetUser() {
  const res = await fetch(`/get_user?user_id=${USER_ID}`);
  return await res.json();
}
async function apiSaveUser() {
  await fetch('/save_data', {
    method: "POST",
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      user_id: USER_ID,
      balance: balancePoints,
      vcBalance: balanceCoins,
      inventory,
      last_active: Math.floor(Date.now()/1000)
    })
  });
}
async function apiOpenCase(itemIdx) {
  // itemIdx — тот, что выпал на рулетке
  const res = await fetch('/open_case', {
    method: "POST",
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({user_id: USER_ID, item_idx: itemIdx})
  });
  return await res.json();
}
async function apiSellItem(idx) {
  const res = await fetch('/sell_item', {
    method: "POST",
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({user_id: USER_ID, item_idx: idx})
  });
  return await res.json();
}
async function apiTop() {
  const res = await fetch('/top_users');
  return await res.json();
}

// ========== DOM ==========
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
const upgradeModal = document.getElementById('upgrade-modal');
const upgradeCircle = document.getElementById('upgrade-circle');
const upgradeChance = document.getElementById('upgrade-chance');
const upgradeChanceLabel = document.getElementById('upgrade-chance-label');
const upgradeSpinBtn = document.getElementById('upgrade-spin-btn');
const upgradeResult = document.getElementById('upgrade-result');
const closeUpgradeBtn = document.getElementById('close-upgrade-btn');

// ========== НАВИГАЦИЯ ==========
sidebarBtns.forEach(btn => {
  btn.onclick = () => {
    sidebarBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    Object.values(panels).forEach(p=>p.classList.remove('active'));
    const page = btn.dataset.page;
    panels[page].classList.add('active');
    if(page==='inventory') renderInventory();
    if(page==='opencase') renderCase();
    if(page==='addpoint') renderAddPoint();
    if(page==='topplayers') renderTop();
    if(page==='upgrade') renderUpgrade();
  }
});

// ========== БАЛАНСЫ ==========
function updateBalances() {
  balancePointsEl.textContent = balancePoints;
  balanceCoinsEl.textContent = balanceCoins;
  let b2 = document.getElementById('balancePoints2');
  let c2 = document.getElementById('balanceCoins2');
  if(b2) b2.textContent = balancePoints;
  if(c2) c2.textContent = balanceCoins;
}

// ========== ИНВЕНТАРЬ ==========
function renderInventory() {
  let html = '<div class="grok-menu-list"></div>';
  if (inventory.length === 0) {
    html += `<div class="grok-inventory-empty">Нет предметов<br>
      <div style="opacity:.7;font-size:.97em;margin-top:1.1em;">Подсказка: продавайте ненужные предметы за VELN COIN и пробуйте апгрейды!</div>
      <div style="margin-top:1.8em;opacity:.33;font-size:1.6em;">🎁</div>
      <div style="margin-top:1.8em;opacity:.33;font-size:.96em;">Получайте предметы из кейсов!</div>
    </div>`;
  } else {
    html += `<div class="grok-inventory-grid">` +
      inventory.map((it,i)=>`
        <div class="grok-item-card">
          <div class="grok-item-ico">${it.ico}</div>
          <div class="grok-item-name">${it.name}</div>
          <div class="grok-item-desc">${it.desc}</div>
          <div style="font-size:.88em;color:${RARITY_COLOR[it.rarity]};font-weight:700;">${RARITY_LABEL[it.rarity]}</div>
          <button class="grok-item-sell" data-i="${i}">Продать за ${it.priceVC} VELN COIN</button>
        </div>
      `).join('') + `</div>
      <div style="margin-top:1.7em;text-align:center;opacity:.75;font-size:.96em;">
        <b>Совет:</b> Пробуйте апгрейд обычных предметов до легендарных!
      </div>`;
  }
  panels.inventory.innerHTML = html;
  panels.inventory.querySelectorAll('.grok-item-sell').forEach(btn=>{
    btn.onclick = async function() {
      const idx = +btn.dataset.i;
      let res = await apiSellItem(idx);
      if(res.success) {
        balanceCoins = res.vcBalance;
        inventory.splice(idx, 1);
        updateBalances();
        renderInventory();
      }
    };
  });
}

// ========== КЕЙС ==========
function renderCase() {
  panels.opencase.innerHTML = `
    <div style="text-align:center;margin:2em 0 .7em 0;color:#b76bfd;font-size:1.15em;font-weight:700;">
      Открой кейс! NFT: 0.5%, Легендарный: 1.5%, Эпический: 8%, Редкий: 20%, Обычный: 70%
    </div>
    <button class="grok-case-spin-btn" id="open-case-ui-btn">Открыть кейс<br><span style="font-size:.7em;font-weight:400;">100 очков / 10 VC</span></button>
    <div style="margin-top:1.1em;font-size:1.1em;">
      <span style="color:#4eafff;font-weight:700;">Очки:</span> <span id="balancePoints2">${balancePoints}</span> &nbsp; | &nbsp; <span style="color:#ed75ff;font-weight:700;">VELN COIN:</span> <span id="balanceCoins2">${balanceCoins}</span>
    </div>
    <div style="margin-top:2.1em;opacity:.54;font-size:.97em;text-align:center;">
      <b>История:</b><br><span id="case-history"></span>
    </div>
  `;
  document.getElementById('balancePoints2').textContent = balancePoints;
  document.getElementById('balanceCoins2').textContent = balanceCoins;
  document.getElementById('open-case-ui-btn').onclick = async () => {
    if(balancePoints>=100) {
      balancePoints -= 100;
    } else if(balanceCoins>=10) {
      balanceCoins -= 10;
    } else {
      alert("Недостаточно очков или монет!");
      return;
    }
    updateBalances();
    await apiSaveUser();
    showCaseModal();
  };
  document.getElementById('case-history').innerHTML = caseDropsHistory.slice(-7).map(
    x=>`<span style="color:${RARITY_COLOR[x.rarity]};font-weight:700;">${x.name}</span>`
  ).join(' <span style="opacity:.5;">|</span> ');
}
closeCaseBtn.onclick = () => { caseModal.classList.remove('active'); };

// ========== РУЛЕТКА ==========
function showCaseModal() {
  caseModal.classList.add('active');
  drawRoulette();
  caseResult.innerHTML = '';
}
function drawRoulette() {
  // 30 предметов по шансам, заранее выбираем победный индекс — всегда центральный
  let items = [];
  for(let i=0;i<30;i++){
    let r = Math.random()*100, rarity = "common";
    let border = 0;
    for(let rc of RARITY_CHANCES){
      border += rc.chance;
      if(r<border) { rarity=rc.rarity; break; }
    }
    let pool = ITEMS.filter(x=>x.rarity===rarity);
    let it = pool[Math.floor(Math.random()*pool.length)];
    items.push(it);
  }
  // Победный индекс — центральный
  const visible = 4;
  const itemWidth = 64;
  const winnerIdx = Math.floor(items.length/2);
  rouletteStrip.innerHTML = items.map(
    (it,j)=>`<div class="grok-roulette-item" style="color:${RARITY_COLOR[it.rarity]};" data-name="${it.name}" data-rarity="${it.rarity}">${it.ico}<div style="font-size:.65em;margin-top:.2em;">${it.name}</div></div>`
  ).join('');
  rouletteStrip.style.transform = "translateX(0px)";
  Array.from(rouletteStrip.children).forEach(e=>e.classList.remove("active"));
  spinBtn.disabled = false;
  spinBtn.onclick = () => spinRoulette(items, winnerIdx, itemWidth, visible);
}
function spinRoulette(items, winnerIdx, itemWidth, visible) {
  spinBtn.disabled = true; caseResult.innerHTML = '';
  const offset = (visible*itemWidth)/2 - itemWidth/2;
  const targetX = -(winnerIdx*itemWidth) + offset;
  rouletteStrip.style.transition = "transform 3s cubic-bezier(.23,1.2,.52,1)";
  rouletteStrip.style.transform = `translateX(${targetX}px)`;
  Array.from(rouletteStrip.children).forEach(e=>e.classList.remove("active"));
  setTimeout(async ()=>{
    Array.from(rouletteStrip.children)[winnerIdx].classList.add("active");
    document.getElementById('roulette-pointer').classList.add('pointer-flash');
    setTimeout(()=>document.getElementById('roulette-pointer').classList.remove('pointer-flash'),700);
    const win = items[winnerIdx];
    // Сохраняем выигрыш
    inventory.push(win);
    caseDropsHistory.push({name: win.name, rarity: win.rarity});
    await apiSaveUser();
    updateBalances();
    renderInventory();
    caseResult.innerHTML = `<div style="font-size:1.05em;margin-top:.4em;">Вам выпало:</div>
    <span style="color:${RARITY_COLOR[win.rarity]};font-weight:900;font-size:1.25em;">${win.ico} ${win.name}</span><br>
    <span style="font-size:.92em;opacity:.8;">${win.desc}</span>`;
    spinBtn.disabled = false;
    drawRoulette();
    renderCase();
  }, 3000);
}

// ========== ФАРМ ==========
function renderAddPoint() {
  panels.addpoint.innerHTML = `
    <div style="margin-top:2em;display:flex;flex-direction:column;align-items:center;">
      <div style="font-size:2em;font-weight:900;color:var(--grok-neon);margin-bottom:0.8em;">
        Очки: <span id="current-points">${balancePoints}</span>
      </div>
      <button id="btn-addpoint" style="background:linear-gradient(90deg,#4eafff 60%,#ed75ff 100%);color:#181a35;
        font-size:1.13em;font-weight:900;border:none;border-radius:14px;padding:0.7em 2.7em;letter-spacing:.09em;cursor:pointer;">
        +1 очко в секунду
      </button>
      <div style="margin-top:2em;opacity:.6;font-size:.99em;">Фармите очки и открывайте кейсы!</div>
    </div>
  `;
  document.getElementById('btn-addpoint').onclick = async () => {
    setInterval(async ()=>{
      balancePoints++;
      document.getElementById('current-points').textContent = balancePoints;
      updateBalances();
      await apiSaveUser();
    }, 1000);
  };
}

// ========== ТОП ==========
function renderTop() {
  panels.topplayers.innerHTML = `
    <div class="grok-leaderboard">
      <div class="grok-leader-head" style="font-size:1.3em;">ТОП игроков</div>
      <div id="top-players-list"></div>
      <div style="margin-top:2.1em;opacity:.48;font-size:.97em;text-align:center;">
        <b>Факт:</b> Здесь только реальные игроки. Получи NFT и попади в топ!
      </div>
    </div>
  `;
  apiTop().then(list=>{
    document.getElementById('top-players-list').innerHTML = list
      .sort((a,b)=>b.balance-a.balance)
      .slice(0,10)
      .map((u,i)=>`
        <div class="grok-leader-row">
          <span class="grok-leader-avatar">${u.photo_url?`<img src="${u.photo_url}" style="width:2em;height:2em;border-radius:50%">`:"👤"}</span>
          <span class="grok-leader-name">${u.username||u.first_name||"Без имени"}</span>
          <span class="grok-leader-score">${u.balance}</span>
          <span class="grok-leader-score" style="color:var(--grok-neon3);font-size:.93em;margin-left:.7em;">${u.vcBalance} VC</span>
          <span style="font-size:.85em;margin-left:.6em;color:var(--grok-neon2);">LVL${u.level||1}</span>
        </div>
      `).join('');
  });
}

// ========== АПГРЕЙД ==========
function renderUpgrade() {
  // Только если есть обычные предметы
  const commonItems = inventory.filter(x=>x.rarity==="common");
  panels.upgrade.innerHTML = `
    <div style="text-align:center;margin-bottom:1.2em;">
      <b>Выберите предмет для апгрейда:</b>
      <div style="margin:1em 0;">
        ${commonItems.length === 0 ? `<span style="color:#f77;opacity:.7;">Нет обычных предметов</span>` : ""}
        <select id="upgrade-item-select" style="font-size:1em;padding:.4em;border-radius:7px;">
          ${commonItems.map((it,i)=>`<option value="${i}">${it.ico} ${it.name}</option>`).join('')}
        </select>
      </div>
      <button class="grok-case-spin-btn" id="open-upgrade-ui-btn" ${commonItems.length === 0 ? "disabled" : ""}>Апгрейд</button>
      <div style="margin-top:2em;opacity:.54;font-size:.97em;">Мини-игра: <span style="color:gold;">Установи шанс и крути для апгрейда!</span></div>
    </div>
  `;
  document.getElementById('open-upgrade-ui-btn')?.addEventListener('click', ()=>{
    upgradeModal.classList.add('active');
    drawUpgradeCircle();
    upgradeResult.innerHTML = '';
  });
}
closeUpgradeBtn.onclick = () => { upgradeModal.classList.remove('active'); };
upgradeChance.oninput = () => { upgradeChanceLabel.textContent = upgradeChance.value; };

function drawUpgradeCircle() {
  // 12 секторов, 1 выигрышный, остальные проигрыш
  let R = 90, sectors = 12, winSector = Math.floor(Math.random()*sectors);
  let angleStep = 360/sectors;
  upgradeCircle.innerHTML = '';
  for(let i=0;i<sectors;i++){
    let theta = (i*angleStep-90)*Math.PI/180;
    let x = 105 + R*Math.cos(theta) - 27;
    let y = 105 + R*Math.sin(theta) - 27;
    upgradeCircle.innerHTML += `<div class="upgrade-sector${i===winSector?' win':''}" style="top:${y}px;left:${x}px;">
      ${i===winSector?'🌟':'❌'}
      <div style="font-size:.65em;margin-top:.1em;">${i===winSector?'Легендарный':'Мимо'}</div>
    </div>`;
  }
  upgradeCircle.innerHTML += `<div class="upgrade-arrow"><svg viewBox="0 0 44 44"><polygon points="22,2 33,42 22,34 11,42" fill="#ffd700" stroke="#fff" stroke-width="2"/></svg></div>`;
  upgradeSpinBtn.disabled = false;
  upgradeSpinBtn.onclick = ()=>spinUpgrade(winSector, sectors);
}

function spinUpgrade(winSector, sectors) {
  upgradeSpinBtn.disabled = true;
  let chance = parseInt(upgradeChance.value);
  let spins = Math.floor(Math.random()*3+3);
  let stopAt = Math.random()*100<chance ? winSector : (winSector+Math.floor(Math.random()*(sectors-1))+1)%sectors;
  let deg = 360*spins + (360/sectors)*stopAt;
  upgradeCircle.style.transition = "transform 3.6s cubic-bezier(.19,1.3,.42,1)";
  upgradeCircle.style.transform = `rotate(${deg}deg)`;
  setTimeout(async ()=>{
    if(stopAt===winSector) {
      // win
      let legendary = ITEMS.filter(x=>x.rarity==="legendary")[Math.floor(Math.random()*2)];
      inventory.push(legendary);
      upgradeResult.innerHTML = `<span style="color:gold;font-weight:900;font-size:1.2em;">Вы выиграли: ${legendary.ico} ${legendary.name}!</span>`;
    } else {
      upgradeResult.innerHTML = `<span style="color:#fc7070;font-weight:700;">Неудача! Попробуйте ещё!</span>`;
    }
    await apiSaveUser();
    updateBalances();
    renderInventory();
    renderUpgrade();
    upgradeSpinBtn.disabled = false;
    setTimeout(()=>{drawUpgradeCircle();upgradeResult.innerHTML='';upgradeCircle.style.transform="";}, 2000);
  }, 3600);
}

// ========== INIT ==========
async function loadUser() {
  let d = await apiGetUser();
  inventory = d.inventory||[];
  balancePoints = d.balance||0;
  balanceCoins = d.vcBalance||0;
  updateBalances();
}
window.onload = async function(){
  await loadUser();
  sidebarBtns[1].click(); // Сразу открыть кейс
};
setInterval(async()=>{
  await loadUser();
}, 5000);