// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Variables de estado global
let nivelGas = 0;
let estadoCircuito = "APAGADO"; // "ENCENDIDO" o "APAGADO"

// --- ENDPOINTS HTTP para el ESP32 (Wokwi) ---

// Wokwi llama aquí para enviar el valor del sensor
app.post('/api/gas', (req, res) => {
    nivelGas = req.body.valor;
    // Envía el dato en tiempo real al panel web
    io.emit('actualizar_gas', { valor: nivelGas });
    res.json({ status: "ok", comando: estadoCircuito });
});

// Wokwi llama aquí para saber si debe encenderse o apagarse
app.get('/api/estado', (req, res) => {
    res.json({ comando: estadoCircuito });
});

// --- PANEL WEB (HTML Integrado) ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Control de Sensor de Gas</title>
        <script src="/socket.io/socket.io.js"></script>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; background: #f4f4f9; padding: 50px; }
            .card { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); display: inline-block; }
            .btn { padding: 15px 30px; font-size: 18px; margin: 10px; border: none; border-radius: 5px; cursor: pointer; color: white; }
            .btn-on { background: #2ecc71; }
            .btn-off { background: #e74c3c; }
            #gas-val { font-size: 48px; font-weight: bold; color: #e67e22; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Monitoreo de Gas en Tiempo Real</h2>
            <div id="gas-val">0</div>
            <p>Estado del Circuito: <span id="estado-txt" style="font-weight:bold;">${estadoCircuito}</span></p>
            <button class="btn btn-on" onclick="cambiarEstado('ENCENDIDO')">Encender</button>
            <button class="btn btn-off" onclick="cambiarEstado('APAGADO')">Apagar</button>
        </div>

        <script>
            const socket = io();
            
            // Escuchar actualizaciones de gas en tiempo real
            socket.on('actualizar_gas', (data) => {
                document.getElementById('gas-val').innerText = data.valor;
            });

            // Escuchar cambios de estado desde otros clientes o el servidor
            socket.on('cambio_estado', (nuevoEstado) => {
                document.getElementById('estado-txt').innerText = nuevoEstado;
            });

            function cambiarEstado(nuevoEstado) {
                fetch('/api/control', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: nuevoEstado })
                });
            }
        </script>
    </body>
    </html>
    `);
});

// Endpoint que activan los botones de la web
app.post('/api/control', (req, res) => {
    estadoCircuito = req.body.estado;
    io.emit('cambio_estado', estadoCircuito);
    res.json({ status: "ok", estado: estadoCircuito });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(\`Servidor corriendo en puerto \${PORT}\`));
eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
