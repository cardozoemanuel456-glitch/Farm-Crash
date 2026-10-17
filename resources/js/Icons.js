// Iconos SVG propios de Farm Royale (sustituyen a los emojis).
// Estilo: relleno plano con contorno de tinta, igual que el resto de la interfaz.
// Uso: import { icon } from './icons.js';  element.innerHTML = icon('cow');

const INK = '#2a1a0e';

const wrap = (body) =>
    `<svg class="ico" viewBox="0 0 64 64" width="1em" height="1em" fill="none" ` +
    `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" ` +
    `aria-hidden="true" focusable="false">${body}</svg>`;

const ICONS = {
    // ───── Personajes ─────
    cow: `
        <path d="M19 17C11 12 8 8 10 3c6 1 11 5 15 10z" fill="#f6e7b4"/>
        <path d="M45 17C53 12 56 8 54 3c-6 1-11 5-15 10z" fill="#f6e7b4"/>
        <ellipse cx="9" cy="27" rx="8" ry="5" transform="rotate(-20 9 27)" fill="#fff"/>
        <ellipse cx="55" cy="27" rx="8" ry="5" transform="rotate(20 55 27)" fill="#fff"/>
        <rect x="14" y="12" width="36" height="44" rx="16" fill="#fff"/>
        <path d="M32 13.5h6c4 0 7 3 8 7-6 1-11-2-14-7z" fill="${INK}" stroke="none"/>
        <ellipse cx="32" cy="44" rx="12" ry="9" fill="#f6a7be"/>
        <circle cx="27.5" cy="44" r="1.8" fill="${INK}" stroke="none"/>
        <circle cx="36.5" cy="44" r="1.8" fill="${INK}" stroke="none"/>
        <circle cx="24" cy="30" r="2.6" fill="${INK}" stroke="none"/>
        <circle cx="40" cy="30" r="2.6" fill="${INK}" stroke="none"/>`,

    chicken: `
        <path d="M22 17C17 9 23 3 28 9c0-8 10-8 10 0 5-6 11 0 6 8z" fill="#e53935"/>
        <circle cx="32" cy="35" r="22" fill="#fff"/>
        <path d="M30 46c-2 9 6 9 4 0z" fill="#e53935"/>
        <path d="M25 36h14l-7 11z" fill="#ff9800"/>
        <circle cx="23" cy="30" r="2.6" fill="${INK}" stroke="none"/>
        <circle cx="41" cy="30" r="2.6" fill="${INK}" stroke="none"/>`,

    pig: `
        <path d="M15 22L11 6l17 8z" fill="#f48fb1"/>
        <path d="M49 22L53 6 36 14z" fill="#f48fb1"/>
        <rect x="9" y="12" width="46" height="42" rx="20" fill="#ffb3c8"/>
        <ellipse cx="32" cy="41" rx="13" ry="10" fill="#f06292"/>
        <ellipse cx="27" cy="41" rx="2.2" ry="3.2" fill="${INK}" stroke="none"/>
        <ellipse cx="37" cy="41" rx="2.2" ry="3.2" fill="${INK}" stroke="none"/>
        <circle cx="22" cy="29" r="2.6" fill="${INK}" stroke="none"/>
        <circle cx="42" cy="29" r="2.6" fill="${INK}" stroke="none"/>`,

    scarecrow: `
        <path d="M11 42L2 45M11 48L3 55M53 42l9 3M53 48l8 7" stroke="#d9a63a"/>
        <rect x="12" y="22" width="40" height="34" rx="14" fill="#e6c98d"/>
        <path d="M22 33l6 6m0-6l-6 6M36 33l6 6m0-6l-6 6"/>
        <path d="M32 39l-3.5 8h7z" fill="#f28c28"/>
        <path d="M22 51h20" stroke-dasharray="3 3"/>
        <ellipse cx="32" cy="23" rx="29" ry="6" fill="#8b5a2b"/>
        <path d="M18 23C18 6 46 6 46 23z" fill="#a8703a"/>
        <path d="M21 19h22" stroke="#b3261e" stroke-width="4"/>`,

    // ───── Interfaz ─────
    crown: `
        <path d="M8 48L5 18l16 13 11-19 11 19 16-13-3 30z" fill="#f2b632"/>
        <rect x="8" y="48" width="48" height="8" rx="2" fill="#f2b632"/>
        <circle cx="5" cy="17" r="3" fill="#e53935"/>
        <circle cx="32" cy="10" r="3" fill="#e53935"/>
        <circle cx="59" cy="17" r="3" fill="#e53935"/>`,

    flag: `
        <path d="M14 6v52"/>
        <path d="M14 9h36v26H14z" fill="#fff"/>
        <g fill="${INK}" stroke="none">
            <rect x="14" y="9" width="12" height="13"/>
            <rect x="38" y="9" width="12" height="13"/>
            <rect x="26" y="22" width="12" height="13"/>
        </g>`,

    tractor: `
        <rect x="5" y="28" width="30" height="14" rx="3" fill="#3d9a3d"/>
        <rect x="9" y="15" width="5" height="14" fill="${INK}" stroke="none"/>
        <path d="M32 12h16c2 0 3 1 3 3v27H32z" fill="#e53935"/>
        <rect x="36" y="16" width="11" height="11" rx="1" fill="#bfe6f5"/>
        <circle cx="44" cy="45" r="13" fill="${INK}"/>
        <circle cx="44" cy="45" r="5" fill="#f2b632" stroke="none"/>
        <circle cx="15" cy="49" r="8" fill="${INK}"/>
        <circle cx="15" cy="49" r="3" fill="#f2b632" stroke="none"/>`,

    check: `
        <circle cx="32" cy="32" r="26" fill="#5f9a2a"/>
        <path d="M20 33l8 8 16-18" stroke="#fff" stroke-width="6"/>`,
};

export function icon(name) {
    return ICONS[name] ? wrap(ICONS[name]) : '';
}

export const ICON_NAMES = Object.keys(ICONS);