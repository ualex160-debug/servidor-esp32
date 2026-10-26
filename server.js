// server.js
// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mqtt = require('mqtt'); // Instalar mediante package.json

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let nivelGas = 0;
let estadoCircuito = "APAGADO";

// Conectarse al Broker MQTT Público
const clientMqtt = mqtt.connect('mqtt://://hivemq.com');

clientMqtt.on('connect', () => {
    console.log('Render conectado a MQTT Broker');
    clientMqtt.subscribe('wokwi/gas/valor'); // Escuchar al ESP32
});

clientMqtt.on('message', (topic, message) => {
    if (topic === 'wokwi/gas/valor') {
        nivelGas = parseInt(message.toString());
        io.emit('actualizar_web', { valor: nivelGas, estado: estadoCircuito });
    }
});

// Cuando presionas los botones en la Web
app.post('/api/control', (req, res) => {
    if (req.body && req.body.estado) {
        estadoCircuito = req.body.estado;
        // Publicar la orden hacia el ESP32 por MQTT
        clientMqtt.publish('wokwi/gas/control', estadoCircuito);
        io.emit('actualizar_web', { valor: nivelGas, estado: estadoCircuito });
    }
    res.status(200).json({ status: "ok" });
});

// Interfaz Gráfica
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Panel MQTT Instantáneo</title>
        <script src="https://socket.io"></script>
        <style>
            body { font-family: sans-serif; background: #121214; color: #fff; text-align: center; padding-top: 50px; }
            .card { background: #1a1a1e; display: inline-block; padding: 40px; border-radius: 15px; border: 1px solid #2a2a30; }
            #gas-val { font-size: 70px; color: #ff9100; font-family: monospace; margin: 20px 0; }
            .btn { padding: 15px 35px; font-size: 16px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; margin: 10px; color: white; }
            .btn-on { background: #00e676; color: #000; }
            .btn-off { background: #ff3d00; }
            #estado-txt { font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Sensor de Gas (Enlace MQTT Activo)</h2>
            <div id="gas-val">${nivelGas}</div>
            <p>Circuito: <span id="estado-txt" style="color: #ff3d00">${estadoCircuito}</span></p>
            <button class="btn btn-on" onclick="cambiarEstado('ENCENDIDO')">ENCENDER</button>
            <button class="btn btn-off" onclick="cambiarEstado('APAGADO')">APAGAR</button>
        </div>
        <script>
            const socket = io();
            socket.on('actualizar_web', (data) => {
                document.getElementById('gas-val').innerText = data.valor;
                document.getElementById('gas-val').style.color = data.valor > 2500 ? '#ff3d00' : '#ff9100';
                const txt = document.getElementById('estado-txt');
                txt.innerText = data.estado;
                txt.style.color = data.estado === 'ENCENDIDO' ? '#00e676' : '#ff3d00';
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
server.listen(PORT, () => console.log('Servidor Render en línea'));
