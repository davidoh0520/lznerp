// ===== 서류 관리 페이지 =====
async function renderDocuments(container) {
    // 샘플 데이터
    const documents = [
        { id: 1, ref_type: 'purchase', ref_id: 'PO2607-01', doc_type: 'order', file_name: '오더시트_PO2607-01.pdf', uploaded_at: '2026-07-06' },
        { id: 2, ref_type: 'export', ref_id: 'EXP2607-01', doc_type: 'contract', file_name: '계약서_EXP2607-01.pdf', uploaded_at: '2026-07-13' },
        { id: 3, ref_type: 'export', ref_id: 'EXP2607-01', doc_type: 'ci', file_name: 'CI_EXP2607-01.xlsx', uploaded_at: '2026-07-14' },
        { id: 4, ref_type: 'export', ref_id: 'EXP2607-02', doc_type: 'baoguandan', file_name: '报关单_EXP2607-02.pdf', uploaded_at: '2026-07-10' },
    ];
    
    const docTypeMap = {
        'offer': '📋 오퍼시트',
        'order': '📄 오더시트',
        'contract': '📑 계약서',
        'ci': '📊 Commercial Invoice',
        'pl': '📦 Packing List',
        'baoguandan': '📁 报关单',
        'co': '📜 원산지증명서',
        'fapiao': '🧾 发票',
        'shuidan': '📃 税单'
    };
    
    const refTypeMap = {
        'purchase': '📥 매입',
        'export': '📤 수출',
        'payment': '💰 수금'
    };
    
    container.innerHTML = `
        <div class="flex-between mb-16">
            <h2>📎 서류 관리</h2>
            <button class="btn-primary" onclick="openDocumentForm()">+ 서류 업로드</button>
        </div>
        <div class="card">
            ${renderTable(
                [
                    { key: 'ref_type', label: '연관', format: (v) => refTypeMap[v] || v },
                    { key: 'ref_id', label: '참조 번호' },
                    { key: 'doc_type', label: '서류 유형', format: (v) => docTypeMap[v] || v },
                    { key: 'file_name', label: '파일명' },
                    { key: 'uploaded_at', label: '업로드일', format: (v) => formatDate(v) }
                ],
                documents,
                (row) => `
                    <button class="btn-secondary" style="padding:4px 10px;font-size:0.8rem;" onclick="downloadDocument(${row.id})">⬇️</button>
                    <button class="btn-danger" style="padding:4px 10px;font-size:0.8rem;" onclick="deleteDocument(${row.id})">🗑️</button>
                `
            )}
        </div>
    `;
}

// ===== 서류 업로드 폼 =====
function openDocumentForm() {
    openModal(`
        <h2>📎 서류 업로드</h2>
        <form id="documentForm" onsubmit="saveDocument(event)">
            <div class="form-group">
                <label>연관 유형</label>
                <select id="docRefType" onchange="updateDocRefId()">
                    <option value="purchase">매입</option>
                    <option value="export" selected>수출</option>
                    <option value="payment">수금</option>
                </select>
            </div>
            <div class="form-group">
                <label>참조 번호</label>
                <select id="docRefId" required>
                    <option value="EXP2607-01">EXP2607-01</option>
                    <option value="EXP2607-02">EXP2607-02</option>
                    <option value="EXP2607-03">EXP2607-03</option>
                    <option value="PO2607-01">PO2607-01</option>
                    <option value="PO2607-02">PO2607-02</option>
                </select>
            </div>
            <div class="form-group">
                <label>서류 유형</label>
                <select id="docType" required>
                    <option value="offer">📋 오퍼시트</option>
                    <option value="order">📄 오더시트</option>
                    <option value="contract">📑 계약서</option>
                    <option value="ci">📊 Commercial Invoice</option>
                    <option value="pl">📦 Packing List</option>
                    <option value="baoguandan">📁 报关单</option>
                    <option value="co">📜 원산지증명서</option>
                    <option value="fapiao">🧾 发票</option>
                    <option value="shuidan">📃 税单</option>
                </select>
            </div>
            <div class="form-group">
                <label>파일 선택</label>
                <div class="file-upload" onclick="document.getElementById('fileInput').click()">
                    <p>📁 클릭하여 파일 선택</p>
                    <input type="file" id="fileInput" accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.png">
                </div>
                <div id="fileInfo" style="margin-top:8px;font-size:0.9rem;color:var(--gray-500);"></div>
            </div>
            <button type="submit" class="btn-primary">📤 업로드</button>
            <button type="button" class="btn-secondary" onclick="closeModal()">취소</button>
        </form>
    `);
    
    // 파일 선택 시 정보 표시
    document.getElementById('fileInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('fileInfo').textContent = `📎 ${file.name} (${(file.size/1024).toFixed(0)} KB)`;
        }
    });
}

// ===== 참조 번호 업데이트 =====
function updateDocRefId() {
    const type = document.getElementById('docRefType').value;
    const select = document.getElementById('docRefId');
    select.innerHTML = '';
    
    const options = type === 'purchase' 
        ? ['PO2607-01', 'PO2607-02', 'PO2607-03']
        : type === 'export'
        ? ['EXP2607-01', 'EXP2607-02', 'EXP2607-03']
        : ['PAY2607-01', 'PAY2607-02'];
    
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    });
}

// ===== 서류 저장 =====
async function saveDocument(event) {
    event.preventDefault();
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    const data = {
        ref_type: document.getElementById('docRefType').value,
        ref_id: document.getElementById('docRefId').value,
        doc_type: document.getElementById('docType').value,
        file_name: file.name,
        file_size: file.size
    };
    
    console.log('업로드할 서류:', data);
    console.log('파일:', file);
    
    showToast('✅ 서류가 업로드되었습니다! (실제 업로드는 Supabase Storage 연결 후 가능)');
    closeModal();
    navigateTo('documents');
}

// ===== 서류 다운로드 =====
function downloadDocument(id) {
    alert(`⬇️ 서류 ID ${id} 다운로드 (Supabase Storage 연결 후 구현)`);
}

// ===== 서류 삭제 =====
function deleteDocument(id) {
    if (confirm(`서류 ID ${id}을(를) 삭제하시겠습니까?`)) {
        alert(`🗑️ 서류 ID ${id} 삭제 완료`);
        navigateTo('documents');
    }
}