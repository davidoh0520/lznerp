// ===== Items Page =====

async function renderItems(container) {
    try {
        const { data: items } = await dbSelect('items');
        
        let html = `
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button onclick="openItemModal()" class="btn-primary">${t('items.add')}</button>
                <input type="text" id="itemSearch" placeholder="${t('items.search')}" 
                    style="flex: 1; max-width: 300px;"
                    onkeyup="filterItemsTable()">
            </div>
            
            <div id="itemsTableContainer">
                ${renderItemsTable(items || [])}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('Items render error:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">${t('error.load_failed')}${e.message}</p>`;
    }
}

function renderItemsTable(items) {
    if (!items || items.length === 0) {
        return `<p class="text-center" style="padding: 40px; color: var(--gray-500);">${t('items.no_data')}</p>`;
    }
    
    let html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>${t('items.col.code')}</th>
                        <th>${t('items.col.name')}</th>
                        <th>${t('items.col.hs_code')}</th>
                        <th>${t('items.col.unit')}</th>
                        <th>${t('items.col.category')}</th>
                        <th>${t('col.manage')}</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    items.forEach(item => {
        html += `
            <tr>
                <td><strong>${item.item_code}</strong></td>
                <td>${item.item_name}</td>
                <td>${item.hs_code || '-'}</td>
                <td>${item.unit || '-'}</td>
                <td>${item.category || '-'}</td>
                <td>
                    <button onclick='editItem(${JSON.stringify(item).replace(/'/g, "&apos;")})' class="btn-warning" style="margin-right: 4px; padding: 4px 8px; font-size: 0.8rem;">${t('btn.edit')}</button>
                    <button onclick="deleteItem(${item.id})" class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">${t('btn.delete')}</button>
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

function filterItemsTable() {
    const searchValue = document.getElementById('itemSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#itemsTableContainer table tbody tr');
    
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(searchValue) ? '' : 'none';
    });
}

function openItemModal(item = null) {
    const isEdit = item !== null;
    
    const html = `
        <h2>${isEdit ? t('items.modal.edit') : t('items.modal.add')}</h2>
        
        <div class="form-group">
            <label>${t('items.field.code')}</label>
            <input type="text" id="itemCode" value="${item?.item_code || ''}" 
                ${isEdit ? 'disabled' : ''} placeholder="${t('items.placeholder.code')}">
        </div>
        
        <div class="form-group">
            <label>${t('items.field.name')}</label>
            <input type="text" id="itemName" value="${item?.item_name || ''}" placeholder="${t('items.placeholder.name')}">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>${t('items.field.hs_code')}</label>
                <input type="text" id="hsCode" value="${item?.hs_code || ''}" placeholder="8466.91-0000">
            </div>
            
            <div class="form-group">
                <label>${t('items.field.unit')}</label>
                <select id="unit">
                    <option value="EA" ${item?.unit === 'EA' ? 'selected' : ''}>${t('items.unit.ea')}</option>
                    <option value="KG" ${item?.unit === 'KG' ? 'selected' : ''}>${t('items.unit.kg')}</option>
                    <option value="SET" ${item?.unit === 'SET' ? 'selected' : ''}>${t('items.unit.set')}</option>
                    <option value="BOX" ${item?.unit === 'BOX' ? 'selected' : ''}>${t('items.unit.box')}</option>
                </select>
            </div>
        </div>
        
        <div class="form-group">
            <label>${t('items.field.category')}</label>
            <input type="text" id="category" value="${item?.category || ''}" placeholder="${t('items.placeholder.category')}">
        </div>
        
        <div class="form-group">
            <label>${t('items.field.description')}</label>
            <textarea id="description" placeholder="${t('items.placeholder.description')}">${item?.description || ''}</textarea>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="saveItem(${item?.id || 'null'})" class="btn-primary" style="flex: 1;">${t('btn.save')}</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">${t('btn.cancel')}</button>
        </div>
    `;
    
    openModal(html);
}

async function saveItem(id) {
    const code = document.getElementById('itemCode').value.trim();
    const name = document.getElementById('itemName').value.trim();
    const hsCode = document.getElementById('hsCode').value.trim();
    const unit = document.getElementById('unit').value;
    const category = document.getElementById('category').value.trim();
    const description = document.getElementById('description').value.trim();
    
    if (!code || !name) {
        alert(t('items.required'));
        return;
    }
    
    const data = {
        item_code: code,
        item_name: name,
        hs_code: hsCode,
        unit: unit,
        category: category,
        description: description
    };
    
    try {
        let result;
        if (id) {
            result = await dbUpdate('items', id, data);
            if (result.error) throw new Error(result.error);
            alert(t('items.updated'));
        } else {
            result = await dbInsert('items', data);
            if (result.error) throw new Error(result.error);
            alert(t('items.saved'));
        }
        
        closeModal();
        navigateTo('items');
        
    } catch (e) {
        console.error('Item save error:', e);
        alert(`${t('error.save_failed')}${e.message}`);
    }
}

async function editItem(item) {
    openItemModal(item);
}

async function deleteItem(id) {
    if (!confirm(t('confirm.delete'))) return;
    
    try {
        const result = await dbDelete('items', id);
        if (result.error) throw new Error(result.error);
        
        alert(t('items.deleted'));
        navigateTo('items');
        
    } catch (e) {
        console.error('Item delete error:', e);
        alert(`${t('error.delete_failed')}${e.message}`);
    }
}