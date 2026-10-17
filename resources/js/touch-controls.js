// Controles táctiles de Farm Crash.
//
// Crea su propia interfaz (no depende del HTML de la vista):
//   - Joystick flotante en la mitad izquierda: desliza el dedo a los lados para girar (giro analógico).
//   - Botones a la derecha: acelerar, frenar y poder (muestra el poder que tienes).
//   - Atajos arriba a la derecha: acelerar solo, sonido y pantalla completa.
//   - Aviso para girar el teléfono, bloqueo de zoom y gestos, y pantalla siempre encendida.

const KEY_AUTO = 'farm-auto-gas';
const STEER_R = 64; // píxeles de recorrido del joystick hasta el giro máximo
const DEAD = 0.12; // zona muerta (fracción del recorrido)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ICON = {
    gas: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 10l14 14-14 14M26 10l14 14-14 14"/></svg>',
    brake: '<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><rect x="11" y="11" width="26" height="26" rx="6"/></svg>',
    crate: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="12" width="40" height="40" rx="6" fill="#ffc400" stroke="#1d140f" stroke-width="4"/><path d="M26 28c0-8 12-8 12 0 0 6-6 5-6 11" fill="none" stroke="#1d140f" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="46" r="3" fill="#1d140f"/></svg>',
    tomato: '<svg viewBox="0 0 64 64" aria-hidden="true" stroke="#1d140f" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><circle cx="32" cy="37" r="22" fill="#e53935"/><ellipse cx="32" cy="12" rx="4.5" ry="9" fill="#4caf50" transform="rotate(-65 32 16)"/><ellipse cx="32" cy="12" rx="4.5" ry="9" fill="#4caf50" transform="rotate(65 32 16)"/><ellipse cx="32" cy="10" rx="4.5" ry="9" fill="#4caf50"/><path d="M19 36c1-6 4-9 9-10" fill="none" stroke="#fff" stroke-opacity=".75"/></svg>',
    mud: '<svg viewBox="0 0 64 64" aria-hidden="true" stroke="#1d140f" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><circle cx="20" cy="22" r="3" fill="#6d4c41"/><circle cx="33" cy="14" r="3.5" fill="#6d4c41"/><circle cx="46" cy="21" r="3" fill="#6d4c41"/><path d="M6 44c0-9 11-13 24-12 14-2 28 3 28 13 0 9-12 14-27 13C15 59 6 54 6 44z" fill="#6d4c41"/><ellipse cx="22" cy="43" rx="7" ry="3" fill="#8d6e63" stroke="none"/></svg>',
    shield: '<svg viewBox="0 0 64 64" aria-hidden="true" stroke="#1d140f" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M32 5l22 8v17c0 14-9 24-22 29C19 54 10 44 10 30V13z" fill="#40c4ff"/><path d="M32 12l15 5.5V30c0 9-6 16-15 20z" fill="#81d4fa" stroke="none"/><path d="M32 22v18M23 31h18" fill="none" stroke="#fff" stroke-width="4"/></svg>',
    potion: '<svg viewBox="0 0 64 64" aria-hidden="true" stroke="#1d140f" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><rect x="25" y="3" width="14" height="7" rx="2" fill="#a8703a"/><path d="M27 10h10v13l14 24c3 6-1 13-8 13H21c-7 0-11-7-8-13l14-24z" fill="#e8f7ff"/><path d="M19 41h26l6 10c3 6-1 9-8 9H21c-7 0-11-3-8-9z" fill="#4cd964" stroke="none"/><path d="M27 10h10v13l14 24c3 6-1 13-8 13H21c-7 0-11-7-8-13l14-24z" fill="none"/></svg>',
    soundOn: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18h8l10-8v28l-10-8H6z" fill="currentColor"/><path d="M32 17c3 3 3 11 0 14M38 11c6 7 6 19 0 26"/></svg>',
    soundOff: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18h8l10-8v28l-10-8H6z" fill="currentColor"/><path d="M32 18l12 12M44 18L32 30"/></svg>',
    full: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 18V8h10M30 8h10v10M40 30v10H30M18 40H8V30"/></svg>',
    rotate: '<svg viewBox="0 0 64 64" fill="none" stroke="#ffc400" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="20" y="6" width="24" height="44" rx="5"/><path d="M30 44h4"/><path d="M12 56c10 6 28 6 40 0M46 52l6 4-2 7"/></svg>',
};

const POWER_LABEL = { tomato: 'Tomates', mud: 'Lodo', shield: 'Escudo', potion: 'Poción' };

const CSS = `
.tc-on, .tc-on body { overscroll-behavior: none; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
.tc-on body { position: fixed; inset: 0; width: 100%; height: 100%; overflow: hidden; }
.tc-on canvas { touch-action: none; }
.tc-on #mobile-controls { display: none !important; }
.tc-on #power { display: none; }
.tc-on #hud small { display: none; }
.tc-on #hud { top: max(8px, env(safe-area-inset-top)); left: max(8px, env(safe-area-inset-left)); padding: 6px 10px; font-size: 12px; line-height: 1.4; }
.tc-on #hp { bottom: auto; top: max(8px, env(safe-area-inset-top)); width: min(260px, 32vw); }
.tc-on #msg { top: 24%; font-size: 22px; }

.tc-root { position: fixed; inset: 0; z-index: 50; pointer-events: none; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
.tc-root > * { pointer-events: auto; }

/* Joystick flotante */
.tc-zone { position: absolute; left: 0; bottom: 0; width: 46vw; height: 72vh; touch-action: none; }
.tc-hint {
    position: absolute; left: calc(max(24px, env(safe-area-inset-left)) + 36px); bottom: max(30px, env(safe-area-inset-bottom));
    width: 132px; height: 132px; border-radius: 50%; border: 3px dashed rgba(255, 196, 0, .9); background: rgba(29, 20, 15, .28);
    display: grid; place-items: center; padding: 18px; text-align: center;
    color: rgba(255, 255, 255, .8); font: 800 12px/1.2 system-ui, sans-serif; text-shadow: 0 1px 3px #000; pointer-events: none;
}
.tc-zone.active .tc-hint { display: none; }
.tc-base {
    position: absolute; display: none; width: 150px; height: 150px; margin: -75px 0 0 -75px; border-radius: 50%;
    background: rgba(29, 20, 15, .4); border: 3px solid rgba(255, 196, 0, .85); pointer-events: none;
}
.tc-zone.active .tc-base { display: block; }
.tc-knob {
    position: absolute; left: 50%; top: 50%; width: 64px; height: 64px; margin: -32px 0 0 -32px; border-radius: 50%;
    background: #ffc400; border: 3px solid #1d140f; box-shadow: 0 4px 0 #1d140f;
}

/* Botones redondos */
.tc-btn {
    position: absolute; display: grid; place-items: center; align-content: center; gap: 2px; padding: 0;
    border-radius: 50%; border: 3px solid rgba(255, 196, 0, .9); background: rgba(29, 20, 15, .55); color: #fff;
    font: 800 11px/1 system-ui, sans-serif; text-shadow: 0 1px 2px #000;
    touch-action: none; -webkit-tap-highlight-color: transparent; transition: transform .06s ease, background .06s ease;
}
.tc-btn svg { width: 38px; height: 38px; flex: none; }
.tc-btn.on { transform: scale(.92); background: rgba(255, 196, 0, .92); color: #1d140f; text-shadow: none; }
.tc-gas   { right: max(20px, env(safe-area-inset-right)); bottom: max(20px, env(safe-area-inset-bottom)); width: 112px; height: 112px; }
.tc-brake { right: calc(max(20px, env(safe-area-inset-right)) + 126px); bottom: max(20px, env(safe-area-inset-bottom)); width: 84px; height: 84px; }
.tc-power { right: calc(max(20px, env(safe-area-inset-right)) + 12px); bottom: calc(max(20px, env(safe-area-inset-bottom)) + 128px); width: 90px; height: 90px; }
.tc-power svg { width: 44px; height: 44px; }
.tc-power.empty { opacity: .6; }
.tc-power.has { border-color: #7ddc3c; background: rgba(40, 110, 20, .7); animation: tcPulse 1.1s ease-in-out infinite; }
.tc-power.has.on { background: rgba(125, 220, 60, .95); color: #1d140f; animation: none; }
.tc-badge {
    position: absolute; top: -8px; right: -8px; min-width: 28px; height: 28px; padding: 0 6px; display: none;
    place-items: center; border-radius: 14px; background: #e53935; border: 3px solid #1d140f; color: #fff; font: 800 13px/1 system-ui, sans-serif; text-shadow: none;
}
.tc-badge.show { display: grid; }
@keyframes tcPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(125, 220, 60, .6); } 50% { box-shadow: 0 0 0 10px rgba(125, 220, 60, 0); } }

/* Con "acelerar solo" activo no hace falta el botón de acelerar */
.tc-auto .tc-gas { display: none; }
.tc-auto .tc-brake { right: max(20px, env(safe-area-inset-right)); width: 104px; height: 104px; }
.tc-auto .tc-power { right: calc(max(20px, env(safe-area-inset-right)) + 6px); }

/* Atajos superiores */
.tc-top { position: absolute; top: max(8px, env(safe-area-inset-top)); right: max(8px, env(safe-area-inset-right)); display: flex; gap: 8px; }
.tc-chip {
    display: inline-flex; align-items: center; gap: 6px; min-width: 44px; height: 44px; padding: 0 12px;
    border-radius: 12px; border: 2px solid rgba(255, 196, 0, .9); background: rgba(29, 20, 15, .62); color: #fff;
    font: 700 13px/1 system-ui, sans-serif; touch-action: manipulation;
}
.tc-chip svg { width: 22px; height: 22px; flex: none; }
.tc-chip[aria-pressed='true'] { background: rgba(255, 196, 0, .92); color: #1d140f; }

/* Aviso para girar el teléfono */
.tc-rotate {
    position: fixed; inset: 0; z-index: 100; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
    padding: 24px; text-align: center; background: rgba(29, 20, 15, .95); color: #fff; font: 700 20px/1.3 system-ui, sans-serif;
}
.tc-rotate svg { width: 92px; height: 92px; animation: tcTurn 2.4s ease-in-out infinite; }
.tc-rotate small { font-weight: 500; font-size: 14px; opacity: .8; }
@keyframes tcTurn { 0%, 20% { transform: rotate(0); } 60%, 100% { transform: rotate(-90deg); } }
@media (orientation: portrait) and (max-width: 700px) { .tc-rotate { display: flex; } }

@media (max-height: 420px) {
    .tc-gas { width: 96px; height: 96px; }
    .tc-brake { width: 72px; height: 72px; right: calc(max(20px, env(safe-area-inset-right)) + 108px); }
    .tc-power { width: 78px; height: 78px; bottom: calc(max(20px, env(safe-area-inset-bottom)) + 108px); }
    .tc-hint { width: 112px; height: 112px; }
}
@media (prefers-reduced-motion: reduce) { .tc-root *, .tc-rotate * { animation: none !important; } }
`;

function el(tag, cls, html) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
}

function lockViewport() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        document.head.appendChild(meta);
    }
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
}

/**
 * @param {object}   opts
 * @param {object}   opts.keys          Mapa de teclas del juego (se rellenan KeyW y KeyS).
 * @param {object}   opts.input         Entrada analógica; se escribe input.steer (-1..1, izquierda positiva).
 * @param {Function} opts.onPower       Se llama al tocar el botón de poder.
 * @param {Function} [opts.onToggleMute] Alterna el sonido y devuelve true si queda silenciado.
 * @param {Function} [opts.isMuted]     Devuelve true si el sonido está silenciado.
 */
export function createTouchControls({ keys, input, onPower, onToggleMute, isMuted }) {
    document.getElementById('mobile-controls')?.remove(); // controles antiguos
    document.documentElement.classList.add('tc-on');
    lockViewport();

    const style = el('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    let auto = true;
    try { auto = localStorage.getItem(KEY_AUTO) !== '0'; } catch (e) { /* sin almacenamiento */ }

    let gasing = false;
    let braking = false;

    const root = el('div', 'tc-root');
    root.addEventListener('contextmenu', (e) => e.preventDefault());

    function refresh() {
        keys.KeyW = auto ? !braking : gasing;
        keys.KeyS = braking;
        root.classList.toggle('tc-auto', auto);
    }

    // ── Joystick flotante de giro ──
    const zone = el('div', 'tc-zone');
    const hint = el('div', 'tc-hint', 'Desliza para girar');
    const base = el('div', 'tc-base');
    const knob = el('div', 'tc-knob');
    base.appendChild(knob);
    zone.append(hint, base);

    let stickId = null;
    let originX = 0;

    function moveStick(e) {
        const dx = clamp((e.clientX - originX) / STEER_R, -1, 1);
        const m = Math.abs(dx);
        const v = m < DEAD ? 0 : Math.sign(dx) * ((m - DEAD) / (1 - DEAD));
        input.steer = -v; // arrastrar a la derecha = girar a la derecha
        knob.style.transform = `translateX(${dx * STEER_R * 0.75}px)`;
    }
    function endStick(e) {
        if (e.pointerId !== stickId) return;
        stickId = null;
        input.steer = 0;
        knob.style.transform = '';
        zone.classList.remove('active');
    }
    zone.addEventListener('pointerdown', (e) => {
        if (stickId !== null) return;
        e.preventDefault();
        stickId = e.pointerId;
        zone.setPointerCapture(e.pointerId);
        const r = zone.getBoundingClientRect();
        originX = e.clientX;
        base.style.left = `${e.clientX - r.left}px`;
        base.style.top = `${e.clientY - r.top}px`;
        zone.classList.add('active');
        moveStick(e);
    });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => zone.addEventListener(t, endStick));

    // ── Botones ──
    function holdButton(btn, onDown, onUp) {
        let id = null;
        btn.addEventListener('pointerdown', (e) => {
            if (id !== null) return;
            e.preventDefault();
            id = e.pointerId;
            btn.setPointerCapture(id);
            btn.classList.add('on');
            onDown();
        });
        const up = (e) => {
            if (e.pointerId !== id) return;
            id = null;
            btn.classList.remove('on');
            onUp();
        };
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => btn.addEventListener(t, up));
    }

    const gas = el('button', 'tc-btn tc-gas', `${ICON.gas}<span>Acelerar</span>`);
    const brake = el('button', 'tc-btn tc-brake', `${ICON.brake}<span>Frenar</span>`);
    const power = el('button', 'tc-btn tc-power empty');
    const powerIcon = el('span', '', ICON.crate);
    powerIcon.style.display = 'contents';
    const powerLabel = el('span', '', 'Sin poder');
    const badge = el('span', 'tc-badge');
    power.append(powerIcon, powerLabel, badge);
    [gas, brake, power].forEach((b) => { b.type = 'button'; });

    holdButton(gas, () => { gasing = true; refresh(); }, () => { gasing = false; refresh(); });
    holdButton(brake, () => { braking = true; refresh(); }, () => { braking = false; refresh(); });
    holdButton(power, () => { if (navigator.vibrate) navigator.vibrate(15); onPower(); }, () => {});

    // ── Atajos superiores ──
    const top = el('div', 'tc-top');

    const autoChip = el('button', 'tc-chip');
    autoChip.type = 'button';
    function drawAuto() {
        autoChip.setAttribute('aria-pressed', String(auto));
        autoChip.textContent = auto ? 'Acelerar solo: sí' : 'Acelerar solo: no';
    }
    autoChip.addEventListener('click', () => {
        auto = !auto;
        try { localStorage.setItem(KEY_AUTO, auto ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
        drawAuto();
        refresh();
    });
    drawAuto();

    const soundChip = el('button', 'tc-chip', ICON.soundOn);
    soundChip.type = 'button';
    soundChip.setAttribute('aria-label', 'Sonido');
    function drawSound() {
        const muted = isMuted ? isMuted() : false;
        soundChip.innerHTML = muted ? ICON.soundOff : ICON.soundOn;
        soundChip.setAttribute('aria-pressed', String(muted));
    }
    soundChip.addEventListener('click', () => {
        if (onToggleMute) onToggleMute();
        drawSound();
    });

    top.append(autoChip, soundChip);

    const root_ = document.documentElement;
    const requestFs = root_.requestFullscreen || root_.webkitRequestFullscreen;
    if (requestFs) {
        const fsChip = el('button', 'tc-chip', ICON.full);
        fsChip.type = 'button';
        fsChip.setAttribute('aria-label', 'Pantalla completa');
        fsChip.addEventListener('click', () => {
            const inFs = document.fullscreenElement || document.webkitFullscreenElement;
            if (inFs) {
                (document.exitFullscreen || document.webkitExitFullscreen).call(document);
                return;
            }
            Promise.resolve(requestFs.call(root_))
                .then(() => screen.orientation?.lock?.('landscape'))
                .catch(() => { /* no disponible en este navegador */ });
        });
        top.append(fsChip);
    }

    // ── Aviso de orientación ──
    const rotate = el('div', 'tc-rotate', `${ICON.rotate}<div>Gira tu teléfono para jugar<br><small>Farm Crash se juega en horizontal</small></div>`);

    root.append(zone, gas, brake, power, top, rotate);
    document.body.appendChild(root);
    refresh();

    // ── Pantalla encendida y limpieza de entradas ──
    let wake = null;
    async function keepAwake() {
        try {
            if ('wakeLock' in navigator && !wake) {
                wake = await navigator.wakeLock.request('screen');
                wake.addEventListener('release', () => { wake = null; });
            }
        } catch (e) { /* el navegador no lo permite */ }
    }
    root.addEventListener('pointerdown', keepAwake, { once: true });

    function releaseAll() {
        gasing = false;
        braking = false;
        input.steer = 0;
        stickId = null;
        zone.classList.remove('active');
        [gas, brake, power].forEach((b) => b.classList.remove('on'));
        refresh();
    }
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) releaseAll();
        else keepAwake();
    });

    // ── API ──
    function setPower(info) {
        power.classList.toggle('empty', !info);
        power.classList.toggle('has', !!info);
        if (!info) {
            powerIcon.innerHTML = ICON.crate;
            powerLabel.textContent = 'Sin poder';
            badge.classList.remove('show');
            return;
        }
        powerIcon.innerHTML = ICON[info.kind] || ICON.crate;
        powerLabel.textContent = POWER_LABEL[info.kind] || info.name;
        if (info.kind === 'tomato' && info.ammo > 0) {
            badge.textContent = `x${info.ammo}`;
            badge.classList.add('show');
        } else {
            badge.classList.remove('show');
        }
    }

    drawSound();
    return { setPower };
}