// ===== 서류 관리 페이지 =====

async function renderDocuments(container) {
    try {
        const { data: documents } = await dbSelect('documents');
        
        let html = `
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button onclick="openDocumentModal()" class="btn-primary">➕ 새 서류 추가</button>
                <select id="docTypeFilter" onchange="filterDocumentsTable()" style="max-width: 200px;">
                    <option value="">전체 서류 유형</option>
                    <option value="invoice">인보이스</option>
                    <option value="packing_list">패킹 리스트</option>
                    <option value="bill_of_lading">선하증권</option>
                    <option value="certificate_of_origin">원산지증명서</option>
                    <option value="other">기타</option>
                </select>
            </div>
            
            <div id="documentsTableContainer">
                ${renderDocumentsTable(documents || [])}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('서류 렌더링 에러:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">❌ 서류 로드 실패: ${e.message}</p>`;
    }
}

function renderDocumentsTable(documents) {
    if (!documents || documents.length === 0) {
        return '<p class="text-center" style="padding: 40px; color: var(--gray-500);">📭 서류가 없습니다.</p>';
    }
    
    let html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>서류번호</th>
                        <th>서류 유형</th>
                        <th>수출 ID</th>
                        <th>작성일</th>
                        <th>파일</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    documents.forEach(doc => {
        const typeLabel = {
            'invoice': '인보이스',
            'packing_list': '패킹 리스트',
            'bill_of_lading': '선하증권',
            'certificate_of_origin': '원산지증명서',
            'other': '기타'
        }[doc.doc_type] || doc.doc_type;
        
        html += `
            <tr>
                <td><strong>${doc.doc_number}</strong></td>
                <td>${typeLabel}</td>
                <td>${doc.export_id || '-'}</td>
                <td>${formatDate(doc.created_at)}</td>
                <td>
                    ${doc.file_url ? `<a href="${doc.file_url}" target="_blank" class="btn-primary" style="padding: 4px 8px; font-size: 0.8rem; display: inline-block;">📥 다운로드</a>` : '-'}
                </td>
                <td>
                    <button onclick='editDocument(${JSON.stringify(doc).replace(/'/g, "&apos;")})' class="btn-warning" style="margin-right: 4px; padding: 4px 8px; font-size: 0.8rem;">✏️ 수정</button>
                    <button onclick="deleteDocument(${doc.id})" class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">🗑️ 삭제</button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        </div>
    `;
    
    return html;
}

function filterDocumentsTable() {
    const docType = document.getElementById('docTypeFilter').value;
    const rows = document.querySelectorAll('#documentsTableContainer table tbody tr');
    
    rows.forEach(row => {
        if (!docType) {
            row.style.display = '';
        } else {
            const typeCell = row.cells[1].textContent;
            row.style.display = typeCell.includes(docType) ? '' : 'none';
        }
    });
}

function openDocumentModal(doc = null) {
    const isEdit = doc !== null;
    
    const html = `
        <h2>${isEdit ? '서류 수정' : '새 서류 추가'}</h2>
        
        <div class="form-group">
            <label>서류번호</label>
            <input type="text" id="docNumber" value="${doc?.doc_number || ''}" 
                ${isEdit ? 'disabled' : ''} placeholder="예: INV-240701-001">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>서류 유형</label>
                <select id="docType">
                    <option value="invoice" ${doc?.doc_type === 'invoice' ? 'selected' : ''}>인보이스</option>
                    <option value="packing_list" ${doc?.doc_type === 'packing_list' ? 'selected' : ''}>패킹 리스트</option>
                    <option value="bill_of_lading" ${doc?.doc_type === 'bill_of_lading' ? 'selected' : ''}>선하증권</option>
                    <option value="certificate_of_origin" ${doc?.doc_type === 'certificate_of_origin' ? 'selected' : ''}>원산지증명서</option>
                    <option value="other" ${doc?.doc_type === 'other' ? 'selected' : ''}>기타</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>수출 ID</label>
                <input type="number" id="exportId" value="${doc?.export_id || ''}" placeholder="수출 ID">
            </div>
        </div>
        
        <div class="form-group">
            <label>파일 URL</label>
            <input type="url" id="fileUrl" value="${doc?.file_url || ''}" placeholder="https://example.com/document.pdf">
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="saveDocument(${doc?.id || 'null'})" class="btn-primary" style="flex: 1;">💾 저장</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">❌ 취소</button>
        </div>
    `;
    
    openModal(html);
}

async function saveDocument(id) {
    const docNumber = document.getElementById('docNumber').value.trim();
    const docType = document.getElementById('docType').value;
    const exportId = document.getElementById('exportId').value;
    const fileUrl = document.getElementById('fileUrl').value.trim();
    
    if (!docNumber || !docType) {
        alert('❌ 서류번호와 서류 유형은 필수입니다.');
        return;
    }
    
    const data = {
        doc_number: docNumber,
        doc_type: docType,
        export_id: exportId ? parseInt(exportId) : null,
        file_url: fileUrl || null
    };
    
    try {
        let result;
        if (id) {
            result = await dbUpdate('documents', id, data);
            if (result.error) throw new Error(result.error);
            alert('✅ 서류가 수정되었습니다.');
        } else {
            result = await dbInsert('documents', data);
            if (result.error) throw new Error(result.error);
            alert('✅ 서류가 추가되었습니다.');
        }
        
        closeModal();
        navigateTo('documents');
        
    } catch (e) {
        console.error('서류 저장 에러:', e);
        alert(`❌ 저장 실패: ${e.message}`);
    }
}

async function editDocument(doc) {
    openDocumentModal(doc);
}

async function deleteDocument(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const result = await dbDelete('documents', id);
        if (result.error) throw new Error(result.error);
        
        alert('✅ 서류가 삭제되었습니다.');
        navigateTo('documents');
        
    } catch (e) {
        console.error('서류 삭제 에러:', e);
        alert(`❌ 삭제 실패: ${e.message}`);
    }
}