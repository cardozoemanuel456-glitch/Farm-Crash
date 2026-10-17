<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Farm Royale — Sala {{ $room->code }}</title>
    @vite(['resources/js/app.js', 'resources/js/game.js'])
    <style>
        body { margin: 0; overflow: hidden; background: #87ceeb; font-family: sans-serif; }
        canvas { display: block; }
        #hud { position: fixed; top: 12px; left: 12px; background: #0008; color: #fff; padding: 10px 14px; border-radius: 10px; font-size: 14px; line-height: 1.6; }
        #hud b { font-size: 18px; letter-spacing: .2rem; }
        #hud small { opacity: .8; }
        #hp { position: fixed; bottom: 70px; left: 50%; transform: translateX(-50%); width: 280px; height: 24px; background: #0009; border-radius: 12px; overflow: hidden; }
        #hp-fill { height: 100%; width: 100%; background: #66bb6a; transition: width .2s, background .2s; }
        #hp-text { position: absolute; inset: 0; text-align: center; line-height: 24px; color: #fff; font-weight: bold; text-shadow: 0 1px 2px #000; }
        #power { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #0009; color: #fff; padding: 10px 20px; border-radius: 12px; font-size: 18px; white-space: nowrap; }
        #msg { position: fixed; top: 18%; left: 50%; transform: translateX(-50%); color: #fff; font-size: 28px; font-weight: bold; text-shadow: 0 2px 6px #000; opacity: 0; transition: opacity .3s; pointer-events: none; white-space: nowrap; }
        #flash { position: fixed; inset: 0; background: rgba(255, 0, 0, .35); opacity: 0; transition: opacity .4s; pointer-events: none; }
        #end { position: fixed; inset: 0; background: #000a; display: none; place-items: center; }
        #end .box { background: #fff8e1; padding: 2rem 3rem; border-radius: 16px; text-align: center; }
        #end button { margin-top: 1rem; padding: .8rem 1.6rem; font-size: 1.1rem; background: #ff9800; color: #fff; border: none; border-radius: 8px; cursor: pointer; }

        
/* Aviso para girar el celular */
#rotate-message {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: #172817;
    color: white;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    padding: 24px;
}

#rotate-message .rotate-icon {
    font-size: 60px;
    margin-bottom: 16px;
}

/* Controles táctiles */
#mobile-controls {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 50;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
}

.control-group {
    position: absolute;
    bottom: 22px;
    display: flex;
    gap: 12px;
    align-items: flex-end;
    pointer-events: auto;
}

#drive-controls {
    left: 18px;
}

#steer-controls {
    right: 18px;
}

.mobile-btn {
    width: 66px;
    height: 66px;
    border: 2px solid #ffffffaa;
    border-radius: 18px;
    background: #172817cc;
    color: white;
    font-size: 26px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
}

.mobile-btn:active,
.mobile-btn.pressed {
    background: #ff9800ee;
    transform: scale(0.94);
}

#mobile-power {
    position: absolute;
    bottom: 105px;
    right: 28px;
    width: 62px;
    height: 62px;
    border-radius: 50%;
    font-size: 25px;
}

/* Mostrar controles en celular horizontal */
@media (orientation: landscape) and (max-width: 950px) {
    #mobile-controls {
        display: block;
    }

    #hud {
        top: 6px;
        left: 8px;
        padding: 6px 9px;
        font-size: 11px;
    }

    #hud b {
        font-size: 14px;
    }

    #hud small {
        display: none;
    }

    #hp {
        bottom: 8px;
        width: 180px;
        height: 18px;
    }

    #hp-text {
        line-height: 18px;
        font-size: 12px;
    }

    #power {
        bottom: 32px;
        font-size: 12px;
        padding: 6px 10px;
    }
}

/* Bloquear la partida visualmente en vertical */
@media (orientation: portrait) and (max-width: 950px) {
    #rotate-message {
        display: flex;
    }
}

    </style>
</head>
<body>
    <div id="game"
         data-code="{{ $room->code }}"
         data-me="{{ auth()->id() }}"
         data-players="{{ json_encode($players) }}"></div>

         
<!-- Aviso de orientación -->
<div id="rotate-message">
    <div class="rotate-icon">📱 ↻</div>
    <h2>¡GirÁ tu celular!</h2>
    <p>Farm Royale se juega mejor con el celular en horizontal.</p>
</div>

<!-- Controles táctiles -->



    <div id="hud">
        Sala <b>{{ $room->code }}</b>
        <div id="hud-players"></div>
        <small>W/S acelerar y frenar · A/D girar · ESPACIO usar poder</small>
    </div>

    <div id="hp"><div id="hp-fill"></div><span id="hp-text">❤️ 100</span></div>
    <div id="power">Sin poder — recoge una caja 🎁</div>
    <div id="msg"></div>
    <div id="flash"></div>

    <div id="end">
        <div class="box">
            <h1 id="end-title"></h1>
            <button onclick="location.href='/'">Volver al lobby</button>
        </div>
    </div>
</body>
</html>