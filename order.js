const orderState = { session: null, orders: [], invoices: [], lines: 1 };

document.addEventListener('DOMContentLoaded', initOrderPortal);

async function initOrderPortal() {
  const root = document.getElementById('orderRoot');
  try {
    orderState.session = await ERP.session();
    if (!orderState.session) return renderOrderLogin(root);
    await loadMyOrders();
    renderOrderPortal(root);
  } catch (error) {
    root.innerHTML = `<div class="empty"><h2>연결 오류</h2><p>${ERP.escapeHtml(error.message)}</p><a href="portal.html" class="btn btn-soft">포털로 돌아가기</a></div>`;
  }
}

function renderOrderLogin(root) {
  root.className = 'landing';
  root.innerHTML = `
    <div class="landing-shell" style="max-width:660px;padding-top:8vh">
      <a class="brand" href="portal.html"><span class="brand-mark">LZ</span><span>LZN ORDER <small>KOREA CUSTOMER PORTAL</small></span></a>
      <div class="access-card" style="margin-top:42px">
        <div class="eyebrow" style="color:#a7730a">Secure drawing upload</div>
        <h2 style="margin-top:10px">한국 주문 로그인</h2>
        <p>이메일로 받은 일회용 링크를 열면 주문 작성, 도면 업로드, 진행 상태와 인보이스 확인이 가능합니다.</p>
        <div class="auth-row"><input id="orderEmail" type="email" placeholder="name@company.com"><button class="btn btn-accent" onclick="sendOrderLink()">로그인 링크</button></div>
        <div class="auth-note">처음 사용하는 이메일도 가입할 수 있습니다. 업로드한 도면은 본인과 LZN 관리자만 볼 수 있습니다.</div>
        <a href="portal.html" style="display:inline-block;margin-top:22px;color:#607489;font-size:13px">← 메인 포털</a>
      </div>
    </div>`;
}

async function sendOrderLink() {
  const email = document.getElementById('orderEmail').value.trim();
  if (!email) return ERP.toast('이메일을 입력해 주세요.', 'error');
  try { await ERP.signIn(email, 'order.html'); ERP.toast('이메일로 로그인 링크를 보냈습니다.', 'success'); }
  catch (error) { ERP.toast(error.message, 'error'); }
}

async function loadMyOrders() {
  const [orders, invoices] = await Promise.all([
    ERP.client.from('erp_v2_orders').select('*').order('requested_at', { ascending: false }),
    ERP.client.from('erp_v2_invoices').select('*').order('issue_date', { ascending: false })
  ]);
  if (orders.error) throw orders.error;
  if (invoices.error) throw invoices.error;
  orderState.orders = orders.data || [];
  orderState.invoices = invoices.data || [];
}

function renderOrderPortal(root) {
  root.className = 'app-shell';
  root.innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="portal.html"><span class="brand-mark">LZ</span><span>LZN ORDER <small>KOREA PORTAL</small></span></a>
      <nav class="nav"><button class="active" onclick="showOrderSection('new',this)">새 주문</button><button onclick="showOrderSection('history',this)">내 주문</button><button onclick="showOrderSection('invoice',this)">인보이스</button></nav>
      <div class="sidebar-footer"><div>${ERP.escapeHtml(orderState.session.user.email)}</div><button onclick="ERP.signOut()">로그아웃</button></div>
    </aside>
    <main class="app-main">
      <header class="topbar"><div><h1 id="orderTitle">새 주문 · 견적 요청</h1><p id="orderSubtitle">품목을 작성하고 DWG, PDF, STP 도면을 바로 올려 주세요.</p></div><div class="top-actions"><a class="btn btn-soft" href="portal.html">메인 포털</a></div></header>
      <section id="orderContent"></section>
    </main>`;
  renderNewOrder();
}

function showOrderSection(section, button) {
  document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
  button?.classList.add('active');
  if (section === 'new') { setOrderTitle('새 주문 · 견적 요청','품목을 작성하고 DWG, PDF, STP 도면을 바로 올려 주세요.'); renderNewOrder(); }
  if (section === 'history') { setOrderTitle('내 주문','접수된 주문의 견적·제작·출고 상태를 확인합니다.'); renderMyOrders(); }
  if (section === 'invoice') { setOrderTitle('인보이스','확정 주문에서 생성된 인보이스를 확인하고 PDF로 저장합니다.'); renderMyInvoices(); }
}

function setOrderTitle(title, subtitle) { document.getElementById('orderTitle').textContent = title; document.getElementById('orderSubtitle').textContent = subtitle; }

function renderNewOrder() {
  orderState.lines = 1;
  document.getElementById('orderContent').innerHTML = `
    <form id="orderForm" class="card form-card" onsubmit="submitOrder(event)">
      <section class="form-section"><h2>1. 회사와 배송 정보</h2><p>견적서와 인보이스에 표시될 정보를 입력해 주세요.</p><div class="form-grid">
        <div class="field"><label>회사명 *</label><input id="companyName" required placeholder="ABC Co., Ltd."></div>
        <div class="field"><label>담당자 *</label><input id="contactName" required></div>
        <div class="field"><label>이메일 *</label><input id="contactEmail" type="email" required value="${ERP.escapeHtml(orderState.session.user.email)}"></div>
        <div class="field"><label>전화번호</label><input id="contactPhone" placeholder="+82-10-0000-0000"></div>
        <div class="field full"><label>배송 주소</label><input id="shippingAddress" placeholder="대한민국 ..."></div>
        <div class="field"><label>고객 PO 번호</label><input id="customerPo" placeholder="선택 입력"></div>
        <div class="field"><label>거래 통화</label><select id="orderCurrency"><option>USD</option><option>KRW</option><option>CNY</option></select></div>
      </div></section>
      <section class="form-section"><div class="section-title"><div><h2>2. 주문 품목</h2><p style="margin:5px 0 0;color:var(--muted)">도면에 품명이 있더라도 검색을 위해 간단히 작성해 주세요.</p></div><button class="btn btn-soft" type="button" onclick="addOrderLine()">+ 품목 추가</button></div><div id="orderLines">${orderLineHtml(0)}</div></section>
      <section class="form-section"><h2>3. 도면 업로드</h2><p>한 품목의 DWG·PDF·STP 세트 또는 판금처럼 필요한 파일만 선택해도 됩니다.</p><div class="dropzone"><strong>도면 파일 선택</strong><div class="help">DWG, PDF, STP/STEP, PNG, JPG · 파일당 최대 50MB · 여러 개 선택 가능</div><input id="drawingFiles" type="file" multiple accept=".dwg,.pdf,.stp,.step,.png,.jpg,.jpeg"></div></section>
      <section class="form-section"><h2>4. 요청 사항</h2><div class="field"><label>납기·포장·검사 등 추가 요청</label><textarea id="orderNotes" placeholder="예: 샘플 5개 우선, 검사성적서 필요"></textarea></div><div style="display:flex;justify-content:flex-end;margin-top:18px"><button id="submitOrderBtn" class="btn btn-accent" type="submit">견적 요청 보내기</button></div></section>
    </form>`;
}

function orderLineHtml(index) {
  return `<div class="line-item" data-line="${index}"><input class="line-name" required placeholder="품목명 / Part name"><select class="line-product"><option value="">제품</option><option>INE-200</option><option>INT-200</option><option>INB-200</option><option>INA-200</option></select><select class="line-process"><option value="">가공·소재</option><option>MCT</option><option>CNC</option><option>GLASS</option><option>기어류</option><option>기타</option></select><input class="line-qty" type="number" min="0.01" step="0.01" value="1" required><button type="button" onclick="removeOrderLine(this)" aria-label="삭제">×</button></div>`;
}

function addOrderLine() { document.getElementById('orderLines').insertAdjacentHTML('beforeend', orderLineHtml(orderState.lines++)); }
function removeOrderLine(button) { if (document.querySelectorAll('.line-item').length > 1) button.closest('.line-item').remove(); }

async function submitOrder(event) {
  event.preventDefault();
  const button = document.getElementById('submitOrderBtn');
  button.disabled = true; button.textContent = '업로드 중...';
  try {
    const orderPayload = {
      order_number: '', user_id: orderState.session.user.id,
      company_name: document.getElementById('companyName').value.trim(),
      contact_name: document.getElementById('contactName').value.trim(),
      contact_email: document.getElementById('contactEmail').value.trim(),
      contact_phone: document.getElementById('contactPhone').value.trim() || null,
      shipping_address: document.getElementById('shippingAddress').value.trim() || null,
      currency: document.getElementById('orderCurrency').value,
      customer_po_number: document.getElementById('customerPo').value.trim() || null,
      notes: document.getElementById('orderNotes').value.trim() || null,
      status: 'quote_requested'
    };
    const { data: order, error: orderError } = await ERP.client.from('erp_v2_orders').insert(orderPayload).select().single();
    if (orderError) throw orderError;

    const itemPayloads = [...document.querySelectorAll('.line-item')].map(line => ({
      order_id: order.id,
      part_name: line.querySelector('.line-name').value.trim(),
      product: line.querySelector('.line-product').value || null,
      process_type: line.querySelector('.line-process').value || null,
      quantity: Number(line.querySelector('.line-qty').value), unit: 'EA'
    }));
    const { error: itemError } = await ERP.client.from('erp_v2_order_items').insert(itemPayloads);
    if (itemError) throw itemError;

    const files = [...document.getElementById('drawingFiles').files];
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) throw new Error(`${file.name}: 50MB를 초과했습니다.`);
      const storagePath = `${orderState.session.user.id}/${order.id}/${Date.now()}-${ERP.safeFileName(file.name)}`;
      const { error: uploadError } = await ERP.client.storage.from(ERP.config.drawingBucket).upload(storagePath, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
      if (uploadError) throw uploadError;
      const { error: drawingError } = await ERP.client.from('erp_v2_drawings').insert({ order_id: order.id, file_name: file.name, storage_path: storagePath, mime_type: file.type || null, file_size: file.size, uploaded_by: orderState.session.user.id });
      if (drawingError) throw drawingError;
    }

    ERP.toast(`주문 ${order.order_number}이 접수되었습니다.`, 'success');
    await loadMyOrders();
    showOrderSection('history', document.querySelectorAll('.nav button')[1]);
  } catch (error) {
    ERP.toast(error.message, 'error');
  } finally {
    button.disabled = false; button.textContent = '견적 요청 보내기';
  }
}

function renderMyOrders() {
  document.getElementById('orderContent').innerHTML = `<div class="card card-pad">${orderState.orders.length ? `<div class="table-wrap"><table><thead><tr><th>주문번호</th><th>회사</th><th>접수일</th><th>PO 번호</th><th>통화</th><th>상태</th></tr></thead><tbody>${orderState.orders.map(o=>`<tr><td><strong>${o.order_number}</strong></td><td>${ERP.escapeHtml(o.company_name)}</td><td>${ERP.date(o.requested_at)}</td><td>${ERP.escapeHtml(o.customer_po_number||'-')}</td><td>${o.currency}</td><td><span class="badge ${['confirmed','processing','shipped','completed'].includes(o.status)?'good':'warn'}">${ERP.statusLabel(o.status)}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">아직 접수한 주문이 없습니다.</div>'}</div>`;
}

function renderMyInvoices() {
  document.getElementById('orderContent').innerHTML = `<div class="card card-pad">${orderState.invoices.length ? `<div class="table-wrap"><table><thead><tr><th>인보이스</th><th>발행일</th><th>금액</th><th>상태</th><th></th></tr></thead><tbody>${orderState.invoices.map(i=>`<tr><td><strong>${i.invoice_number}</strong></td><td>${ERP.date(i.issue_date)}</td><td>${ERP.money(i.total,i.currency)}</td><td><span class="badge ${i.status==='paid'?'good':'warn'}">${ERP.statusLabel(i.status)}</span></td><td><button class="btn btn-small btn-primary" onclick="printCustomerInvoice('${i.id}')">보기 · PDF</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">주문이 확정되면 인보이스가 자동 생성됩니다.</div>'}</div>`;
}

async function printCustomerInvoice(id) {
  const invoice = orderState.invoices.find(x => x.id === id);
  const { data: lines, error } = await ERP.client.from('erp_v2_invoice_items').select('*').eq('invoice_id', id).order('sequence');
  if (error) return ERP.toast(error.message, 'error');
  const c = ERP.config.company;
  const sellerAddress = c.address ? `<br><small>${ERP.escapeHtml(c.address)}</small>` : '';
  const bankInfo = c.bank && c.swift
    ? `${ERP.escapeHtml(c.bank)}<br>Account (${invoice.currency}): ${ERP.escapeHtml(invoice.currency==='KRW'?c.accountKrw:invoice.currency==='CNY'?c.accountCny:c.accountUsd)}<br>SWIFT: ${ERP.escapeHtml(c.swift)}`
    : 'Payment instructions are supplied securely by LZN.';
  const popup = window.open('', '_blank');
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${invoice.invoice_number}</title><style>body{font-family:Arial,sans-serif;color:#172235;margin:42px}.head{display:flex;justify-content:space-between;border-bottom:3px solid #123b59;padding-bottom:20px}.meta{text-align:right}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{border-bottom:1px solid #ccd6df;padding:11px;text-align:left}th{background:#eef3f6}.num{text-align:right}.totals{width:340px;margin:24px 0 0 auto}.bank{margin-top:35px;border:1px solid #ccd6df;padding:18px;background:#f7f9fb;font-size:12px;line-height:1.65}.actions{position:fixed;right:24px;top:20px}@media print{.actions{display:none}body{margin:18mm}}</style></head><body><button class="actions" onclick="print()">PDF / 인쇄</button><div class="head"><div><h1>COMMERCIAL INVOICE</h1><strong>${ERP.escapeHtml(c.name)}</strong>${sellerAddress}</div><div class="meta"><h2>${invoice.invoice_number}</h2><div>Issue: ${invoice.issue_date}</div><div>Due: ${invoice.due_date||'-'}</div></div></div><h3>Bill To</h3><div><strong>${ERP.escapeHtml(invoice.buyer_name||'')}</strong><br>${ERP.escapeHtml(invoice.buyer_address||'')}<br>${ERP.escapeHtml(invoice.buyer_email||'')}</div><table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${(lines||[]).map((x,n)=>`<tr><td>${n+1}</td><td>${ERP.escapeHtml(x.description)}</td><td>${ERP.number(x.quantity,4)}</td><td>${x.unit}</td><td class="num">${ERP.money(x.unit_price,invoice.currency)}</td><td class="num">${ERP.money(x.amount,invoice.currency)}</td></tr>`).join('')}</tbody></table><table class="totals"><tr><td>Subtotal</td><td class="num">${ERP.money(invoice.subtotal,invoice.currency)}</td></tr><tr><td>Freight</td><td class="num">${ERP.money(invoice.freight,invoice.currency)}</td></tr><tr><th>Total</th><th class="num">${ERP.money(invoice.total,invoice.currency)}</th></tr></table><div class="bank"><strong>Payment Information</strong><br>${bankInfo}</div></body></html>`);
  popup.document.close();
}
