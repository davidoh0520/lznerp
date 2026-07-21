// ===== 설정 페이지 =====
async function renderSettings(container) {
    const company = CONFIG.company;
    
    container.innerHTML = `
        <h2>⚙️ 설정</h2>
        
        <div class="card">
            <div class="card-title">🏢 회사 정보</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div><strong>회사명 (영문)</strong><br>${company.name}</div>
                <div><strong>회사명 (중문)</strong><br>${company.name_cn}</div>
                <div><strong>사업자등록번호</strong><br>${company.tax_id}</div>
                <div><strong>전화번호</strong><br>${company.phone}</div>
                <div style="grid-column:1/3;"><strong>주소</strong><br>${company.address}</div>
                <div style="grid-column:1/3;"><strong>은행</strong><br>${company.bank}</div>
                <div><strong>CNY 계좌</strong><br>${company.bank_account_cny}</div>
                <div><strong>USD 계좌</strong><br>${company.bank_account_usd}</div>
                <div><strong>Swift Code</strong><br>${company.swift}</div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-title">🔗 Supabase 연결 상태</div>
            <div id="supabaseStatus">
                <p>⏳ 확인 중...</p>
            </div>
        </div>
        
        <div class="card">
            <div class="card-title">📋 데이터 관리</div>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <button class="btn-secondary" onclick="exportData()">📤 데이터 내보내기</button>
                <button class="btn-secondary" onclick="importData()">📥 데이터 가져오기</button>
                <button class="btn-danger" onclick="clearData()">🗑️ 모든 데이터 초기화</button>
            </div>
        </div>
        
        <div class="card">
            <div class="card-title">📊 시스템 정보</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.95rem;">
                <div><strong>버전</strong></div>
                <div>LZN ERP v1.0</div>
                <div><strong>프레임워크</strong></div>
                <div>Vanilla JS + Supabase</div>
                <div><strong>배포</strong></div>
                <div>GitHub Pages</div>
                <div><strong>데이터베이스</strong></div>
                <div>Supabase (PostgreSQL)</div>
            </div>
        </div>
    `;
    
    // Supabase 연결 상태 확인
    checkSupabaseStatus();
}

// ===== Supabase 연결 상태 확인 =====
async function checkSupabaseStatus() {
    const statusEl = document.getElementById('supabaseStatus');
    
    try {
        const client = initSupabase();
        if (!client) {
            statusEl.innerHTML = `<p style="color: var(--danger);">❌ Supabase가 초기화되지 않았습니다. config.js를 확인하세요.</p>`;
            return;
        }
        
        // 간단한 연결 테스트 (items 테이블 존재 여부 확인)
        const { error } = await client.from('items').select('id').limit(1);
        
        if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
            statusEl.innerHTML = `
                <p style="color: var(--warning);">⚠️ Supabase 연결은 되었으나 테이블이 없습니다.</p>
                <p style="font-size:0.9rem; color: var(--gray-500);">
                    SQL 스크립트를 실행하여 테이블을 생성해주세요.
                </p>
            `;
        } else if (error) {
            statusEl.innerHTML = `<p style="color: var(--danger);">❌ 연결 오류: ${error.message}</p>`;
        } else {
            statusEl.innerHTML = `<p style="color: var(--success);">✅ Supabase 연결 성공!</p>`;
        }
    } catch (e) {
        statusEl.innerHTML = `<p style="color: var(--danger);">❌ 연결 실패: ${e.message}</p>`;
    }
}

// ===== 데이터 내보내기 =====
function exportData() {
    // localStorage에서 데이터 가져오기 (실제로는 Supabase에서 조회)
    const data = {
        items: loadLocal('items') || [],
        partners: loadLocal('partners') || [],
        purchases: loadLocal('purchases') || [],
        exports: loadLocal('exports') || [],
        payments: loadLocal('payments') || [],
        documents: loadLocal('documents') || [],
        exported_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LZN_ERP_Backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('📤 데이터가 내보내기 되었습니다.');
}

// ===== 데이터 가져오기 =====
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                // 데이터 저장 (로컬스토리지)
                if (data.items) saveLocal('items', data.items);
                if (data.partners) saveLocal('partners', data.partners);
                if (data.purchases) saveLocal('purchases', data.purchases);
                if (data.exports) saveLocal('exports', data.exports);
                if (data.payments) saveLocal('payments', data.payments);
                if (data.documents) saveLocal('documents', data.documents);
                
                showToast('✅ 데이터 가져오기 완료!');
                navigateTo('settings');
            } catch (err) {
                alert('❌ 잘못된 파일 형식입니다.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ===== 모든 데이터 초기화 =====
function clearData() {
    if (confirm('⚠️ 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다!')) {
        if (confirm('정말로 삭제하시겠습니까? 다시 한 번 확인해주세요.')) {
            // 로컬스토리지 데이터 삭제
            localStorage.removeItem('lzn_items');
            localStorage.removeItem('lzn_partners');
            localStorage.removeItem('lzn_purchases');
            localStorage.removeItem('lzn_exports');
            localStorage.removeItem('lzn_payments');
            localStorage.removeItem('lzn_documents');
            
            showToast('🗑️ 모든 데이터가 초기화되었습니다.');
            navigateTo('settings');
        }
    }
}