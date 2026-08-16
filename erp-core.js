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
    return data.session;
  }

  async function signIn(email, redirectPage) {
    const emailRedirectTo = new URL(redirectPage, config.siteUrl || window.location.href).href;
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo, shouldCreateUser: true }
    });
    if (error) throw error;
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

  window.ERP = { client, config, escapeHtml, money, number, date, statusLabel, toast, session, signIn, signOut, isAdmin, drawingRole, signedDrawingUrl, safeFileName, drawingFileKind, sha256 };
})();
