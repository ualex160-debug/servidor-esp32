// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let nivelGas = 0;
let estadoCircuito = "APAGADO"; 

// --- ENDPOINT QUE RECIBE LOS DATOS DEL ESP32 ---
app.post('/api/gas', (req, res) => {
    if (req.body && req.body.valor !== undefined) {
        nivelGas = parseInt(req.body.valor);
        // Transmitir valor al navegador en tiempo real
        io.emit('actualizar_gas', { valor: nivelGas });
    }
    // Responder obligatoriamente con el comando actual para el circuito
    res.status(200).json({ status: "ok", comando: estadoCircuito });
});

app.get('/api/estado', (req, res) => {
    res.status(200).json({ comando: estadoCircuito });
});

// --- ENDPOINT DE LOS BOTONES DE LA WEB ---
app.post('/api/control', (req, res) => {
    if (req.body && req.body.estado) {
        estadoCircuito = req.body.estado;
        io.emit('cambio_estado', estadoCircuito);
    }
    res.status(200).json({ status: "ok", estado: estadoCircuito });
});

// --- INTERFAZ WEB ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard - Sensor de Gas Wokwi</title>
        <script src="https://socket.io"></script>
        <style>
            :root {
                --bg-color: #121214;
                --card-bg: #1a1a1e;
                --text-color: #ffffff;
                --accent-green: #00e676;
                --accent-red: #ff3d00;
                --accent-orange: #ff9100;
            }
            body { 
                font-family: 'Segoe UI', Roboto, sans-serif; 
                background-color: var(--bg-color); 
                color: var(--text-color);
                margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh;
            }
            .dashboard { 
                background: var(--card-bg); padding: 40px; border-radius: 20px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; width: 340px; border: 1px solid #2a2a30;
            }
            h1 { font-size: 22px; margin-bottom: 5px; color: #a0a0b0; text-transform: uppercase; letter-spacing: 1px; }
            h2 { font-size: 13px; margin-top: 0; margin-bottom: 30px; color: #606070; }
            .gas-display { background: #222226; border-radius: 15px; padding: 20px; margin-bottom: 30px; border-bottom: 4px solid var(--accent-orange); }
            .gas-label { font-size: 12px; color: #808090; text-transform: uppercase; font-weight: bold; }
            #gas-val { font-size: 64px; font-weight: 300; color: var(--accent-orange); margin: 10px 0; font-family: monospace; }
            .status-container { font-size: 16px; margin-bottom: 30px; color: #b0b0c0; }
            #estado-txt { padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; display: inline-block; margin-left: 8px; }
            .estado-ENCENDIDO { background: rgba(0, 230, 118, 0.15); color: var(--accent-green); border: 1px solid var(--accent-green); }
            .estado-APAGADO { background: rgba(255, 61, 0, 0.15); color: var(--accent-red); border: 1px solid var(--accent-red); }
            .btn-group { display: flex; gap: 15px; }
            .btn { flex: 1; padding: 16px; font-size: 15px; font-weight: bold; border: none; border-radius: 12px; cursor: pointer; color: white; transition: all 0.2s ease; }
            .btn-on { background: var(--accent-green); color: #000; }
            .btn-on:hover { transform: translateY(-2px); }
            .btn-off { background: #323238; color: #fff; border: 1px solid #424248; }
            .btn-off:hover { background: var(--accent-red); transform: translateY(-2px); }
        </style>
    </head>
    <body>
        <div class="dashboard">
            <h1>Panel de Control</h1>
            <h2>Monitoreo de Sensor & Circuito Wokwi</h2>
            <div class="gas-display">
                <div class="gas-label">Nivel de Gas detectado</div>
                <div id="gas-val">${nivelGas}</div>
            </div>
            <div class="status-container">
                Circuito Wokwi: <span id="estado-txt" class="estado-${estadoCircuito}">${estadoCircuito}</span>
            </div>
            <div class="btn-group">
                <button class="btn btn-on" onclick="cambiarEstado('ENCENDIDO')">ENCENDER</button>
                <button class="btn btn-off" onclick="cambiarEstado('APAGADO')">APAGAR</button>
            </div>
        </div>
        <script>
            const socket = io();
            socket.on('actualizar_gas', (data) => {
                document.getElementById('gas-val').innerText = data.valor;
                document.getElementById('gas-val').style.color = data.valor > 2500 ? '#ff3d00' : '#ff9100';
            });
            socket.on('cambio_estado', (nuevoEstado) => {
                const label = document.getElementById('estado-txt');
                label.innerText = nuevoEstado;
                label.className = 'estado-' + nuevoEstado;
            });
            function cambiarEstado(nuevoEstado) {
                fetch('/api/control', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: nuevoEstado })
                }).catch(err => console.error("Error:", err));
            }
        </script>
    </body>
    </html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
