// ===== 수금 관리 페이지 =====

async function renderPayments(container) {
    try {
        const { data: payments } = await dbSelect('payments');
        
        let html = `
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button onclick="openPaymentModal()" class="btn-primary">➕ 새 수금 추가</button>
                <select id="paymentStatusFilter" onchange="filterPaymentsTable()" style="max-width: 150px;">
                    <option value="">전체 상태</option>
                    <option value="pending">미수금</option>
                    <option value="partial">부분수금</option>
                    <option value="paid">수금완료</option>
                </select>
            </div>
            
            <div id="paymentsTableContainer">
                ${renderPaymentsTable(payments || [])}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('수금 렌더링 에러:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">❌ 수금 로드 실패: ${e.message}</p>`;
    }
}

function renderPaymentsTable(payments) {
    if (!payments || payments.length === 0) {
        return '<p class="text-center" style="padding: 40px; color: var(--gray-500);">📭 수금 정보가 없습니다.</p>';
    }
    
    let html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>수금 코드</th>
                        <th>수출 ID</th>
                        <th>금액</th>
                        <th>통화</th>
                        <th>상태</th>
                        <th>수금일</th>
                        <th>관리</th>
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
                    <button onclick='editPayment(${JSON.stringify(payment).replace(/'/g, "&apos;")})' class="btn-warning" style="margin-right: 4px; padding: 4px 8px; font-size: 0.8rem;">✏️ 수정</button>
                    <button onclick="deletePayment(${payment.id})" class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">🗑️ 삭제</button>
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
        <h2>${isEdit ? '수금 수정' : '새 수금 추가'}</h2>
        
        <div class="form-group">
            <label>수금 코드</label>
            <input type="text" id="paymentCode" value="${payment?.payment_code || ''}" 
                ${isEdit ? 'disabled' : ''} placeholder="예: PAY-240701-001">
        </div>
        
        <div class="form-group">
            <label>수출 ID</label>
            <input type="number" id="exportId" value="${payment?.export_id || ''}" placeholder="수출 ID">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>금액</label>
                <input type="number" id="amount" value="${payment?.amount || ''}" placeholder="0.00" step="0.01">
            </div>
            
            <div class="form-group">
                <label>통화</label>
                <select id="currency">
                    <option value="CNY" ${payment?.currency === 'CNY' ? 'selected' : ''}>CNY (¥)</option>
                    <option value="USD" ${payment?.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                    <option value="EUR" ${payment?.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                </select>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>상태</label>
                <select id="status">
                    <option value="pending" ${payment?.status === 'pending' ? 'selected' : ''}>미수금</option>
                    <option value="partial" ${payment?.status === 'partial' ? 'selected' : ''}>부분수금</option>
                    <option value="paid" ${payment?.status === 'paid' ? 'selected' : ''}>수금완료</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>수금일</label>
                <input type="date" id="paymentDate" value="${payment?.payment_date || ''}">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>결제 방법</label>
                <select id="paymentMethod">
                    <option value="" ${!payment?.payment_method ? 'selected' : ''}>선택</option>
                    <option value="wire_transfer" ${payment?.payment_method === 'wire_transfer' ? 'selected' : ''}>해외송금</option>
                    <option value="check" ${payment?.payment_method === 'check' ? 'selected' : ''}>수표</option>
                    <option value="letter_of_credit" ${payment?.payment_method === 'letter_of_credit' ? 'selected' : ''}>신용장</option>
                    <option value="other" ${payment?.payment_method === 'other' ? 'selected' : ''}>기타</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>은행 참조번호</label>
                <input type="text" id="bankReference" value="${payment?.bank_reference || ''}" placeholder="참조번호">
            </div>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="savePayment(${payment?.id || 'null'})" class="btn-primary" style="flex: 1;">💾 저장</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">❌ 취소</button>
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
        alert('❌ 수금 코드와 수출 ID는 필수입니다.');
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
            alert('✅ 수금이 수정되었습니다.');
        } else {
            result = await dbInsert('payments', data);
            if (result.error) throw new Error(result.error);
            alert('✅ 수금이 추가되었습니다.');
        }
        
        closeModal();
        navigateTo('payments');
        
    } catch (e) {
        console.error('수금 저장 에러:', e);
        alert(`❌ 저장 실패: ${e.message}`);
    }
}

async function editPayment(payment) {
    openPaymentModal(payment);
}

async function deletePayment(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const result = await dbDelete('payments', id);
        if (result.error) throw new Error(result.error);
        
        alert('✅ 수금이 삭제되었습니다.');
        navigateTo('payments');
        
    } catch (e) {
        console.error('수금 삭제 에러:', e);
        alert(`❌ 삭제 실패: ${e.message}`);
    }
}