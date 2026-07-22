// ===== Partners Page =====

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
                        <th>${t('partners.col.contact')}</th>
                        <th>${t('partners.col.email')}</th>
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
                <td>${partner.contact_person || '-'}</td>
                <td>${partner.email || '-'}</td>
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

function openPartnerModal(partner = null) {
    const isEdit = partner !== null;
    
    const html = `
        <h2>${isEdit ? t('partners.modal.edit') : t('partners.modal.add')}</h2>
        
        <div class="form-group">
            <label>${t('partners.field.code')}</label>
            <input type="text" id="partnerCode" value="${partner?.partner_code || ''}" 
                ${isEdit ? 'disabled' : ''} placeholder="${t('partners.placeholder.code')}">
        </div>
        
        <div class="form-group">
            <label>${t('partners.field.name')}</label>
            <input type="text" id="partnerName" value="${partner?.partner_name || ''}" placeholder="${t('partners.placeholder.name')}">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('partners.field.country')}</label>
                <input type="text" id="country" value="${partner?.country || ''}" placeholder="${t('partners.placeholder.country')}">
            </div>
            
            <div class="form-group">
                <label>${t('partners.field.contact')}</label>
                <input type="text" id="contactPerson" value="${partner?.contact_person || ''}" placeholder="${t('partners.placeholder.contact')}">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('partners.field.email')}</label>
                <input type="email" id="email" value="${partner?.email || ''}" placeholder="example@company.com">
            </div>
            
            <div class="form-group">
                <label>${t('partners.field.phone')}</label>
                <input type="tel" id="phone" value="${partner?.phone || ''}" placeholder="+86-130-6261-9570">
            </div>
        </div>
        
        <div class="form-group">
            <label>${t('partners.field.address')}</label>
            <textarea id="address" placeholder="${t('partners.placeholder.address')}">${partner?.address || ''}</textarea>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="savePartner(${partner?.id || 'null'})" class="btn-primary" style="flex: 1;">${t('btn.save')}</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">${t('btn.cancel')}</button>
        </div>
    `;
    
    openModal(html);
}

async function savePartner(id) {
    const code = document.getElementById('partnerCode').value.trim();
    const name = document.getElementById('partnerName').value.trim();
    const country = document.getElementById('country').value.trim();
    const contactPerson = document.getElementById('contactPerson').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    
    if (!code || !name) {
        alert(t('partners.required'));
        return;
    }
    
    const data = {
        partner_code: code,
        partner_name: name,
        country: country,
        contact_person: contactPerson,
        email: email,
        phone: phone,
        address: address
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