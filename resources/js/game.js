import * as THREE from 'three';
import { createTouchControls } from './touch-controls.js';

// ───────────── Datos de la sala ─────────────
const root = document.getElementById('game');
const code = root.dataset.code;
const meId = Number(root.dataset.me);
const players = JSON.parse(root.dataset.players).sort((a, b) => a.user_id - b.user_id);

// ───────────── Constantes ─────────────
const ARENA_R = 40;
const CAR_R = 1.6;
const SEND_EVERY = 1 / 15; // 15 envíos por segundo
const MAX_SPEED = 20, ACCEL = 22, BRAKE = 35, FRICTION = 8, TURN = 2.4;
const EMOJI = { cow: '🐮', chicken: '🐔', pig: '🐷', scarecrow: '🎃' };

// ───────────── Dispositivo y calidad gráfica ─────────────
// Pantalla táctil como entrada principal (teléfono o tableta): activa los controles táctiles
// y empieza con una calidad menor. Si aun así no llega a ~38 FPS, baja de nivel sola.
const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;
const TIERS = [
    { pixelRatio: Math.min(devicePixelRatio, 2),   shadow: 2048, stalks: 7000 }, // 0: escritorio
    { pixelRatio: Math.min(devicePixelRatio, 1.5), shadow: 1024, stalks: 2800 }, // 1: móvil
    { pixelRatio: 1,                               shadow: 1024, stalks: 2800 }, // 2
    { pixelRatio: 0.8,                             shadow: 512,  stalks: 2800 }, // 3: mínimo
];
let tier = IS_TOUCH ? 1 : 0;
const QUALITY = TIERS[tier];

const vibrate = (ms) => { if (IS_TOUCH && navigator.vibrate) navigator.vibrate(ms); };

// ───────────── Escena ─────────────
const scene = new THREE.Scene();
// (cielo y niebla los define buildArena)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(QUALITY.pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = IS_TOUCH ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x887744, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(30, 50, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(QUALITY.shadow, QUALITY.shadow);
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.05;
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, far: 150 });
scene.add(sun);

addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

// ───────────── Helpers ─────────────
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angleDiff = (to, from) => ((to - from + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const $ = (id) => document.getElementById(id);
const now = () => performance.now() / 1000;

// ───────────── Sonido (sintetizado, sin archivos) ─────────────
let ac = null, master = null, engine = null, muted = false;
function initAudio() {
    if (ac) {
        if (ac.state === 'suspended') ac.resume();
        return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ac.destination);

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 50;
    gain.gain.value = 0.02;
    osc.connect(gain).connect(master);
    osc.start();
    engine = { osc, gain };
}
addEventListener('keydown', initAudio);
addEventListener('pointerdown', initAudio);
addEventListener('pointerup', initAudio);
addEventListener('touchend', initAudio, { passive: true });
addEventListener('keydown', (e) => {
    if (e.code !== 'KeyM') return;
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 1;
});

function tone(freq, dur, { type = 'square', vol = 0.12, to = null, delay = 0 } = {}) {
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
}

const SFX = {
    pick: () => { tone(520, 0.1, { type: 'triangle' }); tone(780, 0.15, { type: 'triangle', delay: 0.09 }); },
    throw: () => tone(500, 0.18, { type: 'sawtooth', to: 120, vol: 0.1 }),
    hit: () => tone(160, 0.25, { type: 'sawtooth', to: 40, vol: 0.22 }),
    bump: () => tone(120, 0.14, { type: 'square', to: 55, vol: 0.12 }),
    mud: () => tone(220, 0.5, { type: 'sawtooth', to: 60, vol: 0.15 }),
    shield: () => tone(300, 0.4, { type: 'sine', to: 900, vol: 0.15 }),
    potion: () => [440, 554, 659, 880].forEach((f, i) => tone(f, 0.12, { type: 'triangle', delay: i * 0.07 })),
    beep: () => tone(440, 0.15, { vol: 0.15 }),
    go: () => tone(880, 0.4, { vol: 0.18 }),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, { type: 'triangle', delay: i * 0.12 })),
    lose: () => [400, 330, 260, 200].forEach((f, i) => tone(f, 0.25, { type: 'sawtooth', vol: 0.1, delay: i * 0.15 })),
};
const sfx = (n) => SFX[n]?.();

function updateEngine() {
    if (!engine) return;
    const s = me.dead || phase !== 'live' ? 0 : Math.abs(me.speed);
    engine.osc.frequency.setTargetAtTime(50 + s * 5, ac.currentTime, 0.08);
    engine.gain.gain.setTargetAtTime(me.dead ? 0 : 0.02 + s * 0.0008, ac.currentTime, 0.1);
}

function part(group, geo, color, x, y, z, rot) {
    const m = new THREE.Mesh(geo, mat(color));
    m.position.set(x, y, z);
    if (rot) m.rotation.set(...rot);
    m.castShadow = true;
    group.add(m);
    return m;
}

// ═══════════ MODELADO: vehículos, arena y efectos (ver comentarios por sección) ═══════════
// ═════════════════════════════════════════════════════════════════════════════
//  MATERIALES Y GEOMETRÍAS COMPARTIDAS
// ═════════════════════════════════════════════════════════════════════════════
const matCache = new Map();
const mat = (color, { rough = 0.85, metal = 0, flat = false } = {}) => {
    const key = `${color}|${rough}|${metal}|${flat}`;
    if (!matCache.has(key)) {
        matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: flat }));
    }
    return matCache.get(key);
};
const paint = (color) => mat(color, { rough: 0.38, metal: 0.18 }); // pintura con brillo
const metalMat = (color = 0xcfd8dc) => mat(color, { rough: 0.32, metal: 0.4 }); // sin mapa de entorno un metal puro se ve negro
const glowMat = (color) => {
    const key = `glow|${color}`;
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.3 }));
    return matCache.get(key);
};
const GLASS = new THREE.MeshStandardMaterial({ color: 0xa8dcff, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.45 });
const AMBER = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.7 });

const G = {
    sphere: new THREE.SphereGeometry(1, 28, 20),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 24),
    cone: new THREE.ConeGeometry(1, 1, 20),
};

/** Caja con esquinas redondeadas (ancho X, alto Y, largo Z). */
function rbox(w, h, d, r = 0.12) {
    const bevel = Math.min(r * 0.7, w / 4, h / 4, d / 4);
    const iw = w - bevel * 2;
    const ih = h - bevel * 2;
    const id = d - bevel * 2;
    const cr = Math.max(0.001, Math.min(r - bevel, iw / 2, ih / 2));
    const x = -iw / 2;
    const y = -ih / 2;
    const s = new THREE.Shape();
    s.moveTo(x + cr, y);
    s.lineTo(x + iw - cr, y);
    s.quadraticCurveTo(x + iw, y, x + iw, y + cr);
    s.lineTo(x + iw, y + ih - cr);
    s.quadraticCurveTo(x + iw, y + ih, x + iw - cr, y + ih);
    s.lineTo(x + cr, y + ih);
    s.quadraticCurveTo(x, y + ih, x, y + ih - cr);
    s.lineTo(x, y + cr);
    s.quadraticCurveTo(x, y, x + cr, y);
    const g = new THREE.ExtrudeGeometry(s, {
        depth: id, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6,
    });
    g.translate(0, 0, -id / 2);
    return g;
}

function add(parent, geo, material, pos = [0, 0, 0], scale = [1, 1, 1], rot = null) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(pos[0], pos[1], pos[2]);
    m.scale.set(scale[0], scale[1], scale[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = true;
    parent.add(m);
    return m;
}
const blob = (p, material, s, pos, rot) => add(p, G.sphere, material, pos, s, rot); // elipsoide
const tube = (p, material, r, len, pos, rot) => add(p, G.cyl, material, pos, [r, len, r], rot); // cilindro (eje Y)
const cone = (p, material, r, len, pos, rot) => add(p, G.cone, material, pos, [r, len, r], rot); // cono (punta +Y)
const box = (p, material, w, h, d, r, pos, rot) => add(p, rbox(w, h, d, r), material, pos, [1, 1, 1], rot);
const ring = (p, material, R, t, pos, rot, arc = Math.PI * 2) => add(p, new THREE.TorusGeometry(R, t, 10, 28, arc), material, pos, [1, 1, 1], rot);

/** Cilindro entre dos puntos (brazos, patas, soportes). */
function limb(p, material, a, b, r = 0.1) {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const m = new THREE.Mesh(G.cyl, material);
    m.scale.set(r, va.distanceTo(vb), r);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    m.castShadow = true;
    p.add(m);
    return m;
}

const WHITE = mat(0xfdfdfa, { rough: 0.5 });
const BLACK = mat(0x181818, { rough: 0.4 });

/** Ojo con blanco, pupila y brillo. (x, y, z) = centro; s = tamaño. */
function eye(p, x, y, z, s = 0.12) {
    blob(p, WHITE, [s, s, s * 0.8], [x, y, z]);
    blob(p, BLACK, [s * 0.58, s * 0.58, s * 0.5], [x * 1.02, y, z + s * 0.5]);
    blob(p, mat(0xffffff, { rough: 0.1 }), [s * 0.2, s * 0.2, s * 0.15], [x + s * 0.18, y + s * 0.2, z + s * 0.85]);
}

// ═════════════════════════════════════════════════════════════════════════════
//  VEHÍCULOS
// ═════════════════════════════════════════════════════════════════════════════


/** Fusiona en una sola malla todas las piezas hijas directas que comparten material (menos draw calls). */
function mergeByMaterial(group) {
    const buckets = new Map();
    for (const child of [...group.children]) {
        if (!child.isMesh) continue;
        child.updateMatrix();
        const g = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
        g.applyMatrix4(child.matrix);
        if (!buckets.has(child.material)) buckets.set(child.material, []);
        buckets.get(child.material).push(g);
        group.remove(child);
    }
    for (const [material, geos] of buckets) {
        let n = 0;
        for (const g of geos) n += g.attributes.position.count;
        const pos = new Float32Array(n * 3);
        const nor = new Float32Array(n * 3);
        const uv = new Float32Array(n * 2);
        let o = 0;
        for (const g of geos) {
            pos.set(g.attributes.position.array, o * 3);
            nor.set(g.attributes.normal.array, o * 3);
            if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
            o += g.attributes.position.count;
            g.dispose();
        }
        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        const mesh = new THREE.Mesh(merged, material);
        mesh.castShadow = true;
        group.add(mesh);
    }
}

/** Rueda con llanta, rin y rayos (los rayos hacen visible el giro). */
function addWheel(g, x, z, rimColor = 0xcfd8dc) {
    const r = 0.58;
    const w = 0.5;
    const wg = new THREE.Group();
    wg.position.set(x, r, z);
    const spin = new THREE.Group();
    const side = Math.sign(x) || 1;
    add(spin, G.cyl, mat(0x1b1b1b, { rough: 0.95 }), [0, 0, 0], [r, w, r], [0, 0, Math.PI / 2]);
    add(spin, G.cyl, mat(0x2a2a2a, { rough: 0.9 }), [side * 0.0, 0, 0], [r * 0.93, w * 1.02, r * 0.93], [0, 0, Math.PI / 2]);
    add(spin, G.cyl, metalMat(rimColor), [side * (w / 2 - 0.02), 0, 0], [r * 0.62, 0.08, r * 0.62], [0, 0, Math.PI / 2]);
    add(spin, G.cyl, metalMat(0x90a4ae), [side * (w / 2 + 0.01), 0, 0], [r * 0.2, 0.1, r * 0.2], [0, 0, Math.PI / 2]);
    for (let i = 0; i < 3; i++) {
        add(spin, new THREE.BoxGeometry(0.06, r * 1.0, 0.1), mat(0x37474f, { rough: 0.5, metal: 0.6 }), [side * (w / 2 + 0.02), 0, 0], [1, 1, 1], [(i * Math.PI) / 3, 0, 0]);
    }
    mergeByMaterial(spin);
    wg.add(spin);
    g.add(wg);
    g.userData.wheels.push(spin);
}

function baseVehicle(archColor, rim) {
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    g.userData = { body, wheels: [], top: 3.2 };
    for (const [x, z] of [[-1.18, 1.12], [1.18, 1.12], [-1.18, -1.1], [1.18, -1.1]]) {
        addWheel(g, x, z, rim);
        ring(body, paint(archColor), 0.72, 0.075, [x * 0.97, 0.58, z], [0, Math.PI / 2, 0], Math.PI); // guardabarros
    }
    box(body, mat(0x263238), 2.0, 0.32, 3.3, 0.12, [0, 0.64, 0]); // chasis oscuro
    return g;
}

/** 🐮 Vaca al volante de una camioneta lechera. */
function buildCow() {
    const g = baseVehicle(0xd32f2f, 0xeceff1);
    const b = g.userData.body;
    g.userData.top = 3.25;
    const W = paint(0xf7f7f1);
    const K = paint(0x1c1c1c);
    const R = paint(0xd32f2f);
    const P = mat(0xf4a6b6, { rough: 0.6 });
    const CREAM = mat(0xefe3c0, { rough: 0.5 });

    // carrocería
    box(b, W, 2.1, 0.55, 3.5, 0.22, [0, 0.98, 0]);
    box(b, R, 2.16, 0.1, 3.3, 0.04, [0, 1.12, 0]); // franja roja
    box(b, W, 1.9, 0.3, 1.3, 0.14, [0, 1.4, 1.05]); // capó
    box(b, mat(0x20262b), 1.3, 0.36, 0.1, 0.04, [0, 1.02, 1.76]); // parrilla
    for (let i = -1; i <= 1; i++) box(b, metalMat(), 1.1, 0.045, 0.06, 0.02, [0, 1.02 + i * 0.1, 1.8]);
    for (const s of [-1, 1]) {
        blob(b, glowMat(0xfff59d), [0.2, 0.2, 0.14], [s * 0.78, 1.1, 1.72]);
        ring(b, metalMat(), 0.2, 0.035, [s * 0.78, 1.1, 1.78]);
        box(b, glowMat(0xff5252), 0.22, 0.18, 0.08, 0.03, [s * 0.82, 1.3, -1.82]); // calaveras
        box(b, W, 0.12, 0.5, 1.4, 0.05, [s * 1.02, 1.5, -0.3]); // puertas
    }
    box(b, metalMat(), 2.25, 0.2, 0.22, 0.09, [0, 0.72, 1.8]); // defensa
    box(b, metalMat(), 2.2, 0.18, 0.2, 0.08, [0, 0.74, -1.8]);

    // asiento, tablero y volante
    box(b, R, 1.25, 0.16, 0.85, 0.07, [0, 1.32, -0.5]);
    box(b, R, 1.25, 0.75, 0.16, 0.07, [0, 1.7, -0.98]);
    box(b, mat(0x2b2f33), 1.8, 0.28, 0.35, 0.1, [0, 1.56, 0.62]);
    ring(b, mat(0x222222), 0.27, 0.045, [0, 1.8, 0.38], [-0.9, 0, 0]);

    // caja con bidones de leche
    box(b, mat(0x8d6a45), 2.0, 0.12, 1.2, 0.05, [0, 1.12, -1.15]);
    for (const s of [-1, 1]) box(b, W, 0.1, 0.5, 1.25, 0.04, [s * 0.97, 1.42, -1.15]);
    box(b, W, 2.0, 0.5, 0.1, 0.04, [0, 1.42, -1.77]);
    for (const s of [-1, 1]) {
        tube(b, metalMat(0xb0bec5), 0.27, 0.65, [s * 0.45, 1.5, -1.25]);
        tube(b, metalMat(0xb0bec5), 0.16, 0.18, [s * 0.45, 1.88, -1.25]);
        blob(b, metalMat(0x90a4ae), [0.2, 0.1, 0.2], [s * 0.45, 1.98, -1.25]);
    }

    // manchas de vaca
    blob(b, K, [0.4, 0.04, 0.34], [0.45, 1.54, 1.1]);
    blob(b, K, [0.3, 0.04, 0.3], [-0.5, 1.54, 0.85]);
    blob(b, K, [0.04, 0.26, 0.4], [1.07, 1.0, 0.7]);
    blob(b, K, [0.04, 0.2, 0.5], [-1.07, 1.0, -0.6]);
    blob(b, K, [0.35, 0.22, 0.04], [0.5, 1.45, -1.83]);

    // conductora
    blob(b, W, [0.72, 0.65, 0.8], [0, 1.95, -0.55]);
    blob(b, K, [0.34, 0.1, 0.4], [-0.2, 2.53, -0.62]);
    blob(b, K, [0.2, 0.1, 0.25], [0.35, 2.4, -0.5]);
    blob(b, W, [0.42, 0.5, 0.42], [0, 2.35, -0.05]);
    const head = new THREE.Group();
    head.position.set(0, 2.62, 0.3);
    b.add(head);
    g.userData.head = head;
    blob(head, W, [0.52, 0.5, 0.58], [0, 0, 0]);
    blob(head, P, [0.4, 0.3, 0.34], [0, -0.14, 0.48]); // hocico
    for (const s of [-1, 1]) {
        blob(head, K, [0.06, 0.07, 0.05], [s * 0.14, -0.12, 0.78]); // fosas nasales
        eye(head, s * 0.3, 0.1, 0.36, 0.115);
        blob(head, W, [0.34, 0.1, 0.2], [s * 0.62, 0.2, -0.15], [0, 0, s * 0.35]); // orejas
        blob(head, P, [0.2, 0.06, 0.12], [s * 0.62, 0.21, -0.1], [0, 0, s * 0.35]);
        cone(head, CREAM, 0.11, 0.46, [s * 0.32, 0.54, -0.1], [0, 0, -s * 0.55]); // cuernos
    }
    blob(head, K, [0.2, 0.2, 0.12], [-0.32, 0.12, 0.4]); // mancha del ojo
    blob(head, K, [0.22, 0.12, 0.18], [0, 0.5, -0.06]); // mechón
    ring(b, R, 0.4, 0.06, [0, 2.2, -0.12], [Math.PI / 2.2, 0, 0]); // collar
    blob(b, mat(0xffc107, { rough: 0.3, metal: 0.7 }), [0.1, 0.1, 0.1], [0, 2.02, 0.28]); // cencerro
    for (const s of [-1, 1]) {
        limb(b, W, [s * 0.55, 2.0, -0.2], [s * 0.2, 1.8, 0.4], 0.13);
        blob(b, K, [0.14, 0.12, 0.14], [s * 0.2, 1.78, 0.42]);
    }
    return g;
}

/** 🐷 Cerdo al volante de un hot rod rosa. */
function buildPig() {
    const g = baseVehicle(0xe9789b, 0xfff3e0);
    const b = g.userData.body;
    g.userData.top = 3.05;
    const P = paint(0xf6a9c1);
    const P2 = paint(0xe9789b);
    const CRM = paint(0xfff1d6);
    const SK = mat(0xf8b4c8, { rough: 0.6 });
    const SK2 = mat(0xf08aae, { rough: 0.6 });
    const DARK = mat(0x2b2f33);

    box(b, P, 2.0, 0.5, 3.4, 0.24, [0, 0.98, 0]);
    blob(b, P, [0.95, 0.42, 0.8], [0, 1.0, -1.25]); // cola redondeada
    for (const s of [-1, 1]) {
        box(b, CRM, 0.2, 0.04, 3.2, 0.02, [s * 0.3, 1.26, 0]); // franjas
        tube(b, metalMat(), 0.09, 1.3, [s * 1.07, 0.85, -0.4], [Math.PI / 2, 0, 0]); // escapes
        blob(b, glowMat(0xff5252), [0.14, 0.14, 0.08], [s * 0.6, 1.05, -1.78]);
        blob(b, glowMat(0xfff59d), [0.2, 0.2, 0.14], [s * 0.72, 1.05, 1.68]);
        ring(b, metalMat(), 0.21, 0.04, [s * 0.72, 1.05, 1.75]);
    }
    box(b, P2, 0.7, 0.18, 0.7, 0.07, [0, 1.36, 1.0]); // toma de aire
    box(b, DARK, 0.5, 0.05, 0.42, 0.02, [0, 1.46, 1.0]);
    blob(b, metalMat(), [0.5, 0.34, 0.1], [0, 1.0, 1.72]); // parrilla ovalada

    // asiento, tablero, volante, barra antivuelco
    box(b, CRM, 1.1, 0.14, 0.8, 0.06, [0, 1.3, -0.4]);
    box(b, CRM, 1.1, 0.5, 0.14, 0.06, [0, 1.58, -0.86]);
    box(b, P2, 1.6, 0.2, 0.3, 0.08, [0, 1.38, 0.55]);
    box(b, GLASS, 1.3, 0.3, 0.05, 0.02, [0, 1.6, 0.62], [-0.5, 0, 0]);
    ring(b, CRM, 0.25, 0.04, [0, 1.74, 0.36], [-0.9, 0, 0]);
    ring(b, metalMat(), 0.85, 0.07, [0, 1.25, -1.0], [0, 0, 0], Math.PI);

    // barro
    const mud = mat(0x6d4c41, { rough: 1 });
    blob(b, mud, [0.03, 0.14, 0.2], [1.01, 0.95, 0.9]);
    blob(b, mud, [0.03, 0.1, 0.16], [-1.01, 0.9, -0.2]);
    blob(b, mud, [0.2, 0.03, 0.14], [0.4, 1.27, 1.3]);

    // cerdo
    blob(b, SK, [0.7, 0.6, 0.72], [0, 1.85, -0.4]);
    const head = new THREE.Group();
    head.position.set(0, 2.35, 0.22);
    b.add(head);
    g.userData.head = head;
    blob(head, SK, [0.6, 0.55, 0.58], [0, 0, 0]);
    tube(head, SK2, 0.3, 0.3, [0, -0.1, 0.56], [Math.PI / 2, 0, 0]); // hocico
    tube(head, mat(0xe56c93), 0.25, 0.05, [0, -0.1, 0.72], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) {
        blob(head, mat(0x8e2a52), [0.055, 0.085, 0.04], [s * 0.1, -0.1, 0.75]);
        eye(head, s * 0.27, 0.1, 0.4, 0.1);
        tube(head, AMBER, 0.17, 0.06, [s * 0.27, 0.1, 0.5], [Math.PI / 2, 0, 0]); // goggles
        ring(head, mat(0x4e342e), 0.18, 0.035, [s * 0.27, 0.1, 0.52]);
        blob(head, SK2, [0.3, 0.08, 0.27], [s * 0.5, 0.42, -0.02], [0.15, 0, -s * 0.75]); // orejas caídas
        blob(head, mat(0xe56c93, { rough: 0.6 }), [0.18, 0.05, 0.16], [s * 0.5, 0.44, 0.0], [0.15, 0, -s * 0.75]);
    }
    ring(head, mat(0x4e342e), 0.58, 0.04, [0, 0.12, -0.02], [Math.PI / 2, 0, 0]); // correa
    ring(b, SK2, 0.16, 0.045, [0, 1.25, -2.06], [0, 0, 0.4], Math.PI * 1.5); // colita rizada
    ring(b, SK2, 0.1, 0.04, [0, 1.25, -2.1], [0, 0, 1.3], Math.PI * 1.6);
    for (const s of [-1, 1]) {
        limb(b, SK, [s * 0.5, 1.95, -0.15], [s * 0.18, 1.74, 0.38], 0.12);
        blob(b, DARK, [0.13, 0.11, 0.13], [s * 0.18, 1.73, 0.4]);
    }
    return g;
}

/** 🐔 Gallina al volante de un buggy de carreras. */
function buildChicken() {
    const g = baseVehicle(0xf2a900, 0xffffff);
    const b = g.userData.body;
    g.userData.top = 3.3;
    const Y = paint(0xffd93b);
    const R = paint(0xe53935);
    const OR = mat(0xff9800, { rough: 0.5 });
    const WH = mat(0xfdfdfb, { rough: 0.7 });

    blob(b, Y, [1.0, 0.5, 1.75], [0, 1.0, 0]);
    blob(b, Y, [0.8, 0.35, 0.7], [0, 0.92, 1.35]);
    blob(b, mat(0x2b2f33), [0.6, 0.2, 0.6], [0, 1.42, -0.2]); // cabina
    blob(b, R, [0.55, 0.18, 0.55], [0, 1.38, -0.25]); // asiento
    tube(b, WH, 0.32, 0.04, [0, 1.46, 1.0]); // placa con número
    box(b, R, 0.1, 0.04, 0.3, 0.02, [0, 1.49, 1.0]);

    // franja de cuadros a los lados
    for (let i = 0, z = -1.2; z <= 1.21; z += 0.3, i++) {
        const x = Math.sqrt(Math.max(0.01, 1 - (z / 1.75) ** 2 - 0.01)) * 1.0 + 0.01;
        for (const s of [-1, 1]) box(b, i % 2 ? BLACK : WH, 0.05, 0.13, 0.3, 0.01, [s * x, 1.04, z]);
    }
    for (const s of [-1, 1]) {
        blob(b, glowMat(0xfff59d), [0.16, 0.16, 0.1], [s * 0.55, 1.0, 1.9]);
        blob(b, glowMat(0xff5252), [0.13, 0.13, 0.08], [s * 0.6, 1.05, -1.72]);
        tube(b, metalMat(), 0.1, 0.4, [s * 0.45, 0.85, -1.85], [Math.PI / 2, 0, 0]);
        limb(b, metalMat(), [s * 0.55, 1.3, -1.4], [s * 0.55, 1.85, -1.55], 0.05); // soportes del alerón
        box(b, R, 0.06, 0.4, 0.6, 0.02, [s * 1.15, 1.85, -1.6]);
    }
    box(b, R, 2.3, 0.08, 0.55, 0.04, [0, 1.88, -1.6], [0.1, 0, 0]); // alerón

    // gallina
    blob(b, WH, [0.62, 0.62, 0.7], [0, 1.85, -0.3]);
    const mats = [R, OR, paint(0xffd93b), WH, R];
    for (let i = -2; i <= 2; i++) {
        const a = i * 0.3;
        blob(b, mats[i + 2], [0.16, 0.66, 0.08], [Math.sin(a) * 0.45, 2.25 + Math.cos(a) * 0.15, -1.0], [-0.55, 0, -a]); // plumas de la cola
    }
    blob(b, WH, [0.28, 0.4, 0.3], [0, 2.3, 0.05]);
    const head = new THREE.Group();
    head.position.set(0, 2.66, 0.28);
    b.add(head);
    g.userData.head = head;
    blob(head, WH, [0.38, 0.38, 0.4], [0, 0, 0]);
    blob(head, R, [0.1, 0.18, 0.12], [0, 0.4, -0.02]); // cresta
    blob(head, R, [0.09, 0.14, 0.1], [0, 0.36, 0.14]);
    blob(head, R, [0.09, 0.13, 0.1], [0, 0.34, -0.18]);
    blob(head, R, [0.09, 0.16, 0.07], [0, -0.24, 0.34]); // barbilla
    cone(head, OR, 0.13, 0.34, [0, -0.06, 0.45], [Math.PI / 2, 0, 0]); // pico
    cone(head, mat(0xf57c00, { rough: 0.5 }), 0.1, 0.24, [0, -0.14, 0.4], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) {
        eye(head, s * 0.22, 0.07, 0.28, 0.085);
        tube(head, AMBER, 0.12, 0.05, [s * 0.2, 0.22, 0.28], [Math.PI / 2 - 0.5, 0, 0]); // goggles en la frente
        ring(head, mat(0x4e342e), 0.13, 0.03, [s * 0.2, 0.22, 0.29], [-0.5, 0, 0]);
        blob(b, WH, [0.14, 0.4, 0.45], [s * 0.68, 1.95, -0.05], [0.5, 0, s * 0.4]); // alas
        limb(b, WH, [s * 0.6, 2.0, -0.1], [s * 0.2, 1.82, 0.38], 0.1);
    }
    ring(b, R, 0.27, 0.045, [0, 1.84, 0.4], [-0.9, 0, 0]);
    return g;
}

/** 🎃 Espantapájaros al volante de un carro de heno. */
function buildScarecrow() {
    const g = baseVehicle(0x5d4429, 0xb08d3a);
    const b = g.userData.body;
    g.userData.top = 4.35;
    const WOOD = mat(0x8d6a45, { rough: 0.95 });
    const WOODD = mat(0x5d4429, { rough: 0.95 });
    const RUST = mat(0xb5532c, { rough: 0.7, metal: 0.4 });
    const BURL = mat(0xd9bd82, { rough: 1 });
    const PLAID = mat(0xb23a2e, { rough: 0.95 });
    const STRAW = mat(0xe4c25a, { rough: 1 });
    const BRASS = mat(0xb08d3a, { rough: 0.4, metal: 0.7 });

    box(b, WOODD, 2.1, 0.4, 3.4, 0.1, [0, 0.9, 0]);
    box(b, WOOD, 2.15, 0.34, 3.3, 0.08, [0, 1.25, 0]);
    box(b, WOOD, 2.15, 0.28, 3.3, 0.08, [0, 1.55, 0]);
    for (let z = -1.4; z <= 1.41; z += 0.35) {
        for (const s of [-1, 1]) box(b, WOODD, 0.04, 0.62, 0.05, 0.01, [s * 1.09, 1.4, z]); // tablas
    }
    box(b, RUST, 1.7, 0.55, 1.1, 0.12, [0, 1.58, 1.15]); // capó oxidado
    box(b, mat(0x2b2f33), 1.2, 0.42, 0.08, 0.03, [0, 1.52, 1.72]);
    for (let i = -2; i <= 2; i++) box(b, WOODD, 0.06, 0.4, 0.05, 0.01, [i * 0.22, 1.52, 1.77]);
    tube(b, metalMat(), 0.1, 0.14, [0, 1.9, 1.3]);
    tube(b, WOODD, 0.12, 2.2, [0, 0.82, 1.85], [0, 0, Math.PI / 2]); // defensa de tronco
    tube(b, metalMat(0x555a5e), 0.09, 0.9, [0.85, 2.05, 0.75]); // chimenea
    for (const s of [-1, 1]) {
        tube(b, BRASS, 0.17, 0.3, [s * 0.8, 1.5, 1.72], [Math.PI / 2, 0, 0]); // faroles
        tube(b, glowMat(0xffe082), 0.13, 0.04, [s * 0.8, 1.5, 1.89], [Math.PI / 2, 0, 0]);
        box(b, glowMat(0xff5252), 0.2, 0.16, 0.06, 0.02, [s * 0.8, 1.4, -1.68]);
    }
    box(b, WOODD, 2.15, 0.5, 0.1, 0.03, [0, 1.5, -1.7]); // compuerta

    // rollo de heno atrás, con amarres y pajas
    tube(b, STRAW, 0.4, 1.7, [0, 1.8, -1.3], [0, 0, Math.PI / 2]);
    for (const x of [-0.5, 0.5]) ring(b, mat(0x4e342e), 0.42, 0.03, [x, 1.8, -1.3], [0, Math.PI / 2, 0]);
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        tube(b, STRAW, 0.018, 0.4, [(i % 2 ? 0.86 : -0.86) + (i % 3) * 0.02, 1.8 + Math.sin(a) * 0.32, -1.3 + Math.cos(a) * 0.32], [Math.cos(a) * 0.6, 0, (i % 2 ? -1 : 1) * 1.1]);
    }

    box(b, mat(0x6d4c41), 1.1, 0.15, 0.8, 0.06, [0, 1.72, -0.4]); // asiento
    ring(b, mat(0x222222), 0.25, 0.04, [0, 2.0, 0.42], [-0.9, 0, 0]);

    // espantapájaros
    box(b, PLAID, 0.95, 1.0, 0.55, 0.22, [0, 2.3, -0.4]);
    box(b, mat(0x3d6ea5), 0.28, 0.28, 0.04, 0.03, [0.22, 2.2, -0.7]); // parches
    box(b, mat(0x4a7a3a), 0.24, 0.3, 0.04, 0.03, [-0.2, 2.45, -0.7]);
    tube(b, WOODD, 0.07, 1.5, [0, 2.6, -0.85]); // estaca
    tube(b, WOODD, 0.06, 2.3, [0, 2.75, -0.85], [0, 0, Math.PI / 2]); // travesaño
    for (const s of [-1, 1]) {
        for (let i = 0; i < 5; i++) tube(b, STRAW, 0.02, 0.4, [s * (1.1 + i * 0.02), 2.6 - i * 0.05, -0.85 + (i - 2) * 0.05], [0, 0, s * (0.3 + i * 0.12)]);
        limb(b, PLAID, [s * 0.5, 2.6, -0.4], [s * 0.22, 2.05, 0.36], 0.14);
        for (let i = 0; i < 4; i++) cone(b, STRAW, 0.05, 0.3, [s * 0.22 + (i - 1.5) * 0.05, 2.0, 0.42], [1.2, 0, (i - 1.5) * 0.3]);
    }
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        tube(b, STRAW, 0.02, 0.35, [Math.cos(a) * 0.3, 2.82, -0.4 + Math.sin(a) * 0.25], [Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8]); // paja del cuello
    }
    const head = new THREE.Group();
    head.position.set(0, 3.25, -0.35);
    b.add(head);
    g.userData.head = head;
    blob(head, BURL, [0.46, 0.5, 0.46], [0, 0, 0]);
    for (const s of [-1, 1]) {
        tube(head, BLACK, 0.08, 0.04, [s * 0.18, 0.1, 0.42], [Math.PI / 2, 0, 0]); // ojos de botón
        box(head, BLACK, 0.12, 0.02, 0.01, 0.005, [s * 0.18, 0.1, 0.45], [0, 0, 0.7]);
        box(head, BLACK, 0.12, 0.02, 0.01, 0.005, [s * 0.18, 0.1, 0.45], [0, 0, -0.7]);
    }
    cone(head, mat(0xff8f1f), 0.07, 0.28, [0, 0.0, 0.5], [Math.PI / 2, 0, 0]); // nariz
    for (let i = 0; i < 7; i++) box(head, BLACK, 0.06, 0.04, 0.03, 0.01, [-0.21 + i * 0.07, -0.17 + (i % 2 ? 0.035 : -0.035), 0.4]); // sonrisa cosida
    tube(head, mat(0xd8b350), 0.9, 0.07, [0, 0.3, 0]); // ala del sombrero
    add(head, new THREE.CylinderGeometry(0.42, 0.52, 0.5, 22), mat(0xcfa340), [0, 0.58, 0]);
    ring(head, R_RED(), 0.5, 0.05, [0, 0.4, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        tube(head, STRAW, 0.02, 0.32, [Math.cos(a) * 0.88, 0.22, Math.sin(a) * 0.88], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]);
    }
    // cuervo en el sombrero
    const crow = mat(0x1a1a22, { rough: 0.4 });
    blob(head, crow, [0.2, 0.17, 0.3], [0.5, 0.78, 0.0]);
    blob(head, crow, [0.11, 0.11, 0.11], [0.5, 0.92, 0.26]);
    cone(head, mat(0x555555), 0.04, 0.16, [0.5, 0.9, 0.42], [Math.PI / 2, 0, 0]);
    blob(head, WHITE, [0.03, 0.03, 0.03], [0.57, 0.95, 0.33]);
    blob(head, crow, [0.07, 0.04, 0.2], [0.5, 0.74, -0.3], [0.3, 0, 0]);
    return g;
}
function R_RED() { return mat(0xb71c1c); }

const BUILDERS = { cow: buildCow, pig: buildPig, chicken: buildChicken, scarecrow: buildScarecrow };

function buildVehicle(character) {
    const g = (BUILDERS[character] || buildCow)();
    mergeByMaterial(g.userData.body); // la carrocería se mueve como un bloque
    if (g.userData.head) mergeByMaterial(g.userData.head); // la cabeza como otro (se anima aparte)
    return g;
}

/** Inclinación, rebote y giro de ruedas. Llamar una vez por auto y por frame. */
function animateVehicle(car, dt, time) {
    const ud = car.group.userData;
    if (!ud.body) return;
    const clampv = (v, a, b) => Math.max(a, Math.min(b, v));
    const dh = ((car.h - (car.ph ?? car.h) + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    car.ph = car.h;
    const yaw = dh / Math.max(dt, 0.001);
    car.yawS = (car.yawS ?? 0) + (yaw - (car.yawS ?? 0)) * Math.min(1, dt * 8);
    const acc = (car.speed - (car.ps ?? car.speed)) / Math.max(dt, 0.001);
    car.ps = car.speed;
    car.accS = (car.accS ?? 0) + (acc - (car.accS ?? 0)) * Math.min(1, dt * 6);

    const roll = clampv(car.yawS * Math.abs(car.speed) * 0.0055, -0.11, 0.11);
    const pitch = clampv(-car.accS * 0.0035, -0.07, 0.07);
    const k = Math.min(1, dt * 10);
    ud.body.rotation.z += (roll - ud.body.rotation.z) * k;
    ud.body.rotation.x += (pitch - ud.body.rotation.x) * k;
    ud.body.position.y = Math.sin(time * 17 + car.id) * 0.018 * Math.min(1, Math.abs(car.speed) / 10);
    for (const w of ud.wheels) w.rotation.x += (car.speed * dt) / 0.58;
    if (ud.head) {
        ud.head.rotation.z = -ud.body.rotation.z * 1.5 + Math.sin(time * 9 + car.id) * 0.02 * Math.min(1, Math.abs(car.speed) / 10);
        ud.head.rotation.y = clampv(-car.yawS * 0.18, -0.35, 0.35); // mira hacia donde gira
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  ARENA Y ENTORNO
// ═════════════════════════════════════════════════════════════════════════════

/** Generador pseudoaleatorio con semilla: el paisaje es idéntico para todos los jugadores. */
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function canvasTexture(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (THREE.SRGBColorSpace !== undefined) t.colorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
}

/** Tierra de la arena: surcos concéntricos de tractor, charcos y borde pisoteado. */
function groundTexture() {
    return canvasTexture(1024, 1024, (ctx, w, h) => {
        const r = rng(7);
        const c = w / 2;
        ctx.fillStyle = '#c9a24a';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 9000; i++) {
            ctx.fillStyle = ['#b88f3b', '#dcbd62', '#a67c2e', '#d4b055'][Math.floor(r() * 4)];
            ctx.globalAlpha = 0.18 + r() * 0.25;
            ctx.fillRect(r() * w, r() * h, 2 + r() * 6, 1 + r() * 3);
        }
        ctx.globalAlpha = 1;
        // bandas de cosechadora
        for (let rad = 40; rad < c; rad += 46) {
            ctx.strokeStyle = rad % 92 < 46 ? 'rgba(120,80,25,.10)' : 'rgba(255,230,150,.10)';
            ctx.lineWidth = 36;
            ctx.beginPath(); ctx.arc(c, c, rad, 0, Math.PI * 2); ctx.stroke();
        }
        // huellas de neumático (pares de líneas)
        for (const rad of [150, 250, 330, 420]) {
            ctx.strokeStyle = 'rgba(80,50,15,.35)';
            ctx.lineWidth = 5;
            for (const off of [-9, 9]) {
                ctx.beginPath(); ctx.arc(c, c, rad + off, 0.2, Math.PI * 1.7); ctx.stroke();
            }
        }
        // charcos / lodo
        for (let i = 0; i < 9; i++) {
            const a = r() * Math.PI * 2;
            const d = 80 + r() * 380;
            const x = c + Math.cos(a) * d;
            const y = c + Math.sin(a) * d;
            const g = ctx.createRadialGradient(x, y, 2, x, y, 40 + r() * 40);
            g.addColorStop(0, 'rgba(70,45,20,.55)');
            g.addColorStop(1, 'rgba(70,45,20,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.ellipse(x, y, 60 + r() * 40, 35 + r() * 25, r() * 3, 0, Math.PI * 2); ctx.fill();
        }
        // borde pisoteado
        const edge = ctx.createRadialGradient(c, c, c * 0.82, c, c, c);
        edge.addColorStop(0, 'rgba(70,45,20,0)');
        edge.addColorStop(1, 'rgba(70,45,20,.55)');
        ctx.fillStyle = edge;
        ctx.fillRect(0, 0, w, h);
    });
}

/** Patchwork de campos de cultivo alrededor. */
function fieldsTexture() {
    return canvasTexture(1024, 1024, (ctx, w, h) => {
        const r = rng(21);
        ctx.fillStyle = '#7cb342';
        ctx.fillRect(0, 0, w, h);
        const palette = ['#8bc34a', '#689f38', '#9ccc65', '#c0ca33', '#d4b84a', '#7cb342', '#a1887f', '#558b2f'];
        for (let i = 0; i < 90; i++) {
            const x = r() * w, y = r() * h, rw = 60 + r() * 170, rh = 40 + r() * 130;
            ctx.fillStyle = palette[Math.floor(r() * palette.length)];
            ctx.fillRect(x, y, rw, rh);
            ctx.strokeStyle = 'rgba(0,0,0,.07)';
            ctx.lineWidth = 2;
            for (let k = 0; k < rw; k += 7) { ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k, y + rh); ctx.stroke(); }
        }
    });
}

function skyTexture() {
    return canvasTexture(8, 512, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0.0, '#2f7fd0');
        g.addColorStop(0.28, '#6eb2ea');
        g.addColorStop(0.46, '#cfe6f3');
        g.addColorStop(0.5, '#dcecf2');
        g.addColorStop(1.0, '#dcecf2');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    });
}

/** Shader de viento: dobla las espigas con una onda suave (solo si el mesh es instanciado). */
function swayMaterial(wind) {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
        sh.uniforms.uWind = wind;
        sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\nuniform float uWind;')
            .replace('#include <begin_vertex>', `#include <begin_vertex>
            #ifdef USE_INSTANCING
              float ph = instanceMatrix[3][0] * 0.31 + instanceMatrix[3][2] * 0.23;
              float bend = (sin(uWind * 1.7 + ph) + 0.5 * sin(uWind * 3.1 + ph * 1.7)) * 0.07 * position.y;
              transformed.x += bend;
              transformed.z += bend * 0.6;
            #endif`);
    };
    return m;
}

/**
 * Construye toda la arena y el paisaje.
 * Devuelve { update(dt, time) } para animar viento, molino y nubes.
 */
function buildArena(scene, R) {
    const rand = rng(1234);
    const wind = { value: 0 };
    const dummy = new THREE.Object3D();
    const HORIZON = 0xdcecf2;

    scene.background = new THREE.Color(HORIZON);
    scene.fog = new THREE.Fog(HORIZON, 90, 330);

    // ── cielo, sol y nubes ──
    const sky = new THREE.Mesh(
        new THREE.SphereGeometry(420, 32, 20),
        new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }),
    );
    sky.renderOrder = -2;
    scene.add(sky);

    const sunTex = canvasTexture(128, 128, (ctx, w, h) => {
        const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,240,1)');
        g.addColorStop(0.25, 'rgba(255,244,190,.9)');
        g.addColorStop(1, 'rgba(255,230,150,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    });
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, fog: false, depthWrite: false, toneMapped: false }));
    sunSprite.position.set(30, 50, 20).normalize().multiplyScalar(380);
    sunSprite.scale.set(110, 110, 1);
    scene.add(sunSprite);

    const clouds = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.93, fog: false, toneMapped: false });
    for (let i = 0; i < 9; i++) {
        const c = new THREE.Group();
        const n = 4 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
            const m = new THREE.Mesh(G.sphere, cloudMat);
            m.scale.set(12 + rand() * 10, 5 + rand() * 3, 8 + rand() * 6);
            m.position.set((k - n / 2) * 11 + rand() * 4, rand() * 3, rand() * 6);
            c.add(m);
        }
        const a = rand() * Math.PI * 2;
        const d = 160 + rand() * 170;
        c.position.set(Math.cos(a) * d, 75 + rand() * 40, Math.sin(a) * d);
        c.rotation.y = rand() * 3;
        clouds.add(c);
    }
    scene.add(clouds);

    // ── terreno de alrededor: campos de cultivo + colinas ──
    const fields = new THREE.Mesh(new THREE.CircleGeometry(430, 64), new THREE.MeshStandardMaterial({ map: fieldsTexture(), roughness: 1 }));
    fields.rotation.x = -Math.PI / 2;
    fields.position.y = -1.01;
    fields.receiveShadow = true;
    scene.add(fields);

    const hillMat = new THREE.MeshStandardMaterial({ color: 0x6aa33a, roughness: 1, flatShading: true });
    for (let i = 0; i < 14; i++) {
        const a = rand() * Math.PI * 2;
        const d = 190 + rand() * 150;
        const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), hillMat);
        hill.scale.set(50 + rand() * 50, 8 + rand() * 14, 50 + rand() * 50);
        hill.position.set(Math.cos(a) * d, -2, Math.sin(a) * d);
        scene.add(hill);
    }

    // ── suelo de la arena (el contorno exterior se ve como un terraplén elevado) ──
    const dirtSide = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 });
    const ground = new THREE.Mesh(
        new THREE.CylinderGeometry(R, R + 0.6, 1, 96),
        [dirtSide, new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 }), dirtSide],
    );
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── trigo: tallo + espiga, instanciados, con balanceo por viento ──
    const STALKS = QUALITY.stalks;
    const stemGeo = new THREE.CylinderGeometry(0.012, 0.02, 1.0, 4);
    stemGeo.translate(0, 0.5, 0);
    const headGeo = new THREE.ConeGeometry(0.055, 0.34, 5);
    headGeo.translate(0, 1.15, 0);
    const swayMat = swayMaterial(wind);
    const stems = new THREE.InstancedMesh(stemGeo, swayMat, STALKS);
    const heads = new THREE.InstancedMesh(headGeo, swayMat, STALKS);
    const col = new THREE.Color();
    for (let i = 0; i < STALKS; i++) {
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * (R - 1.2);
        dummy.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
        dummy.rotation.set((rand() - 0.5) * 0.18, rand() * 6, (rand() - 0.5) * 0.18);
        dummy.scale.set(1, 0.7 + rand() * 0.55, 1);
        dummy.updateMatrix();
        stems.setMatrixAt(i, dummy.matrix);
        heads.setMatrixAt(i, dummy.matrix);
        col.setHSL(0.115 + rand() * 0.03, 0.55 + rand() * 0.2, 0.4 + rand() * 0.15);
        stems.setColorAt(i, col.clone().offsetHSL(0, -0.1, -0.05));
        heads.setColorAt(i, col);
    }
    stems.castShadow = false;
    scene.add(stems, heads);

    // ── cerca: postes + 2 travesaños ──
    const POSTS = 56;
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.23, 1.9, 8), mat(0x6d4c41, { rough: 1 }), POSTS);
    for (let i = 0; i < POSTS; i++) {
        const a = (i / POSTS) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * (R + 0.4), 0.95, Math.sin(a) * (R + 0.4));
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        posts.setMatrixAt(i, dummy.matrix);
    }
    posts.castShadow = true;
    scene.add(posts);
    for (const y of [0.72, 1.32]) {
        const rail = new THREE.Mesh(new THREE.TorusGeometry(R + 0.4, 0.1, 8, 120), mat(0x8d6e63, { rough: 0.9 }));
        rail.rotation.x = Math.PI / 2;
        rail.position.y = y;
        rail.castShadow = true;
        scene.add(rail);
    }

    // ── tope de llantas pintadas contra la cerca ──
    const STACKS = 28;
    const tires = new THREE.InstancedMesh(new THREE.TorusGeometry(0.5, 0.24, 10, 22), mat(0xffffff, { rough: 0.95 }), STACKS * 2);
    const tireColors = [0x1c1c1c, 0xe8e8e8, 0x1c1c1c, 0xc62828];
    for (let i = 0; i < STACKS; i++) {
        const a = (i / STACKS) * Math.PI * 2 + 0.05;
        for (let k = 0; k < 2; k++) {
            dummy.position.set(Math.cos(a) * (R - 0.55), 0.24 + k * 0.46, Math.sin(a) * (R - 0.55));
            dummy.rotation.set(Math.PI / 2, 0, rand() * 6);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            tires.setMatrixAt(i * 2 + k, dummy.matrix);
            tires.setColorAt(i * 2 + k, col.setHex(tireColors[i % 4]));
        }
    }
    tires.castShadow = true;
    scene.add(tires);

    // ── pacas de heno fuera de la cerca ──
    const BALES = 22;
    const bales = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.95, 0.95, 1.5, 20), mat(0xffffff, { rough: 1 }), BALES);
    for (let i = 0; i < BALES; i++) {
        const a = rand() * Math.PI * 2;
        const d = R + 5 + rand() * 9;
        dummy.position.set(Math.cos(a) * d, -0.05 + 0.95, Math.sin(a) * d);
        dummy.rotation.set(0, rand() * 6, Math.PI / 2);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bales.setMatrixAt(i, dummy.matrix);
        bales.setColorAt(i, col.setHSL(0.12 + rand() * 0.02, 0.6, 0.5 + rand() * 0.1));
    }
    bales.castShadow = true;
    scene.add(bales);

    // ── árboles instanciados ──
    const TREES = 90;
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.4, 2.4, 7), mat(0x6d4c41, { rough: 1 }), TREES);
    const crownLow = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.9, 1), mat(0xffffff, { rough: 1, flat: true }), TREES);
    const crownTop = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.35, 1), mat(0xffffff, { rough: 1, flat: true }), TREES);
    const barnPos = new THREE.Vector3(-82, 0, -34);
    let placed = 0;
    while (placed < TREES) {
        const a = rand() * Math.PI * 2;
        const d = 62 + rand() * 150;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        if (Math.hypot(x - barnPos.x, z - barnPos.z) < 26) continue;
        const s = 0.8 + rand() * 0.9;
        dummy.rotation.set(0, rand() * 6, 0);
        dummy.scale.set(s, s, s);
        dummy.position.set(x, 0.2 + 1.2 * s - 1.01 + 1.0, z);
        dummy.updateMatrix();
        trunks.setMatrixAt(placed, dummy.matrix);
        dummy.position.set(x, -1.01 + 2.4 * s + 1.7 * s, z);
        dummy.updateMatrix();
        crownLow.setMatrixAt(placed, dummy.matrix);
        dummy.position.set(x, -1.01 + 2.4 * s + 3.2 * s, z);
        dummy.scale.set(s * 0.95, s * 0.95, s * 0.95);
        dummy.updateMatrix();
        crownTop.setMatrixAt(placed, dummy.matrix);
        const green = col.setHSL(0.25 + rand() * 0.07, 0.5 + rand() * 0.2, 0.28 + rand() * 0.12);
        crownLow.setColorAt(placed, green);
        crownTop.setColorAt(placed, green.clone().offsetHSL(0, 0, 0.06));
        placed++;
    }
    trunks.castShadow = crownLow.castShadow = crownTop.castShadow = true;
    scene.add(trunks, crownLow, crownTop);

    // ── granero con silo ──
    const barn = new THREE.Group();
    barn.position.copy(barnPos).setY(-1.01);
    barn.rotation.y = Math.atan2(-barnPos.x, -barnPos.z); // mira hacia la arena
    const RED = mat(0xb23a2e, { rough: 0.8 });
    const TRIM = mat(0xf5f0e6, { rough: 0.7 });
    box(barn, RED, 16, 8, 20, 0.2, [0, 4, 0]);
    for (const s of [-1, 1]) {
        box(barn, mat(0x4e342e, { rough: 0.9 }), 9.8, 0.5, 21.4, 0.1, [s * 4.3, 9.7, 0], [0, 0, -s * 0.43]);
    }
    const gable = new THREE.Shape();
    gable.moveTo(-8, 0); gable.lineTo(8, 0); gable.lineTo(0, 3.8); gable.lineTo(-8, 0);
    for (const z of [10.05, -10.05]) {
        const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), RED);
        gm.position.set(0, 8, z);
        if (z < 0) gm.rotation.y = Math.PI;
        gm.castShadow = true;
        barn.add(gm);
    }
    box(barn, TRIM, 5.4, 5.6, 0.3, 0.05, [0, 2.8, 10.1]); // portón
    box(barn, mat(0x8d3128), 4.8, 5.0, 0.32, 0.05, [0, 2.8, 10.12]);
    for (const a of [0.74, -0.74]) box(barn, TRIM, 0.28, 6.6, 0.34, 0.04, [0, 2.8, 10.15], [0, 0, a]);
    box(barn, TRIM, 0.28, 5.2, 0.34, 0.04, [0, 2.8, 10.15]);
    box(barn, TRIM, 2.1, 2.1, 0.3, 0.05, [0, 8.7, 10.1]); // ventana del henil
    box(barn, mat(0x3e2723), 1.7, 1.7, 0.32, 0.05, [0, 8.7, 10.12]);
    const silo = new THREE.Group();
    silo.position.set(10.5, 0, -2);
    tube(silo, mat(0xb0bec5, { rough: 0.5, metal: 0.3 }), 3.0, 15, [0, 7.5, 0]);
    blob(silo, mat(0x90a4ae, { rough: 0.5, metal: 0.3 }), [3.0, 2.4, 3.0], [0, 15, 0]);
    for (let y = 2; y < 15; y += 2.6) tube(silo, mat(0x78909c), 3.06, 0.14, [0, y, 0]);
    barn.add(silo);
    scene.add(barn);

    // ── molino de viento ──
    const mill = new THREE.Group();
    mill.position.set(72, -1.01, 70);
    add(mill, new THREE.CylinderGeometry(0.7, 1.4, 14, 8), mat(0xe0e0e0, { rough: 0.8 }), [0, 7, 0]);
    box(mill, mat(0xb23a2e), 1.6, 1.6, 2.4, 0.2, [0, 14.4, 0.4]);
    const rotor = new THREE.Group();
    rotor.position.set(0, 14.4, 1.8);
    for (let i = 0; i < 6; i++) {
        const blade = box(rotor, TRIM, 1.3, 6.2, 0.12, 0.05, [0, 0, 0]);
        blade.geometry.translate(0, 3.5, 0);
        blade.rotation.z = (i / 6) * Math.PI * 2;
    }
    tube(rotor, mat(0x4e342e), 0.55, 0.9, [0, 0, 0.1], [Math.PI / 2, 0, 0]);
    mill.add(rotor);
    mill.rotation.y = Math.atan2(-mill.position.x, -mill.position.z);
    scene.add(mill);

    return {
        update(dt, time) {
            wind.value = time;
            rotor.rotation.z -= dt * (0.8 + Math.sin(time * 0.3) * 0.3);
            clouds.rotation.y += dt * 0.004;
        },
    };
}

// ═════════════════════════════════════════════════════════════════════════════
//  EFECTOS: polvo y chispas (pool reutilizable, sin crear objetos en juego)
// ═════════════════════════════════════════════════════════════════════════════
function createFx(scene) {
    const MAX = 260;
    const geo = new THREE.SphereGeometry(1, 8, 6);
    const pool = [];
    for (let i = 0; i < MAX; i++) {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false }));
        m.visible = false;
        scene.add(m);
        pool.push({ m, life: 0, max: 1, vx: 0, vy: 0, vz: 0, grow: 0, gravity: 0, alpha: 1, size: 1 });
    }
    let next = 0;

    function spawn(x, y, z, vx, vy, vz, o) {
        const p = pool[next];
        next = (next + 1) % MAX;
        p.life = p.max = o.life;
        p.vx = vx; p.vy = vy; p.vz = vz;
        p.grow = o.grow || 0;
        p.gravity = o.gravity || 0;
        p.alpha = o.alpha ?? 1;
        p.size = o.size;
        p.m.material.color.setHex(o.color);
        p.m.position.set(x, y, z);
        p.m.scale.setScalar(o.size);
        p.m.material.opacity = p.alpha;
        p.m.visible = true;
    }

    return {
        /** Nube de polvo (o lodo) detrás de una rueda. */
        dust(x, z, color = 0xd9c08a) {
            spawn(x + (Math.random() - 0.5) * 0.5, 0.25, z + (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 1.2, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 1.2,
                { color, size: 0.3 + Math.random() * 0.3, life: 0.7 + Math.random() * 0.5, grow: 1.6, alpha: 0.42 });
        },
        /** Chispas de un choque. */
        sparks(x, y, z, n = 10) {
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2;
                const v = 5 + Math.random() * 8;
                spawn(x, y, z, Math.cos(a) * v, 2 + Math.random() * 6, Math.sin(a) * v,
                    { color: Math.random() > 0.4 ? 0xffd54f : 0xffffff, size: 0.07 + Math.random() * 0.07, life: 0.25 + Math.random() * 0.3, gravity: 20, alpha: 1 });
            }
        },
        update(dt) {
            for (const p of pool) {
                if (p.life <= 0) continue;
                p.life -= dt;
                if (p.life <= 0) { p.m.visible = false; continue; }
                p.vy -= p.gravity * dt;
                p.m.position.x += p.vx * dt;
                p.m.position.y = Math.max(0.05, p.m.position.y + p.vy * dt);
                p.m.position.z += p.vz * dt;
                p.m.scale.setScalar(p.size + p.grow * (1 - p.life / p.max));
                p.m.material.opacity = p.alpha * (p.life / p.max);
            }
        },
    };
}

const arena = buildArena(scene, ARENA_R);
const effects = createFx(scene);

function makeLabel(text) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 34);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
    s.scale.set(4, 1, 1);
    s.position.y = 4.4;
    s.renderOrder = 10;
    return s;
}

// ───────────── Autos ─────────────
const cars = new Map();

players.forEach((p, i) => {
    const a = (i / players.length) * Math.PI * 2;
    const car = {
        id: p.user_id,
        group: buildVehicle(p.character || 'cow'),
        x: Math.sin(a) * 25,
        z: Math.cos(a) * 25,
        h: a + Math.PI, // mirando al centro
        speed: 0, kx: 0, kz: 0, bumpCd: 0,
        online: p.user_id === meId,
        fx: '', shieldT: 0,
        hp: 100, dead: false, mudT: 0, spin: 0,
    };
    car.tx = car.x; car.tz = car.z; car.th = car.h;
    const label = makeLabel(p.nickname);
    label.position.y = car.group.userData.top + 0.7;
    car.group.add(label);
    car.group.visible = car.online;
    scene.add(car.group);
    cars.set(car.id, car);
});

const me = cars.get(meId);
if (!me) throw new Error('No eres parte de esta sala');

// HUD de jugadores
$('hud-players').innerHTML = players
    .map((p) => `${EMOJI[p.character] ?? ''} ${p.nickname}${p.user_id === meId ? ' (tú)' : ''}`)
    .join('<br>');

// ───────────── Controles ─────────────
const keys = {};
addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => (keys[e.code] = false));


/* ───────────── Controles táctiles ───────────── */
// Entrada analógica del giro (-1 a 1, izquierda positiva). El teclado sigue funcionando igual.
const input = { steer: 0 };

function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 1;
    return muted;
}

// En pantallas táctiles el módulo crea su propia interfaz: joystick de giro, acelerar,
// frenar y poder, además de pantalla completa, sonido y aviso de orientación.
const touch = IS_TOUCH
    ? createTouchControls({ keys, input, onPower: () => usePower(), onToggleMute: toggleMute, isMuted: () => muted })
    : null;


// ───────────── Choques: ¿quién golpea a quién? ─────────────
// Cada navegador solo calcula SU auto. Antes el daño dependía de la velocidad de
// acercamiento total (simétrica), así que el que embestía y el embestido perdían
// lo mismo. Ahora el daño que recibo depende de la velocidad con la que el OTRO
// auto viene hacia mí: si yo embisto a alguien parado, él se daña y yo no.
const HIT_MIN = 7, HIT_K = 0.8, HIT_MAX = 12;

// n = vector unitario que apunta del otro auto hacia mí.
function computeRam(cvx, cvz, ovx, ovz, nx, nz) {
    const sMe = -(cvx * nx + cvz * nz); // mi velocidad hacia el otro
    const sThem = ovx * nx + ovz * nz; // su velocidad hacia mí
    const closing = sMe + sThem; // velocidad de acercamiento (la de siempre)
    const meIn = Math.max(0, sMe);
    const themIn = Math.max(0, sThem);
    const total = meIn + themIn;
    const theirShare = total > 0 ? themIn / total : 0; // 0 = yo embisto, 1 = me embisten
    const base = closing > HIT_MIN ? Math.min(HIT_MAX, (closing - HIT_MIN) * HIT_K) : 0;
    return {
        closing,
        theirShare,
        base,
        dmgToMe: base * Math.min(1, theirShare * 2), // lo que me hace el otro
        dmgDealt: base * Math.min(1, (1 - theirShare) * 2), // lo que le hago yo
    };
}

// Para depurar los choques: pon true y mira la consola del navegador.
const DEBUG_HITS = false;

// Daño ya descontado por cada atacante. Evita contar dos veces el mismo choque
// cuando llega por dos caminos (mi propia detección y el aviso del atacante).
const HIT_WINDOW = 0.3;
const lastHit = new Map(); // id del atacante -> { t, dmg }

function registerHit(attackerId, dmg) {
    if (!(dmg > 0)) return;
    const t = now();
    const prev = lastHit.get(attackerId);
    if (prev && t - prev.t < HIT_WINDOW) {
        // Mismo choque: solo se descuenta lo que falte para llegar al valor mayor.
        if (dmg > prev.dmg) {
            const extra = dmg - prev.dmg;
            prev.dmg = dmg;
            if (DEBUG_HITS) console.log('[hit] ajuste', attackerId, extra.toFixed(1));
            takeDamage(extra);
        }
        return;
    }
    lastHit.set(attackerId, { t, dmg });
    if (DEBUG_HITS) console.log('[hit] daño', attackerId, dmg.toFixed(1));
    takeDamage(dmg);
}

// Rebote físico de un auto tras un choque (se usa al detectarlo yo y al recibir el aviso).
function applyBump(c, nx, nz, closing, theirShare) {
    // El golpeado sale más disparado y pierde menos velocidad; el que embiste rebota y frena.
    const imp = 3 + Math.max(0, closing) * 0.9 * (0.35 + 0.65 * theirShare);
    c.kx += nx * imp; c.kz += nz * imp;
    c.speed *= 0.6 + 0.3 * theirShare;
    c.bumpCd = 0.25;

    // Al ser embestido, el auto gira un poco según de qué lado lo golpean.
    const side = Math.sign(nx * Math.cos(c.h) - nz * Math.sin(c.h)) || 1;
    c.spin = clamp(c.spin + side * theirShare * Math.min(closing, 25) * 0.05, -3, 3);
}

function resolveBump(c, o, nx, nz) {
    const cvx = Math.sin(c.h) * c.speed + c.kx, cvz = Math.cos(c.h) * c.speed + c.kz;
    const ovx = Math.sin(o.h) * o.speed, ovz = Math.cos(o.h) * o.speed;
    const r = computeRam(cvx, cvz, ovx, ovz, nx, nz);

    applyBump(c, nx, nz, r.closing, r.theirShare);

    if (r.base > 0) {
        effects.sparks((c.x + o.x) / 2, 1.2, (c.z + o.z) / 2, Math.round(6 + r.base * 1.5));

        if (r.dmgToMe > 0) registerHit(o.id, r.dmgToMe);
        else sfx('bump');

        if (r.dmgDealt > 0) {
            // El atacante avisa al golpeado con SU velocidad (la exacta). Así el daño
            // ya no depende de que la pantalla del otro jugador vea el choque.
            if (DEBUG_HITS) console.log('[hit] envío', o.id, r.dmgDealt.toFixed(1));
            channel.whisper('car-hit', {
                from: meId,
                to: o.id,
                dmg: +r.dmgDealt.toFixed(1),
                nx: +(-nx).toFixed(3), // del atacante hacia el golpeado
                nz: +(-nz).toFixed(3),
                v: +Math.min(r.closing, 40).toFixed(1),
                sh: +(1 - r.theirShare).toFixed(2),
            });
        }
        if (r.dmgDealt >= 6) showMsg('💥 ¡Buen golpe!', 600);
    }
}

function updateLocal(dt) {
    const c = me;
    if (c.dead || phase !== 'live') return;
    const fwd = keys.KeyW || keys.ArrowUp;
    const back = keys.KeyS || keys.ArrowDown;
    const left = keys.KeyA || keys.ArrowLeft;
    const right = keys.KeyD || keys.ArrowRight;

    if (fwd) c.speed += ACCEL * dt;
    else if (back) c.speed -= (c.speed > 0 ? BRAKE : ACCEL * 0.6) * dt;
    else c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), FRICTION * dt);
    c.speed = clamp(c.speed, -MAX_SPEED * 0.4, MAX_SPEED);

    const steer = input.steer || ((left ? 1 : 0) - (right ? 1 : 0));
    const slip = c.mudT > 0 ? 0.3 : 1;
    const grip = Math.min(1, Math.abs(c.speed) / 6) * slip;
    c.h += steer * TURN * grip * (c.speed >= 0 ? 1 : -1) * dt;
    c.h += c.spin * dt;
    c.spin *= Math.exp(-1.2 * dt);
    if (c.mudT > 0) c.speed *= Math.exp(-0.6 * dt);

    c.x += (Math.sin(c.h) * c.speed + c.kx) * dt;
    c.z += (Math.cos(c.h) * c.speed + c.kz) * dt;
    const decay = Math.exp(-3 * dt);
    c.kx *= decay; c.kz *= decay;
    c.bumpCd = Math.max(0, c.bumpCd - dt);

    // Borde de la arena (rebote)
    const d = Math.hypot(c.x, c.z);
    const lim = ARENA_R - 1.8;
    if (d > lim) {
        const nx = c.x / d, nz = c.z / d;
        c.x = nx * lim; c.z = nz * lim;
        c.speed *= 0.5;
        c.kx -= nx * 8; c.kz -= nz * 8;
    }

    // Choques con otros autos
    for (const o of cars.values()) {
        if (o === c || !o.online || o.dead) continue;
        const dx = c.x - o.x, dz = c.z - o.z;
        const dist = Math.hypot(dx, dz);
        const min = CAR_R * 2;
        if (dist < min && dist > 0.001) {
            const nx = dx / dist, nz = dz / dist; // apunta del otro auto hacia mí
            c.x += nx * (min - dist) * 0.5;
            c.z += nz * (min - dist) * 0.5;
            if (c.bumpCd === 0) resolveBump(c, o, nx, nz);
        }
    }
}

function updateRemote(o, dt) {
    const k = Math.min(1, dt * 12);
    o.x += (o.tx - o.x) * k;
    o.z += (o.tz - o.z) * k;
    o.h += angleDiff(o.th, o.h) * k;
}

// ───────────── Red (websockets) ─────────────
const channel = window.Echo.join(`room.${code}`);

channel.listenForWhisper('state', (d) => {
    const o = cars.get(d.id);
    if (!o || o === me) return;
    o.tx = d.x; o.tz = d.z; o.th = d.h; o.speed = d.s;
    o.fx = d.f || '';
    o.hp = d.hp ?? 100;
    o.dead = !!d.dead;
    o.online = true;
});
channel.leaving((u) => {
    const o = cars.get(u.id);
    if (o) { o.online = false; o.group.visible = false; }
});

// Presencia: quién está conectado ahora mismo
const setOnline = (id, v) => {
    const c = cars.get(id);
    if (!c || c === me) return;
    c.online = v;
    c.group.visible = v && !c.dead;
};
channel.here((users) => users.forEach((u) => setOnline(u.id, true)));
channel.joining((u) => setOnline(u.id, true));

let sendTimer = 0;
function sendState(dt) {
    sendTimer += dt;
    if (sendTimer < SEND_EVERY) return;
    sendTimer = 0;
    channel.whisper('state', {
        id: meId,
        x: +me.x.toFixed(2),
        z: +me.z.toFixed(2),
        h: +me.h.toFixed(3),
        s: +me.speed.toFixed(2),
        f: me.fx,
        hp: Math.round(me.hp),
        dead: me.dead ? 1 : 0,
    });
}

// ───────────── Constantes de poderes y vida ─────────────
const MAX_HP = 100;
const MAX_BOXES = 4;
const SPAWN_EVERY = 8;
const TOMATO_SPEED = 45, TOMATO_DMG = 20;
const MUD_R = 3.2, MUD_LIFE = 20;
const SHIELD_TIME = 6, POTION_HEAL = 40;
const POWERS = ['tomato', 'tomato', 'tomato', 'mud', 'mud', 'shield', 'shield', 'potion', 'potion'];
const POWER_INFO = {
    tomato: { icon: '🍅', name: 'Tomates' },
    mud: { icon: '🟤', name: 'Charco de lodo' },
    shield: { icon: '🛡️', name: 'Escudo' },
    potion: { icon: '🧪', name: 'Poción de salud' },
};

// ───────────── Mensajes y feedback ─────────────
let msgTimer;
function showMsg(text, ms = 1800) {
    $('msg').textContent = text;
    $('msg').style.opacity = 1;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => ($('msg').style.opacity = 0), ms);
}
function flash() {
    $('flash').style.opacity = 1;
    setTimeout(() => ($('flash').style.opacity = 0), 90);
}

// ───────────── Barra de vida y escudo sobre cada auto ─────────────
function drawHp(c) {
    const ctx = c.hpCanvas.getContext('2d');
    const pct = Math.max(0, c.hp) / MAX_HP;
    ctx.clearRect(0, 0, 128, 16);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(0, 0, 128, 16);
    ctx.fillStyle = pct > 0.5 ? '#66bb6a' : pct > 0.25 ? '#ffca28' : '#ef5350';
    ctx.fillRect(2, 2, 124 * pct, 12);
    c.hpTex.needsUpdate = true;
    c.hpShown = Math.round(c.hp);
}

for (const c of cars.values()) {
    c.shield = new THREE.Mesh(
        new THREE.SphereGeometry(2.7, 24, 16),
        new THREE.MeshBasicMaterial({ color: 0x40c4ff, transparent: true, opacity: 0.3 })
    );
    c.shield.position.y = 1.5;
    c.shield.visible = false;
    c.group.add(c.shield);

    c.hpCanvas = document.createElement('canvas');
    c.hpCanvas.width = 128;
    c.hpCanvas.height = 16;
    c.hpTex = new THREE.CanvasTexture(c.hpCanvas);
    c.hpSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: c.hpTex, depthTest: false }));
    c.hpSprite.scale.set(3.2, 0.4, 1);
    c.hpSprite.position.y = c.group.userData.top + 1.5;
    c.hpSprite.renderOrder = 10;
    c.group.add(c.hpSprite);

    c.hpShown = -1;
    c.deathShown = false;
}

const bursts = [];
function burst(x, z, color, size = 1) {
    const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
    );
    m.position.set(x, 1.2, z);
    scene.add(m);
    bursts.push({ m, t: 0, size });
}

// ───────────── Cajas misteriosas ─────────────
const boxes = new Map();
let boxSeq = 0;
let spawnTimer = 4;
let syncTimer = 2;

function makeIcon(text) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 100px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(text, 64, 70);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }));
    s.scale.set(1.8, 1.8, 1);
    return s;
}

function addBox(id, x, z) {
    if (boxes.has(id)) return;
    const g = new THREE.Group();
    const crate = new THREE.Mesh(B(1.6, 1.6, 1.6), mat(0xffc107));
    crate.castShadow = true;
    g.add(crate);
    g.add(new THREE.Mesh(B(1.7, 0.3, 1.7), mat(0x6d4c41)));
    const icon = makeIcon('?');
    icon.position.y = 1.7;
    g.add(icon);
    g.position.set(x, 1.2, z);
    scene.add(g);
    boxes.set(id, { id, x, z, mesh: g, claim: 0 });
}

function removeBox(id) {
    const b = boxes.get(id);
    if (!b) return;
    scene.remove(b.mesh);
    boxes.delete(id);
}

// La autoridad es el jugador conectado con el ID más bajo
function isAuthority() {
    let min = Infinity;
    for (const c of cars.values()) if (c.online && c.id < min) min = c.id;
    return min === meId;
}

function spawnBox() {
    for (let tries = 0; tries < 15; tries++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * (ARENA_R - 8);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const nearCar = [...cars.values()].some((c) => c.online && Math.hypot(c.x - x, c.z - z) < 6);
        const nearBox = [...boxes.values()].some((b) => Math.hypot(b.x - x, b.z - z) < 6);
        if (nearCar || nearBox) continue;
        const id = `${meId}_${++boxSeq}`;
        addBox(id, x, z);
        channel.whisper('box-spawn', { id, x: +x.toFixed(2), z: +z.toFixed(2) });
        return;
    }
}

function grant(id, to) {
    if (!boxes.has(id)) return;
    const type = POWERS[Math.floor(Math.random() * POWERS.length)];
    removeBox(id);
    channel.whisper('box-granted', { id, to, type });
    if (to === meId) givePower(type);
}

function authorityTick(dt) {
    if (phase !== 'live' || !isAuthority()) return;

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        spawnTimer = SPAWN_EVERY;
        if (boxes.size < MAX_BOXES) spawnBox();
    }

    syncTimer -= dt;
    if (syncTimer <= 0) {
        syncTimer = 2;
        channel.whisper('box-sync', {
            boxes: [...boxes.values()].map((b) => ({ id: b.id, x: b.x, z: b.z })),
        });
    }
}

function updateBoxes() {
    const t = now();
    for (const b of boxes.values()) {
        b.mesh.rotation.y = t * 1.5;
        b.mesh.position.y = 1.2 + Math.sin(t * 2 + b.x) * 0.25;

        if (!power && !me.dead && phase === 'live' && Math.hypot(me.x - b.x, me.z - b.z) < 2.4) {
            if (isAuthority()) grant(b.id, meId);
            else if (t - b.claim > 1) {
                b.claim = t;
                channel.whisper('box-claim', { id: b.id, by: meId });
            }
        }
    }
}

// ───────────── Tomates ─────────────
const tomatoes = new Map();
let projSeq = 0;

function addTomato(id, owner, x, z, dx, dz) {
    if (tomatoes.has(id)) return;
    const g = new THREE.Group();
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), mat(0xe53935));
    fruit.castShadow = true;
    g.add(fruit);
    const cap = new THREE.Mesh(B(0.35, 0.12, 0.35), mat(0x2e7d32));
    cap.position.y = 0.45;
    g.add(cap);
    g.position.set(x, 1.4, z);
    scene.add(g);
    tomatoes.set(id, { id, owner, x, z, dx, dz, t: 0, mesh: g });
}

function removeTomato(id) {
    const t = tomatoes.get(id);
    if (!t) return;
    scene.remove(t.mesh);
    tomatoes.delete(id);
}

function throwTomato() {
    const dx = Math.sin(me.h), dz = Math.cos(me.h);
    const x = me.x + dx * 3, z = me.z + dz * 3;
    const id = `t_${meId}_${++projSeq}`;
    addTomato(id, meId, x, z, dx, dz);
    channel.whisper('tomato-throw', { id, owner: meId, x: +x.toFixed(2), z: +z.toFixed(2), dx, dz });
}

function updateProjectiles(dt) {
    for (const t of [...tomatoes.values()]) {
        t.t += dt;
        t.x += t.dx * TOMATO_SPEED * dt;
        t.z += t.dz * TOMATO_SPEED * dt;
        t.mesh.position.set(t.x, 1.4, t.z);
        t.mesh.rotation.x += dt * 10;

        if (t.t > 2.5 || Math.hypot(t.x, t.z) > ARENA_R + 2) {
            removeTomato(t.id);
            continue;
        }

        // Cada cliente comprueba si el tomate le pegó a su propio auto
        if (t.owner !== meId && !me.dead && Math.hypot(me.x - t.x, me.z - t.z) < 2.1) {
            removeTomato(t.id);
            burst(t.x, t.z, 0xd32f2f);
            channel.whisper('tomato-hit', { id: t.id, x: t.x, z: t.z });
            if (me.shieldT <= 0) {
                me.kx += t.dx * 8;
                me.kz += t.dz * 8;
                showMsg('¡Tomatazo! 🍅');
                takeDamage(TOMATO_DMG);
            }
        }
    }
}

// ───────────── Charcos de lodo ─────────────
const puddles = new Map();
let mudSeq = 0;

function addMud(id, x, z) {
    if (puddles.has(id)) return;
    const m = new THREE.Mesh(new THREE.CircleGeometry(MUD_R, 28), mat(0x4e342e));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.05, z);
    m.receiveShadow = true;
    scene.add(m);
    puddles.set(id, { id, x, z, mesh: m, born: now(), hit: false });
    if (puddles.size > 10) removeMud(puddles.keys().next().value);
}

function removeMud(id) {
    const m = puddles.get(id);
    if (!m) return;
    scene.remove(m.mesh);
    puddles.delete(id);
}

function dropMud() {
    const x = me.x - Math.sin(me.h) * 4.5;
    const z = me.z - Math.cos(me.h) * 4.5;
    const id = `m_${meId}_${++mudSeq}`;
    addMud(id, x, z);
    channel.whisper('mud-drop', { id, x: +x.toFixed(2), z: +z.toFixed(2) });
}

function updateMud() {
    const t = now();
    for (const m of [...puddles.values()]) {
        if (t - m.born > MUD_LIFE) {
            removeMud(m.id);
            continue;
        }
        const inside = Math.hypot(me.x - m.x, me.z - m.z) < MUD_R;
        if (inside && !m.hit && !me.dead) {
            m.hit = true;
            if (me.shieldT <= 0) {
                me.mudT = 2.5;
                me.spin = (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 1.5);
                showMsg('¡Charco de lodo! 🟤');
                sfx('mud');
            }
        } else if (!inside) {
            m.hit = false;
        }
    }
}

// ───────────── Vida y daño ─────────────
function takeDamage(n) {
    if (phase !== 'live' || me.dead || me.shieldT > 0) return;
    me.hp = Math.max(0, me.hp - n);
    flash();
    sfx('hit');
    vibrate(Math.min(120, 30 + n * 6));
    if (me.hp <= 0) {
        me.dead = true;
        me.speed = 0;
        showMsg('💀 Te eliminaron — ahora eres espectador', 3000);
    }
}

// ───────────── Poderes ─────────────
let power = null;
let ammo = 0;
let lastShot = 0;

function updatePowerHud() {
    if (touch) touch.setPower(power ? { kind: power, name: POWER_INFO[power].name, ammo } : null);
    if (!power) {
        $('power').textContent = 'Sin poder — recoge una caja 🎁';
        return;
    }
    const i = POWER_INFO[power];
    $('power').textContent = `${i.icon} ${i.name}${power === 'tomato' ? ` ×${ammo}` : ''} — ${IS_TOUCH ? 'toca Poder' : 'pulsa ESPACIO'}`;
}

function givePower(type) {
    sfx('pick');
    vibrate(25);
    power = type;
    ammo = type === 'tomato' ? 3 : 0;
    updatePowerHud();
}

function usePower() {
    if (!power || me.dead || phase !== 'live') return;

    if (power === 'tomato') {
        if (now() - lastShot < 0.35) return;
        lastShot = now();
        throwTomato();
        sfx('throw');
        if (--ammo <= 0) power = null;
    } else if (power === 'mud') {
        dropMud();
        sfx('mud');
        power = null;
    } else if (power === 'shield') {
        me.shieldT = SHIELD_TIME;
        sfx('shield');
        power = null;
    } else if (power === 'potion') {
        if (me.hp >= MAX_HP) {
            showMsg('Ya tienes la vida completa 💚');
            return;
        }
        me.hp = Math.min(MAX_HP, me.hp + POTION_HEAL);
        burst(me.x, me.z, 0x66bb6a);
        sfx('potion');
        power = null;
    }
    updatePowerHud();
}

addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat) usePower();
});

// ───────────── Fin de partida y cuenta regresiva ─────────────
let phase = 'waiting'; // waiting | countdown | live | over
const waitStart = now();
let countdownEnd = 0;
let lastCount = 0;

function nick(id) {
    return players.find((p) => p.user_id === id)?.nickname ?? '???';
}

function checkMatch() {
    if (phase === 'over') return;
    const connected = [...cars.values()].filter((c) => c.online).length;

    if (phase === 'waiting') {
        const everyone = connected >= players.length;
        const timeout = now() - waitStart > 15 && connected >= 2;
        if (everyone || timeout) {
            phase = 'countdown';
            countdownEnd = now() + 3;
            lastCount = 4;
        } else {
            $('msg').textContent = `Esperando jugadores… (${connected}/${players.length})`;
            $('msg').style.opacity = 1;
        }
        return;
    }

    if (phase === 'countdown') {
        const left = Math.ceil(countdownEnd - now());
        if (left !== lastCount) {
            lastCount = left;
            if (left > 0) {
                showMsg(String(left), 1000);
                sfx('beep');
            }
        }
        if (now() >= countdownEnd) {
            phase = 'live';
            showMsg('¡A GRANJEAR! 🌾', 1500);
            sfx('go');
        }
        return;
    }

    const alive = [...cars.values()].filter((c) => c.online && !c.dead);
    if (alive.length <= 1) {
        phase = 'over';
        const w = alive[0];
        $('end-title').textContent = !w
            ? '🤝 ¡Empate!'
            : w === me
                ? '🏆 ¡Ganaste!'
                : `🏆 ¡Gana ${nick(w.id)}!`;
        $('end').style.display = 'grid';
        sfx(w === me ? 'win' : 'lose');
    }
}

// ───────────── Actualización por frame (efectos, vida, proyectiles) ─────────────
function updateFx(dt) {
    me.shieldT = Math.max(0, me.shieldT - dt);
    me.mudT = Math.max(0, me.mudT - dt);
    me.fx = me.shieldT > 0 ? 's' : '';

    for (const c of cars.values()) {
        c.shield.visible = c.fx.includes('s');
        if (Math.round(c.hp) !== c.hpShown) drawHp(c);
        if (c.dead && !c.deathShown) {
            c.deathShown = true;
            burst(c.x, c.z, 0xff5722, 2.5);
        }
        c.group.visible = c.online && !c.dead;
    }

    // HUD de vida propia
    const pct = Math.max(0, me.hp) / MAX_HP;
    $('hp-fill').style.width = `${pct * 100}%`;
    $('hp-fill').style.background = pct > 0.5 ? '#66bb6a' : pct > 0.25 ? '#ffca28' : '#ef5350';
    $('hp-text').textContent = `❤️ ${Math.round(me.hp)}`;

    // Explosiones
    for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.t += dt;
        const k = b.t / 0.35;
        if (k >= 1) {
            scene.remove(b.m);
            b.m.geometry.dispose();
            b.m.material.dispose();
            bursts.splice(i, 1);
            continue;
        }
        b.m.scale.setScalar(b.size * (0.5 + k * 2.5));
        b.m.material.opacity = 0.8 * (1 - k);
    }

    updateProjectiles(dt);
    updateMud();
    checkMatch();
}

// ───────────── Red: cajas, tomates y lodo ─────────────
channel.listenForWhisper('box-spawn', (d) => addBox(d.id, d.x, d.z));

channel.listenForWhisper('box-sync', (d) => {
    if (isAuthority()) return;
    const ids = new Set(d.boxes.map((b) => b.id));
    d.boxes.forEach((b) => addBox(b.id, b.x, b.z));
    [...boxes.keys()].forEach((id) => { if (!ids.has(id)) removeBox(id); });
});

channel.listenForWhisper('box-claim', (d) => {
    if (isAuthority()) grant(d.id, d.by);
});

channel.listenForWhisper('box-granted', (d) => {
    removeBox(d.id);
    if (d.to === meId) givePower(d.type);
});

channel.listenForWhisper('tomato-throw', (d) => {
    addTomato(d.id, d.owner, d.x, d.z, d.dx, d.dz);
    sfx('throw');
});

channel.listenForWhisper('tomato-hit', (d) => {
    removeTomato(d.id);
    burst(d.x, d.z, 0xd32f2f);
    sfx('hit');
});

channel.listenForWhisper('mud-drop', (d) => addMud(d.id, d.x, d.z));

// Un rival me avisa de que me embistió: aplico el daño (sin duplicarlo) y el rebote.
channel.listenForWhisper('car-hit', (d) => {
    if (d.to !== meId || phase !== 'live' || me.dead) return;
    if (DEBUG_HITS) console.log('[hit] recibido de', d.from, d.dmg);

    registerHit(d.from, d.dmg);

    if (me.bumpCd === 0) {
        applyBump(me, d.nx, d.nz, d.v, d.sh);
        const from = cars.get(d.from);
        const mx = from ? (me.x + from.x) / 2 : me.x;
        const mz = from ? (me.z + from.z) / 2 : me.z;
        effects.sparks(mx, 1.2, mz, Math.round(6 + d.dmg * 1.5));
    }
});

updatePowerHud();

// ───────────── Cámara y bucle ─────────────
const camTarget = new THREE.Vector3();
function camCar() {
    if (!me.dead) return me;
    return [...cars.values()].find((c) => c.online && !c.dead) || me;
}

function updateCamera(dt) {
    const t = camCar();
    camTarget.set(t.x - Math.sin(t.h) * 11, 7, t.z - Math.cos(t.h) * 11);
    camera.position.lerp(camTarget, 1 - Math.exp(-5 * dt));
    camera.lookAt(t.x + Math.sin(t.h) * 4, 1.5, t.z + Math.cos(t.h) * 4);
}
camera.position.set(me.x - Math.sin(me.h) * 11, 7, me.z - Math.cos(me.h) * 11);

// Polvo (o lodo) que levantan las ruedas traseras al andar rápido.
function emitDust(c, dt) {
    if (!c.online || c.dead) return;
    const sp = Math.abs(c.speed);
    if (sp < 5) return;
    c.dustT = (c.dustT ?? 0) - dt;
    if (c.dustT > 0) return;
    c.dustT = 0.075 - Math.min(0.04, sp * 0.002);
    const bx = c.x - Math.sin(c.h) * 1.5, bz = c.z - Math.cos(c.h) * 1.5;
    const lx = Math.cos(c.h) * 0.95, lz = -Math.sin(c.h) * 0.95;
    for (const s of [-1, 1]) effects.dust(bx + lx * s, bz + lz * s, c.mudT > 0 ? 0x5d4037 : 0xd9c08a);
}

// ───────────── Calidad adaptable ─────────────
function applyTier(i) {
    tier = i;
    const q = TIERS[i];
    renderer.setPixelRatio(q.pixelRatio);
    renderer.setSize(innerWidth, innerHeight);
    if (sun.shadow.mapSize.x !== q.shadow) {
        sun.shadow.mapSize.set(q.shadow, q.shadow);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
    }
    console.info('[calidad] nivel', i, q);
}

let fpsSum = 0, fpsFrames = 0, fpsWarm = 4, fpsCool = 0;
function adaptQuality(dt) {
    if (document.hidden) return;
    if (fpsWarm > 0) { fpsWarm -= dt; return; } // ignora la carga inicial
    if (fpsCool > 0) { fpsCool -= dt; return; }
    fpsSum += dt;
    if (++fpsFrames < 120) return;
    const avg = fpsSum / fpsFrames;
    fpsSum = 0; fpsFrames = 0;
    if (avg > 1 / 38 && tier < TIERS.length - 1) {
        applyTier(tier + 1);
        fpsCool = 4;
    }
}

const clock = new THREE.Clock();
function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);

    updateLocal(dt);
    for (const o of cars.values()) if (o !== me) updateRemote(o, dt);
    const tNow = now();
    for (const o of cars.values()) {
        o.group.position.set(o.x, 0, o.z);
        o.group.rotation.y = o.h;
        animateVehicle(o, dt, tNow);
        emitDust(o, dt);
    }
    arena.update(dt, tNow);
    effects.update(dt);

    authorityTick(dt);
    updateBoxes();
    updateFx(dt);
    sendState(dt);
    updateCamera(dt);
    updateEngine();
    renderer.render(scene, camera);
    adaptQuality(dt);
}
loop();