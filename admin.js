const adminState = { transactions: [], items: [], orders: [], invoices: [], drawings: [], notifications: [], accessMembers: [], suppliers: [], company: null, page: 'dashboard', poLines: 1 };

document.addEventListener('DOMContentLoaded', initAdmin);

async function initAdmin() {
  const root = document.getElementById('adminRoot');
  try {
    const activeSession = await ERP.session();
    if (!activeSession) return renderAdminLogin(root);
    if (!(await ERP.isAdmin())) return renderAccessDenied(root, activeSession.user.email);
    await loadAdminData();
    renderAdminShell(root, activeSession.user.email);
    renderAdminPage('dashboard');
    if (!ERP.passwordLoginReady(activeSession)) setTimeout(() => ERP.openPasswordSetup(), 0);
  } catch (error) {
    root.innerHTML = `<div class="empty"><h2>데이터 연결 오류</h2><p>${ERP.escapeHtml(error.message)}</p><a class="btn btn-soft" href="portal.html">포털로 돌아가기</a></div>`;
  }
}

function renderAdminLogin(root) {
  root.className = 'landing';
  root.innerHTML = `
    <div class="landing-shell" style="max-width:620px;padding-top:10vh">
      <a class="brand" href="portal.html"><span class="brand-mark">LZ</span><span>LZN ERP <small>ADMIN ACCESS</small></span></a>
      <div class="access-card" style="margin-top:45px">
        <h2>관리자 로그인</h2>
        <p>이메일을 아이디로 사용해 로그인합니다.</p>
        <form class="auth-login-grid" onsubmit="loginAdmin(event)">
          <input id="adminEmail" type="email" autocomplete="username" value="${ERP.escapeHtml(ERP.rememberedEmail())}" placeholder="이메일 아이디" required>
          <input id="adminPassword" type="password" autocomplete="current-password" placeholder="비밀번호" required>
          <button class="btn btn-primary" type="submit">로그인</button>
        </form>
        <div class="auth-note">비밀번호를 설정한 계정만 로그인할 수 있습니다. 관리자 계정이 아니면 내부 데이터에 접근할 수 없습니다.</div>
      </div>
    </div>`;
}

async function loginAdmin(event) {
  event.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  if (!email || !password) return ERP.toast('이메일과 비밀번호를 입력해 주세요.', 'error');
  try { await ERP.signInWithPassword(email, password); window.location.reload(); }
  catch (error) { ERP.toast(error.message, 'error'); }
}

function renderAccessDenied(root, email) {
  root.className = 'landing';
  root.innerHTML = `<div class="landing-shell" style="max-width:650px;padding-top:10vh"><div class="access-card"><h2>관리자 권한이 없습니다</h2><p>${ERP.escapeHtml(email)} 계정은 한국 주문 포털을 이용할 수 있지만 내부 거래 원장은 볼 수 없습니다.</p><div class="top-actions"><a class="btn btn-accent" href="order.html">주문 포털</a><button class="btn btn-soft" onclick="ERP.signOut()">로그아웃</button></div></div></div>`;
}

async function loadAdminData() {
  const [transactions, items, orders, invoices, drawings, notifications, accessMembers, suppliers, company] = await Promise.all([
    ERP.client.from('erp_v2_transactions').select('*').order('transaction_date', { ascending: false }).limit(1000),
    ERP.client.from('erp_v2_items').select('*').order('item_name').limit(1000),
    ERP.client.from('erp_v2_orders').select('*').order('requested_at', { ascending: false }),
    ERP.client.from('erp_v2_invoices').select('*').order('issue_date', { ascending: false }),
    ERP.client.from('erp_v2_drawings').select('*').order('created_at', { ascending: false }),
    ERP.client.from('erp_v2_notifications').select('*').order('created_at', { ascending: false }).limit(200),
    ERP.client.from('erp_v2_access_members').select('*').order('role').order('email'),
    ERP.client.from('erp_v2_suppliers').select('*').order('display_name'),
    ERP.client.from('erp_v2_company_profile').select('*').eq('id', 1).maybeSingle()
  ]);
  [transactions, items, orders, invoices, drawings, notifications, accessMembers, suppliers, company].forEach(result => { if (result.error) throw result.error; });
  adminState.transactions = transactions.data || [];
  adminState.items = items.data || [];
  adminState.orders = orders.data || [];
  adminState.invoices = invoices.data || [];
  adminState.drawings = drawings.data || [];
  adminState.notifications = notifications.data || [];
  adminState.accessMembers = accessMembers.data || [];
  adminState.suppliers = suppliers.data || [];
  adminState.company = company.data || null;
}

function renderAdminShell(root, email) {
  root.className = 'app-shell';
  root.innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="portal.html"><span class="brand-mark">LZ</span><span>LZN ERP <small>ADMIN CONSOLE</small></span></a>
      <nav class="nav">
        <button data-page="dashboard" onclick="renderAdminPage('dashboard')">대시보드</button>
        <button data-page="ledger" onclick="renderAdminPage('ledger')">통합 거래원장</button>
        <button data-page="items" onclick="renderAdminPage('items')">품목 · 도면</button>
        <button data-page="orders" onclick="renderAdminPage('orders')">한국 주문</button>
        <button data-page="invoices" onclick="renderAdminPage('invoices')">인보이스</button>
        <button data-page="notifications" onclick="renderAdminPage('notifications')">알림 ${notificationBadge()}</button>
        <button data-page="access" onclick="renderAdminPage('access')">도면 권한</button>
        <button data-page="suppliers" onclick="renderAdminPage('suppliers')">업체 · 발주서</button>
        <a href="drawings.html">도면 보관함</a>
      </nav>
      <div class="sidebar-footer"><div>${ERP.escapeHtml(email)}</div><button onclick="ERP.openPasswordSetup()">비밀번호 설정</button><button onclick="ERP.signOut()">로그아웃</button></div>
    </aside>
    <main class="app-main">
      <header class="topbar"><div><h1 id="adminTitle">대시보드</h1><p id="adminSubtitle">구매·판매·도면·주문 현황을 한눈에 확인합니다.</p></div><div class="top-actions"><a class="btn btn-soft" href="drawings.html">도면 보관함</a><button class="btn btn-soft" onclick="refreshAdmin()">새로고침</button><a class="btn btn-accent" href="order.html">주문 포털 보기</a></div></header>
      <section id="adminContent"></section>
    </main>`;
}

function notificationBadge() {
  const count = adminState.notifications.filter(x => !x.read_at).length;
  return count ? `<span class="nav-count">${count}</span>` : '';
}

async function refreshAdmin() {
  try { await loadAdminData(); renderAdminPage(adminState.page); ERP.toast('최신 데이터로 갱신했습니다.', 'success'); }
  catch (error) { ERP.toast(error.message, 'error'); }
}

function renderAdminPage(page) {
  adminState.page = page;
  document.querySelectorAll('.nav button').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
  const meta = {
    dashboard: ['대시보드', '구매·판매·도면·주문 현황을 한눈에 확인합니다.'],
    ledger: ['통합 거래원장', '원본 장부의 구매·판매 기록과 도면 매칭을 조회합니다.'],
    items: ['품목 · 도면', '제품과 가공분류, 최신 가격, 도면 매칭 상태를 관리합니다.'],
    orders: ['한국 주문', '한국에서 접수한 주문과 도면을 확인하고 견적·확정 상태를 관리합니다.'],
    invoices: ['인보이스', '주문 확정 시 자동 생성된 인보이스를 발행하고 출력합니다.']
    ,notifications: ['관리자 알림', 'IINEER 도면 변경과 신규·수정 오더를 확인합니다.']
    ,access: ['도면 권한', '한국 IINEER와 공급사 이메일의 도면 접근 범위를 관리합니다.']
    ,suppliers: ['업체 · 발주서', '주문서 양식에서 정리한 업체 정보로 발주서를 작성합니다.']
  }[page];
  document.getElementById('adminTitle').textContent = meta[0];
  document.getElementById('adminSubtitle').textContent = meta[1];
  ({ dashboard: renderDashboard, ledger: renderLedger, items: renderItems, orders: renderOrders, invoices: renderInvoices, notifications: renderNotifications, access: renderAccess, suppliers: renderSuppliers })[page]();
}

function renderDashboard() {
  const tx = adminState.transactions;
  const purchase = tx.reduce((s, x) => s + Number(x.purchase_amount_ex || 0), 0);
  const sales = tx.reduce((s, x) => s + Number(x.sale_amount_ex || 0), 0);
  const profit = tx.reduce((s, x) => s + Number(x.gross_profit_ex || 0), 0);
  const matched = tx.filter(x => x.drawing_match && x.drawing_match !== '미매칭').length;
  const pendingOrders = adminState.orders.filter(x => !['completed','cancelled'].includes(x.status)).length;
  document.getElementById('adminContent').innerHTML = `
    <div class="grid-kpi">
      ${kpi('총 매입 · 세전', ERP.money(purchase,'CNY'), '#dfeef5')}
      ${kpi('총 매출 · 세전', ERP.money(sales,'CNY'), '#dff3ec')}
      ${kpi('매출총이익', ERP.money(profit,'CNY'), '#fff0c9')}
      ${kpi('도면 매칭률', tx.length ? `${(matched / tx.length * 100).toFixed(1)}%` : '0%', '#e6e8f6')}
    </div>
    <div class="section-grid">
      <div class="card card-pad"><div class="section-title"><h2>최근 한국 주문</h2><span class="badge warn">진행 ${pendingOrders}건</span></div>${ordersTable(adminState.orders.slice(0, 7), false)}</div>
      <div class="card card-pad"><div class="section-title"><h2>제품별 거래</h2></div>${productSummary()}</div>
      <div class="card card-pad"><div class="section-title"><h2>최근 알림</h2><button class="btn btn-small btn-soft" onclick="renderAdminPage('notifications')">전체 보기</button></div>${notificationList(adminState.notifications.slice(0, 5))}</div>
    </div>`;
}

function kpi(label, value, accent) { return `<article class="card kpi" style="--accent:${accent}"><label>${label}</label><strong>${value}</strong></article>`; }

function productSummary() {
  const products = ['INE-200','INT-200','INB-200','INA-200','제품확인필요'];
  const max = Math.max(1, ...products.map(p => adminState.transactions.filter(x => x.product === p).length));
  return products.map(p => { const count = adminState.transactions.filter(x => x.product === p).length; return `<div style="margin:13px 0"><div style="display:flex;justify-content:space-between;font-size:12px"><strong>${p}</strong><span>${count}건</span></div><div style="height:8px;background:#e9eff4;border-radius:9px;margin-top:6px"><div style="height:100%;width:${count/max*100}%;background:#176b87;border-radius:9px"></div></div></div>`; }).join('');
}

function renderLedger() {
  document.getElementById('adminContent').innerHTML = `
    <div class="card card-pad"><div class="filters"><input id="ledgerSearch" placeholder="품목·공급처·주문번호 검색" oninput="filterLedger()"><select id="ledgerProduct" onchange="filterLedger()"><option value="">전체 제품</option>${['INE-200','INT-200','INB-200','INA-200','제품확인필요'].map(x=>`<option>${x}</option>`).join('')}</select><select id="ledgerProcess" onchange="filterLedger()"><option value="">전체 분류</option>${['MCT','CNC','GLASS','기어류','기타'].map(x=>`<option>${x}</option>`).join('')}</select><span class="badge" id="ledgerCount"></span></div><div id="ledgerTable"></div></div>`;
  filterLedger();
}

function filterLedger() {
  const q = (document.getElementById('ledgerSearch')?.value || '').toLowerCase();
  const product = document.getElementById('ledgerProduct')?.value || '';
  const process = document.getElementById('ledgerProcess')?.value || '';
  const rows = adminState.transactions.filter(x => (!q || `${x.part_name} ${x.supplier_name} ${x.order_no}`.toLowerCase().includes(q)) && (!product || x.product === product) && (!process || x.process_type === process));
  document.getElementById('ledgerCount').textContent = `${rows.length}건`;
  document.getElementById('ledgerTable').innerHTML = ledgerTable(rows);
}

function ledgerTable(rows) {
  if (!rows.length) return '<div class="empty">조건에 맞는 거래가 없습니다.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>일자</th><th>품목</th><th>제품</th><th>분류</th><th>공급처</th><th>매입</th><th>매출</th><th>이익</th><th>도면</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${ERP.date(x.transaction_date)}</td><td><strong>${ERP.escapeHtml(x.part_name)}</strong><br><small>${ERP.escapeHtml(x.material||'')}</small></td><td>${x.product}</td><td>${x.process_type}</td><td>${ERP.escapeHtml(x.supplier_name||'-')}</td><td>${ERP.money(x.purchase_amount_ex,'CNY')}</td><td>${ERP.money(x.sale_amount_ex,'CNY')}</td><td>${ERP.money(x.gross_profit_ex,'CNY')}</td><td><span class="badge ${x.drawing_match==='미매칭'?'bad':'good'}">${ERP.escapeHtml(x.drawing_match||'미매칭')}</span></td></tr>`).join('')}</tbody></table></div>`;
}

function renderItems() {
  const rows = adminState.items;
  document.getElementById('adminContent').innerHTML = `<div class="card card-pad"><div class="filters"><input id="itemSearchV2" placeholder="품목명·코드 검색" oninput="filterItemsV2()"><span class="badge">${rows.length}개 품목</span></div><div id="itemsV2Table"></div></div>`;
  filterItemsV2();
}

function filterItemsV2() {
  const q = (document.getElementById('itemSearchV2')?.value || '').toLowerCase();
  const rows = adminState.items.filter(x => !q || `${x.item_code} ${x.item_name} ${x.normalized_key}`.toLowerCase().includes(q));
  document.getElementById('itemsV2Table').innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>코드</th><th>품목</th><th>제품</th><th>분류</th><th>소재</th><th>최근 매입단가</th><th>최근 판매단가</th><th>도면</th></tr></thead><tbody>${rows.map(x=>{const current=adminState.drawings.filter(d=>Number(d.catalog_item_id)===Number(x.id)&&d.is_current);return `<tr><td>${ERP.escapeHtml(x.item_code)}</td><td><strong>${ERP.escapeHtml(x.item_name)}</strong></td><td>${x.product}</td><td>${x.process_type}</td><td>${ERP.escapeHtml(x.material||'-')}</td><td>${ERP.money(x.latest_purchase_unit,'CNY')}</td><td>${ERP.money(x.latest_sale_unit,'CNY')}</td><td>${current.length?`<button class="btn btn-small btn-soft" onclick="openItemDrawings(${x.id})">${current.length}개 열기</button>`:`<span class="badge ${x.drawing_status==='미매칭'?'bad':'good'}">${ERP.escapeHtml(x.drawing_status)}</span>`}</td></tr>`}).join('')}</tbody></table></div>` : '<div class="empty">품목이 없습니다.</div>';
}

async function openItemDrawings(itemId) {
  const files = adminState.drawings.filter(x => Number(x.catalog_item_id) === Number(itemId) && x.is_current);
  if (!files.length) return ERP.toast('등록된 현재 도면이 없습니다.', 'error');
  const popup = window.open('', '_blank', 'width=680,height=720');
  const links = [];
  for (const file of files) {
    try { links.push(`<a class="btn btn-soft" style="display:block;margin:8px" target="_blank" href="${await ERP.signedDrawingUrl(file.storage_path, 900)}">${ERP.escapeHtml(file.file_kind || 'FILE')} · ${ERP.escapeHtml(file.file_name)}</a>`); }
    catch (_) { links.push(`<div>${ERP.escapeHtml(file.file_name)} · 열기 실패</div>`); }
  }
  popup.document.write(`<meta charset="utf-8"><link rel="stylesheet" href="erp.css"><div class="card card-pad" style="margin:20px"><h2>현재 도면</h2>${links.join('')}<p class="auth-note">이전 버전은 도면 보관함의 이력에서 확인할 수 있습니다.</p></div>`);
  popup.document.close();
}

function renderOrders() { document.getElementById('adminContent').innerHTML = `<div class="card card-pad">${ordersTable(adminState.orders, true)}</div>`; }

function ordersTable(rows, manage) {
  if (!rows.length) return '<div class="empty">접수된 한국 주문이 없습니다.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>주문번호</th><th>회사</th><th>담당자</th><th>접수일</th><th>상태</th><th>도면</th>${manage?'<th>관리</th>':''}</tr></thead><tbody>${rows.map(o=>{const count=adminState.drawings.filter(d=>d.order_id===o.id).length;return `<tr><td><strong>${o.order_number}</strong><br><small>${ERP.escapeHtml(o.customer_po_number||'')}</small></td><td>${ERP.escapeHtml(o.company_name)}</td><td>${ERP.escapeHtml(o.contact_name)}<br><small>${ERP.escapeHtml(o.contact_email)}</small></td><td>${ERP.date(o.requested_at)}</td><td><span class="badge ${['confirmed','processing','shipped','completed'].includes(o.status)?'good':'warn'}">${ERP.statusLabel(o.status)}</span></td><td>${count?`<button class="btn btn-small btn-soft" onclick="openOrderDrawings('${o.id}')">${count}개 보기</button>`:'-'}</td>${manage?`<td><select onchange="updateOrderStatus('${o.id}',this.value)" style="min-width:120px">${['quote_requested','quoted','confirmed','processing','shipped','completed','cancelled'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${ERP.statusLabel(s)}</option>`).join('')}</select></td>`:''}</tr>`}).join('')}</tbody></table></div>`;
}

async function updateOrderStatus(id, status) {
  const { error } = await ERP.client.from('erp_v2_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return ERP.toast(error.message, 'error');
  ERP.toast(status === 'confirmed' ? '주문을 확정하고 인보이스 초안을 자동 생성했습니다.' : '주문 상태를 변경했습니다.', 'success');
  await refreshAdmin();
}

async function openOrderDrawings(orderId) {
  const drawings = adminState.drawings.filter(x => x.order_id === orderId);
  if (!drawings.length) return;
  const links = [];
  for (const drawing of drawings) {
    try { links.push(`<a class="btn btn-soft" style="display:block;margin:8px" target="_blank" href="${await ERP.signedDrawingUrl(drawing.storage_path)}">${ERP.escapeHtml(drawing.file_name)}</a>`); }
    catch (error) { links.push(`<div>${ERP.escapeHtml(drawing.file_name)} · 열기 실패</div>`); }
  }
  const popup = window.open('', '_blank', 'width=620,height=720');
  popup.document.write(`<meta charset="utf-8"><link rel="stylesheet" href="erp.css"><div class="card card-pad" style="margin:20px"><h2>주문 도면</h2>${links.join('')}</div>`);
}

function renderInvoices() {
  const rows = adminState.invoices;
  document.getElementById('adminContent').innerHTML = `<div class="card card-pad">${rows.length?`<div class="table-wrap"><table><thead><tr><th>인보이스</th><th>발행일</th><th>Buyer</th><th>금액</th><th>상태</th><th>출력</th></tr></thead><tbody>${rows.map(i=>`<tr><td><strong>${i.invoice_number}</strong></td><td>${ERP.date(i.issue_date)}</td><td>${ERP.escapeHtml(i.buyer_name||'-')}<br><small>${ERP.escapeHtml(i.buyer_email||'')}</small></td><td>${ERP.money(i.total,i.currency)}</td><td><span class="badge ${i.status==='paid'?'good':'warn'}">${ERP.statusLabel(i.status)}</span></td><td><button class="btn btn-small btn-primary" onclick="printInvoice('${i.id}')">보기 · PDF</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">아직 생성된 인보이스가 없습니다. 주문을 확정하면 자동 생성됩니다.</div>'}</div>`;
}

async function printInvoice(id) {
  const invoice = adminState.invoices.find(x => x.id === id);
  const { data: lines, error } = await ERP.client.from('erp_v2_invoice_items').select('*').eq('invoice_id', id).order('sequence');
  if (error) return ERP.toast(error.message,'error');
  const c = ERP.config.company;
  const sellerAddress = c.address ? `<small>${ERP.escapeHtml(c.address)}</small>` : '';
  const bankInfo = c.bank && c.swift
    ? `${ERP.escapeHtml(c.bank)}<br>${ERP.escapeHtml(c.bankAddress || '')}<br>Account (${invoice.currency}): ${ERP.escapeHtml(invoice.currency==='KRW'?c.accountKrw:invoice.currency==='CNY'?c.accountCny:c.accountUsd)}<br>SWIFT: ${ERP.escapeHtml(c.swift)}`
    : 'Payment instructions are supplied securely by LZN.';
  const popup = window.open('', '_blank');
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${invoice.invoice_number}</title><style>body{font-family:Arial,sans-serif;color:#172235;margin:42px}h1{letter-spacing:.08em}.head{display:flex;justify-content:space-between;border-bottom:3px solid #123b59;padding-bottom:20px}.meta{text-align:right}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{border-bottom:1px solid #ccd6df;padding:11px;text-align:left}th{background:#eef3f6}.num{text-align:right}.totals{width:340px;margin:24px 0 0 auto}.bank{margin-top:35px;border:1px solid #ccd6df;padding:18px;background:#f7f9fb;font-size:12px;line-height:1.65}.actions{position:fixed;right:24px;top:20px}@media print{.actions{display:none}body{margin:18mm}}</style></head><body><button class="actions" onclick="print()">PDF / 인쇄</button><div class="head"><div><h1>COMMERCIAL INVOICE</h1><strong>${ERP.escapeHtml(c.name)}</strong>${sellerAddress}</div><div class="meta"><h2>${invoice.invoice_number}</h2><div>Issue: ${invoice.issue_date}</div><div>Due: ${invoice.due_date||'-'}</div><div>Status: ${ERP.statusLabel(invoice.status)}</div></div></div><h3>Bill To</h3><div><strong>${ERP.escapeHtml(invoice.buyer_name||'')}</strong><br>${ERP.escapeHtml(invoice.buyer_address||'')}<br>${ERP.escapeHtml(invoice.buyer_email||'')}</div><table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${(lines||[]).map((x,n)=>`<tr><td>${n+1}</td><td>${ERP.escapeHtml(x.description)}</td><td>${ERP.number(x.quantity,4)}</td><td>${x.unit}</td><td class="num">${ERP.money(x.unit_price,invoice.currency)}</td><td class="num">${ERP.money(x.amount,invoice.currency)}</td></tr>`).join('')}</tbody></table><table class="totals"><tr><td>Subtotal</td><td class="num">${ERP.money(invoice.subtotal,invoice.currency)}</td></tr><tr><td>Freight</td><td class="num">${ERP.money(invoice.freight,invoice.currency)}</td></tr><tr><td>Tax</td><td class="num">${ERP.money(invoice.tax,invoice.currency)}</td></tr><tr><td>Discount</td><td class="num">-${ERP.money(invoice.discount,invoice.currency)}</td></tr><tr><th>Total</th><th class="num">${ERP.money(invoice.total,invoice.currency)}</th></tr></table><div class="bank"><strong>Payment Information</strong><br>${bankInfo}</div></body></html>`);
  popup.document.close();
}

function notificationList(rows) {
  if (!rows.length) return '<div class="empty">새 알림이 없습니다.</div>';
  return `<div class="notification-list">${rows.map(x => `<article class="notification-item ${x.read_at ? '' : 'unread'}"><div><strong>${ERP.escapeHtml(x.title)}</strong><p>${ERP.escapeHtml(x.body || '')}</p><small>${ERP.escapeHtml(x.actor_email || 'system')} · ${ERP.date(x.created_at)}</small></div>${x.read_at ? '' : `<button class="btn btn-small btn-soft" onclick="markNotificationRead(${x.id})">확인</button>`}</article>`).join('')}</div>`;
}

function renderNotifications() {
  const unread = adminState.notifications.filter(x => !x.read_at).length;
  document.getElementById('adminContent').innerHTML = `<div class="card card-pad"><div class="section-title"><div><h2>알림함</h2><p>도면 교체와 오더 접수·수정 기록입니다.</p></div>${unread ? `<button class="btn btn-primary" onclick="markAllNotificationsRead()">${unread}개 모두 확인</button>` : '<span class="badge good">모두 확인함</span>'}</div>${notificationList(adminState.notifications)}</div>`;
}

async function markNotificationRead(id) {
  const { error } = await ERP.client.from('erp_v2_notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) return ERP.toast(error.message, 'error');
  const row = adminState.notifications.find(x => Number(x.id) === Number(id));
  if (row) row.read_at = new Date().toISOString();
  renderNotifications();
}

async function markAllNotificationsRead() {
  const ids = adminState.notifications.filter(x => !x.read_at).map(x => x.id);
  if (!ids.length) return;
  const now = new Date().toISOString();
  const { error } = await ERP.client.from('erp_v2_notifications').update({ read_at: now }).in('id', ids);
  if (error) return ERP.toast(error.message, 'error');
  adminState.notifications.forEach(x => { if (!x.read_at) x.read_at = now; });
  renderNotifications();
  ERP.toast('알림을 모두 확인했습니다.', 'success');
}

function renderAccess() {
  const supplierOptions = adminState.suppliers.map(x => `<option value="${ERP.escapeHtml(x.supplier_key)}">${ERP.escapeHtml(x.display_name)}</option>`).join('');
  document.getElementById('adminContent').innerHTML = `
    <div class="section-grid access-grid">
      <div class="card card-pad"><h2>권한 등록</h2><p class="auth-note">IINEER는 전체 도면 열람·업로드·교체만 가능하고 삭제할 수 없습니다. 공급사는 선택한 업체의 담당 품목만 열람합니다.</p><div class="form-grid" style="margin-top:20px"><div class="field full"><label>이메일</label><input id="accessEmail" type="email" placeholder="name@company.com"></div><div class="field"><label>권한</label><select id="accessRole" onchange="toggleSupplierField()"><option value="iineer">한국 IINEER</option><option value="supplier">공급사</option></select></div><div class="field" id="accessSupplierField" hidden><label>공급사</label><select id="accessSupplier"><option value="">선택</option>${supplierOptions}</select></div></div><button class="btn btn-primary" style="margin-top:18px" onclick="saveAccessMember()">권한 저장</button></div>
      <div class="card card-pad"><div class="section-title"><h2>등록 계정</h2><span class="badge">${adminState.accessMembers.length}명</span></div>${adminState.accessMembers.length ? `<div class="table-wrap"><table><thead><tr><th>이메일</th><th>권한</th><th>공급사</th><th>상태</th></tr></thead><tbody>${adminState.accessMembers.map(x => `<tr><td>${ERP.escapeHtml(x.email)}</td><td>${x.role === 'iineer' ? '한국 IINEER' : '공급사'}</td><td>${ERP.escapeHtml(x.supplier_name || '-')}</td><td><button class="btn btn-small ${x.active ? 'btn-soft' : 'btn-primary'}" onclick="toggleAccessMember('${x.id}',${!x.active})">${x.active ? '사용 중' : '중지됨'}</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">등록된 계정이 없습니다.</div>'}</div>
    </div>`;
}

function toggleSupplierField() {
  const supplier = document.getElementById('accessRole').value === 'supplier';
  document.getElementById('accessSupplierField').hidden = !supplier;
}

async function saveAccessMember() {
  const email = document.getElementById('accessEmail').value.trim().toLowerCase();
  const role = document.getElementById('accessRole').value;
  const supplierName = role === 'supplier' ? document.getElementById('accessSupplier').value : null;
  if (!email) return ERP.toast('이메일을 입력해 주세요.', 'error');
  if (role === 'supplier' && !supplierName) return ERP.toast('공급사를 선택해 주세요.', 'error');
  const payload = { email, role, supplier_name: supplierName, active: true, updated_at: new Date().toISOString() };
  const existing = adminState.accessMembers.find(x => x.email === email);
  const result = existing
    ? await ERP.client.from('erp_v2_access_members').update(payload).eq('id', existing.id)
    : await ERP.client.from('erp_v2_access_members').insert(payload);
  if (result.error) return ERP.toast(result.error.message, 'error');
  await loadAdminData();
  renderAccess();
  ERP.toast('도면 권한을 저장했습니다.', 'success');
}

async function toggleAccessMember(id, active) {
  const { error } = await ERP.client.from('erp_v2_access_members').update({ active, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return ERP.toast(error.message, 'error');
  await loadAdminData();
  renderAccess();
}

function renderSuppliers() {
  document.getElementById('adminContent').innerHTML = `<div class="card card-pad"><div class="section-title"><div><h2>업체 장부</h2><p>제공받은 주문서 양식의 업체 정보를 관리자 전용으로 보관합니다.</p></div><button class="btn btn-accent" onclick="renderPurchaseOrderBuilder()">새 발주서</button></div>${adminState.suppliers.length ? `<div class="table-wrap"><table><thead><tr><th>업체</th><th>법인명</th><th>주소</th><th>참조 양식</th><th></th></tr></thead><tbody>${adminState.suppliers.map(x => `<tr><td><strong>${ERP.escapeHtml(x.display_name)}</strong></td><td>${ERP.escapeHtml(x.legal_name || '-')}</td><td>${ERP.escapeHtml(x.address || '-')}</td><td>${ERP.escapeHtml(x.template_kind)}</td><td><button class="btn btn-small btn-primary" onclick="renderPurchaseOrderBuilder(${x.id})">발주서 작성</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">등록된 업체가 없습니다.</div>'}</div>`;
}

function renderPurchaseOrderBuilder(selectedSupplierId = '') {
  adminState.poLines = 1;
  const options = adminState.suppliers.map(x => `<option value="${x.id}" ${Number(selectedSupplierId) === Number(x.id) ? 'selected' : ''}>${ERP.escapeHtml(x.display_name)}</option>`).join('');
  document.getElementById('adminContent').innerHTML = `<div class="card form-card"><div class="section-title"><div><h2>PURCHASE ORDER</h2><p>기존 업체별 주문서의 공통 양식을 적용합니다.</p></div><button class="btn btn-soft" onclick="renderSuppliers()">업체 목록</button></div><div class="form-grid three"><div class="field"><label>공급사</label><select id="poSupplier"><option value="">선택</option>${options}</select></div><div class="field"><label>발주번호</label><input id="poNumber" value="PO-${new Date().toISOString().slice(2,10).replaceAll('-','')}"></div><div class="field"><label>발주일</label><input id="poDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>가격 기준</label><select id="poPriceBasis"><option>含税 / 세금 포함</option><option>不含税 / 세금 별도</option></select></div><div class="field"><label>통화</label><select id="poCurrency"><option>CNY</option><option>USD</option><option>KRW</option></select></div></div><section class="form-section"><div class="section-title"><h2>품목</h2><button class="btn btn-soft" onclick="addPoLine()">+ 품목 추가</button></div><div id="poLines">${poLineHtml(0)}</div></section><div class="field"><label>비고</label><textarea id="poNotes" placeholder="납기, 포장, 검사 조건"></textarea></div><div style="display:flex;justify-content:flex-end;margin-top:20px"><button class="btn btn-accent" onclick="printSupplierPurchaseOrder()">발주서 보기 · PDF</button></div><datalist id="poItemList">${adminState.items.map(x => `<option value="${ERP.escapeHtml(x.item_name)}">${ERP.escapeHtml(x.material || '')}</option>`).join('')}</datalist></div>`;
}

function poLineHtml(index) {
  return `<div class="po-line" data-po-line="${index}"><input class="po-name" list="poItemList" placeholder="품목명"><input class="po-material" placeholder="소재 / 모델"><input class="po-price" type="number" min="0" step="0.0001" placeholder="단가"><input class="po-qty" type="number" min="0.01" step="0.01" value="1"><button type="button" onclick="this.closest('.po-line').remove()">×</button></div>`;
}

function addPoLine() {
  document.getElementById('poLines').insertAdjacentHTML('beforeend', poLineHtml(adminState.poLines++));
}

function printSupplierPurchaseOrder() {
  const supplier = adminState.suppliers.find(x => Number(x.id) === Number(document.getElementById('poSupplier').value));
  if (!supplier) return ERP.toast('공급사를 선택해 주세요.', 'error');
  const lines = [...document.querySelectorAll('.po-line')].map((row, index) => ({
    no: index + 1,
    name: row.querySelector('.po-name').value.trim(),
    material: row.querySelector('.po-material').value.trim(),
    price: Number(row.querySelector('.po-price').value || 0),
    qty: Number(row.querySelector('.po-qty').value || 0)
  })).filter(x => x.name && x.qty > 0);
  if (!lines.length) return ERP.toast('품목을 한 개 이상 입력해 주세요.', 'error');
  const buyer = adminState.company || { display_name: ERP.config.company.name };
  const currency = document.getElementById('poCurrency').value;
  const totalQty = lines.reduce((sum, x) => sum + x.qty, 0);
  const total = lines.reduce((sum, x) => sum + x.qty * x.price, 0);
  const party = partyBlock => [partyBlock.legal_name || partyBlock.display_name, partyBlock.tax_id ? `税号：${partyBlock.tax_id}` : '', partyBlock.address ? `单位地址：${partyBlock.address}` : '', partyBlock.bank_name ? `开户银行：${partyBlock.bank_name}` : '', partyBlock.bank_account ? `银行账户：${partyBlock.bank_account}` : ''].filter(Boolean).map(ERP.escapeHtml).join('<br>');
  const popup = window.open('', '_blank');
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${ERP.escapeHtml(document.getElementById('poNumber').value)}</title><style>body{font-family:Arial,"Microsoft YaHei",sans-serif;margin:24mm;color:#111}h1{text-align:center;letter-spacing:.08em}.party{display:grid;grid-template-columns:1fr 1fr;gap:24px;font-size:12px;line-height:1.65;margin:22px 0}.party div{border-top:1px solid #333;padding-top:8px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #222;padding:8px}th{background:#f1f3f5}.num{text-align:right}.total{font-weight:bold}.meta{display:flex;justify-content:space-between;margin:14px 0;font-size:12px}.note{margin-top:18px;font-size:12px;white-space:pre-wrap}.sign{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:60px;border-top:1px solid #222;padding-top:12px}.actions{position:fixed;right:20px;top:20px}@media print{.actions{display:none}body{margin:12mm}}</style></head><body><button class="actions" onclick="print()">PDF / 인쇄</button><h1>PURCHASE ORDER</h1><div class="party"><div><strong>买方 / BUYER</strong><br>${party(buyer)}</div><div><strong>卖方 / SELLER</strong><br>${party(supplier)}</div></div><div class="meta"><span>No. ${ERP.escapeHtml(document.getElementById('poNumber').value)}</span><span>Date ${ERP.escapeHtml(document.getElementById('poDate').value)}</span><span>${ERP.escapeHtml(document.getElementById('poPriceBasis').value)} · ${currency}</span></div><table><thead><tr><th>No.</th><th>配件名 / Part Name</th><th>材料 / Material</th><th>单价 / Unit Price</th><th>数量 / Qty</th><th>金额 / Amount</th></tr></thead><tbody>${lines.map(x => `<tr><td>${x.no}</td><td>${ERP.escapeHtml(x.name)}</td><td>${ERP.escapeHtml(x.material || '-')}</td><td class="num">${ERP.number(x.price,4)}</td><td class="num">${ERP.number(x.qty,2)}</td><td class="num">${ERP.number(x.price*x.qty,2)}</td></tr>`).join('')}<tr class="total"><td colspan="4">合计 / TOTAL (${currency})</td><td class="num">${ERP.number(totalQty,2)}</td><td class="num">${ERP.number(total,2)}</td></tr></tbody></table><div class="note"><strong>Remark</strong><br>${ERP.escapeHtml(document.getElementById('poNotes').value || '-')}</div><div class="sign"><div>${ERP.escapeHtml(buyer.legal_name || buyer.display_name || '')}<br><br>Seal and Signature</div><div>${ERP.escapeHtml(supplier.legal_name || supplier.display_name)}<br><br>Seal and Signature</div></div></body></html>`);
  popup.document.close();
}
