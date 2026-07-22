// ===== 설정 페이지 =====

async function renderSettings(container) {
    try {
        let html = `
            <div class="card">
                <h2 style="margin-bottom: 20px;">⚙️ 설정</h2>
                
                <div style="border-bottom: 1px solid var(--gray-200); padding-bottom: 24px; margin-bottom: 24px;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 16px;">🏢 회사 정보</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>회사명 (영문)</label>
                            <input type="text" id="companyName" value="${CONFIG.company.name}" readonly>
                        </div>
                        <div class="form-group">
                            <label>회사명 (중문)</label>
                            <input type="text" id="companyNameCn" value="${CONFIG.company.name_cn}" readonly>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>세금번호</label>
                            <input type="text" id="taxId" value="${CONFIG.company.tax_id}" readonly>
                        </div>
                        <div class="form-group">
                            <label>전화</label>
                            <input type="tel" id="phone" value="${CONFIG.company.phone}" readonly>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>주소 (중문)</label>
                        <textarea id="address" readonly>${CONFIG.company.address}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>주소 (영문)</label>
                        <textarea id="addressEn" readonly>${CONFIG.company.address_en}</textarea>
                    </div>
                </div>
                
                <div style="border-bottom: 1px solid var(--gray-200); padding-bottom: 24px; margin-bottom: 24px;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 16px;">🏦 은행 정보</h3>
                    
                    <div class="form-group">
                        <label>은행명</label>
                        <input type="text" id="bankName" value="${CONFIG.company.bank}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label>은행명 (영문)</label>
                        <input type="text" id="bankNameEn" value="${CONFIG.company.bank_en}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label>은행 주소</label>
                        <textarea id="bankAddress" readonly>${CONFIG.company.bank_address}</textarea>
                    </div>
                    
                    <div class="grid-3">
                        <div class="form-group">
                            <label>계좌 (CNY)</label>
                            <input type="text" id="accountCny" value="${CONFIG.company.bank_account_cny}" readonly>
                        </div>
                        <div class="form-group">
                            <label>계좌 (KRW)</label>
                            <input type="text" id="accountKrw" value="${CONFIG.company.bank_account_krw}" readonly>
                        </div>
                        <div class="form-group">
                            <label>계좌 (USD)</label>
                            <input type="text" id="accountUsd" value="${CONFIG.company.bank_account_usd}" readonly>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>SWIFT 코드</label>
                        <input type="text" id="swift" value="${CONFIG.company.swift}" readonly>
                    </div>
                </div>
                
                <div>
                    <h3 style="font-size: 1.1rem; margin-bottom: 16px;">💾 데이터 관리</h3>
                    
                    <div style="display: flex; gap: 12px;">
                        <button onclick="exportData()" class="btn-primary">📥 데이터 내보내기 (JSON)</button>
                        <button onclick="clearLocalData()" class="btn-danger">🗑️ 로컬 캐시 삭제</button>
                    </div>
                    
                    <div style="background: var(--gray-100); padding: 12px; border-radius: var(--radius); margin-top: 12px; font-size: 0.9rem; color: var(--gray-600);">
                        <strong>ℹ️ 참고:</strong> 로컬 캐시 삭제는 브라우저에 저장된 임시 데이터만 삭제합니다. Supabase의 데이터는 유지됩니다.
                    </div>
                </div>
                
                <div style="background: var(--gray-50); padding: 16px; border-radius: var(--radius); margin-top: 24px; border-left: 4px solid var(--warning);">
                    <strong>ℹ️ 시스템 정보</strong>
                    <p style="margin: 8px 0; font-size: 0.9rem; color: var(--gray-600);">
                        <strong>앱 버전:</strong> 1.0.0<br>
                        <strong>Supabase URL:</strong> ${CONFIG.supabase.url}<br>
                        <strong>마지막 업데이트:</strong> ${new Date().toLocaleString('ko-KR')}
                    </p>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error('설정 렌더링 에러:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">❌ 설정 로드 실패: ${e.message}</p>`;
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
        
        alert('✅ 데이터가 내보내졌습니다.');
        
    } catch (e) {
        console.error('데이터 내보내기 에러:', e);
        alert(`❌ 내보내기 실패: ${e.message}`);
    }
}

function clearLocalData() {
    if (!confirm('로컬 캐시를 정말 삭제하시겠습니까?\n(Supabase의 데이터는 유지됩니다)')) return;
    
    // localStorage에서 lzn_ 프리픽스로 시작하는 모든 항목 삭제
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('lzn_')) {
            localStorage.removeItem(key);
        }
    });
    
    alert('✅ 로컬 캐시가 삭제되었습니다.');
}