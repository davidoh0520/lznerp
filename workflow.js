const WORKFLOW_STAGES = [
  ['order_received', '수주 접수'],
  ['drawing_received', '도면 접수'],
  ['supplier_quote_requested', '공급사 견적 요청'],
  ['supplier_quote_received', '견적 도착'],
  ['customer_approval_pending', 'iiNEER 가격 확인'],
  ['customer_approved', '가격 승인'],
  ['purchase_ordered', '발주 완료'],
  ['contract_sent', 'Contract 전달'],
  ['payment_pending', '수금 대기'],
  ['payment_received', '수금 완료'],
  ['production', '제작 중'],
  ['shipment_invoice', '선적 Invoice'],
  ['shipped', '선적 완료'],
  ['completed', '완료'],
  ['cancelled', '취소']
];

const WORKFLOW_STAGE_TIMESTAMPS = {
  drawing_received: 'drawing_received_at',
  supplier_quote_requested: 'supplier_quote_requested_at',
  supplier_quote_received: 'supplier_quote_received_at',
  customer_approved: 'customer_price_confirmed_at',
  purchase_ordered: 'purchase_ordered_at',
  contract_sent: 'contract_sent_at',
  payment_received: 'payment_received_at',
  shipment_invoice: 'shipment_invoiced_at'
};

function workflowStageLabel(stage) {
  return WORKFLOW_STAGES.find(([value]) => value === stage)?.[1] || stage || '수주 접수';
}

function workflowLegacyStatus(stage) {
  if (stage === 'cancelled') return 'cancelled';
  if (stage === 'completed') return 'completed';
  if (['shipment_invoice', 'shipped'].includes(stage)) return 'shipped';
  if (stage === 'production') return 'processing';
  if (['customer_approved', 'purchase_ordered', 'contract_sent', 'payment_pending', 'payment_received'].includes(stage)) return 'confirmed';
  if (['supplier_quote_received', 'customer_approval_pending'].includes(stage)) return 'quoted';
  return 'quote_requested';
}

function workflowStageOptions(selected) {
  return WORKFLOW_STAGES.map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');
}

function primaryCustomerContact() {
  return adminState.customerContacts.find(contact => contact.is_primary && contact.active) || adminState.customerContacts.find(contact => contact.active) || null;
}

function supplierName(id) {
  return adminState.suppliers.find(supplier => Number(supplier.id) === Number(id))?.display_name || '-';
}

function orderNumber(id) {
  return adminState.orders.find(order => order.id === id)?.order_number || '-';
}

function orderItemsFor(orderId) {
  return adminState.orderItems.filter(item => item.order_id === orderId);
}

function paymentAllocatedToContract(contractId) {
  return adminState.paymentAllocations
    .filter(row => Number(row.contract_id) === Number(contractId))
    .reduce((sum, row) => sum + Number(row.allocated_amount || 0), 0);
}

function invoicedQuantityForContractItem(contractItemId) {
  return adminState.invoiceAllocations
    .filter(row => Number(row.contract_item_id) === Number(contractItemId))
    .reduce((sum, row) => sum + Number(row.allocated_quantity || 0), 0);
}

function invoiceContractReferences(invoiceId) {
  const invoiceItemIds = new Set(adminState.invoiceItems.filter(item => item.invoice_id === invoiceId).map(item => item.id));
  const contractItemIds = new Set(adminState.invoiceAllocations.filter(row => invoiceItemIds.has(row.invoice_item_id)).map(row => Number(row.contract_item_id)));
  const contractIds = new Set(adminState.contractItems.filter(item => contractItemIds.has(Number(item.id))).map(item => Number(item.contract_id)));
  return adminState.contracts.filter(contract => contractIds.has(Number(contract.id))).map(contract => contract.contract_number);
}

function renderWorkflow() {
  const contact = primaryCustomerContact();
  const activeOrders = adminState.orders.filter(order => !['completed', 'cancelled'].includes(order.workflow_stage));
  document.getElementById('adminContent').innerHTML = `
    <div class="workflow-strip">${WORKFLOW_STAGES.slice(0, 13).map(([value, label], index) => `<span><b>${index + 1}</b>${label}</span>`).join('')}</div>
    <div class="grid-kpi workflow-kpis">
      ${kpi('진행 수주', `${activeOrders.length}건`, '#dfeef5')}
      ${kpi('공급사 견적', `${adminState.supplierQuotes.length}건`, '#fff0c9')}
      ${kpi('발주서', `${adminState.purchaseOrders.length}건`, '#e6e8f6')}
      ${kpi('Contract / Invoice', `${adminState.contracts.length} / ${adminState.invoices.length}`, '#dff3ec')}
    </div>
    <div class="section-grid workflow-overview">
      <div class="card card-pad">
        <div class="section-title"><div><h2>한국 거래처</h2><p>수주·가격 확인·Contract 전달 기본 담당자</p></div><span class="badge good">iiNEER</span></div>
        <div class="contact-card"><strong>${ERP.escapeHtml(contact?.contact_name || '담당자 미등록')}</strong><span>${ERP.escapeHtml(contact?.role_title || '한국 거래처 담당자')}</span>${adminState.customerContacts.filter(row => row.active).map(row => `<a href="mailto:${ERP.escapeHtml(row.email)}">${ERP.escapeHtml(row.email)}${row.is_primary ? ' · 기본' : ''}</a>`).join('')}</div>
      </div>
      <div class="card card-pad">
        <div class="section-title"><div><h2>Contract ↔ Invoice</h2><p>두 문서는 1:1로 고정하지 않습니다.</p></div><button class="btn btn-accent" onclick="renderShipmentInvoiceForm()">선적 Invoice 작성</button></div>
        <div class="relation-note"><strong>여러 Contract → 하나의 Invoice</strong><span>같은 선적에 포함된 Contract 품목을 한 장으로 묶습니다.</span><strong>하나의 Contract → 여러 Invoice</strong><span>선적 수량만 나누어 부분 Invoice를 반복 발행합니다.</span></div>
      </div>
    </div>
    <div class="card card-pad">
      <div class="section-title"><div><h2>수주별 진행 관리</h2><p>단계를 바꾸면 해당 시점이 함께 기록됩니다.</p></div><a class="btn btn-primary" href="order.html">+ 새 수주 입력</a></div>
      ${workflowOrdersTable(adminState.orders)}
    </div>`;
}

function workflowOrdersTable(rows) {
  if (!rows.length) return '<div class="empty">아직 수주가 없습니다. 새 수주 입력에서 iiNEER 주문을 먼저 등록해 주세요.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>수주</th><th>담당자</th><th>도면</th><th>견적 / 발주</th><th>Contract / Invoice</th><th>현재 단계</th><th></th></tr></thead><tbody>${rows.map(order => {
    const quoteCount = adminState.supplierQuotes.filter(row => row.order_id === order.id).length;
    const poCount = adminState.purchaseOrders.filter(row => row.order_id === order.id).length;
    const contracts = adminState.contracts.filter(row => row.order_id === order.id);
    const invoiceIds = new Set(adminState.invoices.filter(invoice => invoice.order_id === order.id).map(invoice => invoice.id));
    adminState.invoices.forEach(invoice => {
      if (invoiceContractReferences(invoice.id).some(no => contracts.some(contract => contract.contract_number === no))) invoiceIds.add(invoice.id);
    });
    const drawingCount = adminState.drawings.filter(row => row.order_id === order.id).length;
    return `<tr><td><strong>${ERP.escapeHtml(order.order_number)}</strong><br><small>${ERP.escapeHtml(order.customer_po_number || '')}</small></td><td>${ERP.escapeHtml(order.contact_name)}<br><small>${ERP.escapeHtml(order.contact_email)}</small></td><td>${drawingCount ? `${drawingCount}개` : '<span class="badge bad">없음</span>'}</td><td>${quoteCount} / ${poCount}</td><td>${contracts.length} / ${invoiceIds.size}</td><td><select onchange="updateWorkflowStage('${order.id}',this.value)">${workflowStageOptions(order.workflow_stage)}</select></td><td><button class="btn btn-small btn-primary" onclick="renderWorkflowOrder('${order.id}')">상세</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

async function updateWorkflowStage(orderId, stage, rerender = true, notify = true) {
  const order = adminState.orders.find(row => row.id === orderId);
  if (!order) return;
  const payload = { workflow_stage: stage, status: workflowLegacyStatus(stage), updated_at: new Date().toISOString() };
  const timestampField = WORKFLOW_STAGE_TIMESTAMPS[stage];
  if (timestampField && !order[timestampField]) payload[timestampField] = new Date().toISOString();
  const { error } = await ERP.client.from('erp_v2_orders').update(payload).eq('id', orderId);
  if (error) {
    ERP.toast(error.message, 'error');
    return false;
  }
  Object.assign(order, payload);
  if (rerender) renderWorkflow();
  if (notify) ERP.toast(`${workflowStageLabel(stage)} 단계로 변경했습니다.`, 'success');
  return true;
}

async function updateWorkflowStageAndShow(orderId, stage) {
  if (await updateWorkflowStage(orderId, stage, false)) renderWorkflowOrder(orderId);
}

function renderWorkflowOrder(orderId) {
  const order = adminState.orders.find(row => row.id === orderId);
  if (!order) return renderWorkflow();
  const quotes = adminState.supplierQuotes.filter(row => row.order_id === orderId);
  const purchaseOrders = adminState.purchaseOrders.filter(row => row.order_id === orderId);
  const contracts = adminState.contracts.filter(row => row.order_id === orderId);
  const contractNumbers = new Set(contracts.map(row => row.contract_number));
  const invoices = adminState.invoices.filter(invoice => invoice.order_id === orderId || invoiceContractReferences(invoice.id).some(no => contractNumbers.has(no)));
  const drawings = adminState.drawings.filter(row => row.order_id === orderId);
  document.getElementById('adminContent').innerHTML = `
    <div class="top-actions workflow-back"><button class="btn btn-soft" onclick="renderWorkflow()">← 전체 흐름</button><a class="btn btn-soft" href="drawings.html">도면 보관함</a></div>
    <div class="card form-card">
      <div class="section-title"><div><h2>${ERP.escapeHtml(order.order_number)}</h2><p>${ERP.escapeHtml(order.company_name)} · ${ERP.escapeHtml(order.contact_name)} · ${ERP.escapeHtml(order.contact_email)}</p></div><select onchange="updateWorkflowStageAndShow('${order.id}',this.value)">${workflowStageOptions(order.workflow_stage)}</select></div>
      <div class="workflow-actions"><button class="btn btn-primary" onclick="renderSupplierQuoteForm('${order.id}')">1. 견적 등록</button><button class="btn btn-primary" onclick="renderPurchaseOrderForm('${order.id}')">2. 발주 등록</button><button class="btn btn-accent" onclick="renderContractForm('${order.id}')">3. Contract 작성</button><button class="btn btn-soft" onclick="renderPaymentForm('${order.id}')">4. 수금 등록</button><button class="btn btn-accent" onclick="renderShipmentInvoiceForm('${order.id}')">5. 선적 Invoice</button></div>
    </div>
    <div class="section-grid workflow-detail-grid">
      ${workflowSectionCard('도면', `${drawings.length}개`, drawings.length ? drawings.map(row => `<span class="badge">${ERP.escapeHtml(row.file_name)}</span>`).join(' ') : '<div class="empty">수주 시 받은 도면이 없습니다.</div>')}
      ${workflowSectionCard('공급사 견적', `${quotes.length}건`, quotes.length ? quotes.map(row => `<article class="mini-doc"><strong>${ERP.escapeHtml(row.quote_number || `견적 #${row.id}`)}</strong><span>${ERP.escapeHtml(supplierName(row.supplier_id))}</span><span class="badge ${row.approval_status === 'approved' ? 'good' : 'warn'}">${ERP.escapeHtml(row.approval_status)}</span></article>`).join('') : '<div class="empty">견적 기록이 없습니다.</div>')}
      ${workflowSectionCard('중문 발주', `${purchaseOrders.length}건`, purchaseOrders.length ? purchaseOrders.map(row => `<article class="mini-doc"><strong>${ERP.escapeHtml(row.po_number)}</strong><span>${ERP.escapeHtml(supplierName(row.supplier_id))} · ${ERP.money(row.total_inc, row.currency)} 세후</span><div><span class="badge">${ERP.escapeHtml(row.status)}</span> <button class="btn btn-small btn-soft" onclick="printWorkflowPurchaseOrder(${row.id})">중문 발주서</button></div></article>`).join('') : '<div class="empty">발주 기록이 없습니다.</div>')}
      ${workflowSectionCard('Contract / 수금', `${contracts.length}건`, contracts.length ? contracts.map(row => `<article class="mini-doc"><strong>${ERP.escapeHtml(row.contract_number)}</strong><span>${ERP.money(row.total, row.currency)} · 수금 ${ERP.money(paymentAllocatedToContract(row.id), row.currency)}</span><div><span class="badge ${row.status === 'paid' ? 'good' : 'warn'}">${ERP.escapeHtml(row.status)}</span> <button class="btn btn-small btn-soft" onclick="printContract(${row.id})">보기 · PDF</button></div></article>`).join('') : '<div class="empty">Contract가 없습니다.</div>')}
      ${workflowSectionCard('영문 Invoice / Packing List', `${invoices.length}건`, invoices.length ? invoices.map(row => `<article class="mini-doc"><strong>${ERP.escapeHtml(row.invoice_number)}</strong><span>${invoiceContractReferences(row.id).map(ERP.escapeHtml).join(', ') || 'Contract 미연결'} · ${ERP.money(row.total, row.currency)}</span><div><button class="btn btn-small btn-primary" onclick="printInvoice('${row.id}')">Invoice</button> <button class="btn btn-small btn-soft" onclick="printPackingList('${row.id}')">Packing List</button></div></article>`).join('') : '<div class="empty">선적 Invoice가 없습니다.</div>')}
    </div>`;
}

function workflowSectionCard(title, count, body) {
  return `<div class="card card-pad"><div class="section-title"><h2>${title}</h2><span class="badge">${count}</span></div><div class="mini-doc-list">${body}</div></div>`;
}

function workflowLineRows(orderId, inputClass, label) {
  const rows = orderItemsFor(orderId);
  if (!rows.length) return '<div class="empty">이 수주에 품목이 없습니다.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>품목</th><th>수량</th><th>단위</th><th>${label}</th></tr></thead><tbody>${rows.map(item => `<tr data-workflow-line data-order-item-id="${item.id}" data-catalog-item-id="${item.catalog_item_id || ''}"><td><strong>${ERP.escapeHtml(item.part_name)}</strong><br><small>${ERP.escapeHtml(item.product || '')}</small></td><td><input class="workflow-qty" type="number" min="0.0001" step="0.0001" value="${Number(item.quantity)}"></td><td>${ERP.escapeHtml(item.unit || 'EA')}</td><td><input class="${inputClass}" type="number" min="0" step="0.000001" placeholder="0.000000"></td></tr>`).join('')}</tbody></table></div>`;
}

function renderSupplierQuoteForm(orderId) {
  const order = adminState.orders.find(row => row.id === orderId);
  const contact = primaryCustomerContact();
  document.getElementById('adminContent').innerHTML = `<form class="card form-card" onsubmit="saveSupplierQuote(event,'${orderId}')"><div class="section-title"><div><h2>공급사 견적 · iiNEER 확인</h2><p>${ERP.escapeHtml(order.order_number)}의 공급사 가격과 한국 승인 결과를 기록합니다.</p></div><button type="button" class="btn btn-soft" onclick="renderWorkflowOrder('${orderId}')">돌아가기</button></div><div class="form-grid three"><div class="field"><label>공급사 *</label><select id="wfQuoteSupplier" required><option value="">선택</option>${adminState.suppliers.map(row => `<option value="${row.id}">${ERP.escapeHtml(row.display_name)}</option>`).join('')}</select></div><div class="field"><label>견적번호</label><input id="wfQuoteNumber"></div><div class="field"><label>견적 도착일</label><input id="wfQuoteReceived" type="date" value="${new Date().toISOString().slice(0, 10)}"></div><div class="field"><label>통화</label><select id="wfQuoteCurrency"><option>CNY</option><option>USD</option><option>KRW</option></select></div><div class="field"><label>입력 가격</label><select id="wfQuoteBasis"><option value="exclusive">세전</option><option value="inclusive">세후</option></select></div><div class="field"><label>세율(%)</label><input id="wfQuoteTax" type="number" min="0" max="100" step="0.01" value="13"></div><div class="field"><label>iiNEER 확인</label><select id="wfQuoteApproval"><option value="review_requested">확인 요청</option><option value="approved">승인</option><option value="rejected">재견적</option><option value="pending">대기</option></select></div><div class="field"><label>확인 담당자</label><input id="wfQuoteApprover" value="${ERP.escapeHtml(contact?.contact_name || '')}"></div><div class="field"><label>확인 이메일</label><select id="wfQuoteEmail">${adminState.customerContacts.filter(row => row.active).map(row => `<option value="${ERP.escapeHtml(row.email)}">${ERP.escapeHtml(row.email)}</option>`).join('')}</select></div></div><section class="form-section"><h2>견적 품목</h2>${workflowLineRows(orderId, 'workflow-price', '견적 입력단가')}</section><div class="field"><label>비고</label><textarea id="wfQuoteNotes"></textarea></div><div class="form-submit"><button class="btn btn-accent" type="submit">견적 저장</button></div></form>`;
}

function collectWorkflowLines(priceSelector) {
  return [...document.querySelectorAll('[data-workflow-line]')].map((row, index) => ({
    row,
    orderItemId: row.dataset.orderItemId,
    catalogItemId: row.dataset.catalogItemId ? Number(row.dataset.catalogItemId) : null,
    description: adminState.orderItems.find(item => item.id === row.dataset.orderItemId)?.part_name || '',
    unit: adminState.orderItems.find(item => item.id === row.dataset.orderItemId)?.unit || 'EA',
    quantity: Number(row.querySelector('.workflow-qty').value || 0),
    price: Number(row.querySelector(priceSelector).value || 0),
    sequence: index + 1
  })).filter(line => line.quantity > 0 && line.price >= 0 && rowHasPrice(line.row, priceSelector));
}

function rowHasPrice(row, selector) {
  return row.querySelector(selector).value !== '';
}

async function saveSupplierQuote(event, orderId) {
  event.preventDefault();
  const lines = collectWorkflowLines('.workflow-price');
  if (!lines.length) return ERP.toast('견적 단가를 한 개 이상 입력해 주세요.', 'error');
  const basis = document.getElementById('wfQuoteBasis').value;
  const taxRate = Number(document.getElementById('wfQuoteTax').value || 0) / 100;
  const approval = document.getElementById('wfQuoteApproval').value;
  const header = {
    order_id: orderId,
    supplier_id: Number(document.getElementById('wfQuoteSupplier').value),
    quote_number: document.getElementById('wfQuoteNumber').value.trim() || null,
    received_at: document.getElementById('wfQuoteReceived').value || null,
    currency: document.getElementById('wfQuoteCurrency').value,
    price_basis: basis,
    tax_rate: taxRate,
    approval_status: approval,
    approval_requested_at: ['review_requested','approved','rejected'].includes(approval) ? new Date().toISOString() : null,
    approved_at: approval === 'approved' ? new Date().toISOString() : null,
    approved_by_name: document.getElementById('wfQuoteApprover').value.trim() || null,
    approval_email: document.getElementById('wfQuoteEmail').value || null,
    notes: document.getElementById('wfQuoteNotes').value.trim() || null
  };
  const { data: quote, error } = await ERP.client.from('erp_v2_supplier_quotes').insert(header).select().single();
  if (error) return ERP.toast(error.message, 'error');
  const factor = 1 + taxRate;
  const payload = lines.map(line => ({ quote_id: quote.id, order_item_id: line.orderItemId, catalog_item_id: line.catalogItemId, description: line.description, quantity: line.quantity, unit: line.unit, unit_price_ex: basis === 'inclusive' ? line.price / factor : line.price, unit_price_inc: basis === 'inclusive' ? line.price : line.price * factor, sequence: line.sequence }));
  const result = await ERP.client.from('erp_v2_supplier_quote_items').insert(payload);
  if (result.error) return ERP.toast(result.error.message, 'error');
  const stage = approval === 'approved' ? 'customer_approved' : approval === 'review_requested' ? 'customer_approval_pending' : 'supplier_quote_received';
  await updateWorkflowStage(orderId, stage, false, false);
  await loadAdminData();
  renderWorkflowOrder(orderId);
  ERP.toast('공급사 견적과 iiNEER 확인 상태를 저장했습니다.', 'success');
}

function renderPurchaseOrderForm(orderId) {
  const quotes = adminState.supplierQuotes.filter(row => row.order_id === orderId && row.approval_status === 'approved');
  document.getElementById('adminContent').innerHTML = `<form class="card form-card" onsubmit="saveWorkflowPurchaseOrder(event,'${orderId}')"><div class="section-title"><div><h2>공급사 발주 등록</h2><p>iiNEER가 승인한 견적만 발주로 전환하며, 세전·세후 입력을 모두 세후 금액으로 저장합니다.</p></div><button type="button" class="btn btn-soft" onclick="renderWorkflowOrder('${orderId}')">돌아가기</button></div><div class="form-grid three"><div class="field"><label>승인된 견적 *</label><select id="wfPoQuote" required onchange="syncPoQuoteSelection()"><option value="">선택</option>${quotes.map(row => `<option value="${row.id}">${ERP.escapeHtml(row.quote_number || `견적 #${row.id}`)} · ${ERP.escapeHtml(supplierName(row.supplier_id))}</option>`).join('')}</select></div><div class="field"><label>공급사 *</label><select id="wfPoSupplier" required><option value="">선택</option>${adminState.suppliers.map(row => `<option value="${row.id}">${ERP.escapeHtml(row.display_name)}</option>`).join('')}</select></div><div class="field"><label>발주번호 *</label><input id="wfPoNumber" required value="PO-${new Date().toISOString().slice(2,10).replaceAll('-','')}-01"></div><div class="field"><label>발주일</label><input id="wfPoDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>통화</label><select id="wfPoCurrency"><option>CNY</option><option>USD</option><option>KRW</option></select></div><div class="field"><label>입력 가격</label><select id="wfPoBasis"><option value="exclusive">세전</option><option value="inclusive">세후</option></select></div><div class="field"><label>세율(%)</label><input id="wfPoTax" type="number" min="0" max="100" step="0.01" value="13"></div></div>${quotes.length ? '' : '<div class="empty">먼저 공급사 견적에서 iiNEER 승인을 기록해 주세요.</div>'}<section class="form-section"><h2>발주 품목</h2>${workflowLineRows(orderId, 'workflow-price', '발주 입력단가')}</section><div class="field"><label>중문 비고</label><textarea id="wfPoNotes" placeholder="请用中文填写交货期、包装及检验要求"></textarea></div><div class="form-submit"><button class="btn btn-accent" type="submit" ${quotes.length ? '' : 'disabled'}>발주 저장</button></div></form>`;
}

function syncPoQuoteSelection() {
  const quote = adminState.supplierQuotes.find(row => Number(row.id) === Number(document.getElementById('wfPoQuote').value));
  if (!quote) return;
  document.getElementById('wfPoSupplier').value = String(quote.supplier_id);
  document.getElementById('wfPoCurrency').value = quote.currency;
  document.getElementById('wfPoBasis').value = quote.price_basis;
  document.getElementById('wfPoTax').value = Number(quote.tax_rate || 0) * 100;
  document.querySelectorAll('[data-workflow-line]').forEach(row => {
    const quoteLine = adminState.supplierQuoteItems.find(item => Number(item.quote_id) === Number(quote.id) && item.order_item_id === row.dataset.orderItemId);
    const input = row.querySelector('.workflow-price');
    if (quoteLine && input) input.value = quote.price_basis === 'inclusive' ? quoteLine.unit_price_inc : quoteLine.unit_price_ex;
  });
}

async function saveWorkflowPurchaseOrder(event, orderId) {
  event.preventDefault();
  const quote = adminState.supplierQuotes.find(row => Number(row.id) === Number(document.getElementById('wfPoQuote').value));
  if (!quote || quote.approval_status !== 'approved') return ERP.toast('iiNEER가 승인한 견적을 선택해 주세요.', 'error');
  if (Number(document.getElementById('wfPoSupplier').value) !== Number(quote.supplier_id)) return ERP.toast('견적과 발주 공급사가 다릅니다.', 'error');
  const lines = collectWorkflowLines('.workflow-price');
  if (!lines.length) return ERP.toast('발주 단가를 한 개 이상 입력해 주세요.', 'error');
  const basis = document.getElementById('wfPoBasis').value;
  const taxRate = Number(document.getElementById('wfPoTax').value || 0) / 100;
  const factor = 1 + taxRate;
  const normalized = lines.map(line => ({ ...line, unitEx: basis === 'inclusive' ? line.price / factor : line.price, unitInc: basis === 'inclusive' ? line.price : line.price * factor }));
  const subtotalEx = normalized.reduce((sum, line) => sum + line.quantity * line.unitEx, 0);
  const totalInc = normalized.reduce((sum, line) => sum + line.quantity * line.unitInc, 0);
  const header = { po_number: document.getElementById('wfPoNumber').value.trim(), order_id: orderId, supplier_quote_id: quote.id, supplier_id: Number(document.getElementById('wfPoSupplier').value), issue_date: document.getElementById('wfPoDate').value, status: 'issued', currency: document.getElementById('wfPoCurrency').value, price_basis: basis, tax_rate: taxRate, subtotal_ex: subtotalEx, tax_amount: totalInc - subtotalEx, total_inc: totalInc, notes: document.getElementById('wfPoNotes').value.trim() || null, issued_at: new Date().toISOString() };
  const { data: po, error } = await ERP.client.from('erp_v2_purchase_orders').insert(header).select().single();
  if (error) return ERP.toast(error.message, 'error');
  const payload = normalized.map(line => ({ purchase_order_id: po.id, supplier_quote_item_id: adminState.supplierQuoteItems.find(item => Number(item.quote_id) === Number(quote.id) && item.order_item_id === line.orderItemId)?.id || null, order_item_id: line.orderItemId, catalog_item_id: line.catalogItemId, description: line.description, quantity: line.quantity, unit: line.unit, unit_price_ex: line.unitEx, unit_price_inc: line.unitInc, sequence: line.sequence }));
  const result = await ERP.client.from('erp_v2_purchase_order_items').insert(payload);
  if (result.error) return ERP.toast(result.error.message, 'error');
  await updateWorkflowStage(orderId, 'purchase_ordered', false, false);
  await loadAdminData();
  renderWorkflowOrder(orderId);
  ERP.toast('발주와 세후 금액을 저장했습니다.', 'success');
}

function printWorkflowPurchaseOrder(poId) {
  const po = adminState.purchaseOrders.find(row => Number(row.id) === Number(poId));
  if (!po) return ERP.toast('발주 정보를 찾을 수 없습니다.', 'error');
  const supplier = adminState.suppliers.find(row => Number(row.id) === Number(po.supplier_id));
  if (!supplier) return ERP.toast('공급사 정보를 찾을 수 없습니다.', 'error');
  const buyer = adminState.company || { display_name: ERP.config.company.name };
  const lines = adminState.purchaseOrderItems.filter(row => Number(row.purchase_order_id) === Number(po.id)).sort((a, b) => Number(a.sequence) - Number(b.sequence));
  const priceBasis = po.price_basis === 'inclusive' ? 'inclusive' : 'exclusive';
  const taxPercent = Number(po.tax_rate || 0) * 100;
  const priceLabel = priceBasis === 'exclusive' ? '税前单价' : '含税单价';
  const amountLabel = priceBasis === 'exclusive' ? '税前金额' : '含税金额';
  const party = row => [row.legal_name || row.display_name, row.tax_id ? `税号：${row.tax_id}` : '', row.address ? `地址：${row.address}` : '', row.bank_name ? `开户银行：${row.bank_name}` : '', row.bank_account ? `银行账户：${row.bank_account}` : ''].filter(Boolean).map(ERP.escapeHtml).join('<br>');
  const popup = window.open('', '_blank');
  popup.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${ERP.escapeHtml(po.po_number)}</title><style>body{font-family:"Microsoft YaHei UI","Microsoft YaHei","PingFang SC","Noto Sans SC","Noto Sans CJK SC","Source Han Sans SC",sans-serif;margin:24mm;color:#111}h1{text-align:center;letter-spacing:.18em}.party{display:grid;grid-template-columns:1fr 1fr;gap:24px;font-size:12px;line-height:1.65;margin:22px 0}.party div{border-top:1px solid #333;padding-top:8px}.meta{display:flex;justify-content:space-between;margin:14px 0;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #222;padding:8px}th{background:#f1f3f5}.num{text-align:right}.total{font-weight:bold}.note{margin-top:18px;font-size:12px;white-space:pre-wrap}.sign{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:60px;border-top:1px solid #222;padding-top:12px}.actions{position:fixed;right:20px;top:20px}@media print{.actions{display:none}body{margin:12mm}}</style></head><body><button class="actions" onclick="print()">打印 / 保存PDF</button><h1>采购订单</h1><div class="party"><div><strong>买方</strong><br>${party(buyer)}</div><div><strong>供应商</strong><br>${party(supplier)}</div></div><div class="meta"><span>订单编号：${ERP.escapeHtml(po.po_number)}</span><span>订单日期：${ERP.escapeHtml(po.issue_date || '-')}</span><span>价格类型：${priceBasis === 'exclusive' ? '未税' : '含税'} · 币种：${ERP.escapeHtml(po.currency)} · 税率：${ERP.number(taxPercent,2)}%</span></div><table><thead><tr><th>序号</th><th>配件名称</th><th>${priceLabel}</th><th>数量</th><th>单位</th><th>${amountLabel}</th></tr></thead><tbody>${lines.map((line,index) => { const unitPrice = priceBasis === 'exclusive' ? line.unit_price_ex : line.unit_price_inc; return `<tr><td>${index + 1}</td><td>${ERP.escapeHtml(line.description)}</td><td class="num">${ERP.number(unitPrice,4)}</td><td class="num">${ERP.number(line.quantity,4)}</td><td>${ERP.escapeHtml(line.unit || 'EA')}</td><td class="num">${ERP.number(Number(unitPrice) * Number(line.quantity),2)}</td></tr>`; }).join('')}<tr><td colspan="5">税前合计（${ERP.escapeHtml(po.currency)}）</td><td class="num">${ERP.number(po.subtotal_ex,2)}</td></tr><tr><td colspan="5">税额（${ERP.number(taxPercent,2)}%）</td><td class="num">${ERP.number(po.tax_amount,2)}</td></tr><tr class="total"><td colspan="5">含税总额（${ERP.escapeHtml(po.currency)}）</td><td class="num">${ERP.number(po.total_inc,2)}</td></tr></tbody></table><div class="note"><strong>备注</strong><br>${ERP.escapeHtml(po.notes || '-')}</div><div class="sign"><div>${ERP.escapeHtml(buyer.legal_name || buyer.display_name || '')}<br><br>买方盖章/签字</div><div>${ERP.escapeHtml(supplier.legal_name || supplier.display_name || '')}<br><br>供应商盖章/签字</div></div></body></html>`);
  popup.document.close();
}

function renderContractForm(orderId) {
  const contact = primaryCustomerContact();
  document.getElementById('adminContent').innerHTML = `<form class="card form-card" onsubmit="saveWorkflowContract(event,'${orderId}')"><div class="section-title"><div><h2>Contract 작성</h2><p>수금 기준 문서이며 선적 Invoice와 별도로 관리합니다.</p></div><button type="button" class="btn btn-soft" onclick="renderWorkflowOrder('${orderId}')">돌아가기</button></div><div class="form-grid three"><div class="field"><label>Contract 번호 *</label><input id="wfContractNumber" required value="CONTRACT-${new Date().toISOString().slice(2,10).replaceAll('-','')}-01"></div><div class="field"><label>발행일</label><input id="wfContractDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>통화</label><select id="wfContractCurrency"><option>USD</option><option>CNY</option><option>KRW</option></select></div><div class="field"><label>담당자</label><input value="${ERP.escapeHtml(contact?.contact_name || '')}" readonly></div><div class="field"><label>Freight</label><input id="wfContractFreight" type="number" min="0" step="0.01" value="0"></div><div class="field"><label>Discount</label><input id="wfContractDiscount" type="number" min="0" step="0.01" value="0"></div><div class="field"><label>Tax</label><input id="wfContractTax" type="number" min="0" step="0.01" value="0"></div><div class="field"><label>Payment terms</label><input id="wfContractTerms" value="100% T/T before shipment"></div></div><section class="form-section"><h2>Contract 품목</h2>${workflowLineRows(orderId, 'workflow-price', 'iiNEER 판매단가')}</section><div class="field"><label>비고</label><textarea id="wfContractNotes"></textarea></div><div class="form-submit"><button class="btn btn-accent" type="submit">Contract 저장</button></div></form>`;
}

async function saveWorkflowContract(event, orderId) {
  event.preventDefault();
  const lines = collectWorkflowLines('.workflow-price');
  if (!lines.length) return ERP.toast('판매단가를 한 개 이상 입력해 주세요.', 'error');
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
  const header = { contract_number: document.getElementById('wfContractNumber').value.trim(), customer_key: 'iineer', order_id: orderId, issue_date: document.getElementById('wfContractDate').value, currency: document.getElementById('wfContractCurrency').value, status: 'sent', subtotal, freight: Number(document.getElementById('wfContractFreight').value || 0), discount: Number(document.getElementById('wfContractDiscount').value || 0), tax: Number(document.getElementById('wfContractTax').value || 0), payment_terms: document.getElementById('wfContractTerms').value.trim() || null, notes: document.getElementById('wfContractNotes').value.trim() || null, sent_at: new Date().toISOString() };
  const { data: contract, error } = await ERP.client.from('erp_v2_contracts').insert(header).select().single();
  if (error) return ERP.toast(error.message, 'error');
  const payload = lines.map(line => ({ contract_id: contract.id, order_item_id: line.orderItemId, catalog_item_id: line.catalogItemId, description: line.description, quantity: line.quantity, unit: line.unit, unit_price: line.price, sequence: line.sequence }));
  const result = await ERP.client.from('erp_v2_contract_items').insert(payload);
  if (result.error) return ERP.toast(result.error.message, 'error');
  await updateWorkflowStage(orderId, 'contract_sent', false, false);
  await loadAdminData();
  renderWorkflowOrder(orderId);
  ERP.toast('Contract를 저장했습니다.', 'success');
}

function renderPaymentForm(orderId) {
  const contracts = adminState.contracts.filter(row => row.order_id === orderId && row.status !== 'void');
  document.getElementById('adminContent').innerHTML = `<form class="card form-card" onsubmit="saveWorkflowPayment(event,'${orderId}')"><div class="section-title"><div><h2>수금 등록</h2><p>한 번의 입금으로 같은 통화의 여러 Contract를 결제하거나 부분 수금할 수 있습니다.</p></div><button type="button" class="btn btn-soft" onclick="renderWorkflowOrder('${orderId}')">돌아가기</button></div><div class="form-grid three"><div class="field"><label>수금번호 *</label><input id="wfPaymentNumber" required value="RCPT-${new Date().toISOString().slice(2,10).replaceAll('-','')}-01"></div><div class="field"><label>수금일</label><input id="wfPaymentDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>통화</label><select id="wfPaymentCurrency" onchange="syncPaymentCurrency()"><option>USD</option><option>CNY</option><option>KRW</option></select></div><div class="field"><label>은행 참조</label><input id="wfPaymentReference"></div></div><section class="form-section"><h2>Contract 배분</h2>${contracts.length ? `<div class="table-wrap"><table><thead><tr><th>Contract</th><th>통화</th><th>금액</th><th>기수금</th><th>이번 수금 배분</th></tr></thead><tbody>${contracts.map(row => `<tr data-payment-contract="${row.id}" data-currency="${ERP.escapeHtml(row.currency)}"><td><strong>${ERP.escapeHtml(row.contract_number)}</strong></td><td>${ERP.escapeHtml(row.currency)}</td><td>${ERP.money(row.total,row.currency)}</td><td>${ERP.money(paymentAllocatedToContract(row.id),row.currency)}</td><td><input class="payment-allocation" type="number" min="0" max="${Math.max(0, Number(row.total)-paymentAllocatedToContract(row.id))}" step="0.01" value="0"></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">먼저 Contract를 작성해 주세요.</div>'}</section><div class="field"><label>비고</label><textarea id="wfPaymentNotes"></textarea></div><div class="form-submit"><button class="btn btn-accent" type="submit">수금 저장</button></div></form>`;
  syncPaymentCurrency();
}

function syncPaymentCurrency() {
  const currency = document.getElementById('wfPaymentCurrency')?.value;
  document.querySelectorAll('[data-payment-contract]').forEach(row => {
    const input = row.querySelector('.payment-allocation');
    const matches = row.dataset.currency === currency;
    input.disabled = !matches;
    if (!matches) input.value = 0;
    row.classList.toggle('muted-row', !matches);
  });
}

async function saveWorkflowPayment(event, orderId) {
  event.preventDefault();
  const allocations = [...document.querySelectorAll('[data-payment-contract]')].map(row => ({ contractId: Number(row.dataset.paymentContract), amount: Number(row.querySelector('.payment-allocation').value || 0) })).filter(row => row.amount > 0);
  if (!allocations.length) return ERP.toast('수금 배분 금액을 입력해 주세요.', 'error');
  const currency = document.getElementById('wfPaymentCurrency').value;
  if (allocations.some(allocation => adminState.contracts.find(row => Number(row.id) === allocation.contractId)?.currency !== currency)) return ERP.toast('수금과 Contract 통화를 맞춰 주세요.', 'error');
  const amount = allocations.reduce((sum, row) => sum + row.amount, 0);
  const header = { receipt_number: document.getElementById('wfPaymentNumber').value.trim(), customer_key: 'iineer', received_date: document.getElementById('wfPaymentDate').value, currency, amount, bank_reference: document.getElementById('wfPaymentReference').value.trim() || null, notes: document.getElementById('wfPaymentNotes').value.trim() || null };
  const { data: payment, error } = await ERP.client.from('erp_v2_payments').insert(header).select().single();
  if (error) return ERP.toast(error.message, 'error');
  const result = await ERP.client.from('erp_v2_payment_contract_allocations').insert(allocations.map(row => ({ payment_id: payment.id, contract_id: row.contractId, allocated_amount: row.amount })));
  if (result.error) return ERP.toast(result.error.message, 'error');
  for (const allocation of allocations) {
    const contract = adminState.contracts.find(row => Number(row.id) === allocation.contractId);
    const paid = paymentAllocatedToContract(allocation.contractId) + allocation.amount;
    const update = await ERP.client.from('erp_v2_contracts').update({ status: paid + 0.005 >= Number(contract.total) ? 'paid' : 'partial_paid', updated_at: new Date().toISOString() }).eq('id', allocation.contractId);
    if (update.error) return ERP.toast(update.error.message, 'error');
  }
  const orderContracts = adminState.contracts.filter(row => row.order_id === orderId && row.status !== 'void');
  const allPaid = orderContracts.length > 0 && orderContracts.every(contract => {
    const added = allocations.find(row => row.contractId === Number(contract.id))?.amount || 0;
    return paymentAllocatedToContract(contract.id) + added + 0.005 >= Number(contract.total);
  });
  await updateWorkflowStage(orderId, allPaid ? 'payment_received' : 'payment_pending', false, false);
  await loadAdminData();
  renderWorkflowOrder(orderId);
  ERP.toast('수금과 Contract 배분을 저장했습니다.', 'success');
}

function outstandingContractItems(orderId = '') {
  return adminState.contractItems.map(item => {
    const contract = adminState.contracts.find(row => Number(row.id) === Number(item.contract_id));
    return { item, contract, shipped: invoicedQuantityForContractItem(item.id), remaining: Number(item.quantity) - invoicedQuantityForContractItem(item.id) };
  }).filter(row => row.contract && row.contract.status !== 'void' && row.remaining > 0.000001 && (!orderId || row.contract.order_id === orderId));
}

function renderShipmentInvoiceForm(orderId = '') {
  const rows = outstandingContractItems(orderId);
  const contact = primaryCustomerContact();
  document.getElementById('adminContent').innerHTML = `
    <form class="card form-card" onsubmit="saveShipmentInvoice(event)">
      <div class="section-title"><div><h2>한국 수출서류 작성</h2><p>영문 Commercial Invoice와 Packing List를 한 번에 작성합니다.</p></div><button type="button" class="btn btn-soft" onclick="${orderId ? `renderWorkflowOrder('${orderId}')` : 'renderWorkflow()'}">돌아가기</button></div>
      <div class="form-grid three">
        <div class="field"><label>Invoice 번호 *</label><input id="wfInvoiceNumber" required value="CI-${new Date().toISOString().slice(2,10).replaceAll('-','')}-01"></div>
        <div class="field"><label>발행일</label><input id="wfInvoiceDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="field"><label>선적일</label><input id="wfShipmentDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="field"><label>통화</label><select id="wfInvoiceCurrency"><option>USD</option><option>CNY</option><option>KRW</option></select></div>
        <div class="field"><label>Buyer 이메일</label><input id="wfInvoiceEmail" type="email" value="${ERP.escapeHtml(contact?.email || '')}"></div>
        <div class="field"><label>Tracking No.</label><input id="wfTrackingNo"></div>
        <div class="field"><label>포장 수량 *</label><input id="wfPackageCount" type="number" min="1" step="1" value="1" required></div>
        <div class="field"><label>포장 형태</label><select id="wfPackageType"><option>CARTON</option><option>WOODEN CASE</option><option>PALLET</option><option>BUNDLE</option></select></div>
        <div class="field"><label>박스 크기 (cm)</label><input id="wfDimensions" placeholder="60 x 40 x 35 cm"></div>
        <div class="field"><label>순중량 Net Weight (kg)</label><input id="wfNetWeight" type="number" min="0" step="0.001"></div>
        <div class="field"><label>총중량 Gross Weight (kg)</label><input id="wfGrossWeight" type="number" min="0" step="0.001"></div>
        <div class="field"><label>Shipping Marks</label><input id="wfShippingMarks" value="LZN / iiNEER"></div>
        <div class="field"><label>Freight</label><input id="wfInvoiceFreight" type="number" min="0" step="0.01" value="0"></div>
        <div class="field"><label>Tax</label><input id="wfInvoiceTax" type="number" min="0" step="0.01" value="0"></div>
        <div class="field"><label>Discount</label><input id="wfInvoiceDiscount" type="number" min="0" step="0.01" value="0"></div>
      </div>
      <section class="form-section"><h2>선적할 Contract 품목</h2>${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Contract / 수주</th><th>품목</th><th>계약수량</th><th>기선적</th><th>이번 선적</th><th>단가</th></tr></thead><tbody>${rows.map(row => `<tr data-shipment-contract-item="${row.item.id}" data-order-id="${row.contract.order_id}" data-currency="${row.contract.currency}"><td><strong>${ERP.escapeHtml(row.contract.contract_number)}</strong><br><small>${ERP.escapeHtml(orderNumber(row.contract.order_id))}</small></td><td>${ERP.escapeHtml(row.item.description)}</td><td>${ERP.number(row.item.quantity,4)}</td><td>${ERP.number(row.shipped,4)}</td><td><input class="shipment-qty" type="number" min="0" max="${row.remaining}" step="0.0001" value="0"></td><td>${ERP.money(row.item.unit_price,row.contract.currency)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">선적 가능한 Contract 잔량이 없습니다.</div>'}</section>
      <div class="field"><label>Payment / Shipping Terms</label><input id="wfInvoiceTerms" value="Paid before shipment"></div>
      <div class="form-submit"><button class="btn btn-accent" type="submit">Invoice + Packing List 저장</button></div>
    </form>`;
}

async function saveShipmentInvoice(event) {
  event.preventDefault();
  const selections = [...document.querySelectorAll('[data-shipment-contract-item]')].map(row => {
    const item = adminState.contractItems.find(value => Number(value.id) === Number(row.dataset.shipmentContractItem));
    return { item, orderId: row.dataset.orderId, currency: row.dataset.currency, quantity: Number(row.querySelector('.shipment-qty').value || 0) };
  }).filter(row => row.quantity > 0);
  if (!selections.length) return ERP.toast('이번 선적 수량을 입력해 주세요.', 'error');
  const currency = document.getElementById('wfInvoiceCurrency').value;
  if (selections.some(row => row.currency !== currency)) return ERP.toast('선택한 Contract 통화와 Invoice 통화를 맞춰 주세요.', 'error');
  for (const row of selections) {
    const remaining = Number(row.item.quantity) - invoicedQuantityForContractItem(row.item.id);
    if (row.quantity > remaining + 0.000001) return ERP.toast(`${row.item.description}: 잔량을 초과했습니다.`, 'error');
  }
  const subtotal = selections.reduce((sum, row) => sum + row.quantity * Number(row.item.unit_price), 0);
  const netWeight = document.getElementById('wfNetWeight').value === '' ? null : Number(document.getElementById('wfNetWeight').value);
  const grossWeight = document.getElementById('wfGrossWeight').value === '' ? null : Number(document.getElementById('wfGrossWeight').value);
  if (netWeight !== null && grossWeight !== null && grossWeight < netWeight) return ERP.toast('총중량은 순중량보다 작을 수 없습니다.', 'error');
  const orderIds = [...new Set(selections.map(row => row.orderId))];
  const customer = adminState.customer || { display_name: 'iiNEER Co., Ltd.', address: '' };
  const header = { invoice_number: document.getElementById('wfInvoiceNumber').value.trim(), order_id: orderIds.length === 1 ? orderIds[0] : null, customer_key: 'iineer', issue_date: document.getElementById('wfInvoiceDate').value, shipment_date: document.getElementById('wfShipmentDate').value || null, tracking_no: document.getElementById('wfTrackingNo').value.trim() || null, currency, subtotal, freight: Number(document.getElementById('wfInvoiceFreight').value || 0), tax: Number(document.getElementById('wfInvoiceTax').value || 0), discount: Number(document.getElementById('wfInvoiceDiscount').value || 0), status: 'issued', buyer_name: customer.display_name, buyer_email: document.getElementById('wfInvoiceEmail').value.trim() || null, buyer_address: customer.address, payment_terms: document.getElementById('wfInvoiceTerms').value.trim() || null, package_count: Number(document.getElementById('wfPackageCount').value), package_type: document.getElementById('wfPackageType').value, net_weight_kg: netWeight, gross_weight_kg: grossWeight, dimensions_cm: document.getElementById('wfDimensions').value.trim() || null, shipping_marks: document.getElementById('wfShippingMarks').value.trim() || null };
  const { data: invoice, error } = await ERP.client.from('erp_v2_invoices').insert(header).select().single();
  if (error) return ERP.toast(error.message, 'error');
  for (let index = 0; index < selections.length; index++) {
    const row = selections[index];
    const { data: invoiceItem, error: itemError } = await ERP.client.from('erp_v2_invoice_items').insert({ invoice_id: invoice.id, order_item_id: row.item.order_item_id, catalog_item_id: row.item.catalog_item_id, description: row.item.description, quantity: row.quantity, unit: row.item.unit, unit_price: row.item.unit_price, sequence: index + 1 }).select().single();
    if (itemError) return ERP.toast(itemError.message, 'error');
    const allocation = await ERP.client.from('erp_v2_invoice_contract_allocations').insert({ invoice_item_id: invoiceItem.id, contract_item_id: row.item.id, allocated_quantity: row.quantity, allocated_amount: row.quantity * Number(row.item.unit_price) });
    if (allocation.error) return ERP.toast(allocation.error.message, 'error');
  }
  for (const orderId of orderIds) await updateWorkflowStage(orderId, 'shipment_invoice', false, false);
  await loadAdminData();
  renderInvoices();
  ERP.toast('영문 Invoice와 Packing List를 저장했습니다.', 'success');
}

async function printPackingList(invoiceId) {
  const invoice = adminState.invoices.find(row => row.id === invoiceId);
  if (!invoice) return ERP.toast('Packing List 정보를 찾을 수 없습니다.', 'error');
  const { data: lines, error } = await ERP.client.from('erp_v2_invoice_items').select('*').eq('invoice_id', invoiceId).order('sequence');
  if (error) return ERP.toast(error.message, 'error');
  const seller = adminState.company || { display_name: ERP.config.company.name, address: ERP.config.company.address };
  const buyer = adminState.customer || { display_name: invoice.buyer_name, address: invoice.buyer_address };
  const contractRefs = invoiceContractReferences(invoiceId);
  const packageLabel = [invoice.package_count || '-', invoice.package_type || 'PACKAGE(S)'].join(' ');
  const popup = window.open('', '_blank');
  popup.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>PL-${ERP.escapeHtml(invoice.invoice_number)}</title><style>body{font-family:Arial,sans-serif;margin:20mm;color:#152231}h1{text-align:center;letter-spacing:.12em}.head{display:flex;justify-content:space-between;border-bottom:3px solid #123b59;padding-bottom:18px}.meta{text-align:right;font-size:12px;line-height:1.7}.party{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0;font-size:12px;line-height:1.65}.party div{border-top:1px solid #9aabb8;padding-top:9px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:20px}th,td{border:1px solid #aebbc5;padding:9px}th{background:#eef3f6}.num{text-align:right}.summary{width:62%;margin-left:auto}.marks{margin-top:22px;border:1px solid #aebbc5;padding:14px;min-height:55px;white-space:pre-wrap}.actions{position:fixed;right:20px;top:18px}@media print{.actions{display:none}body{margin:12mm}}</style></head><body><button class="actions" onclick="print()">Print / Save PDF</button><div class="head"><div><h1>PACKING LIST</h1><strong>${ERP.escapeHtml(seller.legal_name || seller.display_name || '')}</strong><br>${ERP.escapeHtml(seller.address || '')}</div><div class="meta"><strong>Packing List No. PL-${ERP.escapeHtml(invoice.invoice_number)}</strong><br>Invoice No. ${ERP.escapeHtml(invoice.invoice_number)}<br>Contract No. ${contractRefs.length ? contractRefs.map(ERP.escapeHtml).join(', ') : '-'}<br>Shipment Date: ${ERP.escapeHtml(invoice.shipment_date || '-')}<br>Tracking No.: ${ERP.escapeHtml(invoice.tracking_no || '-')}</div></div><div class="party"><div><strong>SELLER</strong><br>${ERP.escapeHtml(seller.legal_name || seller.display_name || '')}<br>${ERP.escapeHtml(seller.address || '')}</div><div><strong>CONSIGNEE</strong><br>${ERP.escapeHtml(buyer.display_name || invoice.buyer_name || '')}<br>${ERP.escapeHtml(buyer.address || invoice.buyer_address || '')}<br>${ERP.escapeHtml(invoice.buyer_email || '')}</div></div><table><thead><tr><th>No.</th><th>Description of Goods</th><th>Quantity</th><th>Unit</th><th>HS Code</th><th>Country of Origin</th></tr></thead><tbody>${(lines || []).map((line,index) => `<tr><td>${index + 1}</td><td>${ERP.escapeHtml(line.description)}</td><td class="num">${ERP.number(line.quantity,4)}</td><td>${ERP.escapeHtml(line.unit)}</td><td>${ERP.escapeHtml(line.hs_code || '-')}</td><td>${ERP.escapeHtml(line.origin_country || 'China')}</td></tr>`).join('')}</tbody></table><table class="summary"><tr><th>Total Packages</th><td>${ERP.escapeHtml(packageLabel)}</td></tr><tr><th>Dimensions</th><td>${ERP.escapeHtml(invoice.dimensions_cm || '-')}</td></tr><tr><th>Net Weight</th><td>${invoice.net_weight_kg == null ? '-' : `${ERP.number(invoice.net_weight_kg,3)} kg`}</td></tr><tr><th>Gross Weight</th><td>${invoice.gross_weight_kg == null ? '-' : `${ERP.number(invoice.gross_weight_kg,3)} kg`}</td></tr></table><div class="marks"><strong>SHIPPING MARKS</strong><br>${ERP.escapeHtml(invoice.shipping_marks || 'N/M')}</div></body></html>`);
  popup.document.close();
}

function printContract(contractId) {
  const contract = adminState.contracts.find(row => Number(row.id) === Number(contractId));
  const lines = adminState.contractItems.filter(row => Number(row.contract_id) === Number(contractId));
  if (!contract) return;
  const contact = primaryCustomerContact();
  const seller = adminState.company || { display_name: ERP.config.company.name, address: ERP.config.company.address };
  const popup = window.open('', '_blank');
  const buyer = adminState.customer || { display_name: 'iiNEER Co., Ltd.', address: '' };
  popup.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${ERP.escapeHtml(contract.contract_number)}</title><style>body{font-family:Arial,sans-serif;margin:24mm;color:#111}h1{text-align:center;letter-spacing:.08em}.party{display:grid;grid-template-columns:1fr 1fr;gap:24px;font-size:12px;line-height:1.65;margin:22px 0}.party div{border-top:1px solid #333;padding-top:8px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #222;padding:8px}th{background:#f1f3f5}.num{text-align:right}.total{font-weight:bold}.meta{display:flex;justify-content:space-between;margin:14px 0;font-size:12px}.actions{position:fixed;right:20px;top:20px}@media print{.actions{display:none}body{margin:12mm}}</style></head><body><button class="actions" onclick="print()">Print / Save PDF</button><h1>SALES CONTRACT</h1><div class="party"><div><strong>SELLER</strong><br>${ERP.escapeHtml(seller.legal_name || seller.display_name || '')}<br>${ERP.escapeHtml(seller.address || '')}</div><div><strong>BUYER</strong><br>${ERP.escapeHtml(buyer.display_name || '')}<br>${ERP.escapeHtml(contact?.contact_name || '')} · ${ERP.escapeHtml(contact?.email || '')}<br>${ERP.escapeHtml(buyer.address || '')}</div></div><div class="meta"><span>Contract No. ${ERP.escapeHtml(contract.contract_number)}</span><span>Issue Date ${ERP.escapeHtml(contract.issue_date)}</span><span>Currency ${ERP.escapeHtml(contract.currency)}</span></div><table><thead><tr><th>No.</th><th>Description</th><th>Quantity</th><th>Unit</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>${lines.map((line,index) => `<tr><td>${index+1}</td><td>${ERP.escapeHtml(line.description)}</td><td class="num">${ERP.number(line.quantity,4)}</td><td>${ERP.escapeHtml(line.unit)}</td><td class="num">${ERP.number(line.unit_price,6)}</td><td class="num">${ERP.number(line.amount,2)}</td></tr>`).join('')}<tr><td colspan="5">Subtotal</td><td class="num">${ERP.number(contract.subtotal,2)}</td></tr><tr><td colspan="5">Freight / Tax / Discount</td><td class="num">${ERP.number(Number(contract.freight)+Number(contract.tax)-Number(contract.discount),2)}</td></tr><tr class="total"><td colspan="5">TOTAL ${ERP.escapeHtml(contract.currency)}</td><td class="num">${ERP.number(contract.total,2)}</td></tr></tbody></table><p><strong>Payment Terms:</strong> ${ERP.escapeHtml(contract.payment_terms || '-')}</p><p><strong>Remarks:</strong> ${ERP.escapeHtml(contract.notes || '-')}</p></body></html>`);
  popup.document.close();
}
