// ===== 수출 관리 페이지 =====

async function renderExports(container) {
    try {
        const { data: exports } = await dbSelect('exports');
        
        let html = `
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button onclick="openExportModal()" class="btn-primary">➕ 새 수출 추가</button>
                <select id="exportStatusFilter" onchange="filterExportsTable()" style="max-width: 150px;">
                    <option value="">전체 상태</option>
                    <option value="draft">임시</option>
                    <option value="contract">계약</option>
                    <option value="shipped">선적</option>
                    <option value="completed">완료</option>
                </select>
            </div>
            
            <div id="exportsTableContainer">
                ${renderExportsTable(exports || [])}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('수출 렌더링 에러:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">❌ 수출 로드 실패: ${e.message}</p>`;
    }
}

function renderExportsTable(exports) {
    if (!exports || exports.length === 0) {
        return '<p class="text-center" style="padding: 40px; color: var(--gray-500);">📭 수출 정보가 없습니다.</p>';
    }
    
    let html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>수출 코드</th>
                        <th>거래처</th>
                        <th>상태</th>
                        <th>수출 날짜</th>
                        <th>선적일</th>
                        <th>합계</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    exports.forEach(exp => {
        html += `
            <tr>
                <td><strong>${exp.export_code}</strong></td>
                <td>${exp.partner_id || '-'}</td>
                <td>${getStatusBadge(exp.status)}</td>
                <td>${formatDate(exp.export_date)}</td>
                <td>${formatDate(exp.shipment_date)}</td>
                <td>${formatCurrency(exp.total_amount, exp.currency)}</td>
                <td>
                    <button onclick='editExport(${JSON.stringify(exp).replace(/'/g, "&apos;")})' class="btn-warning" style="margin-right: 4px; padding: 4px 8px; font-size: 0.8rem;">✏️ 수정</button>
                    <button onclick="deleteExport(${exp.id})" class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">🗑️ 삭제</button>
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

function filterExportsTable() {
    const status = document.getElementById('exportStatusFilter').value;
    const rows = document.querySelectorAll('#exportsTableContainer table tbody tr');
    
    rows.forEach(row => {
        if (!status) {
            row.style.display = '';
        } else {
            const statusCell = row.cells[2].textContent;
            row.style.display = statusCell.includes(status) ? '' : 'none';
        }
    });
}

function openExportModal(exp = null) {
    const isEdit = exp !== null;
    
    const html = `
        <h2>${isEdit ? '수출 수정' : '새 수출 추가'}</h2>
        
        <div class="form-group">
            <label>수출 코드</label>
            <input type="text" id="exportCode" value="${exp?.export_code || ''}" 
                ${isEdit ? 'disabled' : ''} placeholder="예: EXP-240701-001">
        </div>
        
        <div class="form-group">
            <label>거래처</label>
            <input type="number" id="partnerId" value="${exp?.partner_id || ''}" placeholder="거래처 ID">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>상태</label>
                <select id="status">
                    <option value="draft" ${exp?.status === 'draft' ? 'selected' : ''}>임시</option>
                    <option value="contract" ${exp?.status === 'contract' ? 'selected' : ''}>계약</option>
                    <option value="shipped" ${exp?.status === 'shipped' ? 'selected' : ''}>선적</option>
                    <option value="completed" ${exp?.status === 'completed' ? 'selected' : ''}>완료</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>통화</label>
                <select id="currency">
                    <option value="CNY" ${exp?.currency === 'CNY' ? 'selected' : ''}>CNY (¥)</option>
                    <option value="USD" ${exp?.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                    <option value="EUR" ${exp?.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                </select>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>수출 날짜</label>
                <input type="date" id="exportDate" value="${exp?.export_date || ''}">
            </div>
            
            <div class="form-group">
                <label>선적일</label>
                <input type="date" id="shipmentDate" value="${exp?.shipment_date || ''}">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>합계 금액</label>
                <input type="number" id="totalAmount" value="${exp?.total_amount || ''}" placeholder="0.00" step="0.01">
            </div>
            
            <div class="form-group">
                <label>Incoterms</label>
                <select id="incoterms">
                    <option value="" ${!exp?.incoterms ? 'selected' : ''}>선택</option>
                    <option value="FOB" ${exp?.incoterms === 'FOB' ? 'selected' : ''}>FOB</option>
                    <option value="CIF" ${exp?.incoterms === 'CIF' ? 'selected' : ''}>CIF</option>
                    <option value="CFR" ${exp?.incoterms === 'CFR' ? 'selected' : ''}>CFR</option>
                    <option value="EXW" ${exp?.incoterms === 'EXW' ? 'selected' : ''}>EXW</option>
                    <option value="DDP" ${exp?.incoterms === 'DDP' ? 'selected' : ''}>DDP</option>
                </select>
            </div>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="saveExport(${exp?.id || 'null'})" class="btn-primary" style="flex: 1;">💾 저장</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">❌ 취소</button>
        </div>
    `;
    
    openModal(html);
}

async function saveExport(id) {
    const exportCode = document.getElementById('exportCode').value.trim();
    const partnerId = document.getElementById('partnerId').value;
    const status = document.getElementById('status').value;
    const currency = document.getElementById('currency').value;
    const exportDate = document.getElementById('exportDate').value;
    const shipmentDate = document.getElementById('shipmentDate').value;
    const totalAmount = document.getElementById('totalAmount').value;
    const incoterms = document.getElementById('incoterms').value;
    
    if (!exportCode || !partnerId) {
        alert('❌ 수출 코드와 거래처는 필수입니다.');
        return;
    }
    
    const data = {
        export_code: exportCode,
        partner_id: parseInt(partnerId),
        status: status,
        currency: currency,
        export_date: exportDate || null,
        shipment_date: shipmentDate || null,
        total_amount: totalAmount ? parseFloat(totalAmount) : null,
        incoterms: incoterms || null
    };
    
    try {
        let result;
        if (id) {
            result = await dbUpdate('exports', id, data);
            if (result.error) throw new Error(result.error);
            alert('✅ 수출이 수정되었습니다.');
        } else {
            result = await dbInsert('exports', data);
            if (result.error) throw new Error(result.error);
            alert('✅ 수출이 추가되었습니다.');
        }
        
        closeModal();
        navigateTo('exports');
        
    } catch (e) {
        console.error('수출 저장 에러:', e);
        alert(`❌ 저장 실패: ${e.message}`);
    }
}

async function editExport(exp) {
    openExportModal(exp);
}

async function deleteExport(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const result = await dbDelete('exports', id);
        if (result.error) throw new Error(result.error);
        
        alert('✅ 수출이 삭제되었습니다.');
        navigateTo('exports');
        
    } catch (e) {
        console.error('수출 삭제 에러:', e);
        alert(`❌ 삭제 실패: ${e.message}`);
    }
}