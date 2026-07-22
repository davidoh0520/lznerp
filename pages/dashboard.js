// ===== Dashboard Page =====

async function renderDashboard(container) {
    try {
        const { data: items } = await dbSelect('items');
        const { data: partners } = await dbSelect('partners');
        const { data: purchases } = await dbSelect('purchases');
        const { data: exports } = await dbSelect('exports');
        const { data: payments } = await dbSelect('payments');
        
        const totalItems = items?.length || 0;
        const totalPartners = partners?.length || 0;
        const totalPurchases = purchases?.length || 0;
        const totalExports = exports?.length || 0;
        const paidPayments = payments?.filter(p => p.status === 'paid').length || 0;
        const pendingPayments = payments?.filter(p => p.status === 'pending').length || 0;
        
        const recentExports = (exports || []).slice(0, 5);
        const recentPayments = (payments || []).slice(0, 5);
        
        let html = `
            <div class="grid-4" style="margin-bottom: 24px;">
                <div class="stat-card">
                    <div class="stat-label">${t('dashboard.stat.items')}</div>
                    <div class="stat-number">${totalItems}</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-label">${t('dashboard.stat.partners')}</div>
                    <div class="stat-number">${totalPartners}</div>
                </div>
                <div class="stat-card yellow">
                    <div class="stat-label">${t('dashboard.stat.purchases')}</div>
                    <div class="stat-number">${totalPurchases}</div>
                </div>
                <div class="stat-card red">
                    <div class="stat-label">${t('dashboard.stat.exports')}</div>
                    <div class="stat-number">${totalExports}</div>
                </div>
            </div>
            
            <div class="grid-2" style="margin-bottom: 24px;">
                <div class="card">
                    <div class="card-title">${t('dashboard.payment_status')}</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <div style="font-size: 0.9rem; color: var(--gray-500);">${t('dashboard.paid')}</div>
                            <div style="font-size: 1.8rem; font-weight: 700; color: var(--success);">${paidPayments}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--gray-500);">${t('dashboard.pending')}</div>
                            <div style="font-size: 1.8rem; font-weight: 700; color: var(--danger);">${pendingPayments}</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-title">${t('dashboard.monthly_stats')}</div>
                    <canvas id="dashboardChart" style="height: 200px;"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-title" style="margin-bottom: 16px;">
                    ${t('dashboard.recent_exports')}
                    <a href="#exports" class="btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;">${t('dashboard.more')}</a>
                </div>
                ${renderRecentTable(recentExports, 'export')}
            </div>
            
            <div class="card" style="margin-top: 20px;">
                <div class="card-title" style="margin-bottom: 16px;">
                    ${t('dashboard.recent_payments')}
                    <a href="#payments" class="btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;">${t('dashboard.more')}</a>
                </div>
                ${renderRecentTable(recentPayments, 'payment')}
            </div>
        `;
        
        container.innerHTML = html;
        
        setTimeout(() => initDashboardChart(exports), 100);
        
    } catch (e) {
        console.error('Dashboard render error:', e);
        container.innerHTML = `<p class="text-center" style="color: var(--danger);">${t('error.load_failed')}${e.message}</p>`;
    }
}

function renderRecentTable(data, type) {
    if (!data || data.length === 0) {
        return `<p class="text-center" style="padding: 20px; color: var(--gray-500);">${t('no_data')}</p>`;
    }
    
    let html = '<div class="table-wrapper"><table><thead><tr>';
    
    if (type === 'export') {
        html += `
            <th>${t('dashboard.col.export_code')}</th>
            <th>${t('dashboard.col.partner')}</th>
            <th>${t('dashboard.col.status')}</th>
            <th>${t('dashboard.col.export_date')}</th>
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
            <th>${t('dashboard.col.payment_code')}</th>
            <th>${t('dashboard.col.amount')}</th>
            <th>${t('dashboard.col.currency')}</th>
            <th>${t('dashboard.col.status')}</th>
            <th>${t('dashboard.col.payment_date')}</th>
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
    if (!ctx || typeof Chart === 'undefined') return;
    
    const monthCounts = {};
    (exports || []).forEach(exp => {
        if (exp.export_date) {
            const d = new Date(exp.export_date);
            const month = d.toLocaleDateString(getLocale(), { month: 'short' });
            monthCounts[month] = (monthCounts[month] || 0) + 1;
        }
    });
    
    const months = Object.keys(monthCounts);
    const counts = Object.values(monthCounts);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.length > 0 ? months : ['Jan', 'Feb', 'Mar'],
            datasets: [{
                label: t('dashboard.export_count'),
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