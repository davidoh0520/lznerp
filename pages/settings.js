// ===== Settings Page =====

async function renderSettings(container) {
    try {
        let html = `
            <div class="card">
                <h2 style="margin-bottom: 20px;">${t('settings.title')}</h2>
                
                <div style="border-bottom: 1px solid var(--gray-200); padding-bottom: 24px; margin-bottom: 24px;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 16px;">${t('settings.company')}</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>${t('settings.company.name_en')}</label>
                            <input type="text" id="companyName" value="${CONFIG.company.name}" readonly>
                        </div>
                        <div class="form-group">
                            <label>${t('settings.company.name_cn')}</label>
                            <input type="text" id="companyNameCn" value="${CONFIG.company.name_cn}" readonly>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>${t('settings.company.tax_id')}</label>
                            <input type="text" id="taxId" value="${CONFIG.company.tax_id}" readonly>
                        </div>
                        <div class="form-group">
                            <label>${t('settings.company.phone')}</label>
                            <input type="tel" id="phone" value="${CONFIG.company.phone}" readonly>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>${t('settings.company.address_cn')}</label>
                        <textarea id="address" readonly>${CONFIG.company.address}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>${t('settings.company.address_en')}</label>
                        <textarea id="addressEn" readonly>${CONFIG.company.address_en}</textarea>
                    </div>
                </div>
                
                <div style="border-bottom: 1px solid var(--gray-200); padding-bottom: 24px; margin-bottom: 24px;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 16px;">${t('settings.bank')}</h3>
                    
                    <div class="form-group">
                        <label>${t('settings.bank.name')}</label>
                        <input type="text" id="bankName" value="${CONFIG.company.bank}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label>${t('settings.bank.name_en')}</label>
                        <input type="text" id="bankNameEn" value="${CONFIG.company.bank_en}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label>${t('settings.bank.address')}</label>
                        <textarea id="bankAddress" readonly>${CONFIG.company.bank_address}</textarea>
                    </div>
                    
                    <div class="grid-3">
                        <div class="form-group">
                            <label>${t('settings.bank.account_cny')}</label>
                            <input type="text" id="accountCny" value="${CONFIG.company.bank_account_cny}" readonly>
                        </div>
                        <div class="form-group">
                            <label>${t('settings.bank.account_krw')}</label>
                            <input type="text" id="accountKrw" value="${CONFIG.company.bank_account_krw}" readonly>
                        </div>
                        <div class="form-group">
                            <label>${t('settings.bank.account_usd')}</label>
                            <input type="text" id="accountUsd" value="${CONFIG.company.bank_account_usd}" readonly>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>${t('settings.bank.swift')}</label>
                        <input type="text" id="swift" value="${CONFIG.company.swift}" readonly>
                    </div>
                </div>
                
                <div>
                    <h3 style="font-size: 1.1rem; margin-bottom: 16px;">${t('settings.data')}</h3>
                    
                    <div style="display: flex; gap: 12px;">
                        <button onclick="exportData()" class="btn-primary">${t('settings.data.export_btn')}</button>
                        <button onclick="clearLocalData()" class="btn-danger">${t('settings.data.clear_btn')}</button>
                    </div>
                    
                    <div style="background: var(--gray-100); padding: 12px; border-radius: var(--radius); margin-top: 12px; font-size: 0.9rem; color: var(--gray-600);">
                        ${t('settings.data.note')}
                    </div>
                </div>
                
                <div style="background: var(--gray-50); padding: 16px; border-radius: var(--radius); margin-top: 24px; border-left: 4px solid var(--warning);">
                    <strong>${t('settings.system')}</strong>
                    <p style="margin: 8px 0; font-size: 0.9rem; color: var(--gray-600);">
                        <strong>${t('settings.system.version')}:</strong> 1.0.0<br>
                        <strong>${t('settings.system.url')}:</strong> ${CONFIG.supabase.url}<br>
                        <strong>${t('settings.system.updated')}:</strong> ${new Date().toLocaleString(getLocale())}
                    </p>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('Settings render error:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">${t('error.load_failed')}${e.message}</p>`;
    }
}

async function exportData() {
    try {
        const { data: items } = await dbSelect('items');
        const { data: partners } = await dbSelect('partners');
        const { data: purchases } = await dbSelect('purchases');
        const { data: exports } = await dbSelect('exports');
        const { data: payments } = await dbSelect('payments');
        const { data: documents } = await dbSelect('documents');
        
        const exportData = {
            exportDate: new Date().toISOString(),
            items: items || [],
            partners: partners || [],
            purchases: purchases || [],
            exports: exports || [],
            payments: payments || [],
            documents: documents || []
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `lzn-erp-export-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        alert(t('settings.data.exported'));
        
    } catch (e) {
        console.error('Data export error:', e);
        alert(`${t('settings.export.failed')}${e.message}`);
    }
}

function clearLocalData() {
    if (!confirm(t('settings.cache.confirm'))) return;
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('lzn_') && key !== LANG_KEY) {
            localStorage.removeItem(key);
        }
    });
    
    alert(t('settings.cache.cleared'));
}