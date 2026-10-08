/* ---------------------------------------------------------------------------
   Browser preview harness - only loaded when web/index.html is opened outside
   the game, and not listed in fxmanifest `files`, so players never get it.

   URL options:
     ?view=garage     public garage menu (default)
     ?view=impound    impound lot
     ?view=empty      a garage with no vehicles
     ?view=manager    /garages
     ?view=editor     /sng creator
     ?accent=%23FF6A3D
--------------------------------------------------------------------------- */
(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view') || 'garage';
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    document.body.style.background = 'linear-gradient(160deg, #3a4a5c 0%, #1f2a36 45%, #2c2219 100%)';

    const garage = { id: 'Legion Square', label: 'Legion Square', type: 'car', kind: 'public', storePrice: 0 };
    const impound = { id: 'Hayes Autos', label: 'Hayes Autos', type: 'car', kind: 'impound', storePrice: 0 };

    let vehicles = [
        { id: 1, plate: 'STRM 001', model: 'zentorno', label: 'Zentorno', brand: 'Pegassi', category: 'super', type: 'car', status: 'here', fee: 0, garage: 'Legion Square', garageLabel: 'Legion Square', fuel: 82, engine: 100, body: 96 },
        { id: 2, plate: '42KRM871', model: 'sultan', label: 'Sultan', brand: 'Karin', category: 'sports', type: 'car', status: 'here', fee: 0, garage: 'Legion Square', garageLabel: 'Legion Square', fuel: 41, engine: 88, body: 63 },
        { id: 3, plate: 'CDNC RP', model: 'kuruma', label: 'Kuruma', brand: 'Karin', category: 'sports', type: 'car', status: 'here', fee: 0, garage: 'Legion Square', garageLabel: 'Legion Square', fuel: 100, engine: 100, body: 100 },
        { id: 4, plate: '8BAT112', model: 'bati', label: 'Bati 801', brand: 'Pegassi', category: 'motorcycles', type: 'car', status: 'elsewhere', fee: 250, garage: 'Mirror Park Parking', garageLabel: 'Mirror Park Parking', fuel: 67, engine: 92, body: 90 },
        { id: 5, plate: 'GTR R35', model: 'gbsultanrsx', photo: '/[gameplay]/[jobs]/st_newdealer/html/images/gbsultanrsx.jpg', label: 'Sultan RSX', brand: 'Karin', category: 'sports', type: 'car', status: 'elsewhere', fee: 250, garage: 'Del Perro Private', garageLabel: 'Del Perro Private', fuel: 55, engine: 100, body: 100 },
        { id: 6, plate: '61CMT445', model: 'comet2', label: 'Comet', brand: 'Pfister', category: 'sports', type: 'car', status: 'out', fee: 0, garage: 'Legion Square', garageLabel: 'Legion Square', fuel: 23, engine: 71, body: 44 },
        { id: 7, plate: '03ELG990', model: 'elegy', label: 'Elegy Retro Custom', brand: 'Annis', category: 'sports', type: 'car', status: 'lost', fee: 0, garage: 'Pillbox Hill Garage', garageLabel: 'Pillbox Hill Garage', fuel: 12, engine: 40, body: 22 },
        { id: 8, plate: 'POL 2210', model: 'buffalo', label: 'Buffalo', brand: 'Bravado', category: 'sports', type: 'car', status: 'impounded', fee: 0, garage: 'Legion Square', garageLabel: 'Legion Square', fuel: 50, engine: 100, body: 85 },
    ];

    const impoundVehicles = [
        { ...vehicles[6], status: 'retrieve', fee: 500 },
        { ...vehicles[5], status: 'recover', fee: 500 },
        { ...vehicles[7], status: 'impounded', fee: 0 },
    ];

    const options = {
        give: true, giveFee: 0, allowPrice: true, maxPrice: 10000000, radius: 10, timeout: 12,
        images: 'https://docs.fivem.net/vehicles/%s.webp',
        accent: params.get('accent') || '#8C36DD',
    };

    const jobs = [
        { name: 'ambulance', label: 'EMS', grades: [{ grade: 0, label: 'Recruit' }, { grade: 1, label: 'Paramedic' }, { grade: 2, label: 'Doctor' }, { grade: 3, label: 'Surgeon' }, { grade: 4, label: 'Chief' }] },
        { name: 'mechanic', label: 'Mechanic', grades: [{ grade: 0, label: 'Recruit' }, { grade: 1, label: 'Novice' }, { grade: 2, label: 'Experienced' }, { grade: 3, label: 'Advanced' }, { grade: 4, label: 'Manager' }] },
        { name: 'police', label: 'LSPD', grades: [{ grade: 0, label: 'Recruit' }, { grade: 1, label: 'Officer' }, { grade: 2, label: 'Sergeant' }, { grade: 3, label: 'Lieutenant' }, { grade: 4, label: 'Chief' }] },
    ];
    const gangs = [{ name: 'ballas', label: 'Ballas', grades: [{ grade: 0, label: 'Recruit' }, { grade: 1, label: 'Enforcer' }, { grade: 2, label: 'Shot Caller' }, { grade: 3, label: 'Boss' }] }];
    const adminData = {
        jobs, gangs, defaultImpoundFee: 500, accent: options.accent,
        blips: { car: { public: { sprite: 357, color: 3 }, impound: { sprite: 68, color: 47 } }, boat: { public: { sprite: 410, color: 3 }, impound: { sprite: 410, color: 47 } }, air: { public: { sprite: 423, color: 3 }, impound: { sprite: 423, color: 47 } }, scale: 0.7 },
    };

    const sp = (x, y, z, w) => ({ x, y, z, w });
    let list = [
        { id: 'Hayes Autos', label: 'Hayes Autos', type: 'car', kind: 'impound', menu: { x: 483.75, y: -1312.29, z: 29.21 }, spawns: [sp(493.28, -1329.28, 29.03, 328.8)], jobs: [], gangs: [], stored: 0, storePrice: 0 },
        { id: 'Legion Square', label: 'Legion Square', type: 'car', kind: 'public', menu: { x: 215.45, y: -809.8, z: 30.73 }, spawns: [sp(232.93, -790.09, 29.45, 158.7), sp(206.64, -798.39, 30.57, 248.8)], jobs: [], gangs: [], stored: 14, storePrice: 0 },
        { id: 'La Puerta Pier', label: 'La Puerta Pier', type: 'boat', kind: 'public', menu: { x: -806.2, y: -1496.7, z: 1.6 }, spawns: [sp(-811.5, -1508.1, 0.1, 110)], jobs: [], gangs: [], stored: 2, storePrice: 0 },
        { id: 'Airport Hangar', label: 'Airport Hangar', type: 'air', kind: 'public', menu: { x: -1243.4, y: -3391.9, z: 13.9 }, spawns: [sp(-1273.8, -3380.4, 13.9, 330)], jobs: [], gangs: [], stored: 1, storePrice: 0 },
        { id: 'Vinewood West', label: 'Vinewood West', type: 'car', kind: 'public', menu: { x: -338.77, y: 267.43, z: 85.71 }, spawns: [sp(-334.44, 283.41, 84.78, 178.6)], jobs: [{ name: 'police', grades: [1, 2] }, { name: 'ambulance', grades: [] }], gangs: [], stored: 3, storePrice: 0 },
        { id: 'property_vinewood_hills_12', label: 'Vinewood Hills 12', type: 'car', kind: 'public', menu: { x: -100, y: 820, z: 235 }, spawns: [sp(-105, 830, 235, 10)], jobs: [], gangs: [], stored: 1, storePrice: 0, runtime: true },
    ];

    const handlers = {
        'garage:close': () => true,
        'garage:takeOut': async ({ id }) => {
            await wait(700);
            const v = vehicles.find((x) => x.id === id);
            if (v && v.fuel < 30) return { ok: false, message: 'Every parking bay is blocked' };
            return { ok: true };
        },
        'garage:moveHere': async ({ id }) => {
            await wait(500);
            vehicles = vehicles.map((v) => (v.id === id ? { ...v, status: 'here', fee: 0, garage: garage.id, garageLabel: garage.label } : v));
            return { ok: true, message: `Moved to ${garage.label} for $250`, vehicles };
        },
        'garage:locate': async ({ status }) => (status === 'lost'
            ? { ok: true, message: 'GPS set to Hayes Autos' }
            : { ok: true, message: status === 'stored' ? 'GPS set to Mirror Park Parking' : 'GPS set to your vehicle' }),
        'garage:nearby': async () => {
            await wait(350);
            return [{ id: 27, distance: 2, name: 'Jamie Cortez' }, { id: 44, distance: 6, name: 'Deacon Hale' }];
        },
        'garage:give': async ({ id, target, price }) => {
            await wait(2500);
            if (target === 44) return { ok: false, message: 'They turned it down' };
            vehicles = vehicles.filter((v) => v.id !== id);
            return { ok: true, message: price ? `Sold to Jamie Cortez for $${price.toLocaleString()}` : 'Given to Jamie Cortez', vehicles };
        },
        'admin:close': () => true,
        'admin:points': () => true,
        'admin:new': () => {
            setTimeout(() => window.postMessage({ action: 'admin:editor', data: adminData, garage: { menu: { x: 1180.4, y: -330.2, z: 69.2 }, spawns: [], type: 'car', kind: 'public' } }), 300);
            return true;
        },
        'admin:pick': ({ what, index }) => {
            window.postMessage({ action: 'admin:hide' });
            setTimeout(() => {
                const c = what === 'spawn' ? sp(1185 + Math.random() * 8, -335 + Math.random() * 8, 69.1, Math.round(Math.random() * 360)) : { x: 1180.4, y: -330.2, z: 69.2 };
                window.postMessage({ action: 'admin:picked', what, index, coords: c });
                window.postMessage({ action: 'admin:show' });
            }, 600);
            return true;
        },
        'admin:save': async (form) => {
            await wait(500);
            if (!form.id) list = [...list, { ...form, id: form.label, stored: 0 }];
            else list = list.map((g) => (g.id === form.id ? { ...g, ...form } : g));
            return { ok: true, message: `${form.label} ${form.id ? 'saved' : 'created'}`, list };
        },
        'admin:delete': async ({ id }) => {
            await wait(400);
            const g = list.find((x) => x.id === id);
            list = list.filter((x) => x.id !== id);
            return { ok: true, message: `${g.label} deleted`, list };
        },
        'admin:teleport': () => true,
    };

    window.__mockNui = async (event, data) => {
        console.log('[nui]', event, data);
        const h = handlers[event];
        return h ? h(data || {}) : null;
    };

    const open = {
        garage: () => ({ action: 'garage:open', data: { ok: true, garage, vehicles, money: { bank: 186450, cash: 4820 }, options } }),
        impound: () => ({ action: 'garage:open', data: { ok: true, garage: impound, vehicles: impoundVehicles, money: { bank: 186450, cash: 4820 }, options } }),
        empty: () => ({ action: 'garage:open', data: { ok: true, garage: { ...garage, type: 'boat', label: 'La Puerta Pier' }, vehicles: [], money: { bank: 5000, cash: 250 }, options } }),
        manager: () => ({ action: 'admin:manager', data: adminData, list }),
        editor: () => ({ action: 'admin:editor', data: adminData, garage: { menu: { x: 1180.4, y: -330.2, z: 69.2 }, spawns: [sp(1186.2, -331.8, 69.1, 270)], type: 'car', kind: 'public' } }),
    };

    window.addEventListener('load', () => {
        const msg = (open[view] || open.garage)();
        window.postMessage(msg);
        if (view === 'manager' || view === 'editor') window.postMessage({ action: 'admin:show' });
    });
})();
