
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>Sala {{ $room->code }} - Farm Royale</title>

    @vite(['resources/js/app.js', 'resources/js/room.js'])

    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        :root {
            --green: #70c644;
            --green-dark: #347b29;
            --cream: #fff9e9;
            --brown: #704326;
            --orange: #ffb52e;
            --text: #493222;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'Fredoka', sans-serif;
            color: var(--text);
            background:
                radial-gradient(ellipse at 15% 10%, #d8f5a9, transparent 38%),
                linear-gradient(145deg, #7ecb50, #3c9238);
        }

        button {
            font: inherit;
        }

        button:focus-visible {
            outline: 3px solid #ffb52e;
            outline-offset: 3px;
        }

        .game-shell {
            width: min(1420px, 96vw);
            min-height: 90vh;
            margin: 5vh auto;
            overflow: hidden;
            background: var(--cream);
            border: 5px solid var(--brown);
            border-radius: 25px;
            box-shadow: 0 18px 0 #285c27, 0 28px 55px #173d2445;
        }

        /* Barra superior */

        .topbar {
            min-height: 76px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 14px 24px;
            background: #fffdf5;
            border-bottom: 4px solid #e8d4a9;
        }

        .brand {
            font-size: clamp(1.4rem, 3vw, 2rem);
            font-weight: 700;
            color: #347b29;
            letter-spacing: -1px;
            text-shadow: 1px 2px #d4edb7;
        }

        .brand span {
            color: #ee9630;
        }

        .room-code {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 15px;
            background: #fff0bc;
            border: 2px solid #edc76e;
            border-radius: 14px;
        }

        .room-code small {
            display: block;
            font-size: .7rem;
            text-transform: uppercase;
            color: #8b6430;
            letter-spacing: 1px;
        }

        .room-code strong {
            font-size: 1.45rem;
            letter-spacing: 4px;
            color: #bb6421;
        }

        .room-status {
            font-size: .85rem;
            font-weight: 600;
            color: #347b29;
        }

        /* Distribución general */

        .lobby-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.6fr) minmax(300px, .85fr);
            min-height: 650px;
        }

        /* Escenario */

        .showroom {
            position: relative;
            display: flex;
            flex-direction: column;
            min-width: 0;
            min-height: 650px;
            overflow: hidden;
            background: linear-gradient(#83d3f3, #d9f1b7 70%, #80bd50);
            border-right: 4px solid #d5b989;
        }

        #farm-scene {
            position: absolute;
            inset: 0;
            z-index: 0;
        }

        #farm-scene canvas {
            display: block;
            width: 100%;
            height: 100%;
        }

        .scene-top {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            padding: 22px;
            pointer-events: none;
        }

        .scene-tag {
            padding: 9px 14px;
            background: #fff9e9ed;
            border: 2px solid #97633a;
            border-radius: 12px;
            font-size: .85rem;
            font-weight: 700;
            box-shadow: 0 4px 0 #70432630;
        }

        .scene-tag span {
            color: #378d32;
        }

        .weather {
            padding: 8px 12px;
            border: 2px solid #ffffffaa;
            border-radius: 12px;
            color: #365d35;
            background: #ffffffbb;
            font-weight: 600;
            font-size: .85rem;
        }

        .scene-spacer {
            flex: 1;
            min-height: 220px;
            pointer-events: none;
        }

        .character-info {
            position: relative;
            z-index: 1;
            padding: 24px;
            background: linear-gradient(transparent, #173a1970);
            color: white;
            text-shadow: 0 2px 4px #18331c99;
            pointer-events: none;
        }

        .character-info .eyebrow {
            margin: 0 0 5px;
            font-size: .8rem;
            font-weight: 700;
            letter-spacing: 2px;
            color: #fff0a9;
            text-transform: uppercase;
        }

        .character-info h1 {
            margin: 0;
            font-size: clamp(2rem, 5vw, 3.6rem);
            line-height: 1;
        }

        .character-info p {
            max-width: 450px;
            margin: 12px 0 0;
            font-size: 1rem;
            line-height: 1.5;
        }

        /* Panel derecho */

        .control-panel {
            display: flex;
            flex-direction: column;
            gap: 22px;
            padding: 25px;
            background: #fffaf0;
            min-width: 0;
        }

        .section-title {
            margin: 0 0 5px;
            font-size: 1.3rem;
            color: #513724;
        }

        .section-subtitle {
            margin: 0 0 15px;
            font-size: .88rem;
            color: #92775e;
        }

        /* Personajes */

        .character-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }

        .character-card {
            position: relative;
            min-height: 102px;
            padding: 13px 8px;
            border: 2px solid #e4d5b9;
            border-radius: 16px;
            background: #fffefa;
            color: var(--text);
            cursor: pointer;
            box-shadow: 0 4px 0 #e4d5b9;
            transition: transform .15s, border-color .15s, background .15s;
        }

        .character-card:hover:not(:disabled) {
            transform: translateY(-3px);
            border-color: #86c85e;
        }

        .character-card.selected {
            background: #edffda;
            border-color: #56a937;
            box-shadow: 0 4px 0 #56a937;
        }

        .character-card:disabled {
            opacity: .48;
            cursor: not-allowed;
            box-shadow: none;
        }

        .character-emoji {
            display: block;
            font-size: 2.3rem;
            line-height: 1.2;
            margin-bottom: 5px;
        }

        .character-name {
            display: block;
            font-size: .92rem;
            font-weight: 700;
        }

        .character-card.selected::after {
            content: "✓";
            position: absolute;
            top: 6px;
            right: 8px;
            color: #39882b;
            font-weight: 700;
        }

        /* Jugadores */

        .player-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .player-count {
            padding: 5px 10px;
            background: #e5f5d7;
            color: #36782c;
            border-radius: 9px;
            font-size: .85rem;
            font-weight: 700;
        }

        #players {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 0;
            margin: 14px 0 0;
            max-height: 190px;
            overflow-y: auto;
        }

        #players li {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 11px;
            background: #f3f5e8;
            border: 1px solid #dfe6cb;
            border-radius: 12px;
            font-size: .9rem;
            overflow-wrap: anywhere;
        }

        .player-dot {
            flex-shrink: 0;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #75c94b;
            border: 2px solid #438c2c;
        }

        .player-empty {
            padding: 16px !important;
            color: #92775e;
            text-align: center;
            background: #faf4e5 !important;
        }

        /* Acciones */

        .lobby-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: auto;
        }

        #start {
            width: 100%;
            padding: 15px;
            border: 2px solid #317b29;
            border-radius: 14px;
            background: linear-gradient(#83d94e, #4eae36);
            color: white;
            font-size: 1.12rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 5px 0 #286321;
            transition: transform .15s, filter .15s;
            text-shadow: 0 1px 2px #285c27;
        }

        #start:hover:not(:disabled) {
            transform: translateY(-2px);
            filter: brightness(1.05);
        }

        #start:active:not(:disabled) {
            transform: translateY(3px);
            box-shadow: 0 2px 0 #286321;
        }

        #start:disabled {
            opacity: .55;
            cursor: not-allowed;
        }

        .waiting-message {
            padding: 11px;
            border-radius: 11px;
            background: #fff0bc;
            color: #83591f;
            font-size: .85rem;
            text-align: center;
        }

        .back-link {
            display: block;
            padding: 10px;
            color: #8d6849;
            text-align: center;
            text-decoration: none;
            font-weight: 600;
            font-size: .9rem;
        }

        .back-link:hover {
            color: #347b29;
        }

        @media (max-width: 850px) {
            .game-shell {
                margin: 2vh auto;
            }

            .lobby-grid {
                grid-template-columns: 1fr;
            }

            .showroom {
                min-height: 430px;
                border-right: none;
                border-bottom: 4px solid #d5b989;
            }

            .control-panel {
                padding: 22px;
            }

            .character-grid {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }

            .character-card {
                padding: 10px 4px;
            }

            .character-emoji {
                font-size: 1.8rem;
            }
        }

        @media (max-width: 520px) {
            .topbar {
                flex-wrap: wrap;
                padding: 14px;
            }

            .room-status {
                display: none;
            }

            .showroom {
                min-height: 360px;
            }

            .scene-top {
                padding: 12px;
            }

            .character-info {
                padding: 18px;
            }

            .character-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .control-panel {
                padding: 16px;
            }
            
/* Ajustes para selección de personajes en móviles */
@media (max-width: 768px) {
    #chars,
    .character-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        width: 100%;
        visibility: visible;
        opacity: 1;
    }

    #chars button,
    .character-grid button,
    .character-card {
        display: flex;
        visibility: visible;
        opacity: 1;
        min-width: 0;
        width: 100%;
        min-height: 64px;
        justify-content: center;
        align-items: center;
        text-align: center;
        touch-action: manipulation;
    }
}

        }
    </style>
</head>

<body>

<div class="game-shell"
     id="room"
     data-code="{{ $room->code }}"
     data-me="{{ auth()->id() }}"
     data-host="{{ $room->host_id }}"
     data-players='@json($players)'>

    <header class="topbar">
        <div class="brand">🌾 FARM <span>ROYALE</span></div>

        <div class="room-code">
            <div>
                <small>Código de sala</small>
                <strong>{{ $room->code }}</strong>
            </div>
        </div>

        <div class="room-status">● SALA DE ESPERA</div>
    </header>

    <main class="lobby-grid">

        <!-- Escenario 3D -->
        <section class="showroom">
            <div id="farm-scene" aria-label="Escenario 3D de Farm Royale"></div>

            <div class="scene-top">
                <div class="scene-tag">
                    🏁 PISTA <span>GRANJA</span>
                </div>

                <div class="weather">☀️ Día soleado</div>
            </div>

            <div class="scene-spacer"></div>

            <div class="character-info">
                <p class="eyebrow">Tu próximo corredor</p>
                <h1 id="character-title">Maverick</h1>
                <p id="character-description">
                    ¡Preparate para dominar los caminos de tierra!
                </p>
            </div>
        </section>

        <!-- Panel de interacción -->
        <aside class="control-panel">

            <section>
                <h2 class="section-title">Elegí tu corredor</h2>
                <p class="section-subtitle">
                    Seleccioná tu personaje antes de la carrera.
                </p>

                <div class="character-grid" id="chars"></div>
            </section>

            <section>
                <div class="player-heading">
                    <h2 class="section-title">En el establo</h2>
                    <span class="player-count">
                        <span id="count">0</span>/4
                    </span>
                </div>

                <ul id="players">
                    <li class="player-empty">Cargando jugadores...</li>
                </ul>
            </section>

            <div class="lobby-actions">
                <div class="waiting-message" id="lobby-message">
                    🚜 Esperando a los corredores...
                </div>

                <button id="start" style="display:none">
                    🏁 ¡INICIAR CARRERA!
                </button>

                <a href="{{ url('/') }}" class="back-link">
                    ← Volver al inicio
                </a>
            </div>
        </aside>

    </main>
</div>

</body>
</html>
