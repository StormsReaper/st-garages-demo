/* ---------------------------------------------------------------------------
   st_garages - shared helpers for the garage menu and the creator
--------------------------------------------------------------------------- */
(() => {
    'use strict';

    const RESOURCE = 'st_garages';
    const IN_GAME = location.hostname.startsWith('cfx-nui-');

    const ICONS = {
        car: '<path d="M5 17h14"/><path d="M3 17v-3.5c0-.7.3-1.4.8-1.9L6 9.5l1.5-3.3A2 2 0 0 1 9.3 5h5.4a2 2 0 0 1 1.8 1.2L18 9.5l2.2 2.1c.5.5.8 1.2.8 1.9V17a1 1 0 0 1-1 1h-1"/><path d="M4 18H3.9a.9.9 0 0 1-.9-.9"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/><path d="M6 9.5h12"/>',
        boat: '<path d="M2 20c1.2.6 2.4 1 3.6 1 2.4 0 2.4-1.5 4.8-1.5s2.4 1.5 4.8 1.5 2.4-1.5 4.8-1.5c.7 0 1.3.1 2 .4"/><path d="M4 17.5 3 13h18l-2.5 4.5"/><path d="M12 13V3l6 7H6l6-7"/>',
        air: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
        impound: '<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        close: '<path d="M18 6 6 18M6 6l12 12"/>',
        back: '<path d="m15 18-6-6 6-6"/>',
        key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
        out: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
        swap: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
        gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C9 3 11 4.5 12 8c1-3.5 3-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
        pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
        check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
        cross: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
        shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>',
        lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
        trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
        target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
        teleport: '<path d="M12 2v8"/><path d="m8 6 4 4 4-4"/><ellipse cx="12" cy="18" rx="8" ry="3"/>',
        flag: '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.3 2A6 6 0 0 0 20 3v11a6 6 0 0 1-4.7 1c-2.3 0-4.3-2-7.3-2a6 6 0 0 0-4 1.5"/>',
        map: '<path d="M14.1 6 9.9 3.9a2 2 0 0 0-1.8 0L3.6 6.1A1 1 0 0 0 3 7v12.8a1 1 0 0 0 1.4.9l3.7-1.8a2 2 0 0 1 1.8 0l4.2 2.1a2 2 0 0 0 1.8 0l4.5-2.2a1 1 0 0 0 .6-.9V4.2a1 1 0 0 0-1.4-.9l-3.7 1.8a2 2 0 0 1-1.8 0Z"/><path d="M15 6v15M9 3v15"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        empty: '<path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 3v6"/>',
    };

    const icon = (name, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');

    async function nui(event, data) {
        if (!IN_GAME) {
            return window.__mockNui ? window.__mockNui(event, data) : null;
        }
        try {
            const response = await fetch(`https://${RESOURCE}/${event}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify(data ?? {}),
            });
            return await response.json();
        } catch {
            return null;
        }
    }

    function toast(message, kind = 'info') {
        if (!message) return;
        const root = document.getElementById('toasts');
        const el = document.createElement('div');
        el.className = `toast ${kind}`;
        el.innerHTML = `${icon(kind === 'ok' ? 'check' : kind === 'err' ? 'cross' : 'info')}<span>${esc(message)}</span>`;
        root.appendChild(el);
        while (root.children.length > 3) root.firstChild.remove();
        setTimeout(() => {
            el.classList.add('out');
            setTimeout(() => el.remove(), 220);
        }, 3200);
    }

    function paintAccent(color) {
        const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color || '');
        if (!m) return;
        const rgb = m.slice(1).map((p) => parseInt(p, 16));
        const soft = rgb.map((c) => Math.round(c + (255 - c) * 0.38));
        const root = document.documentElement.style;
        root.setProperty('--accent', `#${m.slice(1).join('')}`);
        root.setProperty('--accent-rgb', rgb.join(', '));
        root.setProperty('--accent-soft', `rgb(${soft.join(', ')})`);
    }

    // buttons that charge money ask twice: first click arms, second confirms
    function armed(btn, label, run) {
        if (btn.dataset.armed === '1') {
            clearTimeout(Number(btn.dataset.timer));
            btn.dataset.armed = '';
            return run();
        }
        const original = btn.innerHTML;
        btn.dataset.armed = '1';
        btn.classList.add('confirm');
        btn.innerHTML = label;
        btn.dataset.timer = String(setTimeout(() => {
            btn.dataset.armed = '';
            btn.classList.remove('confirm');
            btn.innerHTML = original;
        }, 3500));
    }

    // routes messages from Lua to whichever part handles that action prefix
    const handlers = {};
    window.addEventListener('message', (event) => {
        const msg = event.data;
        if (!msg || typeof msg.action !== 'string') return;
        const prefix = msg.action.split(':')[0];
        if (handlers[prefix]) handlers[prefix](msg.action.slice(prefix.length + 1), msg);
    });

    window.STG = { IN_GAME, icon, esc, money, nui, toast, paintAccent, armed, on: (prefix, fn) => { handlers[prefix] = fn; } };

    if (!IN_GAME) {
        const s = document.createElement('script');
        s.src = 'dev/mock.js';
        document.head.appendChild(s);
    }
})();
