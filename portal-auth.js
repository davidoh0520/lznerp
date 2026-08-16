(function () {
  const target = localStorage.getItem('erp-login-target');
  if (!target) return;

  let moved = false;
  const move = () => {
    if (moved) return;
    moved = true;
    localStorage.removeItem('erp-login-target');
    window.location.replace(target);
  };

  ERP.client.auth.onAuthStateChange((event, session) => {
    if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) move();
  });

  setTimeout(async () => {
    try { if (await ERP.session()) move(); } catch (_) { /* login page remains available */ }
  }, 700);
})();
