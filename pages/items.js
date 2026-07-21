// ===== 품목 관리 페이지 =====
async function renderItems(container) {
    // 샘플 데이터
    const items = [
        { id: 1, name: 'ARM BASE BOTAL', model: 'AL6061', hs_code: '8466.91-0000', unit: 'EA', purchase_price: 200, sale_price: 250 },
        { id: 2, name: 'ARM MAIN BODY', model: 'AL6063', hs_code: '8466.91-0000', unit: 'EA', purchase_price: 100, sale_price: 130 },
        { id: 3, name: 'Internal SMPS', model: 'SMPS-200', hs_code: '8504.40-9100', unit: 'EA', purchase_price: 800, sale_price: 1000 },
    ];
    
    container.innerHTML = `
        <div class="flex-between mb-16">
            <h2>📦 품목 관리</h2>
            <button class="btn-primary" onclick="openItemForm()">+ 새 품목 등록</button>
        </div>
        <div class="card">
            ${renderTable(
                [
                    { key: 'name', label: '품목명' },
                    { key: 'model', label: '모델' },
                    { key: 'hs_code', label: 'HS 코드' },
                    { key: 'unit', label: '통관 단위' },
                    { key: 'purchase_price', label: '매입가', format: (v) => formatCurrency(v) },
                    { key: 'sale_price', label: '판매가', format: (v) => formatCurrency(v) }
                ],
                items,
                (row) => `
                    <button class="btn-secondary" style="padding:4px 10px;font-size:0.8rem;" onclick="editItem(${row.id})">✏️</button>
                    <button class="btn-danger" style="padding:4px 10px;font-size:0.8rem;" onclick="deleteItem(${row.id})">🗑️</button>
                `
            )}
        </div>
    `;
}

// ===== 품목 등록 폼 =====
function openItemForm() {
    openModal(`
        <h2>새 품목 등록</h2>
        <form id="itemForm" onsubmit="saveItem(event)">
            <div class="form-group">
                <label>품목명 *</label>
                <input type="text" id="itemName" required>
            </div>
            <div class="form-group">
                <label>모델명</label>
                <input type="text" id="itemModel">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>HS 코드 *</label>
                    <input type="text" id="itemHsCode" required placeholder="예: 8466.91-0000">
                </div>
                <div class="form-group">
                    <label>통관 단위 *</label>
                    <select id="itemUnit" required>
                        <option value="KG">KG</option>
                        <option value="EA">EA</option>
                        <option value="SET">SET</option>
                        <option value="M">M</option>
                        <option value="BOX">BOX</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>매입가 (CNY)</label>
                    <input type="number" id="itemPurchasePrice" step="0.01">
                </div>
                <div class="form-group">
                    <label>판매가 (CNY)</label>
                    <input type="number" id="itemSalePrice" step="0.01">
                </div>
            </div>
            <div class="form-group">
                <label>규격/비고</label>
                <textarea id="itemSpec" rows="2"></textarea>
            </div>
            <button type="submit" class="btn-primary">💾 저장</button>
            <button type="button" class="btn-secondary" onclick="closeModal()">취소</button>
        </form>
    `);
}

// ===== 품목 저장 =====
async function saveItem(event) {
    event.preventDefault();
    const data = {
        name: document.getElementById('itemName').value,
        model: document.getElementById('itemModel').value,
        hs_code: document.getElementById('itemHsCode').value,
        unit: document.getElementById('itemUnit').value,
        purchase_price: parseFloat(document.getElementById('itemPurchasePrice').value) || 0,
        sale_price: parseFloat(document.getElementById('itemSalePrice').value) || 0,
        spec: document.getElementById('itemSpec').value
    };
    
    console.log('저장할 품목:', data);
    showToast('✅ 품목이 저장되었습니다! (실제 저장은 Supabase 연결 후 가능)');
    closeModal();
    navigateTo('items');
}

// ===== 품목 수정 =====
function editItem(id) {
    alert(`✏️ 품목 ID ${id} 수정 기능 (Supabase 연결 후 구현)`);
}

// ===== 품목 삭제 =====
function deleteItem(id) {
    if (confirm(`품목 ID ${id}을(를) 삭제하시겠습니까?`)) {
        alert(`🗑️ 품목 ID ${id} 삭제 완료 (Supabase 연결 후 실제 삭제)`);
        navigateTo('items');
    }
}