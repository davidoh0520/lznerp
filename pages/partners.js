// ===== 거래처 관리 페이지 =====
async function renderPartners(container) {
    // 샘플 데이터
    const partners = [
        { id: 1, name: '深圳市星火精密科技有限公司', name_cn: '深圳市星火精密科技', type: 'supplier', country: '중국', contact: '장민', phone: '0755-1234-5678' },
        { id: 2, name: 'iNEER Co., Ltd.', name_cn: '', type: 'buyer', country: '한국', contact: '김대리', phone: '+82-31-461-1125' },
        { id: 3, name: '上海精密机械有限公司', name_cn: '上海精密机械', type: 'supplier', country: '중국', contact: '이과장', phone: '021-9876-5432' },
    ];
    
    const typeMap = {
        'supplier': '🏭 공급사',
        'buyer': '🏢 바이어'
    };
    
    container.innerHTML = `
        <div class="flex-between mb-16">
            <h2>🏢 거래처 관리</h2>
            <button class="btn-primary" onclick="openPartnerForm()">+ 새 거래처</button>
        </div>
        <div class="card">
            ${renderTable(
                [
                    { key: 'name', label: '거래처명' },
                    { key: 'name_cn', label: '중국어명' },
                    { key: 'type', label: '유형', format: (v) => typeMap[v] || v },
                    { key: 'country', label: '국가' },
                    { key: 'contact', label: '담당자' },
                    { key: 'phone', label: '연락처' }
                ],
                partners,
                (row) => `
                    <button class="btn-secondary" style="padding:4px 10px;font-size:0.8rem;" onclick="editPartner(${row.id})">✏️</button>
                    <button class="btn-danger" style="padding:4px 10px;font-size:0.8rem;" onclick="deletePartner(${row.id})">🗑️</button>
                `
            )}
        </div>
    `;
}

// ===== 거래처 등록 폼 =====
function openPartnerForm() {
    openModal(`
        <h2>새 거래처 등록</h2>
        <form id="partnerForm" onsubmit="savePartner(event)">
            <div class="form-group">
                <label>거래처명 *</label>
                <input type="text" id="partnerName" required>
            </div>
            <div class="form-group">
                <label>중국어명</label>
                <input type="text" id="partnerNameCn" placeholder="중국어 명칭 (있는 경우)">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>유형 *</label>
                    <select id="partnerType" required>
                        <option value="supplier">🏭 공급사</option>
                        <option value="buyer">🏢 바이어</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>국가</label>
                    <input type="text" id="partnerCountry" value="중국">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>담당자</label>
                    <input type="text" id="partnerContact">
                </div>
                <div class="form-group">
                    <label>연락처</label>
                    <input type="text" id="partnerPhone">
                </div>
            </div>
            <div class="form-group">
                <label>이메일</label>
                <input type="email" id="partnerEmail">
            </div>
            <div class="form-group">
                <label>주소</label>
                <textarea id="partnerAddress" rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>사업자등록번호</label>
                <input type="text" id="partnerTaxId">
            </div>
            <button type="submit" class="btn-primary">💾 저장</button>
            <button type="button" class="btn-secondary" onclick="closeModal()">취소</button>
        </form>
    `);
}

// ===== 거래처 저장 =====
async function savePartner(event) {
    event.preventDefault();
    const data = {
        name: document.getElementById('partnerName').value,
        name_cn: document.getElementById('partnerNameCn').value,
        type: document.getElementById('partnerType').value,
        country: document.getElementById('partnerCountry').value,
        contact: document.getElementById('partnerContact').value,
        phone: document.getElementById('partnerPhone').value,
        email: document.getElementById('partnerEmail').value,
        address: document.getElementById('partnerAddress').value,
        tax_id: document.getElementById('partnerTaxId').value
    };
    
    console.log('저장할 거래처:', data);
    showToast('✅ 거래처가 저장되었습니다!');
    closeModal();
    navigateTo('partners');
}

// ===== 거래처 수정 =====
function editPartner(id) {
    alert(`✏️ 거래처 ID ${id} 수정 기능 (Supabase 연결 후 구현)`);
}

// ===== 거래처 삭제 =====
function deletePartner(id) {
    if (confirm(`거래처 ID ${id}을(를) 삭제하시겠습니까?`)) {
        alert(`🗑️ 거래처 ID ${id} 삭제 완료`);
        navigateTo('partners');
    }
}