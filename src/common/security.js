// Simple password gate for all pages
const PASSWORD = '27181730';
const SESSION_HOURS = 12;

function isAuthenticated() {
  try {
    const ok = localStorage.getItem('isAuthenticated') === 'true';
    const exp = parseInt(localStorage.getItem('sessionExpiry') || '0', 10);
    return ok && Date.now() < exp;
  } catch { return false; }
}

function setSession() {
  const expiry = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  try {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('sessionExpiry', String(expiry));
  } catch {}
}

function clearSession() {
  try {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('sessionExpiry');
  } catch {}
}

function buildModal() {
  const style = document.createElement('style');
  style.textContent = `
    .auth-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:99999}
    .auth-card{background:#111;color:#eee;border:1px solid #333;border-radius:12px;padding:22px;min-width:320px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
    .auth-card h3{margin:0 0 10px;font:600 18px/1.2 system-ui}
    .auth-card p{margin:0 0 12px;color:#bbb;font:400 13px/1.4 system-ui}
    .auth-input{width:100%;padding:10px 12px;border:1px solid #444;border-radius:10px;background:#1a1a1a;color:#eee;}
    .auth-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
    .auth-btn{padding:8px 12px;border-radius:10px;border:1px solid #555;background:#222;color:#eee;cursor:pointer}
    .auth-btn.primary{background:#0b5ed7;border-color:#0b5ed7}
    .auth-error{color:#f87171;font:400 12px/1.4 system-ui;margin-top:8px;min-height:16px}
  `;
  const wrap = document.createElement('div');
  wrap.className = 'auth-overlay';
  wrap.innerHTML = `
    <div class="auth-card">
      <h3>Acceso requerido</h3>
      <p>Ingresa la contraseña para continuar.</p>
      <input id="authPasswordInput" class="auth-input" type="password" placeholder="Contraseña" autocomplete="current-password" />
      <div class="auth-error" id="authError"></div>
      <div class="auth-actions">
        <button class="auth-btn" id="authCancel">Cancelar</button>
        <button class="auth-btn primary" id="authEnter">Entrar</button>
      </div>
    </div>`;
  return { style, wrap };
}

function showGate() {
  const { style, wrap } = buildModal();
  document.head.appendChild(style);
  document.body.appendChild(wrap);
  const input = document.getElementById('authPasswordInput');
  const enter = document.getElementById('authEnter');
  const cancel = document.getElementById('authCancel');
  const err = document.getElementById('authError');
  const tryLogin = () => {
    if (input.value === PASSWORD) {
      setSession();
      wrap.remove(); style.remove();
    } else {
      err.textContent = 'Contraseña incorrecta';
      input.select();
    }
  };
  enter.addEventListener('click', tryLogin);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
  cancel.addEventListener('click', () => { window.location.href = 'https://www.ciaociao.mx'; });
  setTimeout(()=> input.focus(), 50);
}

export function ensureAuthenticated() {
  if (!isAuthenticated()) {
    showGate();
  }
}

export function logout() {
  clearSession();
  window.location.reload();
}

// Auto-run on DOM ready
document.addEventListener('DOMContentLoaded', ensureAuthenticated);

// Expose simple API
window.authManager = { logout, ensureAuthenticated };

