// Addo.corp messages: a contact form that saves to Firestore and emails you through
// Web3Forms, plus an owner-only inbox. Shared by Studio, Glass and Neon.
import { FIREBASE, OWNER_EMAIL, WEB3FORMS_KEY } from './config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const hasFirebase = () => !!(FIREBASE && FIREBASE.apiKey && FIREBASE.projectId && FIREBASE.appId);
const hasEmail = () => !!WEB3FORMS_KEY;

let fbPromise = null;
function firebase() {
  if (!hasFirebase()) return Promise.resolve(null);
  if (!fbPromise) {
    fbPromise = Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-firestore.js'),
      import(SDK + 'firebase-auth.js')
    ]).then(([a, f, u]) => {
      const app = a.initializeApp(FIREBASE);
      return { f, u, db: f.getFirestore(app), auth: u.getAuth(app) };
    }).catch(err => { fbPromise = null; throw err; });
  }
  return fbPromise;
}

const el = (tag, props = {}, kids = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const c of [].concat(kids)) if (c != null) n.append(c);
  return n;
};

/* ---------- contact form ---------- */
function wireForm(form, page) {
  if (!form) return;
  const $ = s => form.querySelector(s);
  const status = form.querySelector('[data-msg-status]');
  const say = (t, kind) => { if (status) { status.textContent = t; status.dataset.kind = kind || ''; } };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = ($('#cName')?.value || '').trim().slice(0, 100);
    const email = ($('#cMail')?.value || '').trim().slice(0, 200);
    const typeSel = $('#cType');
    const type = typeSel && typeSel.value !== '' ? (typeSel.options[typeSel.selectedIndex]?.text || '').slice(0, 60) : '';
    const message = ($('#cMsg')?.value || '').trim().slice(0, 5000);
    if ($('#cHp')?.value) { say('Message sent.', 'ok'); form.reset(); return; }
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !message) { say('Add your name, a valid email and a message.', 'err'); return; }
    const btn = form.querySelector('[type=submit]');
    if (btn) btn.disabled = true;
    say('Sending…');
    let saved = false, emailed = false;
    try {
      const fb = await firebase();
      if (fb) {
        await fb.f.addDoc(fb.f.collection(fb.db, 'messages'), {
          name, email, type, message, page, read: false, createdAt: fb.f.serverTimestamp()
        });
        saved = true;
      }
    } catch (err) { console.warn('Firestore save failed', err); }
    if (hasEmail()) {
      try {
        const r = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: `New message from ${name} on Addo.corp`,
            from_name: 'Addo.corp website',
            replyto: email, name, email,
            project_type: type || 'Not set', page,
            message
          })
        });
        const j = await r.json().catch(() => ({}));
        emailed = !!j.success;
      } catch (err) { console.warn('Email send failed', err); }
    }
    if (btn) btn.disabled = false;
    if (saved || emailed) {
      form.reset();
      say(`Message sent. Shepherd will reply to ${email}.`, 'ok');
      form.dispatchEvent(new CustomEvent('message-sent'));
    } else {
      const body = `${message}\n\nProject type: ${type || 'Not set'}\nName: ${name}\nEmail: ${email}`;
      const a = el('a', { href: `mailto:${encodeURIComponent(OWNER_EMAIL)}?subject=${encodeURIComponent('Project enquiry' + (type ? ': ' + type : ''))}&body=${encodeURIComponent(body)}`, target: '_blank', rel: 'noopener' });
      document.body.append(a); a.click(); a.remove();
      say(`Opening your email app. You can also write to ${OWNER_EMAIL}.`, 'warn');
    }
  });
}

/* ---------- inbox ---------- */
const CSS = `
.mx-ov{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;padding:6vh 14px 14px}
.mx-ov[hidden]{display:none}
.mx-box{width:min(760px,100%);max-height:88vh;display:flex;flex-direction:column;background:var(--mx-bg,#fff);color:var(--mx-ink,#1b1d1f);border:1px solid var(--mx-line,#ddd);border-radius:var(--mx-r,12px);font:15px/1.5 var(--mx-font,system-ui,sans-serif);overflow:hidden}
.mx-hd{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--mx-line,#ddd)}
.mx-hd h3{margin:0;font-size:20px;font-weight:600;flex:1}
.mx-pill{font-size:12px;padding:2px 10px;border-radius:99px;background:var(--mx-accent,#2747d6);color:var(--mx-on,#fff)}
.mx-pill:empty{display:none}
.mx-x{width:40px;height:40px;border-radius:8px;border:1px solid var(--mx-line,#ddd);background:none;color:inherit;font-size:22px;line-height:1;cursor:pointer}
.mx-bd{padding:18px;overflow:auto;display:grid;gap:12px}
.mx-bd p{margin:0}
.mx-mute{color:var(--mx-mute,#666);font-size:14px}
.mx-f{display:grid;gap:10px;max-width:380px}
.mx-f label{display:grid;gap:4px;font-size:13px;color:var(--mx-mute,#666)}
.mx-in{min-height:44px;font:inherit;font-size:16px;color:inherit;background:transparent;border:1px solid var(--mx-line,#ccc);border-radius:8px;padding:0 12px}
.mx-b{min-height:40px;padding:0 14px;border-radius:8px;border:1px solid var(--mx-line,#ccc);background:none;color:inherit;font:inherit;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;text-decoration:none}
.mx-b:hover{border-color:var(--mx-accent,#2747d6)}
.mx-b.pri{background:var(--mx-accent,#2747d6);border-color:var(--mx-accent,#2747d6);color:var(--mx-on,#fff)}
.mx-b.dg{color:var(--mx-dn,#c0392b);border-color:currentColor}
.mx-b[disabled]{opacity:.55;cursor:default}
.mx-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.mx-bar .mx-in{flex:1;min-width:160px;min-height:40px}
.mx-tab[aria-pressed=true]{background:var(--mx-accent,#2747d6);border-color:var(--mx-accent,#2747d6);color:var(--mx-on,#fff)}
.mx-list{display:grid;gap:10px}
.mx-it{border:1px solid var(--mx-line,#ddd);border-radius:calc(var(--mx-r,12px) * .7);padding:14px;display:grid;gap:8px}
.mx-it.new{border-color:var(--mx-accent,#2747d6);box-shadow:inset 3px 0 0 var(--mx-accent,#2747d6)}
.mx-top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.mx-top b{font-weight:600}
.mx-top span{color:var(--mx-mute,#666);font-size:13px;overflow-wrap:anywhere}
.mx-msg{white-space:pre-wrap;overflow-wrap:anywhere}
.mx-tags{display:flex;gap:6px;flex-wrap:wrap}
.mx-tag{font-size:12px;padding:1px 8px;border-radius:99px;border:1px solid var(--mx-line,#ddd);color:var(--mx-mute,#666)}
.mx-err{color:var(--mx-dn,#c0392b);font-size:14px}
.mx-err:empty{display:none}
.mx-steps{margin:0;padding-left:20px;display:grid;gap:4px;font-size:14px}
[data-inbox-count][hidden]{display:none!important}
`;

function inbox() {
  const style = el('style', { text: CSS });
  const count = el('span', { class: 'mx-pill', 'aria-live': 'polite' });
  const body = el('div', { class: 'mx-bd' });
  const ov = el('div', { class: 'mx-ov', hidden: true, onclick: e => { if (e.target === ov) close(); } }, [
    el('div', { class: 'mx-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mxTitle' }, [
      el('div', { class: 'mx-hd' }, [el('h3', { id: 'mxTitle', text: 'Inbox' }), count, el('button', { class: 'mx-x', type: 'button', 'aria-label': 'Close inbox', text: '×', onclick: () => close() })]),
      body
    ])
  ]);
  document.head.append(style);
  document.body.append(ov);

  let fb = null, user = null, unsub = null, msgs = [], filter = 'all', q = '', armed = null, lastFocus = null;
  const badges = () => document.querySelectorAll('[data-inbox-count]');
  const setUnread = n => {
    count.textContent = n ? `${n} unread` : '';
    badges().forEach(b => { b.hidden = !n; if (b.classList.contains('mx-num')) b.textContent = String(n); });
  };

  function open() { lastFocus = document.activeElement; ov.hidden = false; render(); setTimeout(() => (ov.querySelector('input,button.pri') || ov.querySelector('.mx-x')).focus(), 20); }
  function close() { ov.hidden = true; armed = null; if (location.hash === '#inbox') history.replaceState(null, '', location.pathname + location.search); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !ov.hidden) close(); });
  document.addEventListener('click', e => { const t = e.target.closest('[data-inbox]'); if (t) { e.preventDefault(); open(); } });
  const fromHash = () => { if (location.hash === '#inbox') open(); };
  window.addEventListener('hashchange', fromHash);

  function render() {
    body.replaceChildren();
    if (!hasFirebase()) {
      body.append(
        el('p', { text: 'The inbox is not connected yet.' }),
        el('p', { class: 'mx-mute', text: 'Messages from the contact form ' + (hasEmail() ? 'are emailed to you, but are not stored here yet.' : 'open the visitor\'s email app until the inbox is connected.') }),
        el('ol', { class: 'mx-steps' }, [
          el('li', { text: 'Create a Firebase web app and turn on Email/Password sign-in.' }),
          el('li', { text: 'Create Firestore and paste the rules from firestore.rules.' }),
          el('li', { text: 'Put the web app config in config.js.' })
        ]),
        el('p', { class: 'mx-mute', text: 'Full steps are in SETUP-MESSAGES.md in the repository.' })
      );
      return;
    }
    if (!user) return renderSignIn();
    renderList();
  }

  function renderSignIn() {
    const err = el('p', { class: 'mx-err', role: 'alert' });
    const mail = el('input', { class: 'mx-in', type: 'email', id: 'mxMail', autocomplete: 'username', required: true, value: OWNER_EMAIL });
    const pass = el('input', { class: 'mx-in', type: 'password', id: 'mxPass', autocomplete: 'current-password', required: true });
    const go = el('button', { class: 'mx-b pri', type: 'submit', text: 'Sign in' });
    const reset = el('button', { class: 'mx-b', type: 'button', text: 'Forgot password', onclick: async () => {
      err.textContent = '';
      try { const f = await firebase(); await f.u.sendPasswordResetEmail(f.auth, mail.value.trim()); err.textContent = 'Reset email sent. Check your inbox.'; }
      catch (x) { err.textContent = 'Could not send a reset email. Check the address.'; }
    } });
    const form = el('form', { class: 'mx-f', onsubmit: async e => {
      e.preventDefault(); err.textContent = ''; go.disabled = true;
      try { const f = await firebase(); await f.u.signInWithEmailAndPassword(f.auth, mail.value.trim(), pass.value); }
      catch (x) { err.textContent = /too-many/.test(x && x.code) ? 'Too many tries. Wait a minute and try again.' : 'Email or password is incorrect.'; }
      finally { go.disabled = false; }
    } }, [
      el('p', { class: 'mx-mute', text: 'Only the owner can read messages. Sign in with your Firebase account.' }),
      el('label', {}, ['Email', mail]), el('label', {}, ['Password', pass]), err,
      el('div', { class: 'mx-bar' }, [go, reset])
    ]);
    body.append(form);
  }

  function fmt(ts) {
    const d = ts && ts.toDate ? ts.toDate() : null;
    if (!d) return 'Just now';
    return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function renderList() {
    const unread = msgs.filter(m => !m.read).length;
    const search = el('input', { class: 'mx-in', type: 'search', placeholder: 'Search name, email or text', 'aria-label': 'Search messages', value: q, oninput: e => { q = e.target.value; paint(); } });
    const tab = (k, t) => el('button', { class: 'mx-b mx-tab', type: 'button', 'aria-pressed': String(filter === k), text: t, onclick: () => { filter = k; render(); } });
    const list = el('div', { class: 'mx-list' });
    body.append(
      el('div', { class: 'mx-bar' }, [tab('all', `All ${msgs.length}`), tab('unread', `Unread ${unread}`), search,
        el('button', { class: 'mx-b', type: 'button', text: 'Sign out', onclick: async () => { const f = await firebase(); await f.u.signOut(f.auth); } })]),
      el('p', { class: 'mx-mute', text: `Signed in as ${user.email}` }),
      list
    );
    function paint() {
      const qq = q.trim().toLowerCase();
      const shown = msgs.filter(m => (filter === 'all' || !m.read) && (!qq || [m.name, m.email, m.message, m.type].join(' ').toLowerCase().includes(qq)));
      list.replaceChildren();
      if (!msgs.length) { list.append(el('p', { class: 'mx-mute', text: 'No messages yet. New ones appear here as soon as they arrive.' })); return; }
      if (!shown.length) { list.append(el('p', { class: 'mx-mute', text: 'No messages match.' })); return; }
      for (const m of shown) list.append(item(m));
    }
    paint();
  }

  function item(m) {
    const toggle = el('button', { class: 'mx-b', type: 'button', text: m.read ? 'Mark unread' : 'Mark read', onclick: () => setRead(m, !m.read) });
    const del = el('button', { class: 'mx-b dg', type: 'button', text: armed === m.id ? 'Confirm delete' : 'Delete', onclick: () => {
      if (armed !== m.id) { armed = m.id; render(); return; }
      armed = null; remove(m);
    } });
    const reply = el('a', { class: 'mx-b pri', href: `mailto:${encodeURIComponent(m.email || '')}?subject=${encodeURIComponent('Re: your message to Addo.corp')}&body=${encodeURIComponent(`\n\n> ${(m.message || '').split('\n').join('\n> ')}`)}`, target: '_blank', rel: 'noopener', text: 'Reply', onclick: () => { if (!m.read) setRead(m, true); } });
    const copy = el('button', { class: 'mx-b', type: 'button', text: 'Copy email', onclick: () => { try { navigator.clipboard.writeText(m.email || '').then(() => { copy.textContent = 'Copied'; }, () => {}); } catch (e) {} } });
    return el('article', { class: 'mx-it' + (m.read ? '' : ' new') }, [
      el('div', { class: 'mx-top' }, [el('b', { text: m.name || 'No name' }), el('span', { text: fmt(m.createdAt) })]),
      el('div', { class: 'mx-tags' }, [el('span', { class: 'mx-tag', text: m.email || 'No email' }), m.type ? el('span', { class: 'mx-tag', text: m.type }) : null, m.page ? el('span', { class: 'mx-tag', text: 'From ' + m.page }) : null]),
      el('p', { class: 'mx-msg', text: m.message || '' }),
      el('div', { class: 'mx-bar' }, [reply, toggle, copy, del])
    ]);
  }

  async function setRead(m, read) {
    try { await fb.f.updateDoc(fb.f.doc(fb.db, 'messages', m.id), { read }); }
    catch (x) { alertIn('Could not update that message.'); }
  }
  async function remove(m) {
    try { await fb.f.deleteDoc(fb.f.doc(fb.db, 'messages', m.id)); }
    catch (x) { alertIn('Could not delete that message.'); }
  }
  function alertIn(t) { const p = el('p', { class: 'mx-err', role: 'alert', text: t }); body.prepend(p); setTimeout(() => p.remove(), 4000); }

  if (hasFirebase()) {
    firebase().then(f => {
      fb = f;
      f.u.onAuthStateChanged(f.auth, u => {
        user = u; if (unsub) { unsub(); unsub = null; } msgs = []; setUnread(0);
        if (u) {
          const qy = f.f.query(f.f.collection(f.db, 'messages'), f.f.orderBy('createdAt', 'desc'), f.f.limit(300));
          unsub = f.f.onSnapshot(qy, snap => {
            msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setUnread(msgs.filter(m => !m.read).length);
            if (!ov.hidden) render();
          }, () => {
            msgs = []; if (!ov.hidden) { render(); alertIn('This account cannot read messages. Check the owner ID in your Firestore rules.'); }
          });
        }
        if (!ov.hidden) render();
      });
    }).catch(() => {});
  }
  fromHash();
}

export function initMessages({ page = 'site', form = '#msgForm' } = {}) {
  wireForm(document.querySelector(form), page);
  inbox();
}
