// ===== 수출 관리 페이지 =====
async function renderExports(container) {
    // 샘플 데이터
    const exports = [
        { id: 1, export_number: 'EXP2607-01', buyer: 'iNEER Co., Ltd.', contract_date: '2026-07-13', total_amount: 321365, status: 'invoiced' },
        { id: 2, export_number: 'EXP2607-02', buyer: 'iNEER Co., Ltd.', contract_date: '2026-07-08', total_amount: 28645, status: 'shipped' },
        { id: 3, export_number: 'EXP2607-03', buyer: 'MediTech Korea', contract_date: '2026-07-20', total_amount: 125000, status: 'contract' },
    ];
    
    container.innerHTML = `
        <div class="flex-between mb-16">
            <h2>📤 수출 관리</h2>
            <button class="btn-primary" onclick="openExportForm()">+ 새 수출 등록</button>
        </div>
        <div class="card">
            ${renderTable(
                [
                    { key: 'export_number', label: '수출 번호' },
                    { key: 'buyer', label: '바이어' },
                    { key: 'contract_date', label: '계약일', format: (v) => formatDate(v) },
                    { key: 'total_amount', label: '금액', format: (v) => formatCurrency(v) },
                    { key: 'status', label: '상태', format: (v) => getStatusBadge(v) }
                ],
                exports,
                (row) => `
                    <button class="btn-secondary" style="padding:4px 10px;font-size:0.8rem;" onclick="viewExport(${row.id})">📄</button>
                    <button class="btn-secondary" style="padding:4px 10px;font-size:0.8rem;" onclick="editExport(${row.id})">✏️</button>
                    <button class="btn-danger" style="padding:4px 10px;font-size:0.8rem;" onclick="deleteExport(${row.id})">🗑️</button>
                `
            )}
        </div>
    `;
}

// ===== 수출 등록 폼 =====
function openExportForm() {
    openModal(`
        <h2>새 수출 등록</h2>
        <form id="exportForm" onsubmit="saveExport(event)">
            <div class="form-group">
                <label>수출 번호 *</label>
                <input type="text" id="exportNumber" value="${generateId('EXP')}" required>
            </div>
            <div class="form-group">
                <label>바이어 *</label>
                <select id="exportBuyer" required>
                    <option value="">선택...</option>
                    <option value="1">iNEER Co., Ltd.</option>
                    <option value="2">MediTech Korea</option>
                    <option value="3">Global Medical Inc.</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>계약일 *</label>
                    <input type="date" id="exportDate" value="${new Date().toISOString().slice(0,10)}" required>
                </div>
                <div class="form-group">
                    <label>상태</label>
                    <select id="exportStatus">
                        <option value="draft">임시</option>
                        <option value="contract" selected>계약</option>
                        <option value="shipped">선적</option>
                        <option value="invoiced">인보이스발행</option>
                        <option value="completed">완료</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Incoterms</label>
                    <select id="exportIncoterms">
                        <option value="CIF">CIF</option>
                        <option value="FOB">FOB</option>
                        <option value="EXW">EXW</option>
                        <option value="DDP">DDP</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>통화</label>
                    <select id="exportCurrency">
                        <option value="CNY">CNY</option>
                        <option value="USD">USD</option>
                        <option value="KRW">KRW</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>선적지</label>
                <input type="text" id="exportPortLoading" placeholder="Port of Loading" value="Shanghai, China">
            </div>
            <div class="form-group">
                <label>도착지</label>
                <input type="text" id="exportPortDischarge" placeholder="Port of Discharge" value="Incheon, Korea">
            </div>
            <div class="form-group">
                <label>비고</label>
                <textarea id="exportNote" rows="2"></textarea>
            </div>
            <h3 style="margin-top:20px;font-size:1rem;">📦 수출 품목</h3>
            <div id="exportItemsContainer">
                <div class="form-row">
                    <div class="form-group">
                        <label>품목</label>
                        <select>
                            <option>Mechanical Part (HS:8466.91)</option>
                            <option>Internal SMPS (HS:8504.40)</option>
                            <option>Plastic Part (HS:8466.91)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>수량 (KG)</label>
                        <input type="number" value="1" step="0.01">
                    </div>
                </div>
            </div>
            <button type="button" class="btn-secondary" onclick="addExportItemRow()">+ 품목 추가</button>
            
            <div style="margin-top:20px;">
                <button type="submit" class="btn-primary">💾 저장</button>
                <button type="button" class="btn-secondary" onclick="closeModal()">취소</button>
            </div>
        </form>
    `);
}

// ===== 수출 품목 행 추가 =====
function addExportItemRow() {
    const container = document.getElementById('exportItemsContainer');
    const row = document.createElement('div');
    row.className = 'form-row';
    row.style.marginTop = '8px';
    row.innerHTML = `
        <div class="form-group">
            <label>품목</label>
            <select>
                <option>Mechanical Part (HS:8466.91)</option>
                <option>Internal SMPS (HS:8504.40)</option>
                <option>Plastic Part (HS:8466.91)</option>
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

// ===== 수출 저장 =====
async function saveExport(event) {
    event.preventDefault();
    const data = {
        export_number: document.getElementById('exportNumber').value,
        buyer: document.getElementById('exportBuyer').value,
        contract_date: document.getElementById('exportDate').value,
        status: document.getElementById('exportStatus').value,
        incoterms: document.getElementById('exportIncoterms').value,
        currency: document.getElementById('exportCurrency').value,
        port_loading: document.getElementById('exportPortLoading').value,
        port_discharge: document.getElementById('exportPortDischarge').value,
        note: document.getElementById('exportNote').value
    };
    
    console.log('저장할 수출:', data);
    showToast('✅ 수출이 저장되었습니다!');
    closeModal();
    navigateTo('exports');
}

// ===== 수출 조회 =====
function viewExport(id) {
    alert(`📄 수출 ID ${id} 상세 조회 (Supabase 연결 후 구현)`);
}

// ===== 수출 수정 =====
function editExport(id) {
    alert(`✏️ 수출 ID ${id} 수정 기능 (Supabase 연결 후 구현)`);
}

// ===== 수출 삭제 =====
function deleteExport(id) {
    if (confirm(`수출 ID ${id}을(를) 삭제하시겠습니까?`)) {
        alert(`🗑️ 수출 ID ${id} 삭제 완료`);
        navigateTo('exports');
    }
}