(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    const account = document.getElementById('portalAccount');
    if (!account) return;
    try {
      const activeSession = await ERP.session();
      if (!activeSession) return;
      account.hidden = false;
      account.innerHTML = `
        <strong>${ERP.escapeHtml(activeSession.user.email)}</strong>
        <p>이 이메일이 로그인 아이디입니다.</p>
        <div class="top-actions">
          <button class="btn btn-primary" onclick="ERP.openPasswordSetup()">비밀번호 설정</button>
          <button class="btn btn-soft" onclick="ERP.signOut()">로그아웃</button>
        </div>`;
      if (!ERP.passwordLoginReady(activeSession)) setTimeout(() => ERP.openPasswordSetup(), 0);
    } catch (_) {
      account.hidden = true;
    }
  });
})();
