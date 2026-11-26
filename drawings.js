const drawingState = {
  session: null,
  role: 'none',
  items: [],
  drawings: [],
  uploading: false
};

document.addEventListener('DOMContentLoaded', initDrawingLibrary);

async function initDrawingLibrary() {
  const root = document.getElementById('drawingRoot');
  try {
    drawingState.session = await ERP.session();
    if (!drawingState.session) return renderDrawingLogin(root);
    if (!(await ERP.isAdmin())) return renderDrawingDenied(root);
    drawingState.role = 'owner';
    await loadDrawingLibrary();
    renderDrawingShell(root);
    renderDrawingTable();
    if (!ERP.passwordLoginReady(drawingState.session)) setTimeout(() => ERP.openPasswordSetup(), 0);
  } catch (error) {
    root.innerHTML = `<div class="empty"><h2>도면 연결 오류</h2><p>${ERP.escapeHtml(error.message)}</p><a class="btn btn-soft" href="portal.html">메인 포털</a></div>`;
  }
}

function renderDrawingLogin(root) {
  root.className = 'landing';
  root.innerHTML = `
    <div class="landing-shell" style="max-width:680px;padding-top:9vh">
      <a class="brand" href="portal.html"><span class="brand-mark">LZ</span><span>LZN DRAWINGS <small>VERSION CONTROL</small></span></a>
      <div class="access-card" style="margin-top:44px">
        <h2>도면 보관함 로그인</h2>
        <p>대표 전용 계정으로 최신 도면과 모든 이전 버전을 관리합니다.</p>
        <form class="auth-login-grid" onsubmit="loginDrawing(event)">
          <input id="drawingEmail" type="email" autocomplete="username" value="${ERP.escapeHtml(ERP.rememberedEmail())}" placeholder="이메일 아이디" required>
          <input id="drawingPassword" type="password" autocomplete="current-password" placeholder="비밀번호" required>
          <button class="btn btn-primary" type="submit">로그인</button>
        </form>
        <div class="auth-note">등록된 관리자 한 명만 도면을 열고 업로드하거나 교체할 수 있습니다.</div>
      </div>
    </div>`;
}

async function loginDrawing(event) {
  event.preventDefault();
  const email = document.getElementById('drawingEmail').value.trim().toLowerCase();
  const password = document.getElementById('drawingPassword').value;
  if (!email || !password) return ERP.toast('이메일과 비밀번호를 입력해 주세요.', 'error');
  try {
    await ERP.signInWithPassword(email, password);
    window.location.reload();
  } catch (error) {
    ERP.toast(error.message, 'error');
  }
}

function renderDrawingDenied(root) {
  root.className = 'landing';
  root.innerHTML = `<div class="landing-shell" style="max-width:680px;padding-top:9vh"><div class="access-card"><h2>대표 전용 도면관리입니다</h2><p>${ERP.escapeHtml(drawingState.session.user.email)} 계정으로는 도면에 접근할 수 없습니다.</p><div class="top-actions"><button class="btn btn-primary" onclick="ERP.signOut()">다른 계정으로 로그인</button><a class="btn btn-soft" href="portal.html">메인으로</a></div></div></div>`;
}

async function loadDrawingLibrary() {
  const [items, drawings] = await Promise.all([
    ERP.client.from('erp_v2_items').select('id,item_code,item_name,normalized_key,product,process_type,material,unit,remark,drawing_status,drawing_formats,drawing_path').order('item_name'),
    ERP.client.from('erp_v2_drawings').select('id,catalog_item_id,file_name,storage_path,mime_type,file_size,file_kind,version_no,is_current,replaces_drawing_id,source_modified_at,change_note,checksum_sha256,created_at').not('catalog_item_id', 'is', null).order('created_at', { ascending: false })
  ]);
  if (items.error) throw items.error;
  if (drawings.error) throw drawings.error;
  drawingState.items = items.data || [];
  drawingState.drawings = drawings.data || [];
}

function roleLabel() {
  return drawingState.role === 'owner' ? '대표 관리자' : '접근 불가';
}

function canEditDrawings() {
  return drawingState.role === 'owner';
}

function renderDrawingShell(root) {
  root.className = 'app-shell';
  root.innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="portal.html"><span class="brand-mark">LZ</span><span>LZN DRAWINGS <small>CONTROLLED FILES</small></span></a>
      <nav class="nav"><button class="active">도면관리</button><a href="order.html">수주관리</a><a href="admin.html?page=suppliers">발주관리</a><a href="admin.html">전체 대시보드</a></nav>
      <div class="sidebar-footer"><div><span class="badge good">${roleLabel()}</span><br>${ERP.escapeHtml(drawingState.session.user.email)}</div><button onclick="ERP.openPasswordSetup()">비밀번호 설정</button><button onclick="ERP.signOut()">로그아웃</button></div>
    </aside>
    <main class="app-main">
      <header class="topbar"><div><h1>도면 보관함</h1><p>PDF는 브라우저에서 바로 보고, DWG·STP는 내려받아 CAD에서 열 수 있습니다. 교체본은 기존 버전을 보존합니다.</p><p class="auth-note">도면을 한 번에 올리면 이름이 맞는 품목은 새 버전으로, 없는 품목은 자동으로 신규 등록됩니다.</p></div><div class="top-actions"><button class="btn btn-soft" onclick="refreshDrawingLibrary()">새로고침</button>${canEditDrawings() ? '<button class="btn btn-primary" type="button" onclick="openNewDrawingItem()">새 품목 추가</button><label class="btn btn-accent file-button">도면 일괄 업로드<input id="batchDrawingFiles" type="file" multiple accept=".dwg,.pdf,.stp,.step,.png,.jpg,.jpeg" onchange="syncDrawingFolder(this.files); this.value=\'\'"></label><label class="btn btn-accent file-button">폴더 일괄 업로드<input id="folderDrawingFiles" type="file" webkitdirectory directory multiple onchange="syncDrawingFolder(this.files)"></label>' : ''}</div></header>
      <section id="drawingContent">
        <div class="grid-kpi drawing-kpis">
          <article class="card kpi" style="--accent:#dfeef5"><label>접근 가능 품목</label><strong>${drawingState.items.length}</strong></article>
          <article class="card kpi" style="--accent:#dff3ec"><label>현재 도면</label><strong>${drawingState.drawings.filter(x => x.is_current).length}</strong></article>
          <article class="card kpi" style="--accent:#fff0c9"><label>보관 버전</label><strong>${drawingState.drawings.length}</strong></article>
          <article class="card kpi" style="--accent:#e6e8f6"><label>권한</label><strong style="font-size:20px">${roleLabel()}</strong></article>
        </div>
        ${canEditDrawings() ? '<div id="syncProgress" class="sync-progress" hidden></div>' : ''}
        <div class="card card-pad"><div class="filters"><input id="drawingSearch" placeholder="품목명·코드 검색" oninput="renderDrawingTable()"><select id="drawingProduct" onchange="renderDrawingTable()"><option value="">전체 제품</option><option>INE-200</option><option>INT-200</option><option>INB-200</option><option>INA-200</option><option>제품확인필요</option></select><select id="drawingProcess" onchange="renderDrawingTable()"><option value="">전체 가공·소재</option><option>MCT</option><option>CNC</option><option>GLASS</option><option>기어류</option><option>기타</option></select><span id="drawingCount" class="badge"></span></div><div id="drawingTable"></div></div>
      </section>
    </main>`;
}

function openNewDrawingItem() {
  if (!canEditDrawings()) return ERP.toast('새 품목 등록 권한이 없습니다.', 'error');
  closeNewDrawingItem();
  const modal = document.createElement('div');
  modal.id = 'drawingNewItemModal';
  modal.className = 'erp-modal-backdrop';
  modal.onclick = event => { if (event.target === modal) closeNewDrawingItem(); };
  modal.innerHTML = `<section class="erp-modal erp-modal-editor" role="dialog" aria-modal="true" aria-labelledby="drawingNewItemTitle">
    <button class="erp-modal-close" type="button" aria-label="닫기" onclick="closeNewDrawingItem()">×</button>
    <h2 id="drawingNewItemTitle">새 도면 품목 추가</h2>
    <p>품목을 먼저 등록하고, 선택한 도면은 이 품목의 첫 번째 버전으로 함께 보관합니다.</p>
    <form onsubmit="saveNewDrawingItem(event)">
      <div class="form-grid">
        <div class="field full"><label>품목명</label><input id="drawingNewItemName" oninput="this.value=this.value.toUpperCase(); updateNewDrawingItemCode()" placeholder="예: AB IC MOTOR COVER" required></div>
        <div class="field full"><label>품목 코드</label><input id="drawingNewItemCode" oninput="this.dataset.manual='true'" placeholder="비워두면 품목명에서 자동 생성"><small>영문·숫자·한글을 사용할 수 있으며 공백은 밑줄로 정리됩니다.</small></div>
        <div class="field"><label>제품</label><select id="drawingNewItemProduct">${drawingSelectOptions(['INE-200','INT-200','INB-200','INA-200','제품확인필요'], '제품확인필요')}</select></div>
        <div class="field"><label>가공 분류</label><select id="drawingNewItemProcess">${drawingSelectOptions(['MCT','CNC','GLASS','기어류','기타'], '기타')}</select></div>
        <div class="field"><label>소재</label><input id="drawingNewItemMaterial" placeholder="예: SUS304, AL6061, GLASS"></div>
        <div class="field"><label>단위</label><input id="drawingNewItemUnit" value="EA" required></div>
        <div class="field full"><label>비고</label><textarea id="drawingNewItemRemark" placeholder="추가로 관리할 내용을 입력하세요."></textarea></div>
        <div class="field full"><label>도면 파일 (선택)</label><input id="drawingNewItemFiles" type="file" multiple accept=".dwg,.pdf,.stp,.step,.png,.jpg,.jpeg"><small>PDF·DWG·STP 등 형식별 최신 파일을 한 개씩 등록합니다. 품목만 먼저 등록해도 됩니다.</small></div>
      </div>
      <div class="editor-actions"><button class="btn btn-soft" type="button" onclick="closeNewDrawingItem()">취소</button><button class="btn btn-primary" type="submit">품목 등록</button></div>
    </form>
  </section>`;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');
  window.drawingNewItemEscapeHandler = event => { if (event.key === 'Escape') closeNewDrawingItem(); };
  document.addEventListener('keydown', window.drawingNewItemEscapeHandler);
  setTimeout(() => document.getElementById('drawingNewItemName')?.focus(), 0);
}

function closeNewDrawingItem() {
  document.getElementById('drawingNewItemModal')?.remove();
  document.body.classList.remove('modal-open');
  if (window.drawingNewItemEscapeHandler) {
    document.removeEventListener('keydown', window.drawingNewItemEscapeHandler);
    window.drawingNewItemEscapeHandler = null;
  }
}

function updateNewDrawingItemCode() {
  const name = document.getElementById('drawingNewItemName');
  const code = document.getElementById('drawingNewItemCode');
  if (!name || !code || code.dataset.manual === 'true') return;
  code.value = normalizedBaseName(name.value);
}

function friendlyNewItemError(error) {
  if (error?.code === '23505' || /duplicate key|already exists/i.test(error?.message || '')) {
    return '같은 품목 코드가 이미 있습니다. 기존 품목을 검색하거나 다른 코드를 입력해 주세요.';
  }
  return error?.message || '새 품목을 등록하지 못했습니다.';
}

async function saveNewDrawingItem(event) {
  event.preventDefault();
  const button = event.submitter;
  const itemName = document.getElementById('drawingNewItemName').value.trim();
  const itemCode = normalizedBaseName(document.getElementById('drawingNewItemCode').value || itemName);
  if (!itemName) return ERP.toast('품목명을 입력해 주세요.', 'error');
  if (!itemCode) return ERP.toast('품목 코드를 입력해 주세요.', 'error');

  const payload = {
    item_code: itemCode,
    normalized_key: itemCode,
    item_name: itemName,
    product: document.getElementById('drawingNewItemProduct').value,
    process_type: document.getElementById('drawingNewItemProcess').value,
    material: document.getElementById('drawingNewItemMaterial').value.trim() || null,
    unit: document.getElementById('drawingNewItemUnit').value.trim() || 'EA',
    remark: document.getElementById('drawingNewItemRemark').value.trim() || null,
    drawing_status: '미매칭',
    updated_at: new Date().toISOString()
  };
  const selectedFiles = [...(document.getElementById('drawingNewItemFiles').files || [])];
  const unsupportedFiles = selectedFiles.filter(file => !isSupportedDrawing(file));
  if (unsupportedFiles.length) {
    return ERP.toast('지원하지 않는 형식이거나 50MB를 초과한 도면이 있습니다.', 'error');
  }
  const files = latestFilesByKind(selectedFiles);
  button.disabled = true;

  try {
    const { data: item, error } = await ERP.client
      .from('erp_v2_items')
      .insert(payload)
      .select('id,item_code,item_name,normalized_key,product,process_type,material,unit,remark,drawing_status,drawing_formats,drawing_path')
      .single();
    if (error) throw error;

    let uploaded = 0;
    let failed = 0;
    drawingState.items.push(item);
    for (const file of files) {
      try {
        const result = await uploadCatalogDrawing(item, file, '신규 품목 등록');
        if (result === 'uploaded') uploaded++;
      } catch (uploadError) {
        failed++;
        console.error(file.name, uploadError);
      }
    }

    closeNewDrawingItem();
    await loadDrawingLibrary();
    renderDrawingShell(document.getElementById('drawingRoot'));
    renderDrawingTable();
    const drawingMessage = files.length ? ` · 도면 ${uploaded}개 등록${failed ? `, ${failed}개 실패` : ''}` : '';
    ERP.toast(`${item.item_name} 품목을 추가했습니다${drawingMessage}.`, failed ? 'error' : 'success');
  } catch (error) {
    ERP.toast(friendlyNewItemError(error), 'error');
  } finally {
    button.disabled = false;
  }
}

async function refreshDrawingLibrary() {
  try {
    await loadDrawingLibrary();
    renderDrawingShell(document.getElementById('drawingRoot'));
    renderDrawingTable();
    ERP.toast('최신 도면 목록으로 갱신했습니다.', 'success');
  } catch (error) {
    ERP.toast(error.message, 'error');
  }
}

function drawingsForItem(itemId) {
  return drawingState.drawings.filter(x => Number(x.catalog_item_id) === Number(itemId));
}

function renderDrawingTable() {
  const q = (document.getElementById('drawingSearch')?.value || '').trim().toLowerCase();
  const product = document.getElementById('drawingProduct')?.value || '';
  const process = document.getElementById('drawingProcess')?.value || '';
  const rows = drawingState.items.filter(item =>
    (!q || `${item.item_code} ${item.item_name} ${item.material || ''}`.toLowerCase().includes(q))
    && (!product || item.product === product)
    && (!process || item.process_type === process)
  );
  document.getElementById('drawingCount').textContent = `${rows.length}개 품목`;
  document.getElementById('drawingTable').innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>품목</th><th>제품</th><th>가공·소재</th><th>현재 도면</th><th>버전</th>${canEditDrawings() ? '<th>관리</th>' : ''}</tr></thead><tbody>${rows.map(drawingItemRow).join('')}</tbody></table></div>` : '<div class="empty">조건에 맞는 품목이 없습니다.</div>';
}

function drawingItemRow(item) {
  const all = drawingsForItem(item.id);
  const current = all.filter(x => x.is_current).sort((a, b) => String(a.file_kind).localeCompare(String(b.file_kind)));
  const formats = current.length ? current.map(file => `<button class="format-chip ${file.file_kind === 'PDF' ? 'preview' : ''}" onclick="openDrawing('${file.id}')">${ERP.escapeHtml(file.file_kind || 'FILE')} · v${file.version_no}</button>`).join('') : '<span class="badge bad">도면 없음</span>';
  return `<tr><td><strong>${ERP.escapeHtml(item.item_name)}</strong><br><small>${ERP.escapeHtml(item.item_code)}</small></td><td>${ERP.escapeHtml(item.product)}</td><td>${ERP.escapeHtml(item.process_type)}<br><small>${ERP.escapeHtml(item.material || '-')}</small></td><td><div class="format-list">${formats}</div></td><td>${all.length ? `<button class="btn btn-small btn-soft" onclick="showDrawingHistory(${item.id})">이력 ${all.length}</button>` : '-'}</td>${canEditDrawings() ? `<td><div class="row-actions"><button class="btn btn-small btn-soft" type="button" onclick="openDrawingItemEditor(${item.id})">품목정보 수정</button><label class="btn btn-small btn-primary file-button">도면 업로드<input type="file" multiple accept=".dwg,.pdf,.stp,.step,.png,.jpg,.jpeg" onchange="uploadItemDrawings(${item.id},this.files)"></label></div></td>` : ''}</tr>`;
}

function drawingSelectOptions(values, current) {
  return values.map(value => `<option value="${ERP.escapeHtml(value)}" ${value === current ? 'selected' : ''}>${ERP.escapeHtml(value)}</option>`).join('');
}

function openDrawingItemEditor(itemId) {
  const item = drawingState.items.find(x => Number(x.id) === Number(itemId));
  if (!item) return ERP.toast('품목을 찾을 수 없습니다.', 'error');
  closeDrawingItemEditor();
  const modal = document.createElement('div');
  modal.id = 'drawingItemEditorModal';
  modal.className = 'erp-modal-backdrop';
  modal.onclick = event => { if (event.target === modal) closeDrawingItemEditor(); };
  modal.innerHTML = `<section class="erp-modal erp-modal-editor" role="dialog" aria-modal="true" aria-labelledby="drawingItemEditorTitle">
    <button class="erp-modal-close" type="button" aria-label="닫기" onclick="closeDrawingItemEditor()">×</button>
    <h2 id="drawingItemEditorTitle">품목정보 수정</h2>
    <p>${ERP.escapeHtml(item.item_code)} · 도면과 연결된 고유 코드는 유지됩니다.</p>
    <form onsubmit="saveDrawingItemEdit(event,${item.id})">
      <div class="form-grid">
        <div class="field full"><label>품목명</label><input id="drawingEditItemName" value="${ERP.escapeHtml(item.item_name)}" oninput="this.value=this.value.toUpperCase()" required></div>
        <div class="field"><label>제품</label><select id="drawingEditItemProduct">${drawingSelectOptions(['INE-200','INT-200','INB-200','INA-200','제품확인필요'], item.product)}</select></div>
        <div class="field"><label>가공 분류</label><select id="drawingEditItemProcess">${drawingSelectOptions(['MCT','CNC','GLASS','기어류','기타'], item.process_type)}</select></div>
        <div class="field"><label>소재</label><input id="drawingEditItemMaterial" value="${ERP.escapeHtml(item.material || '')}" oninput="this.value=this.value.toUpperCase()" placeholder="예: SUS304, AL6061, GLASS"></div>
        <div class="field"><label>단위</label><input id="drawingEditItemUnit" value="${ERP.escapeHtml(item.unit || 'EA')}" required></div>
        <div class="field full"><label>비고</label><textarea id="drawingEditItemRemark">${ERP.escapeHtml(item.remark || '')}</textarea></div>
      </div>
      <p class="auth-note">품목명·제품·가공분류·소재를 바꾸면 이 품목에 연결된 과거 매입·매출 기록도 같은 내용으로 정리됩니다.</p>
      <div class="editor-actions"><button class="btn btn-soft" type="button" onclick="fillItemInfoFromDrawing(${item.id}, this)">도면에서 제품·소재 불러오기</button><button class="btn btn-soft" type="button" onclick="closeDrawingItemEditor()">취소</button><button class="btn btn-primary" type="submit">저장</button></div>
    </form>
  </section>`;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');
  window.drawingItemEditorEscapeHandler = event => { if (event.key === 'Escape') closeDrawingItemEditor(); };
  document.addEventListener('keydown', window.drawingItemEditorEscapeHandler);
  setTimeout(() => document.getElementById('drawingEditItemName')?.focus(), 0);
}

function closeDrawingItemEditor() {
  document.getElementById('drawingItemEditorModal')?.remove();
  document.body.classList.remove('modal-open');
  if (window.drawingItemEditorEscapeHandler) {
    document.removeEventListener('keydown', window.drawingItemEditorEscapeHandler);
    window.drawingItemEditorEscapeHandler = null;
  }
}

async function fillItemInfoFromDrawing(itemId, button) {
  const item = drawingState.items.find(x => Number(x.id) === Number(itemId));
  if (!item) return ERP.toast('품목을 찾을 수 없습니다.', 'error');
  const pdf = drawingsForItem(itemId).find(x => x.file_kind === 'PDF');
  if (!pdf) return ERP.toast('이 품목의 PDF 도면이 없습니다.', 'error');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = '도면을 읽는 중입니다...';
  try {
    const url = await ERP.signedDrawingUrl(pdf.storage_path, 300);
    const response = await fetch(url);
    if (!response.ok) throw new Error('도면 파일을 불러오지 못했습니다.');
    const blob = await response.blob();
    const info = await readDrawingInfo(new File([blob], pdf.file_name, { type: blob.type || 'application/pdf' }));
    if (!info) return ERP.toast('도면에서 제품·소재를 읽지 못했습니다.', 'error');
    if (info.product) document.getElementById('drawingEditItemProduct').value = info.product;
    if (info.material) document.getElementById('drawingEditItemMaterial').value = info.material;
    ERP.toast(`도면 인식 완료 · 제품 ${info.product || '-'} · 소재 ${info.material || '-'}`, 'success');
  } catch (error) {
    ERP.toast(error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function saveDrawingItemEdit(event, itemId) {
  event.preventDefault();
  const button = event.submitter;
  const item = drawingState.items.find(x => Number(x.id) === Number(itemId));
  if (!item) return ERP.toast('품목을 찾을 수 없습니다.', 'error');
  const payload = {
    item_name: document.getElementById('drawingEditItemName').value.trim(),
    product: document.getElementById('drawingEditItemProduct').value,
    process_type: document.getElementById('drawingEditItemProcess').value,
    material: document.getElementById('drawingEditItemMaterial').value.trim() || null,
    unit: document.getElementById('drawingEditItemUnit').value.trim() || 'EA',
    remark: document.getElementById('drawingEditItemRemark').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  if (!payload.item_name) return ERP.toast('품목명을 입력해 주세요.', 'error');
  button.disabled = true;
  try {
    const itemResult = await ERP.client.from('erp_v2_items').update(payload).eq('id', item.id).select('id').single();
    if (itemResult.error) throw itemResult.error;
    const historyResult = await ERP.client.from('erp_v2_transactions').update({
      part_name: payload.item_name,
      product: payload.product,
      process_type: payload.process_type,
      material: payload.material
    }).eq('normalized_part_name', item.normalized_key).select('id');
    if (historyResult.error) {
      await ERP.client.from('erp_v2_items').update({
        item_name: item.item_name,
        product: item.product,
        process_type: item.process_type,
        material: item.material,
        unit: item.unit,
        remark: item.remark,
        updated_at: new Date().toISOString()
      }).eq('id', item.id);
      throw historyResult.error;
    }
    closeDrawingItemEditor();
    await loadDrawingLibrary();
    renderDrawingTable();
    ERP.toast(`품목정보와 연결 거래 ${historyResult.data?.length || 0}건을 수정했습니다.`, 'success');
  } catch (error) {
    ERP.toast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function openDrawing(drawingId) {
  const file = drawingState.drawings.find(x => x.id === drawingId);
  if (!file) return;
  const popup = window.open('about:blank', '_blank');
  try {
    const url = await ERP.signedDrawingUrl(file.storage_path, 900);
    if (popup) popup.location = url;
    else window.location.href = url;
  } catch (error) {
    if (popup) popup.close();
    ERP.toast(error.message, 'error');
  }
}

async function showDrawingHistory(itemId) {
  const item = drawingState.items.find(x => Number(x.id) === Number(itemId));
  const files = drawingsForItem(itemId).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const popup = window.open('', '_blank', 'width=760,height=760');
  if (!popup) return ERP.toast('팝업을 허용해 주세요.', 'error');
  popup.document.write(`<meta charset="utf-8"><link rel="stylesheet" href="erp.css"><div class="card card-pad" style="margin:20px"><div class="section-title"><div><h2>${ERP.escapeHtml(item.item_name)}</h2><p>기존 버전은 삭제하지 않고 보관됩니다.</p></div></div><div class="table-wrap"><table><thead><tr><th>형식</th><th>버전</th><th>파일</th><th>등록일</th><th></th></tr></thead><tbody>${files.map(file => `<tr><td><span class="badge ${file.is_current ? 'good' : ''}">${ERP.escapeHtml(file.file_kind || 'FILE')}</span></td><td>v${file.version_no}${file.is_current ? ' · 최신' : ''}</td><td>${ERP.escapeHtml(file.file_name)}</td><td>${ERP.date(file.created_at)}</td><td><button class="btn btn-small btn-soft" data-id="${file.id}">열기</button></td></tr>`).join('')}</tbody></table></div></div>`);
  popup.document.close();
  popup.document.querySelectorAll('[data-id]').forEach(button => button.addEventListener('click', () => openDrawing(button.dataset.id)));
}

async function uploadItemDrawings(itemId, fileList) {
  const item = drawingState.items.find(x => Number(x.id) === Number(itemId));
  const files = latestFilesByKind([...fileList]);
  if (!item || !files.length) return;
  let uploaded = 0;
  let skipped = 0;
  try {
    for (const file of files) {
      const result = await uploadCatalogDrawing(item, file, '개별 업로드');
      result === 'skipped' ? skipped++ : uploaded++;
    }
    await loadDrawingLibrary();
    renderDrawingTable();
    ERP.toast(`새 버전 ${uploaded}개 등록${skipped ? ` · 동일 파일 ${skipped}개 제외` : ''}`, 'success');
  } catch (error) {
    ERP.toast(error.message, 'error');
  }
}

function latestFilesByKind(files) {
  const map = new Map();
  files.filter(isSupportedDrawing).forEach(file => {
    const kind = ERP.drawingFileKind(file.name);
    const old = map.get(kind);
    if (!old || file.lastModified >= old.lastModified) map.set(kind, file);
  });
  return [...map.values()];
}

function isSupportedDrawing(file) {
  return ['PDF','DWG','STP','PNG','JPG'].includes(ERP.drawingFileKind(file.name)) && file.size <= 50 * 1024 * 1024;
}

function normalizedBaseName(name) {
  return String(name || '')
    .replace(/\.[^.]+$/, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function findFolderItem(file, lookup) {
  const exact = normalizedBaseName(file.name);
  if (lookup.has(exact)) return lookup.get(exact);
  const withoutCopyNumber = exact.replace(/_\d+$/, '');
  if (lookup.has(withoutCopyNumber)) return lookup.get(withoutCopyNumber);
  return null;
}

function drawingItemLookup() {
  const lookup = new Map();
  drawingState.items.forEach(item => {
    lookup.set(normalizedBaseName(item.normalized_key), item);
    lookup.set(normalizedBaseName(item.item_code), item);
    if (item.drawing_path) lookup.set(normalizedBaseName(item.drawing_path.split(/[\\/]/).pop()), item);
  });
  return lookup;
}

function displayBaseName(fileName) {
  return String(fileName || '')
    .replace(/\.[^.]+$/, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim()
    .toUpperCase();
}

/* ---------- 도면 타이틀 블록 자동 인식 ---------- */

const PDF_JS_SRC = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const PDF_JS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.worker.js';
const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
const KNOWN_PRODUCTS = ['INE-200', 'INT-200', 'INB-200', 'INA-200'];
const TITLE_BLOCK_LABEL_WORDS = new Set(['MODEL', 'NAME', 'PART', 'NO', 'DWG', 'MATERIAL', 'MATL', 'PRODUCT', 'ITEM', 'CODE']);

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error('라이브러리를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });
}

async function ensurePdfJs() {
  if (!window.pdfjsLib) {
    await loadScriptOnce(PDF_JS_SRC);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER;
  }
  return window.pdfjsLib;
}

async function ensureTesseract() {
  if (!window.Tesseract) await loadScriptOnce(TESSERACT_SRC);
  return window.Tesseract;
}

function groupRowsByY(words) {
  const rows = new Map();
  words.filter(w => w.str && w.str.trim()).forEach(w => {
    const key = Math.round(w.y / 6) * 6;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push({ x: w.x, str: w.str });
  });
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, parts]) => ({ parts: parts.sort((a, b) => a.x - b.x) }));
}

async function readPdfTextRows(file) {
  const pdfjs = await ensurePdfJs();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  await doc.destroy();
  if (!content.items.length) return [];
  return groupRowsByY(content.items.map(item => ({ x: item.transform[4], y: item.transform[5], str: item.str })));
}

async function ocrPdfRows(file) {
  const pdfjs = await ensurePdfJs();
  const Tesseract = await ensureTesseract();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  await doc.destroy();
  const result = await Tesseract.recognize(canvas, 'eng');
  const words = [];
  String(result.data.tsv || '').split('\n').forEach(line => {
    const cols = line.split('\t');
    if (cols[0] === '5' && cols[11] && cols[11].trim()) words.push({ x: Number(cols[6]), y: Number(cols[7]), str: cols[11] });
  });
  return groupRowsByY(words);
}

function titleBlockValue(rows, labelPattern) {
  for (let index = 0; index < rows.length; index++) {
    const text = rows[index].parts.map(p => p.str).join(' ');
    const match = text.match(labelPattern);
    if (!match) continue;
    const candidates = [];
    const after = text.slice(match.index + match[0].length);
    candidates.push(after);
    rows.slice(index + 1, index + 3).forEach(row => candidates.push(row.parts.map(p => p.str).join(' ')));
    for (const candidate of candidates) {
      const tokens = candidate.toUpperCase().split(/[^A-Z0-9\-_\.]+/).filter(Boolean);
      const token = tokens.find(t => t.length >= 2 && !TITLE_BLOCK_LABEL_WORDS.has(t.replace(/[^A-Z]/g, '')));
      if (token) return token.replace(/[^A-Z0-9\-_]/g, '');
    }
  }
  return null;
}

function parseTitleBlock(rows) {
  if (!rows || !rows.length) return null;
  const info = {};
  const material = titleBlockValue(rows, /\bMATERIAL\b|\bMATL\b/i);
  const model = titleBlockValue(rows, /\bMODEL\s*NAME\b/i) || titleBlockValue(rows, /\bMODEL\b/i);
  if (material) info.material = material;
  if (model) {
    const cleaned = model.replace(/[^A-Z0-9\-]/g, '');
    info.product = KNOWN_PRODUCTS.includes(cleaned) ? cleaned : '제품확인필요';
  }
  return Object.keys(info).length ? info : null;
}

async function readDrawingInfo(file) {
  let rows = await readPdfTextRows(file).catch(() => []);
  let info = parseTitleBlock(rows);
  if (!info || (!info.product && !info.material)) {
    const ocrRows = await ocrPdfRows(file).catch(() => []);
    info = parseTitleBlock(ocrRows) || info;
  }
  return info;
}

async function syncDrawingFolder(fileList) {
  if (drawingState.uploading) return ERP.toast('이미 업로드 중입니다.', 'error');
  const progress = document.getElementById('syncProgress');
  const lookup = drawingItemLookup();

  const candidates = new Map();
  const newGroups = new Map();
  let unsupported = 0;
  [...fileList].forEach(file => {
    if (!isSupportedDrawing(file)) { unsupported++; return; }
    const item = findFolderItem(file, lookup);
    if (item) {
      const key = `${item.id}:${ERP.drawingFileKind(file.name)}`;
      const old = candidates.get(key);
      if (!old || file.lastModified >= old.file.lastModified) candidates.set(key, { item, file });
      return;
    }
    const code = normalizedBaseName(file.name);
    if (!newGroups.has(code)) newGroups.set(code, { code, files: [] });
    newGroups.get(code).files.push(file);
  });

  const matchedJobs = [...candidates.values()];
  const groups = [...newGroups.values()];
  const totalSteps = matchedJobs.length + groups.reduce((count, group) => count + group.files.length, 0);
  if (!totalSteps) return ERP.toast('업로드할 수 있는 도면이 없습니다.', 'error');

  drawingState.uploading = true;
  progress.hidden = false;
  let uploaded = 0;
  let newItems = 0;
  let skipped = 0;
  let failed = 0;
  let step = 0;

  const renderProgress = (title, detail) => {
    progress.innerHTML = `<strong>도면 업로드 ${step + 1} / ${totalSteps}</strong><div>${ERP.escapeHtml(title)}</div><progress max="${totalSteps}" value="${step}"></progress><small>${detail} · 지원 외 형식/용량 ${unsupported}개</small>`;
  };

  for (const job of matchedJobs) {
    renderProgress(`${job.item.item_name} · ${job.file.name}`, `기존 품목 새 버전 · 신규 품목 예정 ${groups.length}개`);
    try {
      const result = await uploadCatalogDrawing(job.item, job.file, '도면 일괄 업로드');
      result === 'skipped' ? skipped++ : uploaded++;
    } catch (error) {
      failed++;
      console.error(job.file.name, error);
    }
    step++;
  }

  for (const group of groups) {
    renderProgress(`${displayBaseName(group.files[0].name)} · 신규 품목 등록`, `기존 품목 새 버전 완료 ${uploaded}개`);
    let item = null;
    let detected = null;
    const pdfFile = group.files.find(file => ERP.drawingFileKind(file.name) === 'PDF');
    if (pdfFile) {
      renderProgress(`${displayBaseName(group.files[0].name)} · 도면 정보 인식 중`, 'PDF에서 제품·소재를 읽고 있습니다');
      detected = await readDrawingInfo(pdfFile).catch(() => null);
    }
    try {
      const { data, error } = await ERP.client
        .from('erp_v2_items')
        .insert({
          item_code: group.code,
          normalized_key: group.code,
          item_name: displayBaseName(group.files[0].name),
          product: detected?.product || '제품확인필요',
          process_type: '기타',
          material: detected?.material || null,
          unit: 'EA',
          remark: null,
          drawing_status: '미매칭',
          updated_at: new Date().toISOString()
        })
        .select('id,item_code,item_name,normalized_key,product,process_type,material,unit,remark,drawing_status,drawing_formats,drawing_path')
        .single();
      if (error) throw error;
      item = data;
      drawingState.items.push(item);
      lookup.set(normalizedBaseName(item.normalized_key), item);
      lookup.set(normalizedBaseName(item.item_code), item);
      newItems++;
    } catch (error) {
      failed += group.files.length;
      console.error(group.code, error);
    }
    for (const file of group.files) {
      if (!item) { step++; continue; }
      renderProgress(`${item.item_name} · ${file.name}`, `신규 품목 ${newItems}개 등록됨`);
      try {
        const result = await uploadCatalogDrawing(item, file, '도면 일괄 업로드 신규 품목');
        result === 'skipped' ? skipped++ : uploaded++;
      } catch (error) {
        failed++;
        console.error(file.name, error);
      }
      step++;
    }
  }

  drawingState.uploading = false;
  await loadDrawingLibrary();
  renderDrawingShell(document.getElementById('drawingRoot'));
  renderDrawingTable();
  ERP.toast(`업로드 완료 · 새 버전 ${uploaded}개 · 신규 품목 ${newItems}개 · 동일 파일 제외 ${skipped}개 · 실패 ${failed}개`, failed ? 'error' : 'success');
}

async function uploadCatalogDrawing(item, file, note) {
  if (!isSupportedDrawing(file)) throw new Error(`${file.name}: 지원하지 않는 형식이거나 50MB를 초과했습니다.`);
  const kind = ERP.drawingFileKind(file.name);
  const checksum = await ERP.sha256(file);
  const duplicate = drawingState.drawings.find(x => Number(x.catalog_item_id) === Number(item.id) && x.file_kind === kind && x.checksum_sha256 === checksum);
  if (duplicate) return 'skipped';

  const storagePath = `catalog/${item.id}/${Date.now()}-${crypto.randomUUID()}-${ERP.safeFileName(file.name)}`;
  const { error: uploadError } = await ERP.client.storage.from(ERP.config.drawingBucket).upload(storagePath, file, {
    upsert: false,
    contentType: file.type || 'application/octet-stream'
  });
  if (uploadError) throw uploadError;

  const { data, error } = await ERP.client.rpc('erp_v2_register_catalog_drawing', {
    p_catalog_item_id: item.id,
    p_file_name: file.name,
    p_storage_path: storagePath,
    p_file_kind: kind,
    p_mime_type: file.type || 'application/octet-stream',
    p_file_size: file.size,
    p_source_modified_at: file.lastModified ? new Date(file.lastModified).toISOString() : null,
    p_change_note: note,
    p_checksum_sha256: checksum
  });
  if (error) throw error;
  drawingState.drawings.unshift(data);
  return 'uploaded';
}
