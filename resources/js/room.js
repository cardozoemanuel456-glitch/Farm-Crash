import * as THREE from 'three';
import { buildVehicle } from './vehicle.js';
import { icon } from './icons.js';

const el = document.getElementById('room');

if (el) {
    const code = el.dataset.code;
    const meId = Number(el.dataset.me);
    const hostId = Number(el.dataset.host);
    const csrf = document.querySelector(
        'meta[name="csrf-token"]'
    ).content;

    let players = JSON.parse(el.dataset.players || '[]');
    let selectedCharacter = null;

    const MIN_PLAYERS = 2;

    const CHARACTERS = {
        cow: {
            label: 'Vaca',
            icon: 'cow',
            title: 'Lola Pinto',
            description: 'Fuerza y actitud para dominar la granja.'
        },
        chicken: {
            label: 'Gallina',
            icon: 'chicken',
            title: 'Nugget',
            description: 'Pequeña, rápida y lista para competir.'
        },
        pig: {
            label: 'Cerdo',
            icon: 'pig',
            title: 'Lewis Ham-ilton',
            description: 'Un corredor que nunca abandona el barro.'
        },
        scarecrow: {
            label: 'Espantapájaros',
            icon: 'scarecrow',
            title: 'Maverick',
            description: 'El guardián de la granja está listo para correr.'
        }
    };

    // -----------------------------
    // PETICIONES AL SERVIDOR
    // -----------------------------

    async function post(url, body = {}) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrf
                },
                body: JSON.stringify(body)
            });
            
            console.log('POST:', url, 'STATUS:', res.status);

            let data = {};

            try {
                data = await res.json();
            } catch (_) {}

            if (!res.ok) {
                console.error('Error en', url, res.status, data);

                alert(
                    data.error ||
                    data.message ||
                    `Error ${res.status}`
                );

                return null;
            }

            return data;
        } catch (error) {
            console.error('Error de conexión:', error);
            alert('No se pudo conectar con el servidor.');
            return null;
        }
    }

    // -----------------------------
    // ESCENA THREE.JS
    // -----------------------------

    const container = document.getElementById('farm-scene');

    let scene = null;
    let camera = null;
    let renderer = null;
    let characterModel = null;
    let animationId = null;
    let resizeObserver = null;

    let currentRotation = 0;
    let targetRotation = 0;

    function initScene() {
        if (!container || renderer) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x91d5f5);
        scene.fog = new THREE.Fog(0x91d5f5, 15, 38);

        camera = new THREE.PerspectiveCamera(
            38,
            1,
            0.1,
            100
        );

        camera.position.set(4.2, 3.2, 7.5);
        camera.lookAt(0, 1.5, 0);

        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });

        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, 1.5)
        );

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        renderer.outputColorSpace = THREE.SRGBColorSpace;

        container.appendChild(renderer.domElement);

        // Iluminación
        scene.add(
            new THREE.HemisphereLight(
                0xffffff,
                0x64844a,
                2.1
            )
        );

        const sun = new THREE.DirectionalLight(
            0xffedca,
            2.8
        );

        sun.position.set(5, 9, 6);
        sun.castShadow = true;
        scene.add(sun);

        // Suelo
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(80, 80),
            new THREE.MeshStandardMaterial({
                color: 0x78b957,
                roughness: 1
            })
        );

        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.04;
        ground.receiveShadow = true;
        scene.add(ground);

        // Camino de tierra
        const path = new THREE.Mesh(
            new THREE.PlaneGeometry(5, 35),
            new THREE.MeshStandardMaterial({
                color: 0xb99462,
                roughness: 1
            })
        );

        path.rotation.x = -Math.PI / 2;
        path.position.set(0, -0.015, -5);
        scene.add(path);

        // Granero sencillo
        const barn = new THREE.Group();

        const walls = new THREE.Mesh(
            new THREE.BoxGeometry(3.5, 2.5, 1.7),
            new THREE.MeshStandardMaterial({
                color: 0xb94a36,
                roughness: 1
            })
        );

        walls.position.y = 1.25;
        barn.add(walls);

        const roof = new THREE.Mesh(
            new THREE.ConeGeometry(2.7, 1.5, 4),
            new THREE.MeshStandardMaterial({
                color: 0x69452f,
                roughness: 1
            })
        );

        roof.position.y = 3.2;
        roof.rotation.y = Math.PI / 4;
        barn.add(roof);

        barn.position.set(-4.5, 0, -7);
        scene.add(barn);

        // Fardos de heno
        for (const [x, z] of [
            [-3, -2],
            [3.3, -4],
            [4, 1],
            [-4, 2]
        ]) {
            const hay = new THREE.Mesh(
                new THREE.BoxGeometry(0.9, 0.8, 0.9),
                new THREE.MeshStandardMaterial({
                    color: 0xe6bd57,
                    roughness: 1
                })
            );

            hay.position.set(x, 0.4, z);
            hay.rotation.y = 0.15;
            hay.castShadow = true;
            scene.add(hay);
        }

        resizeObserver = new ResizeObserver(resizeScene);
        resizeObserver.observe(container);

        resizeScene();
        setCharacter(selectedCharacter || 'scarecrow');

        animate();
    }

    function resizeScene() {
        if (!container || !renderer || !camera) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        if (!width || !height) return;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height, false);
    }

    function setCharacter(type) {
        if (!scene || !CHARACTERS[type]) return;

        // Evita reconstruir el modelo si no cambió.
        if (type === selectedCharacter && characterModel) {
            return;
        }

        if (characterModel) {
            scene.remove(characterModel);

            characterModel.traverse((object) => {
                if (object.isMesh) {
                    object.geometry?.dispose();

                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material?.dispose();
                    }
                }
            });

            characterModel = null;
        }

        selectedCharacter = type;

        try {
            characterModel = buildVehicle(type);
            characterModel.position.set(0, 0, 0);

            scene.add(characterModel);
        } catch (error) {
            console.error(
                'No se pudo crear el personaje:',
                type,
                error
            );
        }

        const info = CHARACTERS[type];

        document.getElementById('character-title').textContent =
            info.title;

        document.getElementById('character-description').textContent =
            info.description;
    }

    function animate() {
        animationId = requestAnimationFrame(animate);

        if (characterModel) {
            currentRotation +=
                (targetRotation - currentRotation) * 0.04;

            characterModel.rotation.y =
                currentRotation +
                Math.sin(performance.now() * 0.0006) * 0.035;
        }

        renderer.render(scene, camera);
    }

    // -----------------------------
    // INTERFAZ DE PERSONAJES
    // -----------------------------

    function renderCharacters() {
        const chars = document.getElementById('chars');
        chars.innerHTML = '';

        for (const [key, info] of Object.entries(CHARACTERS)) {
            const owner = players.find(
                p => p.character === key
            );

            const isMine =
                owner && Number(owner.user_id) === meId;

            const unavailable =
                owner && Number(owner.user_id) !== meId;

            const btn = document.createElement('button');

            btn.type = 'button';
            btn.className = 'character-card';

            if (selectedCharacter === key || isMine) {
                btn.classList.add('selected');
            }

            btn.disabled = !!unavailable;

            const emoji = document.createElement('span');
            emoji.className = 'character-emoji';
            emoji.innerHTML = icon(info.icon);

            const name = document.createElement('span');
            name.className = 'character-name';
            name.textContent = unavailable
                ? `${info.label} · Ocupado`
                : info.label;

            btn.append(emoji, name);

            btn.addEventListener('click', () => choose(key));

            chars.appendChild(btn);
        }
    }

    // -----------------------------
    // JUGADORES Y ANFITRIÓN
    // -----------------------------

    function renderPlayers() {
        const list = document.getElementById('players');
        list.innerHTML = '';

        if (players.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'player-empty';
            empty.textContent = 'Esperando jugadores...';
            list.appendChild(empty);
        }

        players.forEach(p => {
            const li = document.createElement('li');

            const dot = document.createElement('span');
            dot.className = 'player-dot';

            const name = document.createElement('span');

            const isHost = Number(p.user_id) === hostId;
            const isMe = Number(p.user_id) === meId;

            const character = CHARACTERS[p.character];

            name.textContent = `${p.nickname}${isMe ? ' (Vos)' : ''}`;

            if (isHost) {
                const crown = document.createElement('span');
                crown.className = 'host-badge';
                crown.innerHTML = `${icon('crown')} Anfitrión`;
                name.append(' ', crown);
            }

            name.append(
                ` — ${character ? character.label : 'Sin elegir personaje'}`
            );

            li.append(dot);

            if (character) {
                const face = document.createElement('span');
                face.className = 'player-face';
                face.innerHTML = icon(p.character);
                li.append(face);
            }

            li.append(name);
            list.appendChild(li);
        });

        document.getElementById('count').textContent =
            players.length;
    }

    function render() {
        renderCharacters();
        renderPlayers();

        const start = document.getElementById('start');
        const message = document.getElementById('lobby-message');

        const isHost = meId === hostId;

        const ready =
            players.length >= MIN_PLAYERS &&
            players.length <= 4 &&
            players.every(p => p.character);

        start.style.display = isHost ? 'block' : 'none';
        start.disabled = !ready;

        if (ready) {
            start.innerHTML = `${icon('flag')} ¡INICIAR CARRERA!`;
        } else {
            start.textContent = players.length < MIN_PLAYERS
                ? `Esperando jugadores (mín. ${MIN_PLAYERS})…`
                : 'Todos deben elegir personaje…';
        }

        message.innerHTML = ready
            ? `${icon('check')} ¡Todos listos para correr!`
            : `${icon('tractor')} Esperando a los corredores...`;

        // Sincroniza el modelo con la selección del jugador local.
        const me = players.find(
            p => Number(p.user_id) === meId
        );

        const type = me?.character;

        if (type && CHARACTERS[type]) {
            setCharacter(type);
        }
    }

    async function choose(character) {
        if (!CHARACTERS[character]) return;

        const owner = players.find(
            p => p.character === character &&
                Number(p.user_id) !== meId
        );

        if (owner) return;

        const data = await post(
            `/rooms/${code}/character`,
            { character }
        );

        if (!data) return;

        // Actualización optimista: el servidor sigue siendo
        // quien valida la reserva definitiva.
        const me = players.find(
            p => Number(p.user_id) === meId
        );

        if (me) {
            me.character = character;
        }

        setCharacter(character);
        render();
    }

    document.getElementById('start').addEventListener(
        'click',
        async () => {
            const ready =
                players.length >= MIN_PLAYERS &&
                players.length <= 4 &&
                players.every(p => p.character);

            if (!ready || meId !== hostId) return;

            const start = document.getElementById('start');
            start.disabled = true;

            const data = await post(`/rooms/${code}/start`);

            if (!data) {
                render();
            }
        }
    );

    // -----------------------------
    // LARAVEL ECHO
    // -----------------------------

    window.Echo.join(`room.${code}`)
        .listen('.room.updated', event => {
            players = event.players;
            render();
        })
        .listen('.game.started', () => {
            window.location.href = `/game/${code}`;
        });

    // Inicia el renderizado después de preparar la interfaz.
    render();
    initScene();
}