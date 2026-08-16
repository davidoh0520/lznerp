(function () {
  const config = window.ERP_CONFIG;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function money(value, currency = 'CNY') {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency', currency, maximumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function number(value, digits = 2) {
    return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: digits }).format(Number(value || 0));
  }

  function date(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value));
  }

  function statusLabel(status) {
    return ({
      draft: '작성 중', quote_requested: '견적 요청', quoted: '견적 완료', confirmed: '주문 확정',
      processing: '제작 중', shipped: '출고', completed: '완료', cancelled: '취소',
      issued: '발행', sent: '전송', partial: '일부 입금', paid: '입금 완료', void: '무효'
    })[status] || status || '-';
  }

  function toast(message, type = 'info') {
    const old = document.querySelector('.erp-toast');
    if (old) old.remove();
    const node = document.createElement('div');
    node.className = `erp-toast ${type}`;
    node.textContent = message;
    document.body.appendChild(node);
    requestAnimationFrame(() => node.classList.add('show'));
    setTimeout(() => { node.classList.remove('show'); setTimeout(() => node.remove(), 200); }, 3500);
  }

  async function session() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data.session?.user?.email) rememberEmail(data.session.user.email);
    return data.session;
  }

  function rememberEmail(email) {
    if (email) localStorage.setItem('erp-login-email', String(email).trim().toLowerCase());
  }

  function rememberedEmail() {
    return localStorage.getItem('erp-login-email') || '';
  }

  async function signInWithPassword(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { data, error } = await client.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) throw error;
    rememberEmail(normalizedEmail);
    return data.session;
  }

  async function updatePassword(password) {
    const { data, error } = await client.auth.updateUser({
      password,
      data: { password_login_enabled: true }
    });
    if (error) throw error;
    return data.user;
  }

  function passwordLoginReady(activeSession) {
    return activeSession?.user?.user_metadata?.password_login_enabled === true;
  }

  function openPasswordSetup(options = {}) {
    document.querySelector('.erp-modal-backdrop')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'erp-modal-backdrop';
    overlay.innerHTML = `
      <div class="erp-modal" role="dialog" aria-modal="true" aria-labelledby="passwordSetupTitle">
        <button class="erp-modal-close" type="button" aria-label="닫기">×</button>
        <div class="eyebrow">ACCOUNT SECURITY</div>
        <h2 id="passwordSetupTitle">비밀번호 설정</h2>
        <p>이메일은 아이디로 사용됩니다. 비밀번호를 한 번 설정하면 Edge·Chrome 어디서든 이메일 링크 없이 로그인할 수 있습니다.</p>
        <form id="passwordSetupForm">
          <label>새 비밀번호<input id="newPassword" type="password" minlength="8" autocomplete="new-password" required placeholder="8자 이상"></label>
          <label>비밀번호 확인<input id="confirmPassword" type="password" minlength="8" autocomplete="new-password" required placeholder="한 번 더 입력"></label>
          <div id="passwordSetupError" class="form-error" hidden></div>
          <button class="btn btn-primary" type="submit">비밀번호 저장</button>
        </form>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.erp-modal-close').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    overlay.querySelector('#passwordSetupForm').addEventListener('submit', async event => {
      event.preventDefault();
      const password = overlay.querySelector('#newPassword').value;
      const confirmation = overlay.querySelector('#confirmPassword').value;
      const errorNode = overlay.querySelector('#passwordSetupError');
      errorNode.hidden = true;
      if (password.length < 8) {
        errorNode.textContent = '비밀번호는 8자 이상으로 입력해 주세요.';
        errorNode.hidden = false;
        return;
      }
      if (password !== confirmation) {
        errorNode.textContent = '두 비밀번호가 일치하지 않습니다.';
        errorNode.hidden = false;
        return;
      }
      const submit = event.submitter;
      submit.disabled = true;
      submit.textContent = '저장 중…';
      try {
        await updatePassword(password);
        toast('비밀번호가 저장되었습니다. 이제 이메일 링크가 필요 없습니다.', 'success');
        close();
        if (typeof options.onSuccess === 'function') options.onSuccess();
      } catch (error) {
        errorNode.textContent = error.message;
        errorNode.hidden = false;
        submit.disabled = false;
        submit.textContent = '비밀번호 저장';
      }
    });
    setTimeout(() => overlay.querySelector('#newPassword')?.focus(), 0);
  }

  async function signOut() {
    await client.auth.signOut();
    window.location.href = 'portal.html';
  }

  async function isAdmin() {
    const { data, error } = await client.rpc('is_erp_v2_admin');
    if (error) return false;
    return Boolean(data);
  }

  async function drawingRole() {
    const { data, error } = await client.rpc('erp_v2_my_drawing_role');
    if (error) throw error;
    return data || 'none';
  }

  async function signedDrawingUrl(path, expires = 600) {
    const { data, error } = await client.storage.from(config.drawingBucket).createSignedUrl(path, expires);
    if (error) throw error;
    return data.signedUrl;
  }

  function safeFileName(name) {
    const parts = String(name || 'drawing').split('.');
    const ext = parts.length > 1 ? `.${parts.pop().toLowerCase()}` : '';
    return parts.join('.').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').slice(0, 90) + ext;
  }

  function drawingFileKind(name) {
    const ext = String(name || '').split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'PDF';
    if (ext === 'dwg') return 'DWG';
    if (ext === 'stp' || ext === 'step') return 'STP';
    if (ext === 'png') return 'PNG';
    if (ext === 'jpg' || ext === 'jpeg') return 'JPG';
    return 'OTHER';
  }

  async function sha256(file) {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  window.ERP = { client, config, escapeHtml, money, number, date, statusLabel, toast, session, signInWithPassword, updatePassword, passwordLoginReady, openPasswordSetup, rememberEmail, rememberedEmail, signOut, isAdmin, drawingRole, signedDrawingUrl, safeFileName, drawingFileKind, sha256 };
})();
