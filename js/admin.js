/* ---------------------------------------------------------------------------
   st_garages - garage creator (/sng) and manager (/garages)

   The form lives here while the admin places points in the world; Lua hides
   the panel during placement and sends the picked coords back.
--------------------------------------------------------------------------- */
(() => {
    'use strict';

    const { icon, esc, money, nui, toast, paintAccent, armed } = window.STG;
    const $ = (id) => document.getElementById(id);

    const TYPES = [['car', 'Cars'], ['boat', 'Boats'], ['air', 'Aircraft']];
    const KINDS = [['public', 'Public'], ['impound', 'Impound']];
    const TYPE_LABEL = Object.fromEntries(TYPES);
    const KIND_LABEL = Object.fromEntries(KINDS);

    // approximate colours of GTA blip colour ids, for the preview swatch
    const BLIP_COLORS = ['#fefefe', '#e03232', '#71cb71', '#5db6e5', '#fefefe', '#eec64e', '#c25050', '#9c6eaf', '#fe7ac3', '#f5a55d',
        '#b18f83', '#8dcea7', '#70a8ae', '#d3d1e7', '#8f7e98', '#6ac4bf', '#d5c398', '#ea8e50', '#97caea', '#b26287',
        '#8f8d79', '#a6755e', '#afa8a8', '#e88e9b', '#bbd65b', '#0c7b56', '#7ac3fe', '#ab3ce6', '#cda80c', '#4561ab',
        '#29a5b8', '#b89b7b', '#c8e0fe', '#f0f096', '#ed8ca1', '#f98a8a', '#fbeea5', '#fefefe', '#2c6db8', '#9a9a9a',
        '#4c4c4c', '#f29e9e', '#6db8d7', '#b0eeaf', '#ffa75f', '#f1f1f1', '#ecf029', '#ff9a18', '#f644a5', '#e03b3b',
        '#8a6de3', '#ff8b5c', '#416c41', '#b3ddf3', '#3a64a6', '#a0a0a0', '#848472', '#65b9e7', '#4b4175', '#e1323b',
        '#f0cb57', '#cd3e98', '#cfc0a5', '#1d4867', '#d27c42', '#68877e', '#ffda60', '#2a83f0', '#2d6db6', '#56b35c',
        '#ffb84c', '#f6b23e', '#000000', '#fbc443', '#5c83cf', '#cb3b3b', '#9c1717', '#4ab7e9', '#36618f', '#ff3c3c',
        '#bcbcbc', '#d4a434', '#a6f42a', '#9e5ae0', '#4196e1', '#3c3c3c'];

    const A = {
        view: null,      // 'manager' | 'editor'
        data: null,      // { jobs, gangs, blips, defaultImpoundFee }
        list: [],
        q: '',
        filter: 'all',
        fromManager: false,
        form: null,
        error: '',
        saving: false,
    };

    // --- helpers -------------------------------------------------------------

    const fmt = (n) => Number(n).toFixed(1);
    const coords = (c) => (c ? `${fmt(c.x)}, ${fmt(c.y)}, ${fmt(c.z)}` : 'Not placed');
    const clone = (o) => JSON.parse(JSON.stringify(o ?? null));

    function blipDefault(f) {
        const b = A.data?.blips?.[f.type]?.[f.kind] || { sprite: 357, color: 3 };
        return { sprite: b.sprite, color: b.color, scale: A.data?.blips?.scale ?? 0.7 };
    }

    function formFrom(g) {
        const b = g.blip || {};
        return {
            id: g.id || null,
            runtime: !!g.runtime,
            label: g.label || '',
            type: g.type || 'car',
            kind: g.kind || 'public',
            storePrice: g.storePrice || '',
            impoundFee: g.impoundFee ?? '',
            menu: g.menu || null,
            spawns: clone(g.spawns || []),
            jobs: clone(g.jobs || []),
            gangs: clone(g.gangs || []),
            blip: {
                enabled: b.enabled !== false,
                label: b.label || '',
                sprite: b.sprite ?? '',
                color: b.color ?? '',
                scale: b.scale ?? '',
                shortRange: b.shortRange !== false,
            },
        };
    }

    function pushPoints() {
        const f = A.form;
        nui('admin:points', f ? { menu: f.menu, spawns: f.spawns } : {});
    }

    // --- shell ---------------------------------------------------------------

    function header(eyebrow, title, back) {
        $('a-eyebrow').textContent = eyebrow;
        $('a-heading').textContent = title;
        $('a-back').hidden = !back;
        $('a-back').innerHTML = icon('back');
        $('a-close').innerHTML = icon('close');
    }

    function render() {
        if (A.view === 'manager') renderManager();
        else if (A.view === 'editor') renderEditor();
    }

    // --- manager -------------------------------------------------------------

    const FILTERS = [['all', 'All'], ['public', 'Public'], ['impound', 'Impound'], ['car', 'Cars'], ['boat', 'Boats'], ['air', 'Aircraft']];

    function managerRows() {
        const q = A.q.trim().toLowerCase();
        return A.list.filter((g) => {
            if (A.filter !== 'all' && g.kind !== A.filter && g.type !== A.filter) return false;
            return !q || g.label.toLowerCase().includes(q) || g.id.toLowerCase().includes(q);
        });
    }

    function renderManager() {
        header('Garage manager', `${A.list.length} garage${A.list.length === 1 ? '' : 's'}`, false);
        const rows = managerRows();

        $('a-body').innerHTML = `
            <div class="m-tools">
                <label class="search">${icon('search')}<input id="a-q" type="text" placeholder="Search garages" value="${esc(A.q)}" autocomplete="off" spellcheck="false"></label>
                <div class="filters">${FILTERS.map(([id, label]) => `<button type="button" class="chip${A.filter === id ? ' on' : ''}" data-filter="${id}">${label}</button>`).join('')}</div>
            </div>
            <div id="a-rows">${rowsHtml(rows)}</div>`;

        $('a-foot').innerHTML = `<span class="hint">Click a garage to edit it.</span><span class="spacer"></span>
            <button type="button" class="btn primary" data-a="new">${icon('plus')}New garage</button>`;
    }

    function rowsHtml(rows) {
        if (!rows.length) return `<div class="empty">${icon('empty')}<b>No garages</b><p>${A.list.length ? 'Nothing matches that search.' : 'Create the first one with New garage.'}</p></div>`;
        return rows.map((g) => `
            <div class="g-row" data-row="${esc(g.id)}" role="button" tabindex="0">
                <span class="num${g.kind === 'impound' ? ' impound' : ''}">${icon(g.kind === 'impound' ? 'impound' : g.type)}</span>
                <div>
                    <b>${esc(g.label)}${g.runtime ? '<span class="tag">Script</span>' : ''}</b>
                    <span>${KIND_LABEL[g.kind]} · ${TYPE_LABEL[g.type]} · ${g.spawns.length} bay${g.spawns.length === 1 ? '' : 's'}${g.kind === 'public' ? ` · ${g.stored} parked` : ''}${g.jobs?.length || g.gangs?.length ? ' · Restricted' : ''}</span>
                </div>
                <span class="acts">
                    <button type="button" class="icon-btn" data-tp="${esc(g.id)}" title="Teleport here">${icon('teleport')}</button>
                    ${g.runtime ? '' : `<button type="button" class="icon-btn" data-edit="${esc(g.id)}" title="Edit">${icon('edit')}</button>`}
                </span>
            </div>`).join('') + `<p class="count">${rows.length} of ${A.list.length}</p>`;
    }

    // --- editor --------------------------------------------------------------

    function seg(field, options, value) {
        return `<div class="seg" data-seg="${field}">${options.map(([id, label]) =>
            `<button type="button" class="${value === id ? 'on' : ''}" data-v="${id}">${field === 'type' ? icon(id) : ''}${label}</button>`).join('')}</div>`;
    }

    function groupsHtml(kind) {
        const f = A.form;
        const all = A.data?.[kind] || [];
        const chosen = f[kind];
        const free = all.filter((g) => !chosen.some((c) => c.name === g.name));
        const noun = kind === 'jobs' ? 'job' : 'gang';

        const entries = chosen.map((c, i) => {
            const g = all.find((x) => x.name === c.name) || { label: c.name, grades: [] };
            const allGrades = !c.grades.length;
            return `<div class="group">
                <div class="group-head"><b>${esc(g.label)}<span>${allGrades ? 'All grades' : `${c.grades.length} grade${c.grades.length === 1 ? '' : 's'}`}</span></b>
                    <button type="button" class="icon-btn" data-gremove="${kind}:${i}" title="Remove">${icon('close')}</button></div>
                ${g.grades.length ? `<div class="chips">${g.grades.map((gr) => `<button type="button" class="chip${c.grades.includes(gr.grade) ? ' on' : ''}" data-grade="${kind}:${i}:${gr.grade}">${gr.grade} · ${esc(gr.label)}</button>`).join('')}</div>` : ''}
            </div>`;
        }).join('');

        return `<div class="groups">
            <div class="group-add">
                <select class="select" id="add-${kind}">${free.length ? free.map((g) => `<option value="${esc(g.name)}">${esc(g.label)}</option>`).join('') : `<option value="">No more ${kind}</option>`}</select>
                <button type="button" class="btn sm" data-gadd="${kind}" ${free.length ? '' : 'disabled'}>${icon('plus')}Add ${noun}</button>
            </div>
            ${entries}
        </div>`;
    }

    function renderEditor() {
        const f = A.form;
        const editing = !!f.id;
        header(editing ? 'Edit garage' : 'New garage', f.label || (editing ? f.id : 'Untitled garage'), A.fromManager);

        const def = blipDefault(f);
        const color = f.blip.color === '' ? def.color : Number(f.blip.color);
        const b = f.blip;

        $('a-body').innerHTML = `
            <section class="sec">
                <div class="sec-head"><h2>General</h2></div>
                <div class="stack">
                    <label class="field"><span>Name</span>
                        <input class="input" data-f="label" maxlength="50" placeholder="e.g. Mirror Park Garage" value="${esc(f.label)}"></label>
                    ${editing ? `<p class="hint">Saved as <b>${esc(f.id)}</b> on parked vehicles. Renaming only changes what players see.</p>` : ''}
                    <div class="field"><span>Vehicles</span>${seg('type', TYPES, f.type)}</div>
                    <div class="field"><span>Kind</span>${seg('kind', KINDS, f.kind)}</div>
                    ${f.kind === 'public'
                        ? `<label class="field"><span>Parking fee</span><div class="prefix"><b>$</b><input class="input" type="number" min="0" data-f="storePrice" placeholder="0 · free" value="${esc(f.storePrice)}"></div></label>`
                        : `<label class="field"><span>Release fee</span><div class="prefix"><b>$</b><input class="input" type="number" min="0" data-f="impoundFee" placeholder="${A.data?.defaultImpoundFee ?? 500} · default" value="${esc(f.impoundFee)}"></div></label>
                           <p class="hint">Charged for missing vehicles unless the police set a price with /depot. Players collect ${TYPE_LABEL[f.type].toLowerCase()} here; they can't park here.</p>`}
                </div>
            </section>

            <section class="sec">
                <div class="sec-head"><h2>Location</h2><p>${f.spawns.length} spawn bay${f.spawns.length === 1 ? '' : 's'}</p></div>
                <div class="point">
                    <span class="num">${icon('target')}</span>
                    <div><b>Garage point</b><code>${coords(f.menu)}</code></div>
                    <span class="acts"><button type="button" class="btn sm" data-pick="menu">${f.menu ? 'Move' : 'Place'}</button></span>
                </div>
                ${f.spawns.map((s, i) => `
                    <div class="point">
                        <span class="num">${i + 1}</span>
                        <div><b>Spawn bay ${i + 1}</b><code>${coords(s)} · ${Math.round(s.w)}°</code></div>
                        <span class="acts">
                            <button type="button" class="icon-btn" data-pick="spawn:${i}" title="Move">${icon('target')}</button>
                            <button type="button" class="icon-btn" data-sremove="${i}" title="Remove">${icon('trash')}</button>
                        </span>
                    </div>`).join('')}
                <button type="button" class="btn add-bay" data-pick="spawn">${icon('plus')}Add spawn bay</button>
                <p class="hint" style="margin-top:.6rem">${f.kind === 'public' ? 'Players park by driving into any bay or near the garage point. ' : ''}Vehicles come out at the first bay that's clear.</p>
            </section>

            <section class="sec">
                <div class="sec-head"><h2>Access</h2><p>${f.jobs.length || f.gangs.length ? 'Restricted' : 'Everyone'}</p></div>
                <p class="hint" style="margin-bottom:.8rem">Leave both empty for a garage everyone can use. Pick grades to limit it further; no grades means all of them.</p>
                <div class="stack">
                    <div class="field"><span>Jobs</span>${groupsHtml('jobs')}</div>
                    <div class="field"><span>Gangs</span>${groupsHtml('gangs')}</div>
                </div>
            </section>

            <section class="sec">
                <div class="sec-head"><h2>Map blip</h2></div>
                <div class="stack">
                    <label class="toggle"><span>Show on the map<small>${f.jobs.length || f.gangs.length ? 'Only players with access see it' : 'Everyone sees it'}</small></span>
                        <input type="checkbox" data-f="blip.enabled" ${b.enabled ? 'checked' : ''}><i class="switch"></i></label>
                    <div class="stack blip-fields${b.enabled ? '' : ' off'}">
                        <label class="field"><span>Label</span><input class="input" data-f="blip.label" maxlength="50" placeholder="${esc(f.label || 'Garage name')}" value="${esc(b.label)}"></label>
                        <div class="row3">
                            <label class="field"><span>Sprite</span><input class="input" type="number" min="0" data-f="blip.sprite" placeholder="${def.sprite}" value="${esc(b.sprite)}"></label>
                            <label class="field"><span>Colour</span>
                                <div class="swatch-row"><input class="input" type="number" min="0" max="85" data-f="blip.color" placeholder="${def.color}" value="${esc(b.color)}">
                                <span id="a-swatch" class="swatch" style="background:${BLIP_COLORS[color] || '#888'}"></span></div></label>
                            <label class="field"><span>Size</span><input class="input" type="number" min="0.1" max="2" step="0.1" data-f="blip.scale" placeholder="${def.scale}" value="${esc(b.scale)}"></label>
                        </div>
                        <label class="toggle"><span>Short range<small>Only shows when you're nearby on the minimap</small></span>
                            <input type="checkbox" data-f="blip.shortRange" ${b.shortRange ? 'checked' : ''}><i class="switch"></i></label>
                    </div>
                </div>
            </section>`;

        renderEditorFoot();
    }

    function renderEditorFoot() {
        const f = A.form;
        $('a-foot').innerHTML = `
            ${f.id ? `<button type="button" class="btn danger" data-a="delete" title="Delete">${icon('trash')}</button>` : ''}
            ${A.error ? `<span class="err">${esc(A.error)}</span>` : '<span class="spacer"></span>'}
            <button type="button" class="btn ghost" data-a="cancel">Cancel</button>
            <button type="button" class="btn primary" data-a="save" ${A.saving ? 'disabled' : ''}>${A.saving ? '<span class="spinner"></span>' : (f.id ? 'Save changes' : 'Create garage')}</button>`;
    }

    function setField(path, value) {
        const parts = path.split('.');
        let obj = A.form;
        while (parts.length > 1) obj = obj[parts.shift()];
        obj[parts[0]] = value;
    }

    function payload() {
        const f = A.form;
        const n = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
        return {
            id: f.id || undefined,
            label: f.label.trim(),
            type: f.type,
            kind: f.kind,
            storePrice: n(f.storePrice) || 0,
            impoundFee: f.kind === 'impound' ? n(f.impoundFee) : null,
            menu: f.menu,
            spawns: f.spawns,
            jobs: f.jobs,
            gangs: f.gangs,
            blip: {
                enabled: f.blip.enabled,
                label: f.blip.label.trim(),
                sprite: n(f.blip.sprite),
                color: n(f.blip.color),
                scale: n(f.blip.scale),
                shortRange: f.blip.shortRange,
            },
        };
    }

    async function save() {
        const f = A.form;
        if (A.saving) return;
        if (f.label.trim().length < 2) A.error = 'Give the garage a name.';
        else if (!f.menu) A.error = 'Place the garage point.';
        else if (!f.spawns.length) A.error = 'Add at least one spawn bay.';
        else A.error = '';
        if (A.error) return renderEditorFoot();

        A.saving = true;
        renderEditorFoot();
        const res = await nui('admin:save', payload());
        A.saving = false;

        if (!res?.ok) {
            A.error = res?.message || 'Save failed.';
            return renderEditorFoot();
        }
        if (A.fromManager) {
            A.list = res.list || A.list;
            toast(res.message, 'ok');
            openManager();
        }
    }

    async function remove(btn) {
        const f = A.form;
        armed(btn, `${icon('trash')}Delete for good?`, async () => {
            const res = await nui('admin:delete', { id: f.id });
            if (!res?.ok) {
                A.error = res?.message || 'Delete failed.';
                return renderEditorFoot();
            }
            toast(`${res.message}. Vehicles parked there now show up at any ${TYPE_LABEL[f.type].toLowerCase()} garage.`, 'ok');
            A.list = res.list || A.list.filter((g) => g.id !== f.id);
            if (A.fromManager) openManager();
            else close();
        });
    }

    function openManager() {
        A.view = 'manager';
        A.form = null;
        A.error = '';
        pushPoints();
        render();
    }

    function openEditor(g) {
        A.view = 'editor';
        A.form = formFrom(g);
        A.error = '';
        pushPoints();
        render();
        $('a-body').scrollTop = 0;
    }

    function close() {
        $('admin').hidden = true;
        A.view = null;
        A.form = null;
        nui('admin:close');
    }

    function back() {
        if (A.view === 'editor' && A.fromManager) openManager();
        else close();
    }

    // --- events --------------------------------------------------------------

    $('a-close').addEventListener('click', close);
    $('a-back').addEventListener('click', back);

    $('a-foot').addEventListener('click', (e) => {
        const b = e.target.closest('[data-a]');
        if (!b) return;
        const a = b.dataset.a;
        if (a === 'new') nui('admin:new');
        if (a === 'save') save();
        if (a === 'cancel') back();
        if (a === 'delete') remove(b);
    });

    $('a-body').addEventListener('click', (e) => {
        const t = e.target;

        // manager
        const filter = t.closest('[data-filter]');
        if (filter) { A.filter = filter.dataset.filter; return renderManager(); }
        const tp = t.closest('[data-tp]');
        if (tp) {
            const g = A.list.find((x) => x.id === tp.dataset.tp);
            if (g) nui('admin:teleport', g.menu);
            return;
        }
        const row = t.closest('[data-row]');
        if (row && A.view === 'manager') {
            const g = A.list.find((x) => x.id === row.dataset.row);
            if (g && !g.runtime) openEditor(g);
            else if (g) toast('This garage comes from another resource and can\'t be edited here.', 'info');
            return;
        }

        if (A.view !== 'editor') return;
        const f = A.form;

        const segBtn = t.closest('[data-seg] button');
        if (segBtn) {
            const field = segBtn.parentElement.dataset.seg;
            f[field] = segBtn.dataset.v;
            return renderEditor();
        }

        const pick = t.closest('[data-pick]');
        if (pick) {
            const [what, idx] = pick.dataset.pick.split(':');
            const index = idx === undefined ? null : Number(idx);
            const heading = index !== null ? f.spawns[index]?.w : (f.spawns[f.spawns.length - 1]?.w);
            nui('admin:pick', { what, index, type: f.type, heading });
            return;
        }

        const sr = t.closest('[data-sremove]');
        if (sr) {
            f.spawns.splice(Number(sr.dataset.sremove), 1);
            pushPoints();
            return renderEditor();
        }

        const gadd = t.closest('[data-gadd]');
        if (gadd) {
            const kind = gadd.dataset.gadd;
            const name = $(`add-${kind}`).value;
            if (name) f[kind].push({ name, grades: [] });
            return renderEditor();
        }

        const grem = t.closest('[data-gremove]');
        if (grem) {
            const [kind, i] = grem.dataset.gremove.split(':');
            f[kind].splice(Number(i), 1);
            return renderEditor();
        }

        const grade = t.closest('[data-grade]');
        if (grade) {
            const [kind, i, g] = grade.dataset.grade.split(':');
            const entry = f[kind][Number(i)];
            const n = Number(g);
            entry.grades = entry.grades.includes(n) ? entry.grades.filter((x) => x !== n) : [...entry.grades, n].sort((a, b) => a - b);
            return renderEditor();
        }
    });

    $('a-body').addEventListener('input', (e) => {
        const t = e.target;
        if (t.id === 'a-q') {
            A.q = t.value;
            $('a-rows').innerHTML = rowsHtml(managerRows());
            return;
        }
        if (!A.form || !t.dataset.f) return;
        const value = t.type === 'checkbox' ? t.checked : t.value;
        setField(t.dataset.f, value);

        if (t.dataset.f === 'label') {
            $('a-heading').textContent = value || (A.form.id || 'Untitled garage');
            const bl = document.querySelector('[data-f="blip.label"]');
            if (bl) bl.placeholder = value || 'Garage name';
        }
        if (t.dataset.f === 'blip.color') {
            const def = blipDefault(A.form);
            const c = value === '' ? def.color : Number(value);
            $('a-swatch').style.background = BLIP_COLORS[c] || '#888';
        }
        if (t.dataset.f === 'blip.enabled') document.querySelector('.blip-fields')?.classList.toggle('off', !value);
        if (A.error) { A.error = ''; renderEditorFoot(); }
    });

    $('a-body').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.closest('[data-row]')) e.target.closest('[data-row]').click();
    });

    document.addEventListener('keydown', (e) => {
        if ($('admin').hidden || !A.view) return;
        if (e.key === 'Escape') { e.preventDefault(); back(); }
    });

    // --- from Lua ------------------------------------------------------------

    window.STG.on('admin', (action, msg) => {
        if (action === 'manager') {
            A.data = msg.data;
            if (A.data?.accent) paintAccent(A.data.accent);
            A.list = msg.list || [];
            A.fromManager = true;
            openManager();
        } else if (action === 'editor') {
            A.data = msg.data || A.data;
            if (A.data?.accent) paintAccent(A.data.accent);
            openEditor(msg.garage || {});
        } else if (action === 'picked') {
            const f = A.form;
            if (!f) return;
            if (msg.what === 'menu') f.menu = msg.coords;
            else if (msg.index === null || msg.index === undefined) f.spawns.push(msg.coords);
            else f.spawns[msg.index] = msg.coords;
            A.error = '';
            pushPoints();
            renderEditor();
        } else if (action === 'show') {
            $('admin').hidden = false;
        } else if (action === 'hide') {
            $('admin').hidden = true;
        } else if (action === 'close') {
            $('admin').hidden = true;
            A.view = null;
            A.form = null;
            A.fromManager = false;
        }
    });

    void money;
})();
