const adminState = { transactions: [], items: [], orders: [], invoices: [], drawings: [], page: 'dashboard' };

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
        <p>등록된 관리자 이메일로 일회용 로그인 링크를 받습니다.</p>
        <div class="auth-row"><input id="adminEmail" type="email" placeholder="name@company.com"><button class="btn btn-primary" onclick="sendAdminLink()">로그인 링크</button></div>
        <div class="auth-note">링크는 같은 브라우저에서 열어 주세요. 관리자 계정이 아니면 내부 데이터에 접근할 수 없습니다.</div>
      </div>
    </div>`;
}

async function sendAdminLink() {
  const email = document.getElementById('adminEmail').value.trim();
  if (!email) return ERP.toast('이메일을 입력해 주세요.', 'error');
  try { await ERP.signIn(email, 'admin.html'); ERP.toast('이메일로 로그인 링크를 보냈습니다.', 'success'); }
  catch (error) { ERP.toast(error.message, 'error'); }
}

function renderAccessDenied(root, email) {
  root.className = 'landing';
  root.innerHTML = `<div class="landing-shell" style="max-width:650px;padding-top:10vh"><div class="access-card"><h2>관리자 권한이 없습니다</h2><p>${ERP.escapeHtml(email)} 계정은 한국 주문 포털을 이용할 수 있지만 내부 거래 원장은 볼 수 없습니다.</p><div class="top-actions"><a class="btn btn-accent" href="order.html">주문 포털</a><button class="btn btn-soft" onclick="ERP.signOut()">로그아웃</button></div></div></div>`;
}

async function loadAdminData() {
  const [transactions, items, orders, invoices, drawings] = await Promise.all([
    ERP.client.from('erp_v2_transactions').select('*').order('transaction_date', { ascending: false }).limit(1000),
    ERP.client.from('erp_v2_items').select('*').order('item_name').limit(1000),
    ERP.client.from('erp_v2_orders').select('*').order('requested_at', { ascending: false }),
    ERP.client.from('erp_v2_invoices').select('*').order('issue_date', { ascending: false }),
    ERP.client.from('erp_v2_drawings').select('*').order('created_at', { ascending: false })
  ]);
  [transactions, items, orders, invoices, drawings].forEach(result => { if (result.error) throw result.error; });
  adminState.transactions = transactions.data || [];
  adminState.items = items.data || [];
  adminState.orders = orders.data || [];
  adminState.invoices = invoices.data || [];
  adminState.drawings = drawings.data || [];
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
      </nav>
      <div class="sidebar-footer"><div>${ERP.escapeHtml(email)}</div><button onclick="ERP.signOut()">로그아웃</button></div>
    </aside>
    <main class="app-main">
      <header class="topbar"><div><h1 id="adminTitle">대시보드</h1><p id="adminSubtitle">구매·판매·도면·주문 현황을 한눈에 확인합니다.</p></div><div class="top-actions"><button class="btn btn-soft" onclick="refreshAdmin()">새로고침</button><a class="btn btn-accent" href="order.html">주문 포털 보기</a></div></header>
      <section id="adminContent"></section>
    </main>`;
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
  }[page];
  document.getElementById('adminTitle').textContent = meta[0];
  document.getElementById('adminSubtitle').textContent = meta[1];
  ({ dashboard: renderDashboard, ledger: renderLedger, items: renderItems, orders: renderOrders, invoices: renderInvoices })[page]();
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
  document.getElementById('itemsV2Table').innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>코드</th><th>품목</th><th>제품</th><th>분류</th><th>소재</th><th>최근 매입단가</th><th>최근 판매단가</th><th>도면</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${ERP.escapeHtml(x.item_code)}</td><td><strong>${ERP.escapeHtml(x.item_name)}</strong></td><td>${x.product}</td><td>${x.process_type}</td><td>${ERP.escapeHtml(x.material||'-')}</td><td>${ERP.money(x.latest_purchase_unit,'CNY')}</td><td>${ERP.money(x.latest_sale_unit,'CNY')}</td><td><span class="badge ${x.drawing_status==='미매칭'?'bad':'good'}">${ERP.escapeHtml(x.drawing_status)}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">품목이 없습니다.</div>';
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
