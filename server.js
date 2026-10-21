const express = require('express');
const app = express();

// Permite leer los paquetes JSON enviados por el ESP32
app.use(express.json());

const PORT = process.env.PORT || 3000;
const UMBRAL_GAS = 400; 

let ultimoNivelGas = 0;
let modoAutomatico = true; 
let estadoLedManual = false; 

// Interfaz Gráfica (Panel de Control)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>IoT Control Panel - ESP32</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background: #121212; color: white; padding: 40px; }
                .card { background: #1e1e1e; padding: 25px; border-radius: 12px; display: inline-block; margin: 15px; min-width: 260px; box-shadow: 0 4px 10px rgba(0,0,0,0.6); }
                h1 { color: #00e676; }
                .valor { font-size: 2.5rem; font-weight: bold; color: #ffeb3b; margin: 10px 0; }
                .btn { padding: 12px 24px; margin: 10px; font-weight: bold; cursor: pointer; border-radius: 5px; border: none; font-size: 1rem; }
                .btn-action { background: #2979ff; color: white; }
                .status { font-weight: bold; padding: 5px; border-radius: 4px; }
                .danger { color: #ff1744; }
                .ok { color: #00e676; }
            </style>
            <script>
                // Recarga automática para actualizar el panel cada 3 segundos
                setInterval(() => { location.reload(); }, 3000);
                function cambiarModo() { fetch('/api/config/modo', { method: 'POST' }); }
                function alternarLed() { fetch('/api/config/led', { method: 'POST' }); }
            </script>
        </head>
        <body>
            <h1>📡 IoT Remote Dashboard (Render)</h1>
            
            <div class="card">
                <h3>Sensor Level</h3>
                <div class="valor">${ultimoNivelGas}</div>
                <span class="status ${ultimoNivelGas > UMBRAL_GAS ? 'danger' : 'ok'}">
                    ${ultimoNivelGas > UMBRAL_GAS ? '⚠️ SMOKE DETECTED' : '✅ SAFE STATUS'}
                </span>
            </div>
            
            <div class="card">
                <h3>Remote Controls</h3>
                <p>Current Mode: <strong>${modoAutomatico ? 'AUTOMATIC' : 'MANUAL'}</strong></p>
                <button class="btn btn-action" onclick="cambiarModo()">Change Mode</button>
                <br>
                <button class="btn" onclick="alternarLed()" ${modoAutomatico ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} 
                        style="background:${estadoLedManual ? '#ff1744' : '#424242'}; color:white;">
                    ${estadoLedManual ? 'TURN LED OFF' : 'TURN LED ON'}
                </button>
            </div>
        </body>
        </html>
    `);
});

// APIs para los botones de la página web
app.post('/api/config/modo', (req, res) => {
    modoAutomatico = !modoAutomatico;
    res.json({ success: true });
});

app.post('/api/config/led', (req, res) => {
    estadoLedManual = !estadoLedManual;
    res.json({ success: true });
});

// Ruta de comunicación con Wokwi
app.post('/api/sensor', (req, res) => {
    ultimoNivelGas = req.body.nivel || 0;
    console.log(`[Sensor] Lectura recibida: ${ultimoNivelGas}`);
    
    // Decidir el estado del LED según el modo seleccionado
    let encenderLED = modoAutomatico ? (ultimoNivelGas > UMBRAL_GAS) : estadoLedManual;
    res.json({ encender: encenderLED });
});

app.listen(PORT, () => {
    console.log(`Servidor IoT corriendo con éxito`);
});


