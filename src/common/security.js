// Simple password gate via standalone login page
const SESSION_HOURS = 12;

function getBase(){
  try {
    const parts = location.pathname.split('/').filter(Boolean);
    // On GitHub Pages: /repo/...
    if (location.host.includes('github.io') && parts.length) return '/' + parts[0];
    // Local or custom hosting at root
    return '';
  } catch (e) { void e; return ''; }
}

function isAuthenticated() {
  try {
    const ok = localStorage.getItem('isAuthenticated') === 'true';
    const exp = parseInt(localStorage.getItem('sessionExpiry') || '0', 10);
    return ok && Date.now() < exp;
  } catch (e) { void e; return false; }
}

function setSession() {
  const expiry = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  try {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('sessionExpiry', String(expiry));
  } catch (e) { void e; }
}

function clearSession() {
  try {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('sessionExpiry');
  } catch (e) { void e; }
}

export function ensureAuthenticated() {
  const path = location.pathname;
  // Skip auth for verifier and login pages
  if (path.includes('/verify/') || path.includes('/auth/')) return;
  if (!isAuthenticated()) {
    const base = getBase();
    const target = encodeURIComponent(location.pathname + location.search + location.hash);
    window.location.replace(`${base}/auth/index.html?redirect=${target}`);
  }
}

export function logout() {
  clearSession();
  const base = getBase();
  window.location.replace(`${base}/auth/index.html`);
}

// Auto-run on DOM ready
document.addEventListener('DOMContentLoaded', ensureAuthenticated);

// Expose simple API
window.authManager = { logout, ensureAuthenticated, setSession };
