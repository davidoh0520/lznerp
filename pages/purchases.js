// ===== 매입 관리 페이지 =====

async function renderPurchases(container) {
    try {
        const { data: purchases } = await dbSelect('purchases');
        
        let html = `
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button onclick="openPurchaseModal()" class="btn-primary">➕ 새 매입 추가</button>
                <select id="purchaseStatusFilter" onchange="filterPurchasesTable()" style="max-width: 150px;">
                    <option value="">전체 상태</option>
                    <option value="draft">임시</option>
                    <option value="order">오더</option>
                    <option value="received">입고완료</option>
                    <option value="completed">완료</option>
                </select>
            </div>
            
            <div id="purchasesTableContainer">
                ${renderPurchasesTable(purchases || [])}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('매입 렌더링 에러:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">❌ 매입 로드 실패: ${e.message}</p>`;
    }
}

function renderPurchasesTable(purchases) {
    if (!purchases || purchases.length === 0) {
        return '<p class="text-center" style="padding: 40px; color: var(--gray-500);">📭 매입 정보가 없습니다.</p>';
    }
    
    let html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>PO 번호</th>
                        <th>거래처</th>
                        <th>상태</th>
                        <th>PO 날짜</th>
                        <th>배송 예정일</th>
                        <th>합계</th>
                        <th>관리</th>
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
                    <button onclick='editPurchase(${JSON.stringify(purchase).replace(/'/g, "&apos;")})' class="btn-warning" style="margin-right: 4px; padding: 4px 8px; font-size: 0.8rem;">✏️ 수정</button>
                    <button onclick="deletePurchase(${purchase.id})" class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">🗑️ 삭제</button>
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
        <h2>${isEdit ? '매입 수정' : '새 매입 추가'}</h2>
        
        <div class="form-group">
            <label>PO 번호</label>
            <input type="text" id="poNumber" value="${purchase?.po_number || ''}" 
                ${isEdit ? 'disabled' : ''} placeholder="예: PO-240701-001">
        </div>
        
        <div class="form-group">
            <label>거래처</label>
            <input type="number" id="partnerId" value="${purchase?.partner_id || ''}" placeholder="거래처 ID">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>상태</label>
                <select id="status">
                    <option value="draft" ${purchase?.status === 'draft' ? 'selected' : ''}>임시</option>
                    <option value="order" ${purchase?.status === 'order' ? 'selected' : ''}>오더</option>
                    <option value="received" ${purchase?.status === 'received' ? 'selected' : ''}>입고완료</option>
                    <option value="completed" ${purchase?.status === 'completed' ? 'selected' : ''}>완료</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>통화</label>
                <select id="currency">
                    <option value="CNY" ${purchase?.currency === 'CNY' ? 'selected' : ''}>CNY (¥)</option>
                    <option value="USD" ${purchase?.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                    <option value="EUR" ${purchase?.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                </select>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>PO 날짜</label>
                <input type="date" id="poDate" value="${purchase?.po_date || ''}">
            </div>
            
            <div class="form-group">
                <label>배송 예정일</label>
                <input type="date" id="deliveryDate" value="${purchase?.delivery_date || ''}">
            </div>
        </div>
        
        <div class="form-group">
            <label>합계 금액</label>
            <input type="number" id="totalAmount" value="${purchase?.total_amount || ''}" placeholder="0.00" step="0.01">
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="savePurchase(${purchase?.id || 'null'})" class="btn-primary" style="flex: 1;">💾 저장</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">❌ 취소</button>
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
        alert('❌ PO 번호와 거래처는 필수입니다.');
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
            alert('✅ 매입이 수정되었습니다.');
        } else {
            result = await dbInsert('purchases', data);
            if (result.error) throw new Error(result.error);
            alert('✅ 매입이 추가되었습니다.');
        }
        
        closeModal();
        navigateTo('purchases');
        
    } catch (e) {
        console.error('매입 저장 에러:', e);
        alert(`❌ 저장 실패: ${e.message}`);
    }
}

async function editPurchase(purchase) {
    openPurchaseModal(purchase);
}

async function deletePurchase(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const result = await dbDelete('purchases', id);
        if (result.error) throw new Error(result.error);
        
        alert('✅ 매입이 삭제되었습니다.');
        navigateTo('purchases');
        
    } catch (e) {
        console.error('매입 삭제 에러:', e);
        alert(`❌ 삭제 실패: ${e.message}`);
    }
}