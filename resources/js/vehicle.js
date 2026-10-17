import * as THREE from 'three';

/**
 * Vehículos de Farm Crash: cada animal conduce su propio vehículo.
 *
 *   cow       -> camioneta lechera        pig       -> hot rod rosa
 *   chicken   -> buggy de carreras        scarecrow -> carro rústico con cuervo
 *
 * El frente apunta hacia +Z. Cada grupo devuelto trae en `userData`:
 *   body   grupo de la carrocería (se inclina al girar/acelerar)
 *   wheels grupos de las 4 ruedas (rotar en X para que "rueden")
 *   head   cabeza del conductor (se anima aparte)
 *   top    altura máxima del modelo (útil para colocar la etiqueta con el nombre)
 *
 * Llama a animateVehicle(car, dt, time) una vez por frame para inclinar la
 * carrocería, girar las ruedas y mover la cabeza.
 */

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

/**
 * @param {string} character  'cow' | 'pig' | 'chicken' | 'scarecrow' (otro valor => vaca)
 * @param {{scale?: number}} options  escala uniforme del vehículo (por defecto 1)
 */
export function buildVehicle(character = 'scarecrow', { scale = 1 } = {}) {
    const g = (BUILDERS[character] || buildCow)();
    g.scale.setScalar(scale);
    mergeByMaterial(g.userData.body); // la carrocería se mueve como un bloque
    if (g.userData.head) mergeByMaterial(g.userData.head); // la cabeza como otro (se anima aparte)
    return g;
}

/** Inclinación, rebote y giro de ruedas. Llamar una vez por auto y por frame. */
export function animateVehicle(car, dt, time) {
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