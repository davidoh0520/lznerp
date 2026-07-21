// ===== 매입 관리 페이지 =====
async function renderPurchases(container) {
    // 샘플 데이터
    const purchases = [
        { id: 1, po_number: 'PO2607-01', supplier: '深圳市星火精密科技', order_date: '2026-07-06', total_amount: 3700, status: 'order' },
        { id: 2, po_number: 'PO2607-02', supplier: '上海精密机械', order_date: '2026-07-10', total_amount: 5200, status: 'received' },
        { id: 3, po_number: 'PO2607-03', supplier: '深圳市星火精密科技', order_date: '2026-07-15', total_amount: 2850, status: 'offer' },
    ];
    
    container.innerHTML = `
        <div class="flex-between mb-16">
            <h2>📥 매입 관리</h2>
            <button class="btn-primary" onclick="openPurchaseForm()">+ 새 매입 등록</button>
        </div>
        <div class="card">
            ${renderTable(
                [
                    { key: 'po_number', label: 'PO 번호' },
                    { key: 'supplier', label: '공급사' },
                    { key: 'order_date', label: '주문일', format: (v) => formatDate(v) },
                    { key: 'total_amount', label: '금액', format: (v) => formatCurrency(v) },
                    { key: 'status', label: '상태', format: (v) => getStatusBadge(v) }
                ],
                purchases,
                (row) => `
                    <button class="btn-secondary" style="padding:4px 10px;font-size:0.8rem;" onclick="viewPurchase(${row.id})">📄</button>
                    <button class="btn-secondary" style="padding:4px 10px;font-size:0.8rem;" onclick="editPurchase(${row.id})">✏️</button>
                    <button class="btn-danger" style="padding:4px 10px;font-size:0.8rem;" onclick="deletePurchase(${row.id})">🗑️</button>
                `
            )}
        </div>
    `;
}

// ===== 매입 등록 폼 =====
function openPurchaseForm() {
    openModal(`
        <h2>새 매입 등록</h2>
        <form id="purchaseForm" onsubmit="savePurchase(event)">
            <div class="form-group">
                <label>PO 번호 *</label>
                <input type="text" id="purchasePoNumber" value="${generateId('PO')}" required>
            </div>
            <div class="form-group">
                <label>공급사 *</label>
                <select id="purchaseSupplier" required>
                    <option value="">선택...</option>
                    <option value="1">深圳市星火精密科技</option>
                    <option value="2">上海精密机械</option>
                    <option value="3">深圳电子有限公司</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>주문일 *</label>
                    <input type="date" id="purchaseDate" value="${new Date().toISOString().slice(0,10)}" required>
                </div>
                <div class="form-group">
                    <label>상태</label>
                    <select id="purchaseStatus">
                        <option value="offer">오퍼</option>
                        <option value="order" selected>오더</option>
                        <option value="received">입고완료</option>
                        <option value="completed">완료</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>통화</label>
                <select id="purchaseCurrency">
                    <option value="CNY">CNY</option>
                    <option value="USD">USD</option>
                    <option value="KRW">KRW</option>
                </select>
            </div>
            <div class="form-group">
                <label>비고</label>
                <textarea id="purchaseNote" rows="2"></textarea>
            </div>
            <h3 style="margin-top:20px;font-size:1rem;">📦 품목 추가</h3>
            <div id="purchaseItemsContainer">
                <div class="form-row">
                    <div class="form-group">
                        <label>품목</label>
                        <select>
                            <option>ARM BASE BOTAL</option>
                            <option>ARM MAIN BODY</option>
                            <option>Internal SMPS</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>수량</label>
                        <input type="number" value="1" step="0.01">
                    </div>
                </div>
            </div>
            <button type="button" class="btn-secondary" onclick="addPurchaseItemRow()">+ 품목 추가</button>
            
            <div style="margin-top:20px;">
                <button type="submit" class="btn-primary">💾 저장</button>
                <button type="button" class="btn-secondary" onclick="closeModal()">취소</button>
            </div>
        </form>
    `);
}

// ===== 품목 행 추가 =====
function addPurchaseItemRow() {
    const container = document.getElementById('purchaseItemsContainer');
    const row = document.createElement('div');
    row.className = 'form-row';
    row.style.marginTop = '8px';
    row.innerHTML = `
        <div class="form-group">
            <label>품목</label>
            <select>
                <option>ARM BASE BOTAL</option>
                <option>ARM MAIN BODY</option>
                <option>Internal SMPS</option>
            </select>
        </div>
        <div class="form-group" style="display:flex;gap:8px;align-items:end;">
            <div style="flex:1;">
                <label>수량</label>
                <input type="number" value="1" step="0.01">
            </div>
            <button type="button" class="btn-danger" style="padding:4px 12px;margin-bottom:4px;" onclick="this.closest('.form-row').remove()">✕</button>
        </div>
    `;
    container.appendChild(row);
}

// ===== 매입 저장 =====
async function savePurchase(event) {
    event.preventDefault();
    const data = {
        po_number: document.getElementById('purchasePoNumber').value,
        supplier: document.getElementById('purchaseSupplier').value,
        order_date: document.getElementById('purchaseDate').value,
        status: document.getElementById('purchaseStatus').value,
        currency: document.getElementById('purchaseCurrency').value,
        note: document.getElementById('purchaseNote').value
    };
    
    console.log('저장할 매입:', data);
    showToast('✅ 매입이 저장되었습니다!');
    closeModal();
    navigateTo('purchases');
}

// ===== 매입 조회 =====
function viewPurchase(id) {
    alert(`📄 매입 ID ${id} 상세 조회 (Supabase 연결 후 구현)`);
}

// ===== 매입 수정 =====
function editPurchase(id) {
    alert(`✏️ 매입 ID ${id} 수정 기능 (Supabase 연결 후 구현)`);
}

// ===== 매입 삭제 =====
function deletePurchase(id) {
    if (confirm(`매입 ID ${id}을(를) 삭제하시겠습니까?`)) {
        alert(`🗑️ 매입 ID ${id} 삭제 완료`);
        navigateTo('purchases');
    }
}