<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Farm Crash - Lobby</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --ink: #1d140f;
            --gold: #ffc400;
            --sun: #ffd23f;
            --red: #e53935;
            --green: #7ddc3c;
            --green-d: #3f8f1c;
            --cream: #fff6e0;
            --road: 26vh;
            --display: 'Bowlby One', 'Arial Black', Impact, sans-serif;
            --body: 'Fredoka', 'Trebuchet MS', system-ui, sans-serif;
            --outline: -4px -4px 0 var(--ink), 4px -4px 0 var(--ink), -4px 4px 0 var(--ink), 4px 4px 0 var(--ink),
                       0 -4px 0 var(--ink), 0 4px 0 var(--ink), -4px 0 0 var(--ink), 4px 0 0 var(--ink), 0 9px 0 var(--ink);
        }

        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; min-height: 100%; }
        body { font-family: var(--body); color: var(--cream); background: #2fa8f0; overflow-x: hidden; }
        h1, h2, h3, p, ul { margin: 0; }
        ul { padding: 0; list-style: none; }
        button, input { font: inherit; }

        /* ───────── Escena de fondo con parallax ───────── */

        .scene {
            position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
            background: linear-gradient(#2fa8f0 0%, #7fd3f7 45%, #cdf1ff 72%);
        }
        .sun {
            position: absolute; right: 30%; top: 7%; width: 120px; height: 120px; border-radius: 50%;
            background: radial-gradient(circle, #fffbe0 0 34%, #ffd23f 35% 58%, rgba(255, 210, 63, 0) 72%);
        }
        .layer { position: absolute; left: 0; right: 0; overflow: hidden; }
        .layer::before {
            content: ''; position: absolute; top: 0; bottom: 0; left: 0;
            width: calc(100% + var(--tile));
            background-repeat: repeat-x; background-position: left bottom;
            animation: scroll var(--dur) linear infinite;
        }
        @keyframes scroll { to { transform: translateX(calc(var(--tile) * -1)); } }

        .l-clouds { top: 4%; height: 34%; --tile: 800px; --dur: 140s; }
        .l-clouds::before {
            background-position: left top; background-size: 800px 200px;
            background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='200' viewBox='0 0 800 200'><g fill='%23ffffff' fill-opacity='.88'><ellipse cx='120' cy='70' rx='64' ry='22'/><ellipse cx='165' cy='54' rx='42' ry='24'/><ellipse cx='520' cy='125' rx='74' ry='24'/><ellipse cx='572' cy='104' rx='44' ry='24'/><ellipse cx='330' cy='40' rx='44' ry='15'/></g></svg>");
        }

        .l-hills { bottom: calc(var(--road) + 36px); height: 150px; --tile: 600px; --dur: 42s; }
        .l-hills::before {
            background-size: 600px 150px;
            background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='150' viewBox='0 0 600 150'><path d='M0 150V70Q75 -10 150 70T300 70T450 70T600 70V150Z' fill='%2379b06a'/><path d='M0 150V104Q100 34 200 104T400 104T600 104V150Z' fill='%2391c46a'/></svg>");
        }

        .l-field { bottom: var(--road); height: 62px; background: linear-gradient(#e0a526, #b97d14); }

        .l-wheat { bottom: calc(var(--road) + 22px); height: 84px; --tile: 120px; --dur: 2.4s; }
        .l-wheat::before {
            background-size: 120px 80px;
            background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80' viewBox='0 0 120 80'><g stroke='%23a8720f' stroke-width='3' stroke-linecap='round'><path d='M12 80V36M42 80V24M72 80V40M102 80V28M27 80V52M57 80V50M87 80V54'/></g><g fill='%23f6c445' stroke='%23b07a12' stroke-width='1.5'><ellipse cx='12' cy='30' rx='6' ry='13'/><ellipse cx='42' cy='18' rx='6' ry='13'/><ellipse cx='72' cy='34' rx='6' ry='13'/><ellipse cx='102' cy='22' rx='6' ry='13'/><ellipse cx='27' cy='46' rx='5' ry='10'/><ellipse cx='57' cy='44' rx='5' ry='10'/><ellipse cx='87' cy='48' rx='5' ry='10'/></g></svg>");
        }

        .l-road {
            bottom: 0; height: var(--road);
            background: linear-gradient(#9a6a3c, #7a4f2a 40%, #5e3b1e);
            border-top: 5px solid #3a2411;
        }
        .l-road::before {
            top: 42%; bottom: auto; height: 9px; --tile: 200px; --dur: .5s;
            background-size: 200px 9px;
            background-image: linear-gradient(90deg, #fff3c4 0 90px, transparent 90px);
        }

        .l-fence { bottom: calc(var(--road) - 8px); height: 62px; --tile: 160px; --dur: .55s; }
        .l-fence::before {
            background-size: 160px 56px;
            background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='56' viewBox='0 0 160 56'><g fill='%238b5a2b' stroke='%232a1a0e' stroke-width='2'><rect x='-4' y='14' width='168' height='7'/><rect x='-4' y='34' width='168' height='7'/></g><g fill='%23a8703a' stroke='%232a1a0e' stroke-width='2'><rect x='20' y='4' width='14' height='50'/><rect x='100' y='4' width='14' height='50'/></g></svg>");
        }

        /* ───────── Los cuatro corredores ───────── */

        .pack {
            position: fixed; left: 1.5vw; bottom: 3vh; z-index: 2; pointer-events: none;
            width: 62vw; height: min(40vh, 340px);
        }
        .racer {
            position: absolute; left: var(--l); bottom: var(--b); width: var(--w); z-index: var(--z);
            animation: ride var(--d) ease-in-out infinite; animation-delay: var(--dl);
        }
        .racer svg { display: block; width: 100%; height: auto; overflow: visible; }

        @keyframes ride {
            0%, 100% { transform: translate(0, 0) rotate(0); }
            30%      { transform: translate(9px, -5px) rotate(-1.2deg); }
            62%      { transform: translate(-7px, -2px) rotate(.9deg); }
        }

        .spin { transform-box: fill-box; transform-origin: center; animation: spin .32s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .puff { fill: #ecd2a3; opacity: 0; transform-box: fill-box; transform-origin: center; animation: puff .75s ease-out infinite; }
        @keyframes puff {
            0%   { opacity: .9; transform: translate(0, 0) scale(.5); }
            100% { opacity: 0;  transform: translate(-52px, -12px) scale(1.8); }
        }

        .speed {
            position: absolute; top: var(--t); left: var(--x); width: var(--w); height: 4px; border-radius: 4px;
            background: rgba(255, 255, 255, .8); opacity: 0; animation: zip .75s linear infinite; animation-delay: var(--dl);
        }
        @keyframes zip {
            0%   { opacity: 0; transform: translateX(0); }
            15%  { opacity: .85; }
            100% { opacity: 0; transform: translateX(-34vw); }
        }

        /* ───────── Estructura ───────── */

        .screen {
            position: relative; z-index: 3; min-height: 100vh;
            display: grid; grid-template-columns: 1fr minmax(320px, 430px); gap: 2rem; align-items: center;
            padding: 2vh 4vw;
        }

        /* Logotipo de impacto */
        .hero { align-self: start; padding-top: clamp(.5rem, 3vh, 2rem); }
        .logo {
            position: relative; display: inline-block; isolation: isolate;
            padding: 3rem 4.4rem; transform: rotate(-4deg);
            animation: slam 1s cubic-bezier(.2, .9, .3, 1.15) both;
        }
        .logo::before, .logo::after {
            content: ''; position: absolute; z-index: -1;
            clip-path: polygon(50.0% 0.0%, 58.0% 14.9%, 71.7% 5.0%, 72.4% 21.9%, 89.1% 18.8%, 82.4% 34.4%, 98.7% 38.9%, 86.0% 50.0%, 98.7% 61.1%, 82.4% 65.6%, 89.1% 81.2%, 72.4% 78.1%, 71.7% 95.0%, 58.0% 85.1%, 50.0% 100.0%, 42.0% 85.1%, 28.3% 95.0%, 27.6% 78.1%, 10.9% 81.2%, 17.6% 65.6%, 1.3% 61.1%, 14.0% 50.0%, 1.3% 38.9%, 17.6% 34.4%, 10.9% 18.8%, 27.6% 21.9%, 28.3% 5.0%, 42.0% 14.9%);
        }
        .logo::before { inset: -12px; background: var(--ink); }
        .logo::after  { inset: 0; background: var(--red); }
        .logo h1 {
            font-family: var(--display); font-weight: 400; text-transform: uppercase; text-align: center;
            line-height: .88; font-size: clamp(3rem, 7.2vw, 6.4rem); text-shadow: var(--outline);
        }
        .logo .a { display: block; color: var(--sun); }
        .logo .b { display: block; color: #fff; margin-top: .05em; }

        @keyframes slam {
            0%   { transform: translateY(-120vh) rotate(-14deg); }
            58%  { transform: translateY(0) rotate(-4deg) scale(1.1); }
            76%  { transform: translateY(0) rotate(-4deg) scale(.96); }
            100% { transform: translateY(0) rotate(-4deg) scale(1); }
        }

        .tagline {
            max-width: 36ch; margin-top: 1.6rem;
            background: rgba(29, 20, 15, .88); border: 3px solid var(--gold); border-radius: 12px;
            padding: .75rem 1.1rem; font-size: 1.08rem; font-weight: 500;
        }
        .tagline b { color: var(--sun); font-weight: 700; }

        /* Menú principal estilo videojuego */
        .menu {
            width: 100%; overflow: hidden;
            background: var(--ink); border: 4px solid var(--gold); border-radius: 18px;
            box-shadow: 0 0 0 4px var(--ink), 10px 12px 0 rgba(0, 0, 0, .35);
            animation: pop .6s cubic-bezier(.2, .9, .3, 1.1) .35s both;
        }
        @keyframes pop { from { transform: translateX(70px); opacity: 0; } to { transform: none; opacity: 1; } }

        .menu-head {
            padding: .55rem 1rem;
            background: repeating-linear-gradient(-45deg, var(--gold) 0 16px, var(--ink) 16px 32px);
        }
        .menu-head h2 {
            display: inline-block; font-family: var(--display); font-weight: 400; font-size: 1.05rem;
            background: var(--ink); color: var(--gold); padding: .2rem .9rem; border-radius: 6px;
        }

        .menu-body { padding: 1.2rem 1.3rem 1.3rem; display: grid; gap: .9rem; }

        .msg {
            padding: .6rem .8rem; border-radius: 10px; font-weight: 600; font-size: .92rem;
            background: #ffe0dc; color: #7a1410; border: 3px solid var(--red);
        }
        .msg[hidden] { display: none; }

        .field label { display: block; margin-bottom: .35rem; font-weight: 600; }
        #nickname {
            width: 100%; padding: .8rem 1rem; font-size: 1.1rem; font-weight: 500;
            background: #2c1f16; color: #fff; border: 3px solid #5a4030; border-radius: 10px;
        }
        #nickname::placeholder { color: #9d8670; }
        #nickname:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 4px rgba(255, 196, 0, .25); }
        #nickname.shake, .plate.shake { animation: shake .35s; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-7px); } 75% { transform: translateX(7px); } }

        /* Botones arcade */
        .btn {
            display: block; width: 100%; padding: .9rem 1.2rem;
            font-family: var(--display); font-size: 1.2rem; letter-spacing: .02em; cursor: pointer;
            border: 3px solid #0d0907; border-radius: 12px;
            transform: skewX(-6deg); box-shadow: 0 6px 0 #0d0907;
            transition: transform .08s ease, box-shadow .08s ease, filter .15s ease;
        }
        .btn > span { display: inline-flex; align-items: center; justify-content: center; gap: .6rem; transform: skewX(6deg); }
        .btn:hover { transform: skewX(-6deg) translateY(-2px); box-shadow: 0 8px 0 #0d0907; filter: brightness(1.07); }
        .btn:active { transform: skewX(-6deg) translateY(5px); box-shadow: 0 1px 0 #0d0907; }
        .btn:focus-visible, .plate:focus-within { outline: 3px solid #fff; outline-offset: 4px; }
        .btn-create { background: linear-gradient(#ffe066, var(--gold)); color: var(--ink); }
        .btn-join { background: linear-gradient(#9be85a, var(--green-d)); color: #fff; text-shadow: 0 2px 0 rgba(0, 0, 0, .45); }
        .bi { width: 1.5rem; height: 1.5rem; flex: none; }

        .or { display: flex; align-items: center; gap: .8rem; color: #c9b79a; font-size: .9rem; }
        .or::before, .or::after { content: ''; flex: 1; border-top: 3px dashed #4a3626; }

        /* El código de sala se escribe sobre una matrícula */
        .plate {
            position: relative; padding: .25rem 1.8rem;
            background: linear-gradient(#fbfaf0, #e9e6d2);
            border: 4px solid #0d0907; border-radius: 12px;
            box-shadow: inset 0 0 0 3px #fbfaf0, inset 0 0 0 5px #1d3f8a, 0 5px 0 #000;
        }
        .plate::before, .plate::after {
            content: ''; position: absolute; top: 50%; width: 9px; height: 9px; transform: translateY(-50%);
            background: #8b8a80; border: 2px solid #0d0907; border-radius: 50%;
        }
        .plate::before { left: 11px; }
        .plate::after  { right: 11px; }
        .plate input {
            width: 100%; padding: .2rem 0 .2rem .14em; background: transparent; border: 0; outline: 0; text-align: center;
            font-family: var(--display); font-size: 1.9rem; letter-spacing: .14em; color: #1d3f8a; text-transform: uppercase;
        }
        .plate input::placeholder { color: rgba(29, 63, 138, .28); }

        .boxes { padding: 1rem 1.3rem 1.1rem; background: #261a13; border-top: 3px solid #3b2a1e; }
        .boxes h3 { font-family: var(--display); font-weight: 400; font-size: .95rem; color: var(--gold); margin-bottom: .7rem; }
        .boxes ul { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem .9rem; }
        .boxes li { display: flex; align-items: center; gap: .6rem; }
        .pw { width: 38px; height: 38px; flex: none; }
        .boxes b { display: block; font-size: .92rem; font-weight: 700; line-height: 1.15; }
        .boxes span { display: block; font-size: .78rem; color: #c9b79a; line-height: 1.25; }

        .keys { display: flex; flex-wrap: wrap; gap: .5rem 1.1rem; padding: .75rem 1.3rem; background: #120c08; font-size: .82rem; color: #d8c8ae; }
        kbd {
            font-family: var(--display); font-size: .72rem; color: var(--ink); background: var(--cream);
            border: 2px solid #0d0907; border-bottom-width: 4px; border-radius: 6px; padding: 0 .38rem; margin-right: .15rem;
        }

        /* ───────── Pantallas pequeñas ───────── */

        @media (max-width: 900px) {
            :root { --road: 20vh; }
            .screen { grid-template-columns: 1fr; justify-items: center; padding-bottom: 26vh; }
            .hero { justify-self: center; text-align: center; }
            .logo { padding: 2.2rem 2.8rem; }
            .tagline { margin-left: auto; margin-right: auto; }
            .pack { width: 130vw; left: -15vw; height: 24vh; }
            .sun { right: 8%; width: 80px; height: 80px; }
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { animation: none !important; transition: none !important; }
        }
    </style>
</head>
<body>

    <!-- Biblioteca de dibujos reutilizables (personajes e iconos) -->
    <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
        <defs>
            <symbol id="face-cow" viewBox="0 0 64 64">
                <g fill="none" stroke="#2a1a0e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
                    <path d="M19 17C11 12 8 8 10 3c6 1 11 5 15 10z" fill="#f6e7b4"/>
                    <path d="M45 17C53 12 56 8 54 3c-6 1-11 5-15 10z" fill="#f6e7b4"/>
                    <ellipse cx="9" cy="27" rx="8" ry="5" transform="rotate(-20 9 27)" fill="#fff"/>
                    <ellipse cx="55" cy="27" rx="8" ry="5" transform="rotate(20 55 27)" fill="#fff"/>
                    <rect x="14" y="12" width="36" height="44" rx="16" fill="#fff"/>
                    <path d="M32 13.5h6c4 0 7 3 8 7-6 1-11-2-14-7z" fill="#2a1a0e" stroke="none"/>
                    <ellipse cx="32" cy="44" rx="12" ry="9" fill="#f6a7be"/>
                    <circle cx="27.5" cy="44" r="1.8" fill="#2a1a0e" stroke="none"/>
                    <circle cx="36.5" cy="44" r="1.8" fill="#2a1a0e" stroke="none"/>
                    <circle cx="24" cy="30" r="2.6" fill="#2a1a0e" stroke="none"/>
                    <circle cx="40" cy="30" r="2.6" fill="#2a1a0e" stroke="none"/>
                </g>
            </symbol>

            <symbol id="face-chicken" viewBox="0 0 64 64">
                <g fill="none" stroke="#2a1a0e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
                    <path d="M22 17C17 9 23 3 28 9c0-8 10-8 10 0 5-6 11 0 6 8z" fill="#e53935"/>
                    <circle cx="32" cy="35" r="22" fill="#fff"/>
                    <path d="M30 46c-2 9 6 9 4 0z" fill="#e53935"/>
                    <path d="M25 36h14l-7 11z" fill="#ff9800"/>
                    <circle cx="23" cy="30" r="2.6" fill="#2a1a0e" stroke="none"/>
                    <circle cx="41" cy="30" r="2.6" fill="#2a1a0e" stroke="none"/>
                </g>
            </symbol>

            <symbol id="face-pig" viewBox="0 0 64 64">
                <g fill="none" stroke="#2a1a0e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
                    <path d="M15 22L11 6l17 8z" fill="#f48fb1"/>
                    <path d="M49 22L53 6 36 14z" fill="#f48fb1"/>
                    <rect x="9" y="12" width="46" height="42" rx="20" fill="#ffb3c8"/>
                    <ellipse cx="32" cy="41" rx="13" ry="10" fill="#f06292"/>
                    <ellipse cx="27" cy="41" rx="2.2" ry="3.2" fill="#2a1a0e" stroke="none"/>
                    <ellipse cx="37" cy="41" rx="2.2" ry="3.2" fill="#2a1a0e" stroke="none"/>
                    <circle cx="22" cy="29" r="2.6" fill="#2a1a0e" stroke="none"/>
                    <circle cx="42" cy="29" r="2.6" fill="#2a1a0e" stroke="none"/>
                </g>
            </symbol>

            <symbol id="face-scarecrow" viewBox="0 0 64 64">
                <g fill="none" stroke="#2a1a0e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
                    <path d="M11 42L2 45M11 48L3 55M53 42l9 3M53 48l8 7" stroke="#d9a63a"/>
                    <rect x="12" y="22" width="40" height="34" rx="14" fill="#e6c98d"/>
                    <path d="M22 33l6 6m0-6l-6 6M36 33l6 6m0-6l-6 6"/>
                    <path d="M32 39l-3.5 8h7z" fill="#f28c28"/>
                    <path d="M22 51h20" stroke-dasharray="3 3"/>
                    <ellipse cx="32" cy="23" rx="29" ry="6" fill="#8b5a2b"/>
                    <path d="M18 23C18 6 46 6 46 23z" fill="#a8703a"/>
                    <path d="M21 19h22" stroke="#b3261e" stroke-width="4"/>
                </g>
            </symbol>

            <symbol id="pw-tomato" viewBox="0 0 64 64">
                <g fill="none" stroke="#2a1a0e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
                    <circle cx="32" cy="37" r="22" fill="#e53935"/>
                    <ellipse cx="32" cy="12" rx="4.5" ry="9" fill="#4caf50" transform="rotate(-65 32 16)"/>
                    <ellipse cx="32" cy="12" rx="4.5" ry="9" fill="#4caf50" transform="rotate(65 32 16)"/>
                    <ellipse cx="32" cy="10" rx="4.5" ry="9" fill="#4caf50"/>
                    <path d="M19 36c1-6 4-9 9-10" stroke="#fff" stroke-opacity=".75" stroke-width="3"/>
                </g>
            </symbol>

            <symbol id="pw-mud" viewBox="0 0 64 64">
                <g fill="none" stroke="#2a1a0e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
                    <circle cx="20" cy="22" r="3" fill="#6d4c41"/>
                    <circle cx="33" cy="14" r="3.5" fill="#6d4c41"/>
                    <circle cx="46" cy="21" r="3" fill="#6d4c41"/>
                    <path d="M6 44c0-9 11-13 24-12 14-2 28 3 28 13 0 9-12 14-27 13C15 59 6 54 6 44z" fill="#6d4c41"/>
                    <ellipse cx="22" cy="43" rx="7" ry="3" fill="#8d6e63" stroke="none"/>
                    <circle cx="44" cy="41" r="3.5" fill="#8d6e63" stroke="none"/>
                </g>
            </symbol>

            <symbol id="pw-shield" viewBox="0 0 64 64">
                <g fill="none" stroke="#2a1a0e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
                    <path d="M32 5l22 8v17c0 14-9 24-22 29C19 54 10 44 10 30V13z" fill="#40c4ff"/>
                    <path d="M32 12l15 5.5V30c0 9-6 16-15 20z" fill="#81d4fa" stroke="none"/>
                    <path d="M32 22v18M23 31h18" stroke="#fff" stroke-width="4"/>
                </g>
            </symbol>

            <symbol id="pw-potion" viewBox="0 0 64 64">
                <g fill="none" stroke="#2a1a0e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
                    <rect x="25" y="3" width="14" height="7" rx="2" fill="#a8703a"/>
                    <path d="M27 10h10v13l14 24c3 6-1 13-8 13H21c-7 0-11-7-8-13l14-24z" fill="#e8f7ff"/>
                    <path d="M19 41h26l6 10c3 6-1 9-8 9H21c-7 0-11-3-8-9z" fill="#4cd964" stroke="none"/>
                    <circle cx="29" cy="50" r="2.5" fill="#fff" fill-opacity=".85" stroke="none"/>
                    <path d="M27 10h10v13l14 24c3 6-1 13-8 13H21c-7 0-11-7-8-13l14-24z"/>
                </g>
            </symbol>

            <symbol id="ic-flag" viewBox="0 0 64 64">
                <g fill="none" stroke="#1d140f" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
                    <path d="M14 6v52"/>
                    <path d="M14 9h38v26H14z" fill="#fff"/>
                    <g fill="#1d140f" stroke="none">
                        <rect x="14" y="9" width="12.7" height="13"/>
                        <rect x="39.3" y="9" width="12.7" height="13"/>
                        <rect x="26.7" y="22" width="12.6" height="13"/>
                    </g>
                </g>
            </symbol>

            <symbol id="ic-arrow" viewBox="0 0 64 64">
                <path d="M16 10L50 32L16 54Z" fill="#fff" stroke="#0d0907" stroke-width="6" stroke-linejoin="round"/>
            </symbol>
        </defs>
    </svg>

    <!-- Escena de fondo -->
    <div class="scene" aria-hidden="true">
        <div class="sun"></div>
        <div class="layer l-clouds"></div>
        <div class="layer l-hills"></div>
        <div class="layer l-field"></div>
        <div class="layer l-wheat"></div>
        <div class="layer l-road"></div>
        <div class="layer l-fence"></div>
    </div>

    <!-- Los cuatro personajes corriendo en sus autos -->
    <div class="pack" role="img" aria-label="Una vaca, una gallina, un cerdo y un espantapájaros compitiendo en sus autos por un camino de tierra">
        <i class="speed" style="--t:8%;--x:84%;--w:110px;--dl:-.1s"></i>
        <i class="speed" style="--t:22%;--x:96%;--w:80px;--dl:-.45s"></i>
        <i class="speed" style="--t:38%;--x:70%;--w:130px;--dl:-.3s"></i>
        <i class="speed" style="--t:54%;--x:92%;--w:90px;--dl:-.6s"></i>
        <i class="speed" style="--t:68%;--x:78%;--w:120px;--dl:-.2s"></i>
        <i class="speed" style="--t:82%;--x:98%;--w:70px;--dl:-.55s"></i>

        <!-- Gallina (carril de atrás) -->
        <div class="racer" style="--l:25%;--b:36%;--w:26%;--z:1;--d:1.35s;--dl:-.7s">
            <svg viewBox="0 0 220 120" stroke="#2a1a0e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true" focusable="false">
                <ellipse cx="112" cy="109" rx="98" ry="6" fill="#000" fill-opacity=".22" stroke="none"/>
                <g stroke="none"><circle class="puff" cx="30" cy="102" r="7"/><circle class="puff" cx="30" cy="102" r="7" style="animation-delay:-.25s"/><circle class="puff" cx="30" cy="102" r="7" style="animation-delay:-.5s"/></g>
                <path d="M14 62L4 30L40 58Z" fill="#e53935"/>
                <use href="#face-chicken" x="86" y="4" width="48" height="48"/>
                <path d="M10 86V68Q10 60 18 60H62Q72 60 78 54L86 48H134L144 58H192Q210 60 210 74V86Z" fill="#ffd54a"/>
                <path d="M13 78H207" stroke="#ff7043" stroke-width="5"/>
                <ellipse cx="178" cy="49" rx="9" ry="11" fill="#fff"/>
                <path d="M138 50L150 30L156 32L146 54Z" fill="#bfe6f5"/>
                <circle cx="204" cy="68" r="4" fill="#fff59d"/>
                <circle cx="109" cy="68" r="10" fill="#fff"/>
                <text x="109" y="73" text-anchor="middle" font-family="Bowlby One, Arial Black, sans-serif" font-size="13" fill="#2a1a0e" stroke="none">2</text>
                <circle cx="50" cy="88" r="19" fill="#2a1a0e"/><circle class="spin" cx="50" cy="88" r="12" fill="#cfd8dc" stroke="#78909c" stroke-width="4" stroke-dasharray="7 6"/><circle cx="50" cy="88" r="4" fill="#2a1a0e" stroke="none"/>
                <circle cx="168" cy="88" r="19" fill="#2a1a0e"/><circle class="spin" cx="168" cy="88" r="12" fill="#cfd8dc" stroke="#78909c" stroke-width="4" stroke-dasharray="7 6"/><circle cx="168" cy="88" r="4" fill="#2a1a0e" stroke="none"/>
            </svg>
        </div>

        <!-- Espantapájaros (carril de atrás) -->
        <div class="racer" style="--l:66%;--b:28%;--w:28%;--z:2;--d:1.5s;--dl:-.2s">
            <svg viewBox="0 0 220 120" stroke="#2a1a0e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true" focusable="false">
                <ellipse cx="112" cy="109" rx="98" ry="6" fill="#000" fill-opacity=".22" stroke="none"/>
                <g stroke="none"><circle class="puff" cx="30" cy="102" r="7"/><circle class="puff" cx="30" cy="102" r="7" style="animation-delay:-.25s"/><circle class="puff" cx="30" cy="102" r="7" style="animation-delay:-.5s"/></g>
                <path d="M12 62L6 28L18 40L22 22L32 38L42 26L46 62Z" fill="#f2c94c"/>
                <path d="M14 58L12 40M26 58L26 38M38 58L40 36" stroke="#b58a1a" stroke-width="2"/>
                <path d="M17 20L8 14L10 24Z" fill="#2a1a0e"/>
                <ellipse cx="26" cy="20" rx="10" ry="7" fill="#2a1a0e"/>
                <path d="M35 18L44 21L35 24Z" fill="#ff9800"/>
                <circle cx="30" cy="18" r="1.8" fill="#fff" stroke="none"/>
                <use href="#face-scarecrow" x="86" y="4" width="48" height="48"/>
                <path d="M10 86V68Q10 60 18 60H62Q72 60 78 54L86 48H134L144 58H192Q210 60 210 74V86Z" fill="#a8703a"/>
                <path d="M12 72H208M12 80H208" stroke="#6b4423" stroke-width="2"/>
                <path d="M138 50L150 30L156 32L146 54Z" fill="#bfe6f5"/>
                <circle cx="204" cy="68" r="4" fill="#ffd23f"/>
                <circle cx="109" cy="68" r="10" fill="#fff"/>
                <text x="109" y="73" text-anchor="middle" font-family="Bowlby One, Arial Black, sans-serif" font-size="13" fill="#2a1a0e" stroke="none">4</text>
                <circle cx="50" cy="88" r="19" fill="#2a1a0e"/><circle class="spin" cx="50" cy="88" r="12" fill="#cfd8dc" stroke="#78909c" stroke-width="4" stroke-dasharray="7 6"/><circle cx="50" cy="88" r="4" fill="#2a1a0e" stroke="none"/>
                <circle cx="168" cy="88" r="19" fill="#2a1a0e"/><circle class="spin" cx="168" cy="88" r="12" fill="#cfd8dc" stroke="#78909c" stroke-width="4" stroke-dasharray="7 6"/><circle cx="168" cy="88" r="4" fill="#2a1a0e" stroke="none"/>
            </svg>
        </div>

        <!-- Vaca (carril de adelante) -->
        <div class="racer" style="--l:1%;--b:2%;--w:32%;--z:4;--d:1.25s;--dl:-.3s">
            <svg viewBox="0 0 220 120" stroke="#2a1a0e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true" focusable="false">
                <ellipse cx="112" cy="109" rx="98" ry="6" fill="#000" fill-opacity=".22" stroke="none"/>
                <g stroke="none"><circle class="puff" cx="30" cy="102" r="7"/><circle class="puff" cx="30" cy="102" r="7" style="animation-delay:-.25s"/><circle class="puff" cx="30" cy="102" r="7" style="animation-delay:-.5s"/></g>
                <rect x="22" y="34" width="22" height="30" rx="5" fill="#cfd8dc"/>
                <rect x="25" y="27" width="16" height="9" rx="3" fill="#90a4ae"/>
                <use href="#face-cow" x="86" y="4" width="48" height="48"/>
                <path d="M10 86V68Q10 60 18 60H62Q72 60 78 54L86 48H134L144 58H192Q210 60 210 74V86Z" fill="#f7f7f2"/>
                <path d="M24 62q6-4 12 0q2 8-6 8q-8 0-6-8z" fill="#2a1a0e" stroke="none"/>
                <path d="M172 66q6-4 12 0q2 8-6 8q-8 0-6-8z" fill="#2a1a0e" stroke="none"/>
                <path d="M13 80H207" stroke="#f48fb1" stroke-width="5"/>
                <path d="M138 50L150 30L156 32L146 54Z" fill="#bfe6f5"/>
                <circle cx="204" cy="68" r="4" fill="#fff59d"/>
                <circle cx="109" cy="68" r="10" fill="#fff"/>
                <text x="109" y="73" text-anchor="middle" font-family="Bowlby One, Arial Black, sans-serif" font-size="13" fill="#2a1a0e" stroke="none">1</text>
                <circle cx="50" cy="88" r="19" fill="#2a1a0e"/><circle class="spin" cx="50" cy="88" r="12" fill="#cfd8dc" stroke="#78909c" stroke-width="4" stroke-dasharray="7 6"/><circle cx="50" cy="88" r="4" fill="#2a1a0e" stroke="none"/>
                <circle cx="168" cy="88" r="19" fill="#2a1a0e"/><circle class="spin" cx="168" cy="88" r="12" fill="#cfd8dc" stroke="#78909c" stroke-width="4" stroke-dasharray="7 6"/><circle cx="168" cy="88" r="4" fill="#2a1a0e" stroke="none"/>
            </svg>
        </div>

        <!-- Cerdo (carril de adelante) -->
        <div class="racer" style="--l:38%;--b:0%;--w:32%;--z:3;--d:1.4s;--dl:-.9s">
            <svg viewBox="0 0 220 120" stroke="#2a1a0e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true" focusable="false">
                <ellipse cx="112" cy="109" rx="98" ry="6" fill="#000" fill-opacity=".22" stroke="none"/>
                <g stroke="none"><circle class="puff" cx="30" cy="102" r="7"/><circle class="puff" cx="30" cy="102" r="7" style="animation-delay:-.25s"/><circle class="puff" cx="30" cy="102" r="7" style="animation-delay:-.5s"/></g>
                <rect x="2" y="70" width="12" height="8" rx="2" fill="#607d8b"/>
                <use href="#face-pig" x="86" y="4" width="48" height="48"/>
                <path d="M10 86V68Q10 60 18 60H62Q72 60 78 54L86 48H134L144 58H192Q210 60 210 74V86Z" fill="#ff9fb8"/>
                <g fill="#6d4c41" stroke="none"><circle cx="72" cy="76" r="4"/><circle cx="150" cy="80" r="3"/><circle cx="112" cy="82" r="3"/></g>
                <rect x="204" y="60" width="12" height="26" rx="3" fill="#90a4ae"/>
                <path d="M204 68H216M204 78H216"/>
                <path d="M138 50L150 30L156 32L146 54Z" fill="#bfe6f5"/>
                <circle cx="109" cy="68" r="10" fill="#fff"/>
                <text x="109" y="73" text-anchor="middle" font-family="Bowlby One, Arial Black, sans-serif" font-size="13" fill="#2a1a0e" stroke="none">3</text>
                <circle cx="50" cy="88" r="19" fill="#2a1a0e"/><circle class="spin" cx="50" cy="88" r="12" fill="#cfd8dc" stroke="#78909c" stroke-width="4" stroke-dasharray="7 6"/><circle cx="50" cy="88" r="4" fill="#2a1a0e" stroke="none"/>
                <circle cx="168" cy="88" r="19" fill="#2a1a0e"/><circle class="spin" cx="168" cy="88" r="12" fill="#cfd8dc" stroke="#78909c" stroke-width="4" stroke-dasharray="7 6"/><circle cx="168" cy="88" r="4" fill="#2a1a0e" stroke="none"/>
            </svg>
        </div>
    </div>

    <div class="screen">
        <header class="hero">
            <div class="logo">
                <h1><span class="a">Farm</span><span class="b">Royale</span></h1>
            </div>
            <p class="tagline">Conduce, choca y lanza tomates. <b>Solo un granjero queda en pie.</b> De 2 a 4 jugadores en línea.</p>
        </header>

        <main class="menu" aria-labelledby="menu-title">
            <div class="menu-head"><h2 id="menu-title">Menú principal</h2></div>

            <form class="menu-body" id="lobby-form" method="POST" action="{{ route('rooms.create') }}" novalidate>
                @csrf

                @if ($errors->any())
                    <p class="msg" role="alert">{{ $errors->first() }}</p>
                @endif
                <p class="msg" id="msg" role="alert" hidden></p>

                <div class="field">
                    <label for="nickname">Tu apodo de granjero</label>
                    <input id="nickname" name="nickname" maxlength="20" autocomplete="nickname" placeholder="Por ejemplo, Doña Gallina" value="{{ old('nickname') }}">
                </div>

                <button type="submit" class="btn btn-create" data-action="create" formaction="{{ route('rooms.create') }}">
                    <span><svg class="bi" aria-hidden="true"><use href="#ic-flag"/></svg>Crear sala</span>
                </button>

                <div class="or">o entra a una sala</div>

                <div class="field">
                    <label for="code">Código de la sala</label>
                    <div class="plate">
                        <input id="code" name="code" maxlength="5" placeholder="A1B2C" autocomplete="off" autocapitalize="characters" spellcheck="false">
                    </div>
                </div>

                <button type="submit" class="btn btn-join" data-action="join" formaction="{{ route('rooms.join') }}">
                    <span>Unirse a la sala<svg class="bi" aria-hidden="true"><use href="#ic-arrow"/></svg></span>
                </button>
            </form>

            <section class="boxes" aria-labelledby="boxes-title">
                <h3 id="boxes-title">Cajas misteriosas</h3>
                <ul>
                    <li><svg class="pw" aria-hidden="true"><use href="#pw-tomato"/></svg><div><b>Tomates</b><span>Quitan 20 de vida</span></div></li>
                    <li><svg class="pw" aria-hidden="true"><use href="#pw-mud"/></svg><div><b>Charco de lodo</b><span>Hace derrapar al que lo pise</span></div></li>
                    <li><svg class="pw" aria-hidden="true"><use href="#pw-shield"/></svg><div><b>Escudo</b><span>6 segundos sin recibir daño</span></div></li>
                    <li><svg class="pw" aria-hidden="true"><use href="#pw-potion"/></svg><div><b>Poción</b><span>Cura 40 de vida</span></div></li>
                </ul>
            </section>

            <footer class="keys">
                <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Conducir</span>
                <span><kbd>Espacio</kbd> Usar poder</span>
                <span><kbd>M</kbd> Silencio</span>
            </footer>
        </main>
    </div>

    <script>
        (function () {
            var form = document.getElementById('lobby-form');
            var nick = document.getElementById('nickname');
            var code = document.getElementById('code');
            var plate = code.parentNode;
            var msg = document.getElementById('msg');
            var createBtn = form.querySelector('[data-action="create"]');
            var joinBtn = form.querySelector('[data-action="join"]');

            try { if (!nick.value) nick.value = localStorage.getItem('farm-nick') || ''; } catch (e) {}

            function warn(text, field, box) {
                msg.textContent = text;
                msg.hidden = false;
                field.focus();
                box.classList.remove('shake');
                void box.offsetWidth;
                box.classList.add('shake');
            }

            function submitFrom(btn) {
                if (form.requestSubmit) form.requestSubmit(btn); else btn.click();
            }

            code.addEventListener('input', function () {
                code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
            });

            nick.addEventListener('keydown', function (e) {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                submitFrom(code.value.length === 5 ? joinBtn : createBtn);
            });

            code.addEventListener('keydown', function (e) {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                submitFrom(joinBtn);
            });

            form.addEventListener('submit', function (e) {
                var isJoin = e.submitter && e.submitter.getAttribute('data-action') === 'join';
                var name = nick.value.trim();

                if (!name) {
                    e.preventDefault();
                    warn('Escribe tu apodo para empezar.', nick, nick);
                    return;
                }
                if (isJoin && code.value.length !== 5) {
                    e.preventDefault();
                    warn('El código de la sala tiene 5 caracteres.', code, plate);
                    return;
                }
                try { localStorage.setItem('farm-nick', name); } catch (err) {}
            });
        })();
    </script>
</body>
</html>