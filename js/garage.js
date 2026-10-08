/* ---------------------------------------------------------------------------
   st_garages - the garage menu

   Opened by client/main.lua with { garage, vehicles, money, options }.
   The list on the left filters by tab and search; the right side shows the
   selected vehicle and what can be done with it from this garage.
--------------------------------------------------------------------------- */
(() => {
    'use strict';

    const { icon, esc, money, nui, toast, paintAccent, armed } = window.STG;
    const $ = (id) => document.getElementById(id);

    const TABS = {
        public: [
            { id: 'here', label: 'Here', match: (v) => v.status === 'here' },
            { id: 'elsewhere', label: 'Elsewhere', match: (v) => v.status === 'elsewhere' },
            { id: 'away', label: 'Away', match: (v) => v.status === 'out' || v.status === 'lost' || v.status === 'impounded' },
        ],
        impound: [
            { id: 'ready', label: 'Ready to collect', match: (v) => v.status === 'retrieve' || v.status === 'recover' },
            { id: 'held', label: 'Not available', match: (v) => v.status === 'impounded' || v.status === 'out' },
        ],
    };

    const STATUS = {
        here: (v) => 'Parked here',
        elsewhere: (v) => `At ${v.garageLabel || 'another garage'}`,
        out: () => 'Out in the city',
        lost: () => 'At the impound',
        impounded: () => 'Held by police',
        retrieve: () => 'Ready to collect',
        recover: () => 'Still in the city',
    };

    const TYPE_NAMES = { car: ['Car', 'Cars'], boat: ['Boat', 'Boats'], air: ['Aircraft', 'Aircraft'] };

    const S = {
        garage: null,
        vehicles: [],
        money: null,
        options: {},
        tab: null,
        q: '',
        sel: null,
        busy: false,
        modal: null, // { step: 'pick'|'wait', people, target, price, error }
    };

    const brokenImages = new Set();

    // --- helpers -------------------------------------------------------------

    const tabs = () => TABS[S.garage?.kind === 'impound' ? 'impound' : 'public'];

    function visible() {
        const tab = tabs().find((t) => t.id === S.tab) || tabs()[0];
        const q = S.q.trim().toLowerCase();
        return S.vehicles.filter((v) => tab.match(v) && (!q
            || v.label.toLowerCase().includes(q)
            || (v.brand || '').toLowerCase().includes(q)
            || v.plate.toLowerCase().includes(q)
            || String(v.model).toLowerCase().includes(q)));
    }

    const selected = () => S.vehicles.find((v) => v.id === S.sel);

    // pictures to try in order: the FiveM docs (stock cars), then the
    // st_newdealer photo (addon cars) - or the other way round with photosFirst
    function imageUrls(v) {
        const urls = [];
        const tpl = S.options.images;
        if (tpl && typeof v.model === 'string' && !/^-?\d+$/.test(v.model)) urls.push(tpl.replace('%s', encodeURIComponent(v.model.toLowerCase())));
        if (v.photo) S.options.photosFirst ? urls.unshift(v.photo) : urls.push(v.photo);
        return urls.filter((u) => !brokenImages.has(u));
    }

    // <img> that moves on to the next picture if one doesn't exist, then the type icon
    function picture(v, cls) {
        const [first, ...rest] = imageUrls(v);
        if (!first) return icon(v.type || 'car', cls || 'i');
        return `<img src="${esc(first)}" alt="" data-next="${esc(rest.join('|'))}" data-type="${esc(v.type || 'car')}" data-cls="${esc(cls || 'i')}" onerror="window.STG_imgFail && window.STG_imgFail(this)">`;
    }
    window.STG_imgFail = (img) => {
        brokenImages.add(img.getAttribute('src'));
        const next = (img.dataset.next || '').split('|').filter((u) => u && !brokenImages.has(u));
        if (next.length) {
            img.dataset.next = next.slice(1).join('|');
            img.src = next[0];
            return;
        }
        img.outerHTML = icon(img.dataset.type || 'car', img.dataset.cls || 'i');
    };

    const barColor = (n) => (n >= 60 ? 'var(--good)' : n >= 30 ? 'var(--warn)' : 'var(--bad)');

    const initials = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
    const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

    // --- rendering -----------------------------------------------------------

    function renderHead() {
        const g = S.garage;
        const impound = g.kind === 'impound';
        $('g-icon').className = `g-icon${impound ? ' impound' : ''}`;
        $('g-icon').innerHTML = icon(impound ? 'impound' : g.type);
        $('g-name').textContent = g.label;
        $('g-sub').textContent = `${impound ? 'Impound lot' : 'Public garage'} · ${TYPE_NAMES[g.type]?.[1] || 'Vehicles'}`;
        $('g-search-icon').innerHTML = icon('search');
        $('g-close').innerHTML = icon('close');

        const m = S.money;
        $('g-money').innerHTML = m
            ? `<span><em>Bank</em>${money(m.bank)}</span><span><em>Cash</em>${money(m.cash)}</span>`
            : '';
    }

    function renderTabs() {
        $('g-tabs').innerHTML = tabs().map((t) => {
            const n = S.vehicles.filter(t.match).length;
            return `<button type="button" class="tab${t.id === S.tab ? ' on' : ''}" data-tab="${t.id}">${esc(t.label)}<b>${n}</b></button>`;
        }).join('');
    }

    function emptyList() {
        const g = S.garage;
        const noun = (TYPE_NAMES[g.type]?.[1] || 'vehicles').toLowerCase();
        if (S.q.trim()) return { title: 'No matches', text: `Nothing matches "${S.q.trim()}".` };
        if (!S.vehicles.length) {
            return g.kind === 'impound'
                ? { title: 'Nothing impounded', text: `None of your ${noun} are waiting here.` }
                : { title: `No ${noun} yet`, text: `${TYPE_NAMES[g.type]?.[1] || 'Vehicles'} you own will show up here.` };
        }
        const hints = {
            here: 'Drive into one of the marked bays and press E to park here.',
            elsewhere: 'Everything you own is either here or out.',
            away: 'All your vehicles are parked.',
            ready: 'Nothing is waiting to be collected.',
            held: 'Nothing is being held.',
        };
        return { title: 'Nothing here', text: hints[S.tab] || '' };
    }

    function renderList() {
        const list = visible();
        if (!list.find((v) => v.id === S.sel)) S.sel = list[0]?.id ?? null;

        if (!list.length) {
            const e = emptyList();
            $('g-list').innerHTML = `<div class="empty">${icon('empty')}<b>${esc(e.title)}</b><p>${esc(e.text)}</p></div>`;
            return;
        }

        $('g-list').innerHTML = list.map((v) => `
            <button type="button" class="v-item${v.id === S.sel ? ' on' : ''}" data-id="${v.id}" data-s="${v.status}" role="option" aria-selected="${v.id === S.sel}">
                <span class="v-thumb">${picture(v)}</span>
                <span class="v-txt"><b>${esc(v.label)}</b><span>${esc(v.brand || STATUS[v.status](v))}</span></span>
                <span class="v-right"><span class="plate sm">${esc(v.plate)}</span><span class="v-dot"></span></span>
            </button>`).join('');
    }

    function primaryFor(v) {
        const fee = v.fee || 0;
        switch (v.status) {
            case 'here': return { act: 'takeOut', label: `${icon('key')}Take out <kbd>↵</kbd>` };
            case 'elsewhere': return { act: 'moveHere', label: `${icon('swap')}Move here${fee ? ` · ${money(fee)}` : ''}`, fee };
            case 'out': return { act: 'locate', label: `${icon('pin')}Mark on GPS` };
            case 'lost': return { act: 'locate', label: `${icon('map')}GPS to impound` };
            case 'retrieve': return { act: 'takeOut', label: `${icon('key')}Retrieve${fee ? ` · ${money(fee)}` : ''}`, fee };
            case 'recover': return { act: 'takeOut', label: `${icon('impound')}Recover${fee ? ` · ${money(fee)}` : ''}`, fee };
            default: return null;
        }
    }

    function noteFor(v) {
        switch (v.status) {
            case 'elsewhere': return `It's parked at ${v.garageLabel || 'another garage'}. Moving it here is instant.`;
            case 'out': return 'It\'s somewhere in the city. Park it at any garage to bring it back.';
            case 'lost': return 'It went missing and was towed. Collect it from an impound lot for a fee.';
            case 'impounded': return 'The police are holding this vehicle. Speak to LSPD to have it released.';
            case 'recover': return 'It\'s still out in the city. It can be recovered here as long as nobody is inside it.';
            case 'retrieve': return v.fee ? `Pay the ${money(v.fee)} release fee to drive it away.` : 'It\'s ready to drive away.';
            case 'here': return S.garage.storePrice ? `Parking here costs ${money(S.garage.storePrice)} each time.` : null;
            default: return null;
        }
    }

    function renderDetail(animate) {
        const box = $('g-detail');
        const v = selected();

        if (!v) {
            box.innerHTML = `<div class="empty">${icon(S.garage.kind === 'impound' ? 'impound' : S.garage.type)}
                <b>${esc(S.garage.label)}</b><p>Pick a vehicle on the left to see what you can do with it.</p></div>`;
            return;
        }

        const stats = [['Fuel', v.fuel], ['Engine', v.engine], ['Body', v.body]].map(([name, n]) => `
            <div class="stat"><div class="stat-top"><span>${name}</span><b>${n}%</b></div>
            <div class="bar"><i style="width:${n}%;--bc:${barColor(n)}"></i></div></div>`).join('');

        const primary = primaryFor(v);
        const note = noteFor(v);
        const canGive = v.status === 'here' && S.options.give;
        const eyebrow = [v.brand, v.category].filter(Boolean).map(esc).join(' · ') || (TYPE_NAMES[v.type]?.[0] || 'Vehicle');

        box.innerHTML = `
            <div class="d-stage">${picture(v)}</div>
            <div class="d-head">
                <div><p class="eyebrow">${eyebrow}</p><h2>${esc(v.label)}</h2></div>
                <span class="plate">${esc(v.plate)}</span>
            </div>
            <div class="d-meta">
                <span class="pill" data-s="${v.status}">${esc(STATUS[v.status](v))}</span>
            </div>
            <div class="d-stats">${stats}</div>
            ${note ? `<div class="d-note">${icon(v.status === 'impounded' ? 'shield' : 'info')}<span>${esc(note)}</span></div>` : ''}
            <div class="d-actions">
                ${canGive ? `<button type="button" class="btn" data-act="give">${icon('gift')}Give to player</button>` : ''}
                ${v.status === 'elsewhere' ? `<button type="button" class="btn" data-act="locateGarage">${icon('pin')}GPS</button>` : ''}
                <span class="spacer"></span>
                ${primary ? `<button type="button" class="btn primary" data-act="${primary.act}" data-fee="${primary.fee || 0}">${primary.label}</button>` : ''}
            </div>`;

        if (animate) {
            box.classList.remove('swap');
            void box.offsetWidth;
            box.classList.add('swap');
        }
    }

    function render() {
        renderHead();
        renderTabs();
        renderList();
        renderDetail(false);
        renderModal();
    }

    // --- actions -------------------------------------------------------------

    function setBusy(btn, busy) {
        S.busy = busy;
        if (!btn) return;
        if (busy) {
            btn.dataset.html = btn.innerHTML;
            btn.innerHTML = '<span class="spinner"></span>';
            btn.disabled = true;
        } else {
            btn.innerHTML = btn.dataset.html || btn.innerHTML;
            btn.disabled = false;
            btn.classList.remove('confirm');
        }
    }

    function replaceVehicles(list) {
        if (Array.isArray(list)) S.vehicles = list;
    }

    async function act(name, btn) {
        const v = selected();
        if (!v || S.busy) return;

        if (name === 'give') return openGive();

        const run = async () => {
            setBusy(btn, true);
            let res;
            if (name === 'takeOut') {
                res = await nui('garage:takeOut', { id: v.id });
                if (res?.ok) { S.busy = false; return; } // Lua closes the menu
            } else if (name === 'moveHere') {
                res = await nui('garage:moveHere', { id: v.id });
                if (res?.ok) {
                    replaceVehicles(res.vehicles);
                    S.tab = 'here';
                    S.sel = v.id;
                }
            } else if (name === 'locate') {
                res = await nui('garage:locate', { id: v.id, status: v.status, type: v.type });
            } else if (name === 'locateGarage') {
                res = await nui('garage:locate', { id: v.id, status: 'stored', type: v.type });
            }
            setBusy(btn, false);
            toast(res?.message || (res?.ok ? 'Done' : 'Something went wrong'), res?.ok ? 'ok' : 'err');
            if (res?.ok && name === 'moveHere') render();
        };

        const fee = Number(btn?.dataset.fee) || 0;
        if (fee > 0) return armed(btn, `Confirm · ${money(fee)}`, run);
        return run();
    }

    // --- give to player ------------------------------------------------------

    async function openGive() {
        const v = selected();
        S.modal = { step: 'pick', people: null, target: null, manual: '', price: '', error: '' };
        renderModal();
        const people = await nui('garage:nearby');
        if (!S.modal) return;
        S.modal.people = Array.isArray(people) ? people : [];
        if (S.modal.people.length === 1) S.modal.target = S.modal.people[0].id;
        renderModal();
        void v;
    }

    function closeModal() {
        if (S.modal?.step === 'wait') return;
        S.modal = null;
        renderModal();
    }

    function renderModal() {
        const root = $('g-modal');
        const m = S.modal;
        const v = selected();
        if (!m || !v) { root.innerHTML = ''; return; }

        if (m.step === 'wait') {
            const total = S.options.timeout || 30;
            const left = Math.max(0, m.left ?? total);
            const c = 2 * Math.PI * 28;
            root.innerHTML = `<div class="modal"><div class="waiting">
                <div class="ring"><svg viewBox="0 0 64 64"><circle class="track" cx="32" cy="32" r="28"/><circle class="prog" cx="32" cy="32" r="28" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - left / total)}"/></svg><span>${left}</span></div>
                <b>Waiting for ${esc(m.targetName)}</b>
                <p>They have ${total} seconds to accept${m.priceNum ? ` and pay ${money(m.priceNum)}` : ''}.</p>
            </div></div>`;
            return;
        }

        const people = m.people === null
            ? '<div class="people-empty"><span class="spinner" style="margin:0 auto"></span></div>'
            : m.people.length
                ? m.people.map((p) => `
                    <button type="button" class="person${m.target === p.id && !m.manual ? ' on' : ''}" data-person="${p.id}">
                        <span class="avatar" style="--h:${hue(p.name)}">${esc(initials(p.name))}</span>
                        <div><b>${esc(p.name)}</b><span>ID ${p.id} · ${p.distance}m away</span></div>
                        <span class="tick"></span>
                    </button>`).join('')
                : `<div class="people-empty">Nobody is standing within ${Math.round(S.options.radius || 10)}m of you.</div>`;

        const fee = S.options.giveFee || 0;
        root.innerHTML = `<div class="modal" role="dialog" aria-label="Give vehicle">
            <div class="m-head">
                <h3>Give ${esc(v.label)}</h3>
                <p>The new owner gets it parked here at ${esc(S.garage.label)}. They have to accept before anything changes.</p>
            </div>
            <div class="m-body">
                <div class="m-label">Nearby</div>
                <div class="people">${people}</div>
                <label class="field"><span>Or enter a server ID</span>
                    <input id="m-id" class="input" type="number" min="1" placeholder="e.g. 27" value="${esc(m.manual)}"></label>
                ${S.options.allowPrice ? `<label class="field"><span>Asking price (optional)</span>
                    <div class="prefix"><b>$</b><input id="m-price" class="input" type="number" min="0" placeholder="0 · it's a gift" value="${esc(m.price)}"></div></label>` : ''}
                ${fee ? `<div class="m-sum"><span>Transfer fee</span><b>${money(fee)}</b></div>` : ''}
                ${m.error ? `<div class="m-sum" style="color:var(--bad)">${esc(m.error)}</div>` : ''}
            </div>
            <div class="m-foot">
                <button type="button" class="btn ghost" data-modal="cancel">Cancel</button>
                <button type="button" class="btn primary" data-modal="send">${icon('gift')}Send offer</button>
            </div>
        </div>`;
    }

    async function sendOffer() {
        const m = S.modal;
        const v = selected();
        if (!m || !v) return;

        const manual = Number(m.manual);
        const target = m.manual ? manual : m.target;
        if (!target || target < 1) { m.error = 'Pick someone nearby or enter their ID.'; return renderModal(); }

        const price = Math.floor(Number(m.price) || 0);
        if (price < 0 || (S.options.maxPrice && price > S.options.maxPrice)) { m.error = 'That price isn\'t allowed.'; return renderModal(); }

        const person = (m.people || []).find((p) => p.id === target);
        m.step = 'wait';
        m.targetName = person ? person.name : `ID ${target}`;
        m.priceNum = price;
        m.left = S.options.timeout || 30;
        renderModal();

        const timer = setInterval(() => {
            if (!S.modal || S.modal.step !== 'wait') return clearInterval(timer);
            S.modal.left = Math.max(0, S.modal.left - 1);
            renderModal();
        }, 1000);

        const res = await nui('garage:give', { id: v.id, target, price });
        clearInterval(timer);
        if (!S.modal) return;

        if (res?.ok) {
            S.modal = null;
            replaceVehicles(res.vehicles);
            render();
            toast(res.message || 'Vehicle handed over', 'ok');
        } else {
            m.step = 'pick';
            m.error = res?.message || 'The offer didn\'t go through.';
            renderModal();
        }
    }

    // --- events --------------------------------------------------------------

    $('g-tabs').addEventListener('click', (e) => {
        const t = e.target.closest('[data-tab]');
        if (!t) return;
        S.tab = t.dataset.tab;
        S.sel = null;
        renderTabs();
        renderList();
        renderDetail(true);
    });

    $('g-list').addEventListener('click', (e) => {
        const item = e.target.closest('[data-id]');
        if (!item) return;
        const id = Number(item.dataset.id);
        if (id === S.sel) return;
        S.sel = id;
        renderList();
        renderDetail(true);
    });

    $('g-q').addEventListener('input', (e) => {
        S.q = e.target.value;
        renderList();
        renderDetail(false);
    });

    $('g-detail').addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]');
        if (b) act(b.dataset.act, b);
    });

    $('g-modal').addEventListener('click', (e) => {
        if (e.target === $('g-modal')) return closeModal();
        const p = e.target.closest('[data-person]');
        if (p && S.modal) {
            S.modal.target = Number(p.dataset.person);
            S.modal.manual = '';
            S.modal.error = '';
            return renderModal();
        }
        const b = e.target.closest('[data-modal]');
        if (!b) return;
        if (b.dataset.modal === 'cancel') closeModal();
        if (b.dataset.modal === 'send') sendOffer();
    });

    $('g-modal').addEventListener('input', (e) => {
        if (!S.modal) return;
        if (e.target.id === 'm-id') { S.modal.manual = e.target.value; S.modal.error = ''; }
        if (e.target.id === 'm-price') S.modal.price = e.target.value;
        // keep focus while re-rendering the selection state only
        document.querySelectorAll('.person').forEach((el) => el.classList.toggle('on', !S.modal.manual && Number(el.dataset.person) === S.modal.target));
    });

    $('g-close').addEventListener('click', () => close());

    function close() {
        if (S.modal?.step === 'wait') return;
        S.modal = null;
        $('garage').hidden = true;
        S.garage = null;
        nui('garage:close');
    }

    function moveSelection(step) {
        const list = visible();
        if (!list.length) return;
        const i = Math.max(0, list.findIndex((v) => v.id === S.sel));
        const next = list[Math.min(list.length - 1, Math.max(0, i + step))];
        if (next.id === S.sel) return;
        S.sel = next.id;
        renderList();
        renderDetail(true);
        document.querySelector(`.v-item[data-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
    }

    document.addEventListener('keydown', (e) => {
        if ($('garage').hidden) return;
        const inField = e.target instanceof HTMLInputElement;

        if (e.key === 'Escape') {
            e.preventDefault();
            if (S.modal) return closeModal();
            if (inField && e.target.id === 'g-q' && S.q) {
                e.target.value = '';
                S.q = '';
                renderList();
                return renderDetail(false);
            }
            return close();
        }
        if (S.modal) {
            if (e.key === 'Enter' && S.modal.step === 'pick') { e.preventDefault(); sendOffer(); }
            return;
        }
        if (e.key === '/' && !inField) { e.preventDefault(); $('g-q').focus(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); return; }
        if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
            const b = document.querySelector('#g-detail .btn.primary');
            if (b && !b.disabled) { e.preventDefault(); act(b.dataset.act, b); }
        }
    });

    // --- from Lua ------------------------------------------------------------

    window.STG.on('garage', (action, msg) => {
        if (action === 'open') {
            const d = msg.data;
            if (d.options?.accent) paintAccent(d.options.accent);
            S.garage = d.garage;
            S.vehicles = d.vehicles || [];
            S.money = d.money || null;
            S.options = d.options || {};
            S.q = '';
            S.modal = null;
            S.busy = false;
            $('g-q').value = '';
            const t = tabs();
            S.tab = (t.find((x) => S.vehicles.some(x.match)) || t[0]).id;
            S.sel = null;
            $('garage').hidden = false;
            render();
        } else if (action === 'close') {
            S.modal = null;
            $('garage').hidden = true;
        }
    });
})();
