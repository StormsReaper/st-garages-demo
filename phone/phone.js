/* ---------------------------------------------------------------------------
   st_garages - Garage app for LB Phone

   Lists every vehicle the player owns. A parked car can be delivered by the
   valet or moved to another garage; anything else can be found on the map.
   All actions go through client/phone.lua, which asks the server.
--------------------------------------------------------------------------- */
(() => {
    'use strict';

    const RESOURCE = 'st_garages';
    const IN_GAME = location.hostname.startsWith('cfx-nui-');

    const ICONS = {
        car: '<path d="M5 17h14"/><path d="M3 17v-3.5c0-.7.3-1.4.8-1.9L6 9.5l1.5-3.3A2 2 0 0 1 9.3 5h5.4a2 2 0 0 1 1.8 1.2L18 9.5l2.2 2.1c.5.5.8 1.2.8 1.9V17a1 1 0 0 1-1 1h-1"/><path d="M4 18H3.9a.9.9 0 0 1-.9-.9"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/><path d="M6 9.5h12"/>',
        boat: '<path d="M2 20c1.2.6 2.4 1 3.6 1 2.4 0 2.4-1.5 4.8-1.5s2.4 1.5 4.8 1.5 2.4-1.5 4.8-1.5c.7 0 1.3.1 2 .4"/><path d="M4 17.5 3 13h18l-2.5 4.5"/><path d="M12 13V3l6 7H6l6-7"/>',
        air: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
        back: '<path d="m15 18-6-6 6-6"/>',
        chev: '<path d="m9 18 6-6-6-6"/>',
        valet: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v6"/><path d="m8 22 4-8 4 8"/><path d="M8 11h8"/>',
        swap: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
        pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
        garage: '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect x="6" y="10" width="12" height="12"/>',
        impound: '<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
        shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>',
        check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
        cross: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
        empty: '<path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 3v6"/>',
    };
    const icon = (name, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
    const $ = (id) => document.getElementById(id);

    const SEGMENTS = [
        { id: 'all', label: 'All', match: () => true },
        { id: 'stored', label: 'Parked', match: (v) => v.status === 'stored' },
        { id: 'away', label: 'Out', match: (v) => v.status !== 'stored' },
    ];

    const P = { data: null, seg: 'all', q: '', sel: null, busy: false };
    const brokenImages = new Set();

    async function nui(event, data) {
        if (!IN_GAME) return window.__mockNui ? window.__mockNui(event, data) : null;
        try {
            const r = await fetch(`https://${RESOURCE}/${event}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify(data ?? {}),
            });
            return await r.json();
        } catch {
            return null;
        }
    }

    // --- look ------------------------------------------------------------------

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

    function applyTheme(settings) {
        const theme = settings?.display?.theme;
        if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    }

    // lb-phone hands custom apps its settings; follow its light/dark mode
    async function readTheme() {
        try {
            if (globalThis.settings) return applyTheme(globalThis.settings);
            if (globalThis.components?.fetchPhone) applyTheme(await globalThis.components.fetchPhone('GetSettings'));
        } catch { /* stays dark */ }
    }

    // --- helpers -----------------------------------------------------------------

    // pictures to try in order: the FiveM docs (stock cars), then the
    // st_newdealer photo (addon cars) - or the other way round with photosFirst
    function imageUrls(v) {
        const urls = [];
        const tpl = P.data?.images;
        if (tpl && typeof v.model === 'string' && !/^-?\d+$/.test(v.model)) urls.push(tpl.replace('%s', encodeURIComponent(v.model.toLowerCase())));
        if (v.photo) P.data?.photosFirst ? urls.unshift(v.photo) : urls.push(v.photo);
        return urls.filter((u) => !brokenImages.has(u));
    }

    function picture(v) {
        const [first, ...rest] = imageUrls(v);
        if (!first) return icon(v.type || 'car');
        return `<img src="${esc(first)}" alt="" data-next="${esc(rest.join('|'))}" data-type="${esc(v.type || 'car')}" onerror="window.STP_imgFail(this)">`;
    }
    window.STP_imgFail = (img) => {
        brokenImages.add(img.getAttribute('src'));
        const next = (img.dataset.next || '').split('|').filter((u) => u && !brokenImages.has(u));
        if (next.length) {
            img.dataset.next = next.slice(1).join('|');
            img.src = next[0];
            return;
        }
        img.outerHTML = icon(img.dataset.type || 'car');
    };

    function where(v) {
        switch (v.status) {
            case 'stored': return v.orphan ? 'Any garage' : (v.garageLabel || 'Garage');
            case 'out': return 'Out in the city';
            case 'lost': return 'At the impound';
            case 'impounded': return 'Held by police';
            default: return '';
        }
    }

    function distance(g) {
        const p = P.data?.position;
        if (!p) return null;
        return Math.hypot(g.x - p.x, g.y - p.y);
    }
    const fmtDist = (m) => (m == null ? '' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`);

    const selected = () => P.data?.vehicles.find((v) => v.id === P.sel);

    let toastTimer;
    function toast(message, kind = 'ok') {
        if (!message) return;
        const el = $('toast');
        el.className = `toast ${kind}`;
        el.innerHTML = `${icon(kind === 'err' ? 'cross' : 'check')}<span>${esc(message)}</span>`;
        el.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            el.classList.add('out');
            setTimeout(() => { el.hidden = true; }, 250);
        }, 2800);
    }

    // --- data --------------------------------------------------------------------

    async function load({ quiet } = {}) {
        if (!quiet) {
            $('app').dataset.state = P.data ? 'ready' : 'loading';
            $('refresh').classList.add('spin');
        }
        const res = await nui('phone:data');
        $('refresh').classList.remove('spin');

        if (!res?.ok) {
            if (!P.data) {
                $('app').dataset.state = 'error';
                $('splash-text').textContent = res?.message || 'Couldn\'t reach the garage service.';
            } else if (!quiet) {
                toast(res?.message || 'Couldn\'t refresh', 'err');
            }
            return;
        }

        if (res.accent) paintAccent(res.accent);
        P.data = res;
        $('app').dataset.state = 'ready';
        renderHome();
        if (P.sel && !$('detail').hidden) {
            if (selected()) renderDetail();
            else showHome();
        }
    }

    // --- home --------------------------------------------------------------------

    function renderHome() {
        const d = P.data;
        const total = d.vehicles.length;
        const parked = d.vehicles.filter((v) => v.status === 'stored').length;
        $('summary').textContent = total ? `${total} vehicle${total === 1 ? '' : 's'} · ${parked} parked` : 'No vehicles yet';
        $('refresh').innerHTML = icon('refresh');
        $('search-icon').innerHTML = icon('search');

        $('valet-banner').hidden = !d.delivering;
        $('valet-banner').innerHTML = `${icon('valet')}<span>Your valet is on the way</span><span class="dots"><i></i><i></i><i></i></span>`;

        $('seg').innerHTML = SEGMENTS.map((s) => `<button type="button" class="${P.seg === s.id ? 'on' : ''}" data-seg="${s.id}">${s.label}</button>`).join('');

        const seg = SEGMENTS.find((s) => s.id === P.seg);
        const q = P.q.trim().toLowerCase();
        const list = d.vehicles
            .filter((v) => seg.match(v) && (!q || v.label.toLowerCase().includes(q) || (v.brand || '').toLowerCase().includes(q) || v.plate.toLowerCase().includes(q)))
            .sort((a, b) => (b.status === 'stored') - (a.status === 'stored') || a.label.localeCompare(b.label));

        if (!list.length) {
            $('list').innerHTML = `<div class="empty">${icon('empty')}<b>${total ? 'Nothing here' : 'No vehicles yet'}</b>
                <p>${q ? `Nothing matches "${esc(P.q.trim())}".` : total ? 'Nothing in this list right now.' : 'Cars, boats and aircraft you own will show up here.'}</p></div>`;
            return;
        }

        $('list').innerHTML = list.map((v, i) => `
            <button type="button" class="card" data-id="${v.id}" style="animation-delay:${Math.min(i, 8) * 30}ms">
                <span class="thumb">${picture(v)}</span>
                <span class="c-txt"><b>${esc(v.label)}</b>
                    <span class="c-where" data-s="${v.status}"><i class="dot"></i><span>${esc(where(v))}</span></span></span>
                <span class="c-right"><span class="plate">${esc(v.plate)}</span>${icon('chev')}</span>
            </button>`).join('');
    }

    function showHome() {
        P.sel = null;
        $('detail').hidden = true;
        $('home').hidden = false;
        $('home').classList.remove('back');
        void $('home').offsetWidth;
        $('home').classList.add('back');
    }

    // --- detail ------------------------------------------------------------------

    function gauge(label, n) {
        const c = 2 * Math.PI * 22;
        const color = n >= 60 ? 'var(--good)' : n >= 30 ? 'var(--warn)' : 'var(--bad)';
        return `<div class="gauge"><div class="ring"><svg viewBox="0 0 50 50"><circle class="track" cx="25" cy="25" r="22"/>
            <circle class="val" cx="25" cy="25" r="22" style="--gc:${color}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c * (1 - n / 100)}"/></svg><b>${n}</b></div>
            <span>${label}</span></div>`;
    }

    function renderDetail() {
        const v = selected();
        if (!v) return showHome();
        const d = P.data;
        const typeName = { car: 'Car', boat: 'Boat', air: 'Aircraft' }[v.type] || 'Vehicle';
        const eyebrow = [v.brand, v.category].filter(Boolean).join(' · ') || typeName;

        const rows = [];
        if (v.status === 'stored') {
            if (v.canValet) {
                const wait = d.valet?.cooldown || 0;
                const disabled = d.delivering || wait > 0;
                rows.push(`<button type="button" class="row" data-do="valet" ${disabled ? 'disabled' : ''}>
                    <span class="ico" style="--ic:var(--accent)">${icon('valet')}</span>
                    <div><b>Valet to me</b><small>${d.delivering ? 'A valet is already on the way' : wait > 0 ? `Available again in ${wait}s` : 'A driver brings it to you'}</small></div>
                    <span class="price">${money(d.fees.valet)}</span></button>`);
            }
            rows.push(`<button type="button" class="row" data-do="move">
                <span class="ico" style="--ic:var(--info)">${icon('swap')}</span>
                <div><b>Move to another garage</b><small>Ready there right away</small></div>
                <span class="price">${money(d.fees.move)}</span>${icon('chev', 'i chev')}</button>`);
            if (!v.orphan) {
                rows.push(`<button type="button" class="row" data-do="locate">
                    <span class="ico" style="--ic:var(--good)">${icon('pin')}</span>
                    <div><b>Directions to ${esc(v.garageLabel || 'garage')}</b><small>Sets your GPS</small></div>${icon('chev', 'i chev')}</button>`);
            }
        } else if (v.status === 'out') {
            rows.push(`<button type="button" class="row" data-do="locate">
                <span class="ico" style="--ic:var(--warn)">${icon('pin')}</span>
                <div><b>Show on map</b><small>Sets your GPS to the vehicle</small></div>${icon('chev', 'i chev')}</button>`);
        } else if (v.status === 'lost') {
            rows.push(`<button type="button" class="row" data-do="locate">
                <span class="ico" style="--ic:var(--bad)">${icon('impound')}</span>
                <div><b>Nearest impound</b><small>Release fee ${money(v.fee)}</small></div>${icon('chev', 'i chev')}</button>`);
        }

        const notes = {
            stored: v.orphan ? 'Its garage was removed, so you can take it out at any garage.' : null,
            out: 'Park it at any garage to put it away. The valet can only fetch parked vehicles.',
            lost: 'It was towed after going missing. Pay the release fee at an impound lot to get it back.',
            impounded: 'The police are holding this vehicle. Speak to LSPD to have it released.',
        };

        $('detail').innerHTML = `
            <div class="nav"><button type="button" class="back-btn" data-do="back">${icon('back')}Garage</button></div>
            <div class="hero">${picture(v)}</div>
            <div class="d-title">
                <div><small>${esc(eyebrow)}</small><h2>${esc(v.label)}</h2></div>
                <span class="plate lg">${esc(v.plate)}</span>
            </div>
            <div class="status" data-s="${v.status}"><i class="dot"></i><b>${esc(where(v))}</b></div>
            <div class="gauges">${gauge('Fuel', v.fuel)}${gauge('Engine', v.engine)}${gauge('Body', v.body)}</div>
            ${rows.length ? `<p class="group-title">Actions</p><div class="group">${rows.join('')}</div>` : ''}
            ${notes[v.status] ? `<p class="note">${esc(notes[v.status])}</p>` : ''}`;

        requestAnimationFrame(() => requestAnimationFrame(() => {
            document.querySelectorAll('.gauge .val').forEach((c) => { c.style.strokeDashoffset = c.dataset.off; });
        }));
    }

    function showDetail(id) {
        P.sel = id;
        renderDetail();
        $('home').hidden = true;
        const el = $('detail');
        el.hidden = false;
        el.scrollTop = 0;
        el.classList.remove('enter');
        void el.offsetWidth;
        el.classList.add('enter');
    }

    // --- sheets ------------------------------------------------------------------

    function closeSheet() {
        const root = $('sheet');
        if (!root.innerHTML) return;
        root.classList.add('closing');
        setTimeout(() => { root.innerHTML = ''; root.classList.remove('closing'); }, 200);
    }

    function openSheet(html) {
        const root = $('sheet');
        root.classList.remove('closing');
        root.innerHTML = `<div class="sheet"><div class="grabber"></div>${html}</div>`;
    }

    function confirmSheet({ title, sub, v, lines, action, run }) {
        const bank = P.data?.money?.bank;
        openSheet(`
            <h3>${esc(title)}</h3>
            ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
            <div class="confirm-card"><span class="thumb">${picture(v)}</span><div><b>${esc(v.label)}</b><small>${esc(v.plate)}</small></div></div>
            <div class="lines">
                ${lines.map(([k, val]) => `<div class="line"><span>${esc(k)}</span><b>${esc(val)}</b></div>`).join('')}
                ${bank != null ? `<div class="line total"><span>Bank balance</span><b>${money(bank)}</b></div>` : ''}
            </div>
            <div class="sheet-actions">
                <button type="button" class="btn primary" data-sheet="go">${esc(action)}</button>
                <button type="button" class="btn plain" data-sheet="cancel">Cancel</button>
            </div>`);
        confirmRun = run;
    }
    let confirmRun = null;

    function garagePicker(v) {
        const list = (P.data.garages || [])
            .filter((g) => g.type === v.type && g.id !== v.garage)
            .map((g) => ({ ...g, dist: distance(g) }))
            .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));

        const rows = (q) => {
            const f = list.filter((g) => !q || g.label.toLowerCase().includes(q));
            if (!f.length) return `<div class="empty" style="padding:2rem 1rem"><p>${list.length ? 'No garages match.' : 'There\'s no other garage you can use.'}</p></div>`;
            return f.map((g) => `<button type="button" class="pick" data-garage="${esc(g.id)}">
                <span class="ico">${icon('garage')}</span><div><b>${esc(g.label)}</b><small>${fmtDist(g.dist)}</small></div>${icon('chev', 'i chev')}</button>`).join('');
        };

        openSheet(`
            <h3>Move ${esc(v.label)}</h3>
            <p class="sub">Pick where it should be parked. It's ready there right away.</p>
            <label class="search">${icon('search')}<input id="gq" type="text" placeholder="Search garages" autocomplete="off"></label>
            <div class="sheet-list" id="glist">${rows('')}</div>`);

        $('gq').addEventListener('input', (e) => { $('glist').innerHTML = rows(e.target.value.trim().toLowerCase()); });
    }

    // --- actions -----------------------------------------------------------------

    async function withButton(btn, run) {
        if (P.busy) return;
        P.busy = true;
        const html = btn?.innerHTML;
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }
        try {
            return await run();
        } finally {
            P.busy = false;
            if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = html; }
        }
    }

    function doValet(v) {
        confirmSheet({
            title: 'Call the valet?',
            sub: `A driver picks it up from ${v.garageLabel || 'the garage'} and brings it to the nearest road.`,
            v,
            lines: [['Valet fee', money(P.data.fees.valet)]],
            action: 'Call valet',
            run: async (btn) => withButton(btn, async () => {
                const res = await nui('phone:valet', { id: v.id });
                if (!res?.ok) return toast(res?.message || 'The valet couldn\'t take the job', 'err');
                closeSheet();
                toast(res.message || 'Your car is on its way');
                P.data.delivering = true;
                await load({ quiet: true });
                showHome();
            }),
        });
    }

    function doMove(v, g) {
        confirmSheet({
            title: `Move to ${g.label}?`,
            sub: `From ${v.garageLabel || 'its current garage'}.`,
            v,
            lines: [['Transfer fee', money(P.data.fees.move)]],
            action: 'Move vehicle',
            run: async (btn) => withButton(btn, async () => {
                const res = await nui('phone:move', { id: v.id, garage: g.id });
                if (!res?.ok) return toast(res?.message || 'It couldn\'t be moved', 'err');
                closeSheet();
                toast(res.message || `Moved to ${g.label}`);
                await load({ quiet: true });
            }),
        });
    }

    async function doLocate(v, btn) {
        await withButton(btn, async () => {
            const res = await nui('phone:locate', { id: v.id, status: v.status, type: v.type });
            toast(res?.message || (res?.ok ? 'GPS set' : 'It couldn\'t be found'), res?.ok ? 'ok' : 'err');
        });
    }

    // --- events ------------------------------------------------------------------

    $('seg').addEventListener('click', (e) => {
        const b = e.target.closest('[data-seg]');
        if (!b) return;
        P.seg = b.dataset.seg;
        renderHome();
    });
    $('q').addEventListener('input', (e) => { P.q = e.target.value; renderHome(); });
    $('list').addEventListener('click', (e) => {
        const c = e.target.closest('[data-id]');
        if (c) showDetail(Number(c.dataset.id));
    });
    $('refresh').addEventListener('click', () => load());
    $('retry').addEventListener('click', () => load());

    $('detail').addEventListener('click', (e) => {
        const b = e.target.closest('[data-do]');
        const v = selected();
        if (!b || !v) return;
        const what = b.dataset.do;
        if (what === 'back') return showHome();
        if (what === 'valet') return doValet(v);
        if (what === 'move') return garagePicker(v);
        if (what === 'locate') return doLocate(v, b);
    });

    $('sheet').addEventListener('click', (e) => {
        if (e.target === $('sheet')) return closeSheet();
        const g = e.target.closest('[data-garage]');
        if (g) {
            const v = selected();
            const garage = P.data.garages.find((x) => x.id === g.dataset.garage);
            if (v && garage) doMove(v, garage);
            return;
        }
        const b = e.target.closest('[data-sheet]');
        if (!b) return;
        if (b.dataset.sheet === 'cancel') closeSheet();
        if (b.dataset.sheet === 'go' && confirmRun) confirmRun(b);
    });

    // messages from Lua (through lb-phone) and from lb-phone itself
    window.addEventListener('message', (event) => {
        const msg = event.data;
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'settingsUpdated') return applyTheme(msg.settings);
        if (msg.action === 'appOpened') {
            readTheme();
            load({ quiet: !!P.data });
        }
    });

    // --- start -------------------------------------------------------------------

    if (!IN_GAME) {
        const s = document.createElement('script');
        s.src = '../dev/phone-mock.js';
        s.onload = () => { readTheme(); load(); };
        document.head.appendChild(s);
    } else {
        setTimeout(readTheme, 150);
        load();
    }
})();
