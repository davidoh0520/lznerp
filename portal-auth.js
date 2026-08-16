(function () {
  document.addEventListener('DOMContentLoaded', initOwnerPortal);

  async function initOwnerPortal() {
    const account = document.getElementById('portalAccount');
    const links = document.getElementById('ownerLinks');
    if (!account || !links) return;
    try {
      const activeSession = await ERP.session();
      if (!activeSession) return renderOwnerLogin(account);
      if (!(await ERP.isAdmin())) return renderDenied(account);
      links.hidden = false;
      account.innerHTML = `
        <div class="assistant-message"><span class="status-light"></span><div><strong>업무실이 준비되었습니다.</strong><small>${ERP.escapeHtml(activeSession.user.email)}</small></div></div>
        <div class="top-actions">
          <a class="btn btn-accent" href="admin.html">전체 대시보드</a>
          <button class="btn btn-glass" type="button" onclick="ERP.signOut()">로그아웃</button>
        </div>`;
    } catch (error) {
      account.innerHTML = `<strong>연결을 확인해 주세요.</strong><small>${ERP.escapeHtml(error.message)}</small>`;
    }
  }

  function renderOwnerLogin(account) {
    account.innerHTML = `
      <strong>대표 전용 로그인</strong>
      <small>관리자 이메일과 비밀번호를 입력해 주세요.</small>
      <form class="owner-login-form" onsubmit="loginOwner(event)">
        <input id="ownerEmail" type="email" autocomplete="username" value="${ERP.escapeHtml(ERP.rememberedEmail())}" placeholder="이메일 아이디" required>
        <input id="ownerPassword" type="password" autocomplete="current-password" placeholder="비밀번호" required>
        <button class="btn btn-accent" type="submit">업무실 열기</button>
      </form>`;
  }

  function renderDenied(account) {
    account.innerHTML = `
      <strong>대표 전용 계정이 아닙니다.</strong>
      <small>이 ERP는 등록된 관리자 한 명만 사용할 수 있습니다.</small>
      <button class="btn btn-glass" type="button" onclick="ERP.signOut()">다른 계정으로 로그인</button>`;
  }

  window.loginOwner = async function (event) {
    event.preventDefault();
    const email = document.getElementById('ownerEmail').value.trim();
    const password = document.getElementById('ownerPassword').value;
    const button = event.submitter;
    button.disabled = true;
    button.textContent = '확인 중…';
    try {
      await ERP.signInWithPassword(email, password);
      if (!(await ERP.isAdmin())) {
        await ERP.client.auth.signOut();
        throw new Error('대표 전용 계정이 아닙니다.');
      }
      window.location.reload();
    } catch (error) {
      ERP.toast(error.message, 'error');
      button.disabled = false;
      button.textContent = '업무실 열기';
    }
  };
})();
