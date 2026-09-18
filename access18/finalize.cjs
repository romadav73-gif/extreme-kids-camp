'use strict';
module.exports = function finalizeAccessGuard(source) {
  const replaceOnce = (from, to) => {
    if (source.split(from).length !== 2) throw Error('Account navigation source changed. Build stopped.');
    source = source.replace(from, to);
  };
  replaceOnce("location.replace(base() + '#login');", "history.replaceState(null, '', base() + '#login'); location.reload();");
  replaceOnce("if (navigate) location.replace(base() + (localOnly ? '#login-local' : '#login'));", "if (navigate) { history.replaceState(null, '', base() + (localOnly ? '#login-local' : '#login')); location.reload(); }");
  source += `
window.addEventListener('hashchange', () => {
  if (!/^#login(?:$|-|[?&])/.test(location.hash) || !started || access18Closing) return;
  access18Closing = true; access18Generation++; access18HidePrivate();
  Promise.resolve(window.EK65Exit?.preserveDraft?.())
    .catch(() => {})
    .finally(() => location.reload());
});
`;
  return source;
};
