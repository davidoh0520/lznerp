// ===== 품목 관리 페이지 =====

async function renderItems(container) {
    try {
        const { data: items } = await dbSelect('items');
        
        let html = `
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button onclick="openItemModal()" class="btn-primary">➕ 새 품목 추가</button>
                <input type="text" id="itemSearch" placeholder="품목명 또는 코드 검색..." 
                    style="flex: 1; max-width: 300px;"
                    onkeyup="filterItemsTable()">
            </div>
            
            <div id="itemsTableContainer">
                ${renderItemsTable(items || [])}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('품목 렌더링 에러:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">❌ 품목 로드 실패: ${e.message}</p>`;
    }
}

function renderItemsTable(items) {
    if (!items || items.length === 0) {
        return '<p class="text-center" style="padding: 40px; color: var(--gray-500);">📭 품목이 없습니다.</p>';
    }
    
    let html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>품목 코드</th>
                        <th>품목명</th>
                        <th>HS 코드</th>
                        <th>단위</th>
                        <th>분류</th>
                        <th>관리</th>
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
                    <button onclick='editItem(${JSON.stringify(item).replace(/'/g, "&apos;")})' class="btn-warning" style="margin-right: 4px; padding: 4px 8px; font-size: 0.8rem;">✏️ 수정</button>
                    <button onclick="deleteItem(${item.id})" class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">🗑️ 삭제</button>
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
        <h2>${isEdit ? '품목 수정' : '새 품목 추가'}</h2>
        
        <div class="form-group">
            <label>품목 코드</label>
            <input type="text" id="itemCode" value="${item?.item_code || ''}" 
                ${isEdit ? 'disabled' : ''} placeholder="예: ITEM-001">
        </div>
        
        <div class="form-group">
            <label>품목명</label>
            <input type="text" id="itemName" value="${item?.item_name || ''}" placeholder="의료 기계 부품">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>HS 코드</label>
                <input type="text" id="hsCode" value="${item?.hs_code || ''}" placeholder="8466.91-0000">
            </div>
            
            <div class="form-group">
                <label>단위</label>
                <select id="unit">
                    <option value="EA" ${item?.unit === 'EA' ? 'selected' : ''}>개 (EA)</option>
                    <option value="KG" ${item?.unit === 'KG' ? 'selected' : ''}>킬로그램 (KG)</option>
                    <option value="SET" ${item?.unit === 'SET' ? 'selected' : ''}>세트 (SET)</option>
                    <option value="BOX" ${item?.unit === 'BOX' ? 'selected' : ''}>상자 (BOX)</option>
                </select>
            </div>
        </div>
        
        <div class="form-group">
            <label>분류</label>
            <input type="text" id="category" value="${item?.category || ''}" placeholder="전자부품">
        </div>
        
        <div class="form-group">
            <label>설명</label>
            <textarea id="description" placeholder="상세 설명...">${item?.description || ''}</textarea>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="saveItem(${item?.id || 'null'})" class="btn-primary" style="flex: 1;">💾 저장</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">❌ 취소</button>
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
        alert('❌ 품목 코드와 품목명은 필수입니다.');
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
            // 수정
            result = await dbUpdate('items', id, data);
            if (result.error) throw new Error(result.error);
            alert('✅ 품목이 수정되었습니다.');
        } else {
            // 새로 추가
            result = await dbInsert('items', data);
            if (result.error) throw new Error(result.error);
            alert('✅ 품목이 추가되었습니다.');
        }
        
        closeModal();
        navigateTo('items');
        
    } catch (e) {
        console.error('품목 저장 에러:', e);
        alert(`❌ 저장 실패: ${e.message}`);
    }
}

async function editItem(item) {
    openItemModal(item);
}

async function deleteItem(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const result = await dbDelete('items', id);
        if (result.error) throw new Error(result.error);
        
        alert('✅ 품목이 삭제되었습니다.');
        navigateTo('items');
        
    } catch (e) {
        console.error('품목 삭제 에러:', e);
        alert(`❌ 삭제 실패: ${e.message}`);
    }
}