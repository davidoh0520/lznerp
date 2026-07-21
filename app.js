// ===== LZN ERP - 메인 애플리케이션 =====

// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    // Supabase 초기화
    initSupabase();
    
    // 네비게이션 이벤트
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            navigateTo(page);
        });
    });
    
    // 새로고침 버튼
    document.getElementById('refreshBtn').addEventListener('click', function() {
        const currentPage = document.querySelector('.nav-menu a.active')?.dataset?.page || 'dashboard';
        navigateTo(currentPage);
    });
    
    // 모달 닫기
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    
    // 로그아웃
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('로그아웃 하시겠습니까?')) {
            alert('로그아웃 되었습니다.');
        }
    });
    
    // 기본 페이지: 대시보드
    navigateTo('dashboard');
}

// ===== 페이지 네비게이션 =====
async function navigateTo(page) {
    // 네비게이션 활성화
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) link.classList.add('active');
    });
    
    // 페이지 타이틀 변경
    const titles = {
        dashboard: '📊 대시보드',
        items: '📦 품목 관리',
        partners: '🏢 거래처 관리',
        purchases: '📥 매입 관리',
        exports: '📤 수출 관리',
        payments: '💰 수금 관리',
        documents: '📎 서류 관리',
        settings: '⚙️ 설정'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;
    
    // 페이지 내용 로드
    const content = document.getElementById('pageContent');
    
    // 로딩 표시
    content.innerHTML = '<div class="text-center" style="padding: 40px;">⏳ 로딩 중...</div>';
    
    try {
        switch(page) {
            case 'dashboard':
                await renderDashboard(content);
                break;
            case 'items':
                await renderItems(content);
                break;
            case 'partners':
                await renderPartners(content);
                break;
            case 'purchases':
                await renderPurchases(content);
                break;
            case 'exports':
                await renderExports(content);
                break;
            case 'payments':
                await renderPayments(content);
                break;
            case 'documents':
                await renderDocuments(content);
                break;
            case 'settings':
                await renderSettings(content);
                break;
            default:
                content.innerHTML = '<p>페이지를 찾을 수 없습니다.</p>';
        }
    } catch (e) {
        console.error(e);
        content.innerHTML = `<p class="text-center" style="color: var(--danger);">❌ 오류가 발생했습니다: ${e.message}</p>`;
    }
}

// ===== 모달 =====
function openModal(html) {
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ===== 공통 테이블 렌더링 =====
function renderTable(columns, data, actions = null) {
    if (!data || data.length === 0) {
        return '<p class="text-center" style="padding: 20px; color: var(--gray-500);">📭 데이터가 없습니다.</p>';
    }
    
    let html = '<div class="table-wrapper"><table><thead><tr>';
    columns.forEach(col => {
        html += `<th>${col.label}</th>`;
    });
    if (actions) html += '<th>관리</th>';
    html += '</tr></thead><tbody>';
    
    data.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            let val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '-';
            if (col.format) val = col.format(val, row);
            html += `<td>${val}</td>`;
        });
        if (actions) {
            html += `<td>${actions(row)}</td>`;
        }
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    return html;
}

// ===== 알림 =====
function showToast(message, type = 'info') {
    alert(message);
}