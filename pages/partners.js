// ===== Partners Page =====

function isChina(country) {
    if (!country) return false;
    return ['china', 'cn', '中国', 'prc'].includes(country.toLowerCase().trim());
}

async function renderPartners(container) {
    try {
        const { data: partners } = await dbSelect('partners');
        
        let html = `
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button onclick="openPartnerModal()" class="btn-primary">${t('partners.add')}</button>
                <input type="text" id="partnerSearch" placeholder="${t('partners.search')}" 
                    style="flex: 1; max-width: 300px;"
                    onkeyup="filterPartnersTable()">
            </div>
            
            <div id="partnersTableContainer">
                ${renderPartnersTable(partners || [])}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('Partners render error:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">${t('error.load_failed')}${e.message}</p>`;
    }
}

function renderPartnersTable(partners) {
    if (!partners || partners.length === 0) {
        return `<p class="text-center" style="padding: 40px; color: var(--gray-500);">${t('partners.no_data')}</p>`;
    }
    
    let html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>${t('partners.col.code')}</th>
                        <th>${t('partners.col.name')}</th>
                        <th>${t('partners.col.country')}</th>
                        <th>${t('partners.col.tax_reg_no')}</th>
                        <th>${t('partners.col.contact')}</th>
                        <th>${t('partners.col.phone')}</th>
                        <th>${t('col.manage')}</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    partners.forEach(partner => {
        html += `
            <tr>
                <td><strong>${partner.partner_code}</strong></td>
                <td>${partner.partner_name}</td>
                <td>${partner.country || '-'}</td>
                <td>${partner.tax_registration_number || '-'}</td>
                <td>${partner.contact_person || '-'}</td>
                <td>${partner.phone || '-'}</td>
                <td>
                    <button onclick='editPartner(${JSON.stringify(partner).replace(/'/g, "&apos;")})' class="btn-warning" style="margin-right: 4px; padding: 4px 8px; font-size: 0.8rem;">${t('btn.edit')}</button>
                    <button onclick="deletePartner(${partner.id})" class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">${t('btn.delete')}</button>
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

function filterPartnersTable() {
    const searchValue = document.getElementById('partnerSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#partnersTableContainer table tbody tr');
    
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(searchValue) ? '' : 'none';
    });
}

async function openPartnerModal(partner = null) {
    const isEdit = partner !== null;
    let displayCode = partner?.partner_code || '';
    
    if (!isEdit) {
        displayCode = await generatePartnerCode();
    }
    
    const country = partner?.country || '';
    const chinaActive = isChina(country);
    const reqStyle = chinaActive ? '' : 'display:none';
    
    const html = `
        <h2>${isEdit ? t('partners.modal.edit') : t('partners.modal.add')}</h2>
        
        <p class="form-section-label">${t('partners.section.company')}</p>
        
        <div class="form-group">
            <label>${t('partners.field.code.auto')}</label>
            <input type="text" id="partnerCode" value="${displayCode}" disabled
                style="background:var(--gray-100); color:var(--gray-500);">
            <small style="color:var(--gray-400);">${t('partners.code.hint')}</small>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('partners.field.name')} <span style="color:var(--danger)">*</span></label>
                <input type="text" id="partnerName" value="${partner?.partner_name || ''}"
                    placeholder="${t('partners.placeholder.name')}">
                <small id="err-name" class="field-error"></small>
            </div>
            
            <div class="form-group">
                <label>${t('partners.field.country')}</label>
                <input type="text" id="country" value="${country}"
                    placeholder="${t('partners.placeholder.country')}"
                    oninput="onPartnerCountryChange()">
            </div>
        </div>
        
        <div class="form-group">
            <label>${t('partners.field.tax_reg_no')} <span class="china-req-mark" style="${reqStyle}; color:var(--danger)">*</span></label>
            <input type="text" id="taxRegNo" value="${partner?.tax_registration_number || ''}"
                placeholder="${t('partners.placeholder.tax_reg_no')}">
            <small id="err-tax-reg-no" class="field-error"></small>
        </div>
        
        <div class="form-group">
            <label>${t('partners.field.address')} <span class="china-req-mark" style="${reqStyle}; color:var(--danger)">*</span></label>
            <textarea id="address" placeholder="${t('partners.placeholder.address')}">${partner?.address || ''}</textarea>
            <small id="err-address" class="field-error"></small>
        </div>
        
        <p class="form-section-label">${t('partners.section.banking')}</p>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('partners.field.bank_name')} <span class="china-req-mark" style="${reqStyle}; color:var(--danger)">*</span></label>
                <input type="text" id="bankName" value="${partner?.bank_name || ''}"
                    placeholder="${t('partners.placeholder.bank_name')}">
                <small id="err-bank-name" class="field-error"></small>
            </div>
            
            <div class="form-group">
                <label>${t('partners.field.bank_account_no')} <span class="china-req-mark" style="${reqStyle}; color:var(--danger)">*</span></label>
                <input type="text" id="bankAccountNo" value="${partner?.bank_account_number || ''}"
                    placeholder="${t('partners.placeholder.bank_account_no')}">
                <small id="err-bank-account-no" class="field-error"></small>
            </div>
        </div>
        
        <p class="form-section-label">${t('partners.section.contact')}</p>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('partners.field.contact')} <span class="china-req-mark" style="${reqStyle}; color:var(--danger)">*</span></label>
                <input type="text" id="contactPerson" value="${partner?.contact_person || ''}"
                    placeholder="${t('partners.placeholder.contact')}">
                <small id="err-contact" class="field-error"></small>
            </div>
            
            <div class="form-group">
                <label>${t('partners.field.phone')} <span class="china-req-mark" style="${reqStyle}; color:var(--danger)">*</span></label>
                <input type="tel" id="phone" value="${partner?.phone || ''}" placeholder="+86-130-6261-9570">
                <small id="err-phone" class="field-error"></small>
            </div>
        </div>
        
        <div class="form-group">
            <label>${t('partners.field.email')}</label>
            <input type="email" id="email" value="${partner?.email || ''}" placeholder="example@company.com">
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="savePartner(${partner?.id || 'null'})" class="btn-primary" style="flex: 1;">${t('btn.save')}</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">${t('btn.cancel')}</button>
        </div>
    `;
    
    openModal(html);
}

function onPartnerCountryChange() {
    const country = document.getElementById('country').value.trim();
    const china = isChina(country);
    document.querySelectorAll('.china-req-mark').forEach(el => {
        el.style.display = china ? '' : 'none';
    });
}

async function savePartner(id) {
    // Clear previous inline errors
    ['name', 'tax-reg-no', 'address', 'bank-name', 'bank-account-no', 'contact', 'phone'].forEach(f => {
        const el = document.getElementById(`err-${f}`);
        if (el) el.textContent = '';
    });
    
    const code = document.getElementById('partnerCode').value.trim();
    const name = document.getElementById('partnerName').value.trim();
    const country = document.getElementById('country').value.trim();
    const contactPerson = document.getElementById('contactPerson').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const taxRegNo = document.getElementById('taxRegNo').value.trim();
    const bankName = document.getElementById('bankName').value.trim();
    const bankAccountNo = document.getElementById('bankAccountNo').value.trim();
    
    let hasError = false;
    
    if (!name) {
        document.getElementById('err-name').textContent = t('partners.err.name');
        hasError = true;
    }
    
    if (isChina(country)) {
        if (!taxRegNo) {
            document.getElementById('err-tax-reg-no').textContent = t('partners.err.tax_reg_no');
            hasError = true;
        }
        if (!address) {
            document.getElementById('err-address').textContent = t('partners.err.address');
            hasError = true;
        }
        if (!bankName) {
            document.getElementById('err-bank-name').textContent = t('partners.err.bank_name');
            hasError = true;
        }
        if (!bankAccountNo) {
            document.getElementById('err-bank-account-no').textContent = t('partners.err.bank_account_no');
            hasError = true;
        }
        if (!contactPerson) {
            document.getElementById('err-contact').textContent = t('partners.err.contact');
            hasError = true;
        }
        if (!phone) {
            document.getElementById('err-phone').textContent = t('partners.err.phone');
            hasError = true;
        }
    }
    
    if (hasError) return;
    
    const data = {
        partner_code: code,
        partner_name: name,
        country: country,
        contact_person: contactPerson,
        email: email,
        phone: phone,
        address: address,
        tax_registration_number: taxRegNo,
        bank_name: bankName,
        bank_account_number: bankAccountNo
    };
    
    try {
        let result;
        if (id) {
            result = await dbUpdate('partners', id, data);
            if (result.error) throw new Error(result.error);
            alert(t('partners.updated'));
        } else {
            result = await dbInsert('partners', data);
            if (result.error) throw new Error(result.error);
            alert(t('partners.saved'));
        }
        
        closeModal();
        navigateTo('partners');
        
    } catch (e) {
        console.error('Partner save error:', e);
        alert(`${t('error.save_failed')}${e.message}`);
    }
}

async function editPartner(partner) {
    openPartnerModal(partner);
}

async function deletePartner(id) {
    if (!confirm(t('confirm.delete'))) return;
    
    try {
        const result = await dbDelete('partners', id);
        if (result.error) throw new Error(result.error);
        
        alert(t('partners.deleted'));
        navigateTo('partners');
        
    } catch (e) {
        console.error('Partner delete error:', e);
        alert(`${t('error.delete_failed')}${e.message}`);
    }
}