// ===== 거래처 관리 페이지 =====

async function renderPartners(container) {
    try {
        const { data: partners } = await dbSelect('partners');
        
        let html = `
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button onclick="openPartnerModal()" class="btn-primary">➕ 새 거래처 추가</button>
                <input type="text" id="partnerSearch" placeholder="거래처명 또는 국가 검색..." 
                    style="flex: 1; max-width: 300px;"
                    onkeyup="filterPartnersTable()">
            </div>
            
            <div id="partnersTableContainer">
                ${renderPartnersTable(partners || [])}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('거래처 렌더링 에러:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">❌ 거래처 로드 실패: ${e.message}</p>`;
    }
}

function renderPartnersTable(partners) {
    if (!partners || partners.length === 0) {
        return '<p class="text-center" style="padding: 40px; color: var(--gray-500);">📭 거래처가 없습니다.</p>';
    }
    
    let html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>거래처 코드</th>
                        <th>거래처명</th>
                        <th>국가</th>
                        <th>담당자</th>
                        <th>이메일</th>
                        <th>전화</th>
                        <th>관리</th>
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
                    <button onclick='editPartner(${JSON.stringify(partner).replace(/'/g, "&apos;")})' class="btn-warning" style="margin-right: 4px; padding: 4px 8px; font-size: 0.8rem;">✏️ 수정</button>
                    <button onclick="deletePartner(${partner.id})" class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">🗑️ 삭제</button>
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
        <h2>${isEdit ? '거래처 수정' : '새 거래처 추가'}</h2>
        
        <div class="form-group">
            <label>거래처 코드</label>
            <input type="text" id="partnerCode" value="${partner?.partner_code || ''}" 
                ${isEdit ? 'disabled' : ''} placeholder="예: PARTNER-001">
        </div>
        
        <div class="form-group">
            <label>거래처명</label>
            <input type="text" id="partnerName" value="${partner?.partner_name || ''}" placeholder="거래처 이름">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>국가</label>
                <input type="text" id="country" value="${partner?.country || ''}" placeholder="중국, 미국 등">
            </div>
            
            <div class="form-group">
                <label>담당자</label>
                <input type="text" id="contactPerson" value="${partner?.contact_person || ''}" placeholder="담당자명">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>이메일</label>
                <input type="email" id="email" value="${partner?.email || ''}" placeholder="example@company.com">
            </div>
            
            <div class="form-group">
                <label>전화</label>
                <input type="tel" id="phone" value="${partner?.phone || ''}" placeholder="+86-130-6261-9570">
            </div>
        </div>
        
        <div class="form-group">
            <label>주소</label>
            <textarea id="address" placeholder="회사 주소">${partner?.address || ''}</textarea>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="savePartner(${partner?.id || 'null'})" class="btn-primary" style="flex: 1;">💾 저장</button>
            <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">❌ 취소</button>
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
        alert('❌ 거래처 코드와 거래처명은 필수입니다.');
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
            // 수정
            result = await dbUpdate('partners', id, data);
            if (result.error) throw new Error(result.error);
            alert('✅ 거래처가 수정되었습니다.');
        } else {
            // 새로 추가
            result = await dbInsert('partners', data);
            if (result.error) throw new Error(result.error);
            alert('✅ 거래처가 추가되었습니다.');
        }
        
        closeModal();
        navigateTo('partners');
        
    } catch (e) {
        console.error('거래처 저장 에러:', e);
        alert(`❌ 저장 실패: ${e.message}`);
    }
}

async function editPartner(partner) {
    openPartnerModal(partner);
}

async function deletePartner(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const result = await dbDelete('partners', id);
        if (result.error) throw new Error(result.error);
        
        alert('✅ 거래처가 삭제되었습니다.');
        navigateTo('partners');
        
    } catch (e) {
        console.error('거래처 삭제 에러:', e);
        alert(`❌ 삭제 실패: ${e.message}`);
    }
}