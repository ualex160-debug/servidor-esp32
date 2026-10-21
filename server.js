const express = require('express');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Variables globales para almacenar el estado actual del sistema
let ultimoNivelGas = 0;
let modoAutomatico = true; // true = controla el umbral, false = control manual por botón
let estadoLedManual = false; 
const UMBRAL_GAS = 400;

// INTERFAZ WEB VIRTUAL: Esta página se cargará cuando entres a tu URL de Render
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Panel de Control IoT - ESP32</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background: #121212; color: white; padding: 20px; }
                .card { background: #1e1e1e; padding: 20px; border-radius: 10px; display: inline-block; margin: 10px; min-width: 250px; box-shadow: 0 4px 8px rgba(0,0,0,0.5); }
                h1 { color: #00e676; }
                .valor { font-size: 3rem; font-weight: bold; color: #ffeb3b; }
                .btn { padding: 15px 30px; font-size: 1.2rem; border: none; border-radius: 5px; cursor: pointer; margin: 10px; font-weight: bold; }
                .btn-on { background: #ff1744; color: white; }
                .btn-off { background: #424242; color: white; }
                .btn-mode { background: #2979ff; color: white; }
                .status-danger { color: #ff1744; animation: blink 1s infinite; }
                @keyframes blink { 50% { opacity: 0; } }
            </style>
            <script>
                // Recargar la página automáticamente cada 3 segundos para ver los datos del ESP32 en tiempo real
                setInterval(() => { location.reload(); }, 3000);

                function cambiarModo() { fetch('/api/config/modo', { method: 'POST' }); }
                function alternarLed() { fetch('/api/config/led', { method: 'POST' }); }
            </script>
        </head>
        <body>
            <h1>📡 Panel de Monitoreo Remoto (Render)</h1>
            
            <div class="card">
                <h3>Nivel de Gas / Humo</h3>
                <div class="valor">${ultimoNivelGas}</div>
                <p class="${ultimoNivelGas > UMBRAL_GAS ? 'status-danger' : ''}">
                    ${ultimoNivelGas > UMBRAL_GAS ? '⚠️ ¡ALERTA: HUMO DETECTADO!' : '✅ Atmósfera Segura'}
                </p>
            </div>

            <div class="card">
                <h3>Control de Actuador (LED)</h3>
                <p>Modo Actual: <strong>${modoAutomatico ? 'AUTOMÁTICO (Por Sensor)' : 'MANUAL (Por Botón)'}</strong></p>
                <button class="btn btn-mode" onclick="cambiarModo()">Cambiar Modo</button>
                <br>
                <button class="btn ${estadoLedManual ? 'btn-on' : 'btn-off'}" 
                        ${modoAutomatico ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} 
                        onclick="alternarLed()">
                    ${estadoLedManual ? 'APAGAR LED' : 'ENCENDER LED'}
                </button>
            </div>
        </body>
        </html>
    `);
});

// API para que la página web cambie las configuraciones de control remoto
app.post('/api/config/modo', (req, res) => {
    modoAutomatico = !modoAutomatico;
    res.json({ success: true, modoAutomatico });
});

app.post('/api/config/led', (req, res) => {
    estadoLedManual = !estadoLedManual;
    res.json({ success: true, estadoLedManual });
});

// API donde Wokwi envía sus datos y recibe las órdenes de control
app.post('/api/sensor', (req, res) => {
    ultimoNivelGas = req.body.nivel;
    console.log(`[Render] Monitoreando nivel: ${ultimoNivelGas}`);

    let encenderLED = false;

    if (modoAutomatico) {
        // Control Automático basado en el sensor
        if (ultimoNivelGas > UMBRAL_GAS) {
            encenderLED = true;
        }
    } else {
        // Control Manual basado en el botón de Render
        encenderLED = estadoLedManual;
    }

    // Enviarle la respuesta al ESP32 en Wokwi
    res.json({ encender: encenderLED });
});

app.listen(PORT, () => {
    console.log(`Servidor IoT con Interfaz corriendo en el puerto ${PORT}`);
});


});
