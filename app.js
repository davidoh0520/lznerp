// ===== LZN ERP - Main Application =====

// Run after page load
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    // Apply i18n to static HTML
    applyI18n();

    // Supabase init
    initSupabase();
    
    // Navigation events
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            navigateTo(page);
        });
    });
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', function() {
        const currentPage = document.querySelector('.nav-menu a.active')?.dataset?.page || 'dashboard';
        navigateTo(currentPage);
    });
    
    // Modal close
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm(t('confirm.logout'))) {
            alert(t('alert.logout'));
        }
    });
    
    // Default page: dashboard
    navigateTo('dashboard');
}

// ===== Language Switcher =====
function switchLang(lang) {
    setLang(lang);
    // Re-render current page content
    const currentPage = document.querySelector('.nav-menu a.active')?.dataset?.page || 'dashboard';
    // Update page title
    const titles = {
        dashboard: 'page.dashboard',
        items: 'page.items',
        partners: 'page.partners',
        purchases: 'page.purchases',
        exports: 'page.exports',
        payments: 'page.payments',
        documents: 'page.documents',
        settings: 'page.settings'
    };
    const titleKey = titles[currentPage];
    if (titleKey) document.getElementById('pageTitle').textContent = t(titleKey);
    // Re-render dynamic content
    navigateTo(currentPage);
}

// ===== Page Navigation =====
async function navigateTo(page) {
    // Activate nav link
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) link.classList.add('active');
    });
    
    // Page title
    const titles = {
        dashboard: 'page.dashboard',
        items: 'page.items',
        partners: 'page.partners',
        purchases: 'page.purchases',
        exports: 'page.exports',
        payments: 'page.payments',
        documents: 'page.documents',
        settings: 'page.settings'
    };
    document.getElementById('pageTitle').textContent = t(titles[page] || page);
    
    // Load page content
    const content = document.getElementById('pageContent');
    
    // Loading indicator
    content.innerHTML = `<div class="text-center" style="padding: 40px;">${t('loading')}</div>`;
    
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
                content.innerHTML = `<p>${t('error.page_not_found')}</p>`;
        }
        applyI18n();
    } catch (e) {
        console.error(e);
        content.innerHTML = `<p class="text-center" style="color: var(--danger);">${t('error.occurred')}${e.message}</p>`;
    }
}

// ===== Modal =====
function openModal(html) {
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
    applyI18n();
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ===== Common Table Rendering =====
function renderTable(columns, data, actions = null) {
    if (!data || data.length === 0) {
        return `<p class="text-center" style="padding: 20px; color: var(--gray-500);">${t('no_data')}</p>`;
    }
    
    let html = '<div class="table-wrapper"><table><thead><tr>';
    columns.forEach(col => {
        html += `<th>${col.label}</th>`;
    });
    if (actions) html += `<th>${t('col.manage')}</th>`;
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

// ===== Toast / Alert =====
function showToast(message, type = 'info') {
    alert(message);
}