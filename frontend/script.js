// Demo data for tabs
const fakeTop = [
  {rank: 1, name: "Dante696swag", score: 9999},
  {rank: 2, name: "SwagKing", score: 6500},
  {rank: 3, name: "AppleUser", score: 5088},
];
const fakeInventory = [
  {name: "Super Case", priceVC: 900, description: "Крутой дроп", is_nft: true},
  {name: "Mega Drop", priceVC: 500},
];

// Tab switching logic
const section = document.getElementById('swag-section');
const caseBtn = document.getElementById('case-btn');
const topBtn = document.getElementById('top-btn');
const inventoryBtn = document.getElementById('inventory-btn');

function renderCase() {
  section.innerHTML = `
    <div class="case-center" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:2em;">
      <button class="case-main-btn" id="case-main-btn" title="Открыть кейс">
        <span class="case-main-btn-icon">🎁</span>
      </button>
      <div class="case-title" style="margin-top:1em;">Открыть кейс</div>
      <div class="case-desc">Попробуй свою удачу и получи призы!</div>
    </div>
  `;
  document.getElementById('case-main-btn').onclick = () => {
    alert('Кейс открыт! (demo)');
  };
}
function renderTop() {
  section.innerHTML = `
    <div class="top-center" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:2em;">
      <div class="top-title" style="margin-bottom:1.1em;">Топ игроков</div>
      <ul class="top-list">
        ${fakeTop.map(user => `
          <li>
            <span class="top-rank">#${user.rank}</span>
            <span class="top-name">${user.name}</span>
            <span class="top-score">${user.score}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}
function renderInventory() {
  section.innerHTML = `
    <div class="inventory-center" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:2em;">
      <div class="inventory-title" style="margin-bottom:1em;">Инвентарь</div>
      <button class="sell-all-btn" id="sell-all-btn">Продать все</button>
      <div class="inventory-list" id="inventory"></div>
    </div>
  `;
  const invDiv = document.getElementById('inventory');
  if (!fakeInventory.length) {
    invDiv.innerHTML = `<div class="inventory-empty">Ваш инвентарь пуст</div>`;
    return;
  }
  invDiv.innerHTML = fakeInventory.map((item, i) => `
    <div class="item">
      <span class="item-name">${item.name}${item.is_nft ? '<span class="nft-badge">NFT</span>' : ''}</span>
      ${item.description ? `<div class="item-desc">${item.description}</div>` : ""}
      <button class="sell-btn">Продать за ${item.priceVC || 10} VC</button>
    </div>
  `).join('');
  document.getElementById('sell-all-btn').onclick = () => alert('Все предметы проданы (demo)');
}

// Анимированное переключение меню
function activateMenu(btnType) {
  [caseBtn, topBtn, inventoryBtn].forEach(btn => btn.classList.remove('active'));
  if (btnType === 'case') {
    caseBtn.classList.add('active');
    renderCase();
  } else if (btnType === 'top') {
    topBtn.classList.add('active');
    renderTop();
  } else if (btnType === 'inventory') {
    inventoryBtn.classList.add('active');
    renderInventory();
  }
}

caseBtn.addEventListener('click', () => activateMenu('case'));
topBtn.addEventListener('click', () => activateMenu('top'));
inventoryBtn.addEventListener('click', () => activateMenu('inventory'));

// Default - показать кейс
activateMenu('case');