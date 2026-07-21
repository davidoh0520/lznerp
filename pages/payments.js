// ===== 수금 관리 페이지 =====
async function renderPayments(container) {
    // 샘플 데이터
    const payments = [
        { id: 1, export_number: 'EXP2607-01', buyer: 'iNEER Co., Ltd.', amount: 321365, payment_date: '2026-07-20', status: 'paid', method: 'Wire Transfer' },
        { id: 2, export_number: 'EXP2607-02', buyer: 'iNEER Co., Ltd.', amount: 28645, payment_date: null, status: 'pending', method: '-' },
        { id: 3, export_number: 'EXP2607-03', buyer: 'MediTech Korea', amount: 125000, payment_date: '2026-07-25', status: 'partial', method: 'Wire Transfer' },
    ];
    
    container.innerHTML = `
        <div class="flex-between mb-16">
            <h2>💰 수금 관리</h2>
            <button class="btn-primary" onclick="openPaymentForm()">+ 수금 등록</button>
        </div>
        <div class="card">
            ${renderTable(
                [
                    { key: 'export_number', label: '수출 번호' },
                    { key: 'buyer', label: '바이어' },
                    { key: 'amount', label: '금액', format: (v) => formatCurrency(v) },
                    { key: 'payment_date', label: '수금일', format: (v) => v ? formatDate(v) : '-' },
                    { key: 'status', label: '상태', format: (v) => getStatusBadge(v) },
                    { key: 'method', label: '방식' }
                ],
                payments,
                (row) => `
                    <button class="btn-secondary" style="padding:4px 10px;font-size:0.8rem;" onclick="editPayment(${row.id})">✏️</button>
                    <button class="btn-danger" style="padding:4px 10px;font-size:0.8rem;" onclick="deletePayment(${row.id})">🗑️</button>
                `
            )}
        </div>
    `;
}

// ===== 수금 등록 폼 =====
function openPaymentForm() {
    openModal(`
        <h2>💰 수금 등록</h2>
        <form id="paymentForm" onsubmit="savePayment(event)">
            <div class="form-group">
                <label>수출 번호 *</label>
                <select id="paymentExport" required>
                    <option value="">선택...</option>
                    <option value="1">EXP2607-01 (iNEER Co., Ltd.)</option>
                    <option value="2">EXP2607-02 (iNEER Co., Ltd.)</option>
                    <option value="3">EXP2607-03 (MediTech Korea)</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>수금 금액 *</label>
                    <input type="number" id="paymentAmount" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>통화</label>
                    <select id="paymentCurrency">
                        <option value="CNY">CNY</option>
                        <option value="USD">USD</option>
                        <option value="KRW">KRW</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>수금일</label>
                    <input type="date" id="paymentDate" value="${new Date().toISOString().slice(0,10)}">
                </div>
                <div class="form-group">
                    <label>상태</label>
                    <select id="paymentStatus">
                        <option value="pending">미수금</option>
                        <option value="partial">부분수금</option>
                        <option value="paid" selected>수금완료</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>수금 방식</label>
                <select id="paymentMethod">
                    <option value="Wire Transfer">Wire Transfer</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check">Check</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>참조 번호</label>
                <input type="text" id="paymentReference" placeholder="송금 번호 등">
            </div>
            <div class="form-group">
                <label>비고</label>
                <textarea id="paymentNote" rows="2"></textarea>
            </div>
            <button type="submit" class="btn-primary">💾 저장</button>
            <button type="button" class="btn-secondary" onclick="closeModal()">취소</button>
        </form>
    `);
}

// ===== 수금 저장 =====
async function savePayment(event) {
    event.preventDefault();
    const data = {
        export_id: document.getElementById('paymentExport').value,
        amount: parseFloat(document.getElementById('paymentAmount').value),
        currency: document.getElementById('paymentCurrency').value,
        payment_date: document.getElementById('paymentDate').value || null,
        status: document.getElementById('paymentStatus').value,
        method: document.getElementById('paymentMethod').value,
        reference: document.getElementById('paymentReference').value,
        note: document.getElementById('paymentNote').value
    };
    
    console.log('저장할 수금:', data);
    showToast('✅ 수금이 저장되었습니다!');
    closeModal();
    navigateTo('payments');
}

// ===== 수금 수정 =====
function editPayment(id) {
    alert(`✏️ 수금 ID ${id} 수정 기능 (Supabase 연결 후 구현)`);
}

// ===== 수금 삭제 =====
function deletePayment(id) {
    if (confirm(`수금 ID ${id}을(를) 삭제하시겠습니까?`)) {
        alert(`🗑️ 수금 ID ${id} 삭제 완료`);
        navigateTo('payments');
    }
}