// ===== Documents Page =====

async function renderDocuments(container) {
    try {
        const { data: documents } = await dbSelect('documents');
        
        let html = `
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button onclick="openDocumentModal()" class="btn-primary">${t('documents.add')}</button>
                <select id="docTypeFilter" onchange="filterDocumentsTable()" style="max-width: 200px;">
                    <option value="">${t('documents.filter.all')}</option>
                    <option value="invoice">${t('documents.type.invoice')}</option>
                    <option value="packing_list">${t('documents.type.packing_list')}</option>
                    <option value="bill_of_lading">${t('documents.type.bill_of_lading')}</option>
                    <option value="certificate_of_origin">${t('documents.type.certificate_of_origin')}</option>
                    <option value="other">${t('documents.type.other')}</option>
                </select>
            </div>
            
            <div id="documentsTableContainer">
                ${renderDocumentsTable(documents || [])}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('Documents render error:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">${t('error.load_failed')}${e.message}</p>`;
    }
}

function renderDocumentsTable(documents) {
    if (!documents || documents.length === 0) {
        return `<p class="text-center" style="padding: 40px; color: var(--gray-500);">${t('documents.no_data')}</p>`;
    }
    
    let html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>${t('documents.col.number')}</th>
                        <th>${t('documents.col.type')}</th>
                        <th>${t('documents.col.export_id')}</th>
                        <th>${t('documents.col.date')}</th>
                        <th>${t('documents.col.file')}</th>
                        <th>${t('col.manage')}</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    documents.forEach(doc => {
        const typeLabel = {
            'invoice': t('documents.type.invoice'),
            'packing_list': t('documents.type.packing_list'),
            'bill_of_lading': t('documents.type.bill_of_lading'),
            'certificate_of_origin': t('documents.type.certificate_of_origin'),
            'other': t('documents.type.other')
        }[doc.doc_type] || doc.doc_type;
        
        html += `
            <tr>
                <td><strong>${doc.doc_number}</strong></td>
                <td>${typeLabel}</td>
                <td>${doc.export_id || '-'}</td>
                <td>${formatDate(doc.created_at)}</td>
                <td>
                    ${doc.file_url ? `<a href="${doc.file_url}" target="_blank" class="btn-primary" style="padding: 4px 8px; font-size: 0.8rem; display: inline-block;">${t('documents.btn.download')}</a>` : '-'}
                </td>
                <td>
                    <button onclick='editDocument(${JSON.stringify(doc).replace(/'/g, "&apos;")})' class="btn-warning" style="margin-right: 4px; padding: 4px 8px; font-size: 0.8rem;">${t('btn.edit')}</button>
                    <button onclick="deleteDocument(${doc.id})" class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">${t('btn.delete')}</button>
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
        <h2>${isEdit ? t('documents.modal.edit') : t('documents.modal.add')}</h2>
        
        <div class="form-group">
            <label>${t('documents.field.number')}</label>
            <input type="text" id="docNumber" value="${doc?.doc_number || ''}" 
                ${isEdit ? 'disabled' : ''} placeholder="${t('documents.placeholder.number')}">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('documents.field.type')}</label>
                <select id="docType">
                    <option value="invoice" ${doc?.doc_type === 'invoice' ? 'selected' : ''}>${t('documents.type.invoice')}</option>
                    <option value="packing_list" ${doc?.doc_type === 'packing_list' ? 'selected' : ''}>${t('documents.type.packing_list')}</option>
                    <option value="bill_of_lading" ${doc?.doc_type === 'bill_of_lading' ? 'selected' : ''}>${t('documents.type.bill_of_lading')}</option>
                    <option value="certificate_of_origin" ${doc?.doc_type === 'certificate_of_origin' ? 'selected' : ''}>${t('documents.type.certificate_of_origin')}</option>
                    <option value="other" ${doc?.doc_type === 'other' ? 'selected' : ''}>${t('documents.type.other')}</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>${t('documents.field.export_id')}</label>
                <input type="number" id="exportId" value="${doc?.export_id || ''}" placeholder="${t('documents.field.export_id')}">
            </div>
        </div>
        
        <div class="form-group">
            <label>${t('documents.field.file_url')}</label>
            <input type="url" id="fileUrl" value="${doc?.file_url || ''}" placeholder="${t('documents.placeholder.file_url')}">
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="saveDocument(${doc?.id || 'null'})" class="btn-primary" style="flex: 1;">${t('btn.save')}</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">${t('btn.cancel')}</button>
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
        alert(t('documents.required'));
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
            alert(t('documents.updated'));
        } else {
            result = await dbInsert('documents', data);
            if (result.error) throw new Error(result.error);
            alert(t('documents.saved'));
        }
        
        closeModal();
        navigateTo('documents');
        
    } catch (e) {
        console.error('Document save error:', e);
        alert(`${t('error.save_failed')}${e.message}`);
    }
}

async function editDocument(doc) {
    openDocumentModal(doc);
}

async function deleteDocument(id) {
    if (!confirm(t('confirm.delete'))) return;
    
    try {
        const result = await dbDelete('documents', id);
        if (result.error) throw new Error(result.error);
        
        alert(t('documents.deleted'));
        navigateTo('documents');
        
    } catch (e) {
        console.error('Document delete error:', e);
        alert(`${t('error.delete_failed')}${e.message}`);
    }
}