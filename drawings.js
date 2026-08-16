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
    ERP.client.from('erp_v2_items').select('id,item_code,item_name,normalized_key,product,process_type,material,drawing_status,drawing_formats,drawing_path').order('item_name'),
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
      <header class="topbar"><div><h1>도면 보관함</h1><p>PDF는 브라우저에서 바로 보고, DWG·STP는 내려받아 CAD에서 열 수 있습니다. 교체본은 기존 버전을 보존합니다.</p></div><div class="top-actions"><button class="btn btn-soft" onclick="refreshDrawingLibrary()">새로고침</button>${canEditDrawings() ? '<label class="btn btn-accent file-button">폴더 최신본 동기화<input id="folderDrawingFiles" type="file" webkitdirectory directory multiple onchange="syncDrawingFolder(this.files)"></label>' : ''}</div></header>
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
  document.getElementById('drawingTable').innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>품목</th><th>제품</th><th>가공·소재</th><th>현재 도면</th><th>버전</th>${canEditDrawings() ? '<th>새 버전</th>' : ''}</tr></thead><tbody>${rows.map(drawingItemRow).join('')}</tbody></table></div>` : '<div class="empty">조건에 맞는 품목이 없습니다.</div>';
}

function drawingItemRow(item) {
  const all = drawingsForItem(item.id);
  const current = all.filter(x => x.is_current).sort((a, b) => String(a.file_kind).localeCompare(String(b.file_kind)));
  const formats = current.length ? current.map(file => `<button class="format-chip ${file.file_kind === 'PDF' ? 'preview' : ''}" onclick="openDrawing('${file.id}')">${ERP.escapeHtml(file.file_kind || 'FILE')} · v${file.version_no}</button>`).join('') : '<span class="badge bad">도면 없음</span>';
  return `<tr><td><strong>${ERP.escapeHtml(item.item_name)}</strong><br><small>${ERP.escapeHtml(item.item_code)}</small></td><td>${ERP.escapeHtml(item.product)}</td><td>${ERP.escapeHtml(item.process_type)}<br><small>${ERP.escapeHtml(item.material || '-')}</small></td><td><div class="format-list">${formats}</div></td><td>${all.length ? `<button class="btn btn-small btn-soft" onclick="showDrawingHistory(${item.id})">이력 ${all.length}</button>` : '-'}</td>${canEditDrawings() ? `<td><label class="btn btn-small btn-primary file-button">업로드<input type="file" multiple accept=".dwg,.pdf,.stp,.step,.png,.jpg,.jpeg" onchange="uploadItemDrawings(${item.id},this.files)"></label></td>` : ''}</tr>`;
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
    .replace(/[^A-Z0-9]+/g, '_')
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

async function syncDrawingFolder(fileList) {
  if (drawingState.uploading) return ERP.toast('이미 동기화 중입니다.', 'error');
  const progress = document.getElementById('syncProgress');
  const lookup = new Map();
  drawingState.items.forEach(item => {
    lookup.set(normalizedBaseName(item.normalized_key), item);
    lookup.set(normalizedBaseName(item.item_code), item);
    if (item.drawing_path) lookup.set(normalizedBaseName(item.drawing_path.split(/[\\/]/).pop()), item);
  });

  const candidates = new Map();
  let unsupported = 0;
  let unmatched = 0;
  [...fileList].forEach(file => {
    if (!isSupportedDrawing(file)) { unsupported++; return; }
    const item = findFolderItem(file, lookup);
    if (!item) { unmatched++; return; }
    const key = `${item.id}:${ERP.drawingFileKind(file.name)}`;
    const old = candidates.get(key);
    if (!old || file.lastModified >= old.file.lastModified) candidates.set(key, { item, file });
  });

  const jobs = [...candidates.values()];
  if (!jobs.length) return ERP.toast('품목명과 일치하는 도면을 찾지 못했습니다.', 'error');
  drawingState.uploading = true;
  progress.hidden = false;
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < jobs.length; index++) {
    const job = jobs[index];
    progress.innerHTML = `<strong>도면 동기화 ${index + 1} / ${jobs.length}</strong><div>${ERP.escapeHtml(job.item.item_name)} · ${ERP.escapeHtml(job.file.name)}</div><progress max="${jobs.length}" value="${index}"></progress><small>일치하지 않은 파일 ${unmatched}개 · 지원 외 형식/용량 ${unsupported}개</small>`;
    try {
      const result = await uploadCatalogDrawing(job.item, job.file, '도면 종합 폴더 최신본 동기화');
      result === 'skipped' ? skipped++ : uploaded++;
    } catch (error) {
      failed++;
      console.error(job.file.name, error);
    }
  }

  drawingState.uploading = false;
  await loadDrawingLibrary();
  renderDrawingShell(document.getElementById('drawingRoot'));
  renderDrawingTable();
  ERP.toast(`동기화 완료 · 등록 ${uploaded} · 동일 파일 제외 ${skipped} · 실패 ${failed}`, failed ? 'error' : 'success');
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
