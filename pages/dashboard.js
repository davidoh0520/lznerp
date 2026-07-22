// ===== 대시보드 페이지 =====

async function renderDashboard(container) {
    try {
        // 데이터 조회
        const { data: items } = await dbSelect('items');
        const { data: partners } = await dbSelect('partners');
        const { data: purchases } = await dbSelect('purchases');
        const { data: exports } = await dbSelect('exports');
        const { data: payments } = await dbSelect('payments');
        
        // 통계 계산
        const totalItems = items?.length || 0;
        const totalPartners = partners?.length || 0;
        const totalPurchases = purchases?.length || 0;
        const totalExports = exports?.length || 0;
        const paidPayments = payments?.filter(p => p.status === 'paid').length || 0;
        const pendingPayments = payments?.filter(p => p.status === 'pending').length || 0;
        
        // 최근 수출 목록
        const recentExports = (exports || []).slice(0, 5);
        
        // 최근 수금 목록
        const recentPayments = (payments || []).slice(0, 5);
        
        let html = `
            <div class="grid-4" style="margin-bottom: 24px;">
                <div class="stat-card">
                    <div class="stat-label">📦 품목 수</div>
                    <div class="stat-number">${totalItems}</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-label">🏢 거래처 수</div>
                    <div class="stat-number">${totalPartners}</div>
                </div>
                <div class="stat-card yellow">
                    <div class="stat-label">📥 매입 건수</div>
                    <div class="stat-number">${totalPurchases}</div>
                </div>
                <div class="stat-card red">
                    <div class="stat-label">📤 수출 건수</div>
                    <div class="stat-number">${totalExports}</div>
                </div>
            </div>
            
            <div class="grid-2" style="margin-bottom: 24px;">
                <div class="card">
                    <div class="card-title">💰 수금 현황</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <div style="font-size: 0.9rem; color: var(--gray-500);">✅ 수금완료</div>
                            <div style="font-size: 1.8rem; font-weight: 700; color: var(--success);">${paidPayments}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--gray-500);">⏳ 미수금</div>
                            <div style="font-size: 1.8rem; font-weight: 700; color: var(--danger);">${pendingPayments}</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-title">📊 월별 통계</div>
                    <canvas id="dashboardChart" style="height: 200px;"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-title" style="margin-bottom: 16px;">
                    📤 최근 수출
                    <a href="#exports" class="btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;">더보기</a>
                </div>
                ${renderRecentTable(recentExports, 'export')}
            </div>
            
            <div class="card" style="margin-top: 20px;">
                <div class="card-title" style="margin-bottom: 16px;">
                    💰 최근 수금
                    <a href="#payments" class="btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;">더보기</a>
                </div>
                ${renderRecentTable(recentPayments, 'payment')}
            </div>
        `;
        
        container.innerHTML = html;
        
        // 차트 초기화
        setTimeout(() => initDashboardChart(exports), 100);
        
    } catch (e) {
        console.error('대시보드 렌더링 에러:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">❌ 대시보드 로드 실패: ${e.message}</p>`;
    }
}

function renderRecentTable(data, type) {
    if (!data || data.length === 0) {
        return '<p class="text-center" style="padding: 20px; color: var(--gray-500);">📭 데이터가 없습니다.</p>';
    }
    
    let html = '<div class="table-wrapper"><table><thead><tr>';
    
    if (type === 'export') {
        html += `
            <th>수출 코드</th>
            <th>거래처</th>
            <th>상태</th>
            <th>수출 날짜</th>
        </tr></thead><tbody>
        `;
        
        data.forEach(row => {
            html += `
                <tr>
                    <td><strong>${row.export_code || '-'}</strong></td>
                    <td>${row.partner_id || '-'}</td>
                    <td>${getStatusBadge(row.status)}</td>
                    <td>${formatDate(row.export_date)}</td>
                </tr>
            `;
        });
    } else if (type === 'payment') {
        html += `
            <th>수금 코드</th>
            <th>금액</th>
            <th>통화</th>
            <th>상태</th>
            <th>수금 날짜</th>
        </tr></thead><tbody>
        `;
        
        data.forEach(row => {
            html += `
                <tr>
                    <td><strong>${row.payment_code || '-'}</strong></td>
                    <td>${formatCurrency(row.amount, row.currency)}</td>
                    <td>${row.currency}</td>
                    <td>${getStatusBadge(row.status)}</td>
                    <td>${formatDate(row.payment_date)}</td>
                </tr>
            `;
        });
    }
    
    html += '</tbody></table></div>';
    return html;
}

function initDashboardChart(exports) {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx) return;
    
    // 월별 수출 건수 계산
    const monthCounts = {};
    (exports || []).forEach(exp => {
        if (exp.export_date) {
            const month = new Date(exp.export_date).toLocaleDateString('ko-KR', { month: 'short' });
            monthCounts[month] = (monthCounts[month] || 0) + 1;
        }
    });
    
    const months = Object.keys(monthCounts);
    const counts = Object.values(monthCounts);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.length > 0 ? months : ['1월', '2월', '3월'],
            datasets: [{
                label: '수출 건수',
                data: counts.length > 0 ? counts : [0, 0, 0],
                backgroundColor: 'rgba(37, 99, 235, 0.6)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}