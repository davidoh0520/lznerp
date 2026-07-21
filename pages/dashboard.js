// ===== 대시보드 페이지 =====
async function renderDashboard(container) {
    // 샘플 데이터 (실제로는 Supabase에서 조회)
    const stats = {
        totalPurchases: 12,
        totalExports: 8,
        pendingPayments: 3,
        totalAmount: 1425000
    };
    
    const recentPurchases = [
        { id: 'PO2607-01', supplier: '深圳市星火精密科技', date: '2026-07-06', amount: 3700, status: 'order' },
        { id: 'PO2607-02', supplier: '上海精密机械', date: '2026-07-10', amount: 5200, status: 'received' },
    ];
    
    const recentExports = [
        { id: 'EXP2607-01', buyer: 'iNEER Co., Ltd.', date: '2026-07-13', amount: 321365, status: 'invoiced' },
        { id: 'EXP2607-02', buyer: 'iNEER Co., Ltd.', date: '2026-07-08', amount: 28645, status: 'shipped' },
    ];
    
    let html = `
        <!-- 통계 카드 -->
        <div class="grid-4">
            <div class="stat-card">
                <div class="stat-number">${stats.totalPurchases}</div>
                <div class="stat-label">📥 총 매입 건수</div>
            </div>
            <div class="stat-card green">
                <div class="stat-number">${stats.totalExports}</div>
                <div class="stat-label">📤 총 수출 건수</div>
            </div>
            <div class="stat-card yellow">
                <div class="stat-number">${stats.pendingPayments}</div>
                <div class="stat-label">💰 미수금 건수</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${(stats.totalAmount/10000).toFixed(0)}만</div>
                <div class="stat-label">📊 총 거래 금액 (CNY)</div>
            </div>
        </div>
        
        <!-- 최근 매입 -->
        <div class="card">
            <div class="card-title">📋 최근 매입 내역</div>
            ${renderTable(
                [
                    { key: 'id', label: 'PO 번호' },
                    { key: 'supplier', label: '공급사' },
                    { key: 'date', label: '일자' },
                    { key: 'amount', label: '금액', format: (v) => formatCurrency(v) },
                    { key: 'status', label: '상태', format: (v) => getStatusBadge(v) }
                ],
                recentPurchases
            )}
        </div>
        
        <!-- 최근 수출 -->
        <div class="card">
            <div class="card-title">📋 최근 수출 내역</div>
            ${renderTable(
                [
                    { key: 'id', label: '수출 번호' },
                    { key: 'buyer', label: '바이어' },
                    { key: 'date', label: '일자' },
                    { key: 'amount', label: '금액', format: (v) => formatCurrency(v) },
                    { key: 'status', label: '상태', format: (v) => getStatusBadge(v) }
                ],
                recentExports
            )}
        </div>
    `;
    
    container.innerHTML = html;
}