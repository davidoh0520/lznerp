// ===== Purchases Page =====

async function renderPurchases(container) {
    try {
        const { data: purchases } = await dbSelect('purchases');
        
        let html = `
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button onclick="openPurchaseModal()" class="btn-primary">${t('purchases.add')}</button>
                <select id="purchaseStatusFilter" onchange="filterPurchasesTable()" style="max-width: 150px;">
                    <option value="">${t('purchases.filter.all')}</option>
                    <option value="draft">${t('status.draft')}</option>
                    <option value="order">${t('status.order')}</option>
                    <option value="received">${t('status.received')}</option>
                    <option value="completed">${t('status.completed')}</option>
                </select>
            </div>
            
            <div id="purchasesTableContainer">
                ${renderPurchasesTable(purchases || [])}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('Purchases render error:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">${t('error.load_failed')}${e.message}</p>`;
    }
}

function renderPurchasesTable(purchases) {
    if (!purchases || purchases.length === 0) {
        return `<p class="text-center" style="padding: 40px; color: var(--gray-500);">${t('purchases.no_data')}</p>`;
    }
    
    let html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>${t('purchases.col.po')}</th>
                        <th>${t('purchases.col.partner')}</th>
                        <th>${t('purchases.col.status')}</th>
                        <th>${t('purchases.col.po_date')}</th>
                        <th>${t('purchases.col.delivery_date')}</th>
                        <th>${t('purchases.col.total')}</th>
                        <th>${t('col.manage')}</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    purchases.forEach(purchase => {
        html += `
            <tr>
                <td><strong>${purchase.po_number}</strong></td>
                <td>${purchase.partner_id || '-'}</td>
                <td>${getStatusBadge(purchase.status)}</td>
                <td>${formatDate(purchase.po_date)}</td>
                <td>${formatDate(purchase.delivery_date)}</td>
                <td>${formatCurrency(purchase.total_amount, purchase.currency)}</td>
                <td>
                    <button onclick='editPurchase(${JSON.stringify(purchase).replace(/'/g, "&apos;")})' class="btn-warning" style="margin-right: 4px; padding: 4px 8px; font-size: 0.8rem;">${t('btn.edit')}</button>
                    <button onclick="deletePurchase(${purchase.id})" class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">${t('btn.delete')}</button>
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

function filterPurchasesTable() {
    const status = document.getElementById('purchaseStatusFilter').value;
    const rows = document.querySelectorAll('#purchasesTableContainer table tbody tr');
    
    rows.forEach(row => {
        if (!status) {
            row.style.display = '';
        } else {
            const statusCell = row.cells[2].textContent;
            row.style.display = statusCell.includes(status) ? '' : 'none';
        }
    });
}

function openPurchaseModal(purchase = null) {
    const isEdit = purchase !== null;
    
    const html = `
        <h2>${isEdit ? t('purchases.modal.edit') : t('purchases.modal.add')}</h2>
        
        <div class="form-group">
            <label>${t('purchases.field.po')}</label>
            <input type="text" id="poNumber" value="${purchase?.po_number || ''}" 
                ${isEdit ? 'disabled' : ''} placeholder="${t('purchases.placeholder.po')}">
        </div>
        
        <div class="form-group">
            <label>${t('purchases.field.partner')}</label>
            <input type="number" id="partnerId" value="${purchase?.partner_id || ''}" placeholder="${t('purchases.placeholder.partner')}">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('purchases.field.status')}</label>
                <select id="status">
                    <option value="draft" ${purchase?.status === 'draft' ? 'selected' : ''}>${t('status.draft')}</option>
                    <option value="order" ${purchase?.status === 'order' ? 'selected' : ''}>${t('status.order')}</option>
                    <option value="received" ${purchase?.status === 'received' ? 'selected' : ''}>${t('status.received')}</option>
                    <option value="completed" ${purchase?.status === 'completed' ? 'selected' : ''}>${t('status.completed')}</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>${t('purchases.field.currency')}</label>
                <select id="currency">
                    <option value="CNY" ${purchase?.currency === 'CNY' ? 'selected' : ''}>CNY (¥)</option>
                    <option value="USD" ${purchase?.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                    <option value="EUR" ${purchase?.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                </select>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('purchases.field.po_date')}</label>
                <input type="date" id="poDate" value="${purchase?.po_date || ''}">
            </div>
            
            <div class="form-group">
                <label>${t('purchases.field.delivery_date')}</label>
                <input type="date" id="deliveryDate" value="${purchase?.delivery_date || ''}">
            </div>
        </div>
        
        <div class="form-group">
            <label>${t('purchases.field.total')}</label>
            <input type="number" id="totalAmount" value="${purchase?.total_amount || ''}" placeholder="0.00" step="0.01">
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="savePurchase(${purchase?.id || 'null'})" class="btn-primary" style="flex: 1;">${t('btn.save')}</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">${t('btn.cancel')}</button>
        </div>
    `;
    
    openModal(html);
}

async function savePurchase(id) {
    const poNumber = document.getElementById('poNumber').value.trim();
    const partnerId = document.getElementById('partnerId').value;
    const status = document.getElementById('status').value;
    const currency = document.getElementById('currency').value;
    const poDate = document.getElementById('poDate').value;
    const deliveryDate = document.getElementById('deliveryDate').value;
    const totalAmount = document.getElementById('totalAmount').value;
    
    if (!poNumber || !partnerId) {
        alert(t('purchases.required'));
        return;
    }
    
    const data = {
        po_number: poNumber,
        partner_id: parseInt(partnerId),
        status: status,
        currency: currency,
        po_date: poDate || null,
        delivery_date: deliveryDate || null,
        total_amount: totalAmount ? parseFloat(totalAmount) : null
    };
    
    try {
        let result;
        if (id) {
            result = await dbUpdate('purchases', id, data);
            if (result.error) throw new Error(result.error);
            alert(t('purchases.updated'));
        } else {
            result = await dbInsert('purchases', data);
            if (result.error) throw new Error(result.error);
            alert(t('purchases.saved'));
        }
        
        closeModal();
        navigateTo('purchases');
        
    } catch (e) {
        console.error('Purchase save error:', e);
        alert(`${t('error.save_failed')}${e.message}`);
    }
}

async function editPurchase(purchase) {
    openPurchaseModal(purchase);
}

async function deletePurchase(id) {
    if (!confirm(t('confirm.delete'))) return;
    
    try {
        const result = await dbDelete('purchases', id);
        if (result.error) throw new Error(result.error);
        
        alert(t('purchases.deleted'));
        navigateTo('purchases');
        
    } catch (e) {
        console.error('Purchase delete error:', e);
        alert(`${t('error.delete_failed')}${e.message}`);
    }
}