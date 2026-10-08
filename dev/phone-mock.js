/* ---------------------------------------------------------------------------
   Browser preview for the phone app - loaded by web/phone/phone.js only when
   it runs outside the game. Not listed in fxmanifest `files`.

   Open web/dev/phone.html (frames the app like a phone), or the app directly.
   URL options on the app: ?theme=light  ?empty=1  ?offline=1
--------------------------------------------------------------------------- */
(() => {
    const params = new URLSearchParams(location.search);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    if (params.get('theme') === 'light') globalThis.settings = { display: { theme: 'light' } };

    let delivering = false;
    let cooldown = 0;

    let vehicles = params.get('empty') === '1' ? [] : [
        { id: 1, plate: 'STRM 001', model: 'zentorno', label: 'Zentorno', brand: 'Pegassi', category: 'super', type: 'car', status: 'stored', garage: 'Legion Square', garageLabel: 'Legion Square', fuel: 82, engine: 100, body: 96, canValet: true, canMove: true, fee: 0 },
        { id: 2, plate: '42KRM871', model: 'sultan', label: 'Sultan', brand: 'Karin', category: 'sports', type: 'car', status: 'stored', garage: 'Motel Parking', garageLabel: 'Motel Parking', fuel: 41, engine: 88, body: 63, canValet: true, canMove: true, fee: 0 },
        { id: 3, plate: 'GTR R35', model: 'gbsultanrsx', photo: '/[gameplay]/[jobs]/st_newdealer/html/images/gbsultanrsx.jpg', label: 'Sultan RSX', brand: 'Karin', category: 'sports', type: 'car', status: 'stored', garage: 'motelgarage', garageLabel: null, orphan: true, fuel: 55, engine: 100, body: 100, canValet: true, canMove: true, fee: 0 },
        { id: 4, plate: 'SEA 77', model: 'jetmax', label: 'Jetmax', brand: 'Shitzu', category: 'boats', type: 'boat', status: 'stored', garage: 'La Puerta Pier', garageLabel: 'La Puerta Pier', fuel: 90, engine: 100, body: 100, canValet: false, canMove: true, fee: 0 },
        { id: 5, plate: '61CMT445', model: 'comet2', label: 'Comet', brand: 'Pfister', category: 'sports', type: 'car', status: 'out', garage: 'Legion Square', garageLabel: 'Legion Square', fuel: 23, engine: 71, body: 44, canValet: false, canMove: false, fee: 0 },
        { id: 6, plate: '03ELG990', model: 'elegy', label: 'Elegy Retro Custom', brand: 'Annis', category: 'sports', type: 'car', status: 'lost', garage: 'Pillbox Hill Garage', garageLabel: 'Pillbox Hill Garage', fuel: 12, engine: 40, body: 22, canValet: false, canMove: false, fee: 500 },
        { id: 7, plate: 'POL 2210', model: 'buffalo', label: 'Buffalo', brand: 'Bravado', category: 'sports', type: 'car', status: 'impounded', garage: 'Legion Square', garageLabel: 'Legion Square', fuel: 50, engine: 100, body: 85, canValet: false, canMove: false, fee: 0 },
    ];

    const garages = [
        { id: 'Legion Square', label: 'Legion Square', type: 'car', x: 215, y: -809 },
        { id: 'Motel Parking', label: 'Motel Parking', type: 'car', x: 273, y: -343 },
        { id: 'Pillbox Hill Garage', label: 'Pillbox Hill Garage', type: 'car', x: 213, y: -1007 },
        { id: 'Mirror Park Parking', label: 'Mirror Park Parking', type: 'car', x: 1035, y: -763 },
        { id: 'Del Perro Private', label: 'Del Perro Private', type: 'car', x: -1580, y: -900 },
        { id: 'Sandy Shore Parking', label: 'Sandy Shore Parking', type: 'car', x: 1737, y: 3710 },
        { id: 'Paleto Bay Parking', label: 'Paleto Bay Parking', type: 'car', x: 80, y: 6420 },
        { id: 'La Puerta Pier', label: 'La Puerta Pier', type: 'boat', x: -806, y: -1496 },
        { id: 'Paleto Cove Pier', label: 'Paleto Cove Pier', type: 'boat', x: -1600, y: 5260 },
    ];

    const handlers = {
        'phone:data': async () => {
            await wait(450);
            if (params.get('offline') === '1') return { ok: false, message: 'The garage service is offline.' };
            return {
                ok: true, vehicles, garages, impounds: [],
                fees: { valet: 350, move: 250 },
                valet: { enabled: true, cooldown },
                money: { cash: 4820, bank: 186450 },
                images: 'https://docs.fivem.net/vehicles/%s.webp',
                accent: params.get('accent') || '#8C36DD',
                position: { x: 240, y: -760 },
                delivering,
            };
        },
        'phone:valet': async ({ id }) => {
            await wait(900);
            vehicles = vehicles.map((v) => (v.id === id ? { ...v, status: 'out', canValet: false, canMove: false } : v));
            delivering = true;
            cooldown = 90;
            setTimeout(() => { delivering = false; }, 15000);
            return { ok: true, message: 'Your car is on its way' };
        },
        'phone:move': async ({ id, garage }) => {
            await wait(600);
            const g = garages.find((x) => x.id === garage);
            vehicles = vehicles.map((v) => (v.id === id ? { ...v, garage: g.id, garageLabel: g.label, orphan: false } : v));
            return { ok: true, message: `Moved to ${g.label} for $250` };
        },
        'phone:locate': async ({ status }) => ({ ok: true, message: status === 'lost' ? 'GPS set to Hayes Autos' : status === 'out' ? 'GPS set to your vehicle' : 'GPS set to the garage' }),
    };

    window.__mockNui = async (event, data) => {
        (window.parent.__devLog || console.log)('[nui]', event, data);
        const h = handlers[event];
        return h ? h(data || {}) : null;
    };
})();
