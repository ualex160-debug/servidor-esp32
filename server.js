const express = require('express');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const UMBRAL_GAS = 400; 

let ultimoNivelGas = 0;
let modoAutomatico = true; 
let estadoLedManual = false; 

// Interfaz Web Base
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Panel IoT</title>
            <style>
                body { font-family: Arial; text-align: center; background: #121212; color: white; padding: 50px; }
                .card { background: #1e1e1e; padding: 20px; border-radius: 10px; display: inline-block; margin: 10px; }
                h1 { color: #00e676; }
                .btn { padding: 10px 20px; margin: 10px; font-weight: bold; cursor: pointer; }
            </style>
            <script>
                setInterval(() => { location.reload(); }, 3000);
                function cambiarModo() { fetch('/api/config/modo', { method: 'POST' }); }
                function alternarLed() { fetch('/api/config/led', { method: 'POST' }); }
            </script>
        </head>
        <body>
            <h1>📡 Panel IoT (ESP32)</h1>
            <div class="card">
                <h3>Nivel de Humo: <span style="color:#ffeb3b">${ultimoNivelGas}</span></h3>
                <p>${ultimoNivelGas > UMBRAL_GAS ? '⚠️ ALERTA' : '✅ SEGURO'}</p>
            </div>
            <div class="card">
                <h3>Controles</h3>
                <p>Modo: ${modoAutomatico ? 'AUTOMÁTICO' : 'MANUAL'}</p>
                <button class="btn" onclick="cambiarModo()">Cambiar Modo</button>
                <button class="btn" onclick="alternarLed()" ${modoAutomatico ? 'disabled' : ''}>
                    ${estadoLedManual ? 'APAGAR' : 'ENCENDER'}
                </button>
            </div>
        </body>
        </html>
    `);
});

app.post('/api/config/modo', (req, res) => {
    modoAutomatico = !modoAutomatico;
    res.json({ success: true });
});

app.post('/api/config/led', (req, res) => {
    estadoLedManual = !estadoLedManual;
    res.json({ success: true });
});

app.post('/api/api/sensor', (req, res) => {
    ultimoNivelGas = req.body.nivel || 0;
    let encenderLED = modoAutomatico ? (ultimoNivelGas > UMBRAL_GAS) : estadoLedManual;
    res.json({ encender: encenderLED });
});

// Corrección de sintaxis estándar
app.listen(PORT, () => {
    console.log(`Servidor activo en el puerto ${PORT}`);
});

});
