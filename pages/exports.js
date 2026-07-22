// ===== Exports Page =====

async function renderExports(container) {
    try {
        const { data: exports } = await dbSelect('exports');
        
        let html = `
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button onclick="openExportModal()" class="btn-primary">${t('exports.add')}</button>
                <select id="exportStatusFilter" onchange="filterExportsTable()" style="max-width: 150px;">
                    <option value="">${t('exports.filter.all')}</option>
                    <option value="draft">${t('status.draft')}</option>
                    <option value="contract">${t('status.contract')}</option>
                    <option value="shipped">${t('status.shipped')}</option>
                    <option value="completed">${t('status.completed')}</option>
                </select>
            </div>
            
            <div id="exportsTableContainer">
                ${renderExportsTable(exports || [])}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('Exports render error:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">${t('error.load_failed')}${e.message}</p>`;
    }
}

function renderExportsTable(exports) {
    if (!exports || exports.length === 0) {
        return `<p class="text-center" style="padding: 40px; color: var(--gray-500);">${t('exports.no_data')}</p>`;
    }
    
    let html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>${t('exports.col.code')}</th>
                        <th>${t('exports.col.partner')}</th>
                        <th>${t('exports.col.status')}</th>
                        <th>${t('exports.col.export_date')}</th>
                        <th>${t('exports.col.shipment_date')}</th>
                        <th>${t('exports.col.total')}</th>
                        <th>${t('col.manage')}</th>
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
                    <button onclick='editExport(${JSON.stringify(exp).replace(/'/g, "&apos;")})' class="btn-warning" style="margin-right: 4px; padding: 4px 8px; font-size: 0.8rem;">${t('btn.edit')}</button>
                    <button onclick="deleteExport(${exp.id})" class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">${t('btn.delete')}</button>
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
        <h2>${isEdit ? t('exports.modal.edit') : t('exports.modal.add')}</h2>
        
        <div class="form-group">
            <label>${t('exports.field.code')}</label>
            <input type="text" id="exportCode" value="${exp?.export_code || ''}" 
                ${isEdit ? 'disabled' : ''} placeholder="${t('exports.placeholder.code')}">
        </div>
        
        <div class="form-group">
            <label>${t('exports.field.partner')}</label>
            <input type="number" id="partnerId" value="${exp?.partner_id || ''}" placeholder="${t('exports.placeholder.partner')}">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('exports.field.status')}</label>
                <select id="status">
                    <option value="draft" ${exp?.status === 'draft' ? 'selected' : ''}>${t('status.draft')}</option>
                    <option value="contract" ${exp?.status === 'contract' ? 'selected' : ''}>${t('status.contract')}</option>
                    <option value="shipped" ${exp?.status === 'shipped' ? 'selected' : ''}>${t('status.shipped')}</option>
                    <option value="completed" ${exp?.status === 'completed' ? 'selected' : ''}>${t('status.completed')}</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>${t('exports.field.currency')}</label>
                <select id="currency">
                    <option value="CNY" ${exp?.currency === 'CNY' ? 'selected' : ''}>CNY (¥)</option>
                    <option value="USD" ${exp?.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                    <option value="EUR" ${exp?.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                </select>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('exports.field.export_date')}</label>
                <input type="date" id="exportDate" value="${exp?.export_date || ''}">
            </div>
            
            <div class="form-group">
                <label>${t('exports.field.shipment_date')}</label>
                <input type="date" id="shipmentDate" value="${exp?.shipment_date || ''}">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('exports.field.total')}</label>
                <input type="number" id="totalAmount" value="${exp?.total_amount || ''}" placeholder="0.00" step="0.01">
            </div>
            
            <div class="form-group">
                <label>${t('exports.field.incoterms')}</label>
                <select id="incoterms">
                    <option value="" ${!exp?.incoterms ? 'selected' : ''}>${t('exports.incoterms.select')}</option>
                    <option value="FOB" ${exp?.incoterms === 'FOB' ? 'selected' : ''}>FOB</option>
                    <option value="CIF" ${exp?.incoterms === 'CIF' ? 'selected' : ''}>CIF</option>
                    <option value="CFR" ${exp?.incoterms === 'CFR' ? 'selected' : ''}>CFR</option>
                    <option value="EXW" ${exp?.incoterms === 'EXW' ? 'selected' : ''}>EXW</option>
                    <option value="DDP" ${exp?.incoterms === 'DDP' ? 'selected' : ''}>DDP</option>
                </select>
            </div>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="saveExport(${exp?.id || 'null'})" class="btn-primary" style="flex: 1;">${t('btn.save')}</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">${t('btn.cancel')}</button>
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
        alert(t('exports.required'));
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
            alert(t('exports.updated'));
        } else {
            result = await dbInsert('exports', data);
            if (result.error) throw new Error(result.error);
            alert(t('exports.saved'));
        }
        
        closeModal();
        navigateTo('exports');
        
    } catch (e) {
        console.error('Export save error:', e);
        alert(`${t('error.save_failed')}${e.message}`);
    }
}

async function editExport(exp) {
    openExportModal(exp);
}

async function deleteExport(id) {
    if (!confirm(t('confirm.delete'))) return;
    
    try {
        const result = await dbDelete('exports', id);
        if (result.error) throw new Error(result.error);
        
        alert(t('exports.deleted'));
        navigateTo('exports');
        
    } catch (e) {
        console.error('Export delete error:', e);
        alert(`${t('error.delete_failed')}${e.message}`);
    }
}