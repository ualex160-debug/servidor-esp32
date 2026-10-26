// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Desactivar estrictamente el bloqueo de contenido no seguro para el microcontrolador
app.use(cors({ origin: "*" }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let nivelGas = 0;
let estadoCircuito = "APAGADO"; 

// Recibir datos de Wokwi
app.post('/api/gas', (req, res) => {
    if (req.body && req.body.valor !== undefined) {
        nivelGas = parseInt(req.body.valor);
        io.emit('actualizar_gas', { valor: nivelGas });
    }
    res.status(200).json({ status: "ok", comando: estadoCircuito });
});

// Control desde la web
app.post('/api/control', (req, res) => {
    if (req.body && req.body.estado) {
        estadoCircuito = req.body.estado;
        io.emit('cambio_estado', estadoCircuito);
    }
    res.status(200).json({ status: "ok", estado: estadoCircuito });
});

// Interfaz Web Gráfica
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Panel de Control Wokwi</title>
        <script src="https://socket.io"></script>
        <style>
            body { font-family: sans-serif; background: #121214; color: #fff; text-align: center; padding-top: 50px; }
            .card { background: #1a1a1e; display: inline-block; padding: 40px; border-radius: 15px; border: 1px solid #2a2a30; }
            #gas-val { font-size: 70px; color: #ff9100; font-family: monospace; margin: 20px 0; }
            .btn { padding: 15px 35px; font-size: 16px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; margin: 10px; }
            .btn-on { background: #00e676; color: #000; }
            .btn-off { background: #ff3d00; color: #fff; }
            #estado-txt { font-weight: bold; color: #00e676; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Sensor de Gas en Tiempo Real</h2>
            <div id="gas-val">${nivelGas}</div>
            <p>Estado del Circuito: <span id="estado-txt">${estadoCircuito}</span></p>
            <button class="btn btn-on" onclick="cambiarEstado('ENCENDIDO')">ENCENDER</button>
            <button class="btn btn-off" onclick="cambiarEstado('APAGADO')">APAGAR</button>
        </div>
        <script>
            const socket = io();
            socket.on('actualizar_gas', (data) => {
                document.getElementById('gas-val').innerText = data.valor;
                document.getElementById('gas-val').style.color = data.valor > 2500 ? '#ff3d00' : '#ff9100';
            });
            socket.on('cambio_estado', (nuevoEstado) => {
                const txt = document.getElementById('estado-txt');
                txt.innerText = nuevoEstado;
                txt.style.color = nuevoEstado === 'ENCENDIDO' ? '#00e676' : '#ff3d00';
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
