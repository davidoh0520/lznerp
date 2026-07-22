// ===== Payments Page =====

async function renderPayments(container) {
    try {
        const { data: payments } = await dbSelect('payments');
        
        let html = `
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button onclick="openPaymentModal()" class="btn-primary">${t('payments.add')}</button>
                <select id="paymentStatusFilter" onchange="filterPaymentsTable()" style="max-width: 150px;">
                    <option value="">${t('payments.filter.all')}</option>
                    <option value="pending">${t('status.pending')}</option>
                    <option value="partial">${t('status.partial')}</option>
                    <option value="paid">${t('status.paid')}</option>
                </select>
            </div>
            
            <div id="paymentsTableContainer">
                ${renderPaymentsTable(payments || [])}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('Payments render error:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">${t('error.load_failed')}${e.message}</p>`;
    }
}

function renderPaymentsTable(payments) {
    if (!payments || payments.length === 0) {
        return `<p class="text-center" style="padding: 40px; color: var(--gray-500);">${t('payments.no_data')}</p>`;
    }
    
    let html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>${t('payments.col.code')}</th>
                        <th>${t('payments.col.export_id')}</th>
                        <th>${t('payments.col.amount')}</th>
                        <th>${t('payments.col.currency')}</th>
                        <th>${t('payments.col.status')}</th>
                        <th>${t('payments.col.date')}</th>
                        <th>${t('col.manage')}</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    payments.forEach(payment => {
        html += `
            <tr>
                <td><strong>${payment.payment_code}</strong></td>
                <td>${payment.export_id || '-'}</td>
                <td>${formatCurrency(payment.amount, payment.currency)}</td>
                <td>${payment.currency}</td>
                <td>${getStatusBadge(payment.status)}</td>
                <td>${formatDate(payment.payment_date)}</td>
                <td>
                    <button onclick='editPayment(${JSON.stringify(payment).replace(/'/g, "&apos;")})' class="btn-warning" style="margin-right: 4px; padding: 4px 8px; font-size: 0.8rem;">${t('btn.edit')}</button>
                    <button onclick="deletePayment(${payment.id})" class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">${t('btn.delete')}</button>
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

function filterPaymentsTable() {
    const status = document.getElementById('paymentStatusFilter').value;
    const rows = document.querySelectorAll('#paymentsTableContainer table tbody tr');
    
    rows.forEach(row => {
        if (!status) {
            row.style.display = '';
        } else {
            const statusCell = row.cells[4].textContent;
            row.style.display = statusCell.includes(status) ? '' : 'none';
        }
    });
}

function openPaymentModal(payment = null) {
    const isEdit = payment !== null;
    
    const html = `
        <h2>${isEdit ? t('payments.modal.edit') : t('payments.modal.add')}</h2>
        
        <div class="form-group">
            <label>${t('payments.field.code')}</label>
            <input type="text" id="paymentCode" value="${payment?.payment_code || ''}" 
                ${isEdit ? 'disabled' : ''} placeholder="${t('payments.placeholder.code')}">
        </div>
        
        <div class="form-group">
            <label>${t('payments.field.export_id')}</label>
            <input type="number" id="exportId" value="${payment?.export_id || ''}" placeholder="${t('payments.placeholder.export_id')}">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('payments.field.amount')}</label>
                <input type="number" id="amount" value="${payment?.amount || ''}" placeholder="0.00" step="0.01">
            </div>
            
            <div class="form-group">
                <label>${t('payments.field.currency')}</label>
                <select id="currency">
                    <option value="CNY" ${payment?.currency === 'CNY' ? 'selected' : ''}>CNY (¥)</option>
                    <option value="USD" ${payment?.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                    <option value="EUR" ${payment?.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                </select>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('payments.field.status')}</label>
                <select id="status">
                    <option value="pending" ${payment?.status === 'pending' ? 'selected' : ''}>${t('status.pending')}</option>
                    <option value="partial" ${payment?.status === 'partial' ? 'selected' : ''}>${t('status.partial')}</option>
                    <option value="paid" ${payment?.status === 'paid' ? 'selected' : ''}>${t('status.paid')}</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>${t('payments.field.date')}</label>
                <input type="date" id="paymentDate" value="${payment?.payment_date || ''}">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('payments.field.method')}</label>
                <select id="paymentMethod">
                    <option value="" ${!payment?.payment_method ? 'selected' : ''}>${t('payments.method.select')}</option>
                    <option value="wire_transfer" ${payment?.payment_method === 'wire_transfer' ? 'selected' : ''}>${t('payments.method.wire')}</option>
                    <option value="check" ${payment?.payment_method === 'check' ? 'selected' : ''}>${t('payments.method.check')}</option>
                    <option value="letter_of_credit" ${payment?.payment_method === 'letter_of_credit' ? 'selected' : ''}>${t('payments.method.lc')}</option>
                    <option value="other" ${payment?.payment_method === 'other' ? 'selected' : ''}>${t('payments.method.other')}</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>${t('payments.field.bank_ref')}</label>
                <input type="text" id="bankReference" value="${payment?.bank_reference || ''}" placeholder="${t('payments.placeholder.bank_ref')}">
            </div>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="savePayment(${payment?.id || 'null'})" class="btn-primary" style="flex: 1;">${t('btn.save')}</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">${t('btn.cancel')}</button>
        </div>
    `;
    
    openModal(html);
}

async function savePayment(id) {
    const paymentCode = document.getElementById('paymentCode').value.trim();
    const exportId = document.getElementById('exportId').value;
    const amount = document.getElementById('amount').value;
    const currency = document.getElementById('currency').value;
    const status = document.getElementById('status').value;
    const paymentDate = document.getElementById('paymentDate').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const bankReference = document.getElementById('bankReference').value.trim();
    
    if (!paymentCode || !exportId) {
        alert(t('payments.required'));
        return;
    }
    
    const data = {
        payment_code: paymentCode,
        export_id: parseInt(exportId),
        amount: amount ? parseFloat(amount) : null,
        currency: currency,
        status: status,
        payment_date: paymentDate || null,
        payment_method: paymentMethod || null,
        bank_reference: bankReference
    };
    
    try {
        let result;
        if (id) {
            result = await dbUpdate('payments', id, data);
            if (result.error) throw new Error(result.error);
            alert(t('payments.updated'));
        } else {
            result = await dbInsert('payments', data);
            if (result.error) throw new Error(result.error);
            alert(t('payments.saved'));
        }
        
        closeModal();
        navigateTo('payments');
        
    } catch (e) {
        console.error('Payment save error:', e);
        alert(`${t('error.save_failed')}${e.message}`);
    }
}

async function editPayment(payment) {
    openPaymentModal(payment);
}

async function deletePayment(id) {
    if (!confirm(t('confirm.delete'))) return;
    
    try {
        const result = await dbDelete('payments', id);
        if (result.error) throw new Error(result.error);
        
        alert(t('payments.deleted'));
        navigateTo('payments');
        
    } catch (e) {
        console.error('Payment delete error:', e);
        alert(`${t('error.delete_failed')}${e.message}`);
    }
}