// === 기본 상수 및 데이터 ===
const ATTRIBUTES = [
    {key: "burn", name: "화상"},
    {key: "bleed", name: "출혈"},
    {key: "tremor", name: "진동"},
    {key: "rupture", name: "파열"},
    {key: "sinking", name: "침잠"},
    {key: "poise", name: "호흡"},
    {key: "charge", name: "충전"},
    {key: "slash", name: "참격"},
    {key: "pierce", name: "관통"},
    {key: "blunt", name: "타격"},
    {key: "nothing", name: "범용"},
];

//아이템 개수
const ITEMS_PER_ROW = 5;
const ITEMS_PER_PAGE = 20;
let currentPage = 1;

const fileList = [
    'data/items_burn.json',
    'data/items_bleed.json',
    'data/items_tremor.json',
    'data/items_rupture.json',
    'data/items_sinking.json',
    'data/items_poise.json',
    'data/items_charge.json',
    'data/items_slash.json',
    'data/items_pierce.json',
    'data/items_blunt.json',
    'data/items_nothing.json'
];

let ITEMS = [];
let loadedFiles = 0;

fileList.forEach(file => {
    fetch(file)
        .then(res => res.json())
        .then(data => {
            ITEMS = ITEMS.concat(data);
            loadedFiles++;
            if (loadedFiles === fileList.length) {
                updateFilterUI();
                renderItems();
            }
        });
});

const LS_KEY = 'mydex-states-v1';
function loadState() {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
}
function saveState(state) {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
}

let state = loadState();
if (!state.acquired) state.acquired = {};
if (!state.filters) state.filters = [];
if (typeof state.hideAcquired === "undefined") state.hideAcquired = false;

const itemFlexListEl = document.getElementById('itemFlexList');
const filterBar = document.getElementById('filterBar');
let openDetailId = null;

// === 아이템 리스트/카드 렌더링 ===
function renderItems() {
    ITEMS.sort((a, b) => (a.no || 0) - (b.no || 0));
    let filtered = ITEMS;

    if (state.hideAcquired) {
    filtered = filtered.filter(item => !state.acquired[item.id]);
}

    if (state.filters.length > 0 && !state.filters.includes('all')) {
        filtered = ITEMS.filter(item =>
            state.filters.some(f =>
                item.type === f ||
                ATTRIBUTES.find(attr=>attr.key===f)?.name === item.attrs[0]
            )
        );
        filtered = filtered.sort((a, b) => {
            const aMatch = state.filters.some(f => a.type === f);
            const bMatch = state.filters.some(f => b.type === f);
            return bMatch - aMatch;
        });
    }

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = filtered.slice(start, end);

    itemFlexListEl.innerHTML = '';
    // 한 줄(6개)씩 그룹핑
    for (let i = 0; i < pageItems.length; i += ITEMS_PER_ROW) {
        const rowItems = pageItems.slice(i, i + ITEMS_PER_ROW);

        // 카드 6개짜리 flex-row 생성
        const rowDiv = document.createElement('div');
        rowDiv.className = 'item-flex-row';

        rowItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card' + (state.acquired[item.id] ? ' acquired' : '');
            card.dataset.id = item.id;

            const img = document.createElement('img');
            img.className = 'item-img';
            img.src = state.acquired[item.id] ? item.img.color : item.img.gray;
            img.alt = item.name;

            const infoBtn = document.createElement('button');
            infoBtn.className = 'info-btn';
            infoBtn.innerHTML = '+';
            infoBtn.onclick = e => {
                e.stopPropagation();
                showDetail(item.id);
            };

            const title = document.createElement('div');
            title.className = 'item-title';
            title.textContent = item.name;

            const attrs = document.createElement('div');
            attrs.className = 'item-attrs';
            attrs.innerHTML = item.attrs.map(a =>
                `<span>${a}</span>`
            ).join('');

            img.onclick = () => {
                toggleAcquire(item.id);
            };
            card.appendChild(img);            
            card.appendChild(infoBtn);
            card.appendChild(title);
            card.appendChild(attrs);
            rowDiv.appendChild(card);
        });

        itemFlexListEl.appendChild(rowDiv);

        // 이 줄에 상세 열릴 아이템이 있으면 바로 아래에 패널 추가
        if (openDetailId && rowItems.some(it => it.id === openDetailId)) {
            const item = rowItems.find(it => it.id === openDetailId);
            insertDetailPanel(item, itemFlexListEl);
        }
    }

    renderPagination(totalPages);
    updateToggleAllBtn(); // ★ 반드시 마지막에 한 줄!
}

function toggleAcquire(itemId) {
    state.acquired[itemId] = !state.acquired[itemId];
    saveState(state);
    renderItems();
    if (openDetailId === itemId)
        showDetail(itemId);
}

function showDetail(itemId) {
    if (openDetailId === itemId) {
        // 이미 열려있는 상태면 닫기
        closeDetail();
    } else {
        // 아니면 해당 상세 열기
        openDetailId = itemId;
        renderItems();
    }
}

function insertDetailPanel(item, parentEl) {
    if (!item) return;
    const isWide = !!item.extraImg;
    const extraImgHtml = isWide
        ? `<div class="extra-img-wrap"><img src="${item.extraImg}" class="extra-img"></div>`
        : '';

    const panel = document.createElement('div');
    panel.className = 'detail-panel open' + (isWide ? ' detail-wide' : '');
    panel.innerHTML = `
      <button class="detail-close" aria-label="닫기">&times;</button>
      <div class="detail-contents">
        ${item.img.detail ? `<img src="${item.img.detail}" class="detail-image" alt="${item.name}">` : ""}
        <div class="detail-info">
          <div class="detail-title">${item.name}</div>
          <div class="detail-desc">${item.desc}</div>
          <div style="margin-top:0em;color:#e7a700;font-size:0em;">
              </span>
          </div>
          ${extraImgHtml}
        </div>
      </div>
    `;
    panel.querySelector('.detail-close').onclick = closeDetail;
    parentEl.appendChild(panel);
}

function closeDetail() {
    openDetailId = null;
    renderItems();
}

function renderPagination(totalPages) {
    const paginationEl = document.getElementById('pagination');
    paginationEl.innerHTML = '';
    // if (totalPages <= 1) return;  ← 이 줄을 막음

    // 페이지가 1개라도 이전/다음 버튼을 비활성화로 표시
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '‹ 이전';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; closeDetail(); renderItems(); };
    paginationEl.appendChild(prevBtn);

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '다음 ›';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; closeDetail(); renderItems(); };
    paginationEl.appendChild(nextBtn);
}

filterBar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const type = btn.dataset.type;
    if (type === 'all') {
        state.filters = [];
    } else {
        if (state.filters.includes(type)) {
            state.filters = state.filters.filter(f => f !== type);
        } else {
            state.filters.push(type);
        }
        state.filters = state.filters.filter(f => f !== 'all');
    }
    saveState(state);
    updateFilterUI();
    currentPage = 1;
    closeDetail();
    renderItems();
});

function updateFilterUI() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const type = btn.dataset.type;
        if (type === 'all' && state.filters.length === 0) {
            btn.classList.add('selected');
        } else if (state.filters.includes(type)) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

window.addEventListener('resize', () => {
    if (window.innerWidth < 601) closeDetail();
});



// 토글버튼 상태 갱신
function updateToggleAllBtn() {
    const btn = document.getElementById('toggleAllBtn');
    if (!btn) return;
    const allAcquired = ITEMS.every(item => state.acquired[item.id]);
    btn.textContent = allAcquired ? "전체 토글 ON" : "전체 토글 OFF";
    btn.classList.toggle("on", allAcquired);    // 획득 상태
    btn.classList.toggle("off", !allAcquired);  // 미획득 상태
}

// 1. 모달 함수 추가 (어디든 한 번만!)
function showCustomConfirm(message, callback) {
    const modal = document.getElementById('customModal');
    modal.querySelector('.modal-message').textContent = message;
    modal.style.display = 'flex';

    const okBtn = document.getElementById('modalOk');
    const cancelBtn = document.getElementById('modalCancel');

    function cleanup(result) {
        modal.style.display = 'none';
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        document.onkeydown = null;
        if (callback) callback(result);
    }

    okBtn.onclick = () => cleanup(true);
    cancelBtn.onclick = () => cleanup(false);
    document.onkeydown = function(e) {
        if (e.key === "Escape") cleanup(false);
    };
}

// 2. 토글 이벤트 등록부에서 confirm → showCustomConfirm으로 교체
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('toggleAllBtn');
    if (btn) {
        btn.addEventListener('click', function() {
            const allAcquired = ITEMS.every(item => state.acquired[item.id]);
            const msg = allAcquired
                ? "전부 미획득으로 변경합니까?"
                : "전부 획득으로 변경합니까?";
            showCustomConfirm(msg, function(yes) {
                if (!yes) return;
                ITEMS.forEach(item => {
                    state.acquired[item.id] = !allAcquired;
                });
                saveState(state);
                renderItems();
            });
        });
        updateToggleAllBtn();
    }

    const hideAcquiredBtn = document.getElementById('hideAcquiredBtn');
if (hideAcquiredBtn) {
    hideAcquiredBtn.onclick = function() {
        state.hideAcquired = !state.hideAcquired;
        saveState(state);
        renderItems();
        hideAcquiredBtn.textContent = state.hideAcquired ? "미획득 필터 ON" : "미획득 필터 OFF";
        hideAcquiredBtn.classList.toggle("on", state.hideAcquired);
        hideAcquiredBtn.classList.toggle("off", !state.hideAcquired);
    }
    hideAcquiredBtn.textContent = state.hideAcquired ? "미획득 필터 ON" : "미획득 필터 OFF";
    hideAcquiredBtn.classList.toggle("on", state.hideAcquired);
    hideAcquiredBtn.classList.toggle("off", !state.hideAcquired);
}

});

// 1. 검색어 추적용 변수와 이벤트 리스너 추가
const searchInput = document.getElementById('searchInput');
let searchQuery = '';

if (searchInput) {
    searchInput.addEventListener('input', function(e) {
        searchQuery = e.target.value.trim().toLowerCase();
        renderItems();
    });
}

// 2. renderItems 함수에 검색 조건 추가!
const originalRenderItems = renderItems; // 혹시 모를 중복 방지

renderItems = function() {
    ITEMS.sort((a, b) => (a.no || 0) - (b.no || 0));
    let filtered = ITEMS;
    if (state.hideAcquired) {
    filtered = filtered.filter(item => !state.acquired[item.id]);
}
    if (state.filters.length > 0 && !state.filters.includes('all')) {
        filtered = filtered.filter(item =>
            state.filters.some(f =>
                item.type === f ||
                ATTRIBUTES.find(attr=>attr.key===f)?.name === item.attrs[0]
            )
        );
        filtered = filtered.sort((a, b) => {
            const aMatch = state.filters.some(f => a.type === f);
            const bMatch = state.filters.some(f => b.type === f);
            return bMatch - aMatch;
        });
    }

    // ↓↓↓ 검색 조건 추가 ↓↓↓
    if (searchQuery) {
    filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery)
    );
}

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        let acquiredCount = filtered.filter(item => state.acquired[item.id]).length;
    let totalCount = filtered.length;

    const countDisplay = document.getElementById('countDisplay');
    if (countDisplay) {
        countDisplay.textContent = `[${acquiredCount} / ${totalCount}]`;
    }
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = filtered.slice(start, end);

    itemFlexListEl.innerHTML = '';
    for (let i = 0; i < pageItems.length; i += ITEMS_PER_ROW) {
        const rowItems = pageItems.slice(i, i + ITEMS_PER_ROW);

        const rowDiv = document.createElement('div');
        rowDiv.className = 'item-flex-row';

        rowItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card' + (state.acquired[item.id] ? ' acquired' : '');
            card.dataset.id = item.id;

            const img = document.createElement('img');
            img.className = 'item-img';
            img.src = state.acquired[item.id] ? item.img.color : item.img.gray;
            img.alt = item.name;

            const infoBtn = document.createElement('button');
            infoBtn.className = 'info-btn';
            infoBtn.innerHTML = '+';
            infoBtn.onclick = e => {
                e.stopPropagation();
                showDetail(item.id);
            };

            const title = document.createElement('div');
            title.className = 'item-title';
            title.textContent = item.name;

            const attrs = document.createElement('div');
            attrs.className = 'item-attrs';
            attrs.innerHTML = item.attrs.map(a =>
                `<span>${a}</span>`
            ).join('');

            img.onclick = () => {
                toggleAcquire(item.id);
            };
            card.appendChild(img);            
            card.appendChild(infoBtn);
            card.appendChild(title);
            card.appendChild(attrs);
            rowDiv.appendChild(card);
        });

        itemFlexListEl.appendChild(rowDiv);

        if (openDetailId && rowItems.some(it => it.id === openDetailId)) {
            const item = rowItems.find(it => it.id === openDetailId);
            insertDetailPanel(item, itemFlexListEl);
        }
    }

    renderPagination(totalPages);
    updateToggleAllBtn();
};

