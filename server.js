// server.js
// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Configuración de Middlewares obligatorios
app.use(cors({ origin: "*" }));
app.use(express.json());

const server = http.createServer(app);

// Configuración de Socket.io para comunicación en tiempo real
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Variables de estado en memoria
let nivelGas = 0;
let estadoCircuito = "APAGADO"; // "ENCENDIDO" o "APAGADO"

// --- ENDPOINTS HTTP PARA EL ESP32 (WOKWI) ---

// El ESP32 envía el valor del gas aquí mediante POST
app.post('/api/gas', (req, res) => {
    // Si Wokwi envía { "valor": 450 }, lo capturamos
    nivelGas = req.body.valor !== undefined ? req.body.valor : nivelGas;
    
    // Emitir inmediatamente el valor a la interfaz Web en tiempo real
    io.emit('actualizar_gas', { valor: nivelGas });
    
    // Le respondemos al ESP32 con el comando actual (ENCENDIDO/APAGADO)
    res.status(200).json({ status: "ok", comando: estadoCircuito });
});

// Endpoint opcional para consultar el estado actual por GET
app.get('/api/estado', (req, res) => {
    res.status(200).json({ comando: estadoCircuito });
});

// --- ENDPOINT PARA LOS BOTONES DE LA INTERFAZ WEB ---
app.post('/api/control', (req, res) => {
    if (req.body.estado) {
        estadoCircuito = req.body.estado;
        // Notificar a la web que el estado cambió gráficamente
        io.emit('cambio_estado', estadoCircuito);
    }
    res.status(200).json({ status: "ok", estado: estadoCircuito });
});

// --- INTERFAZ GRÁFICA WEB ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Monitoreo Panel Gas y Circuito</title>
        <!-- Cargamos Socket.io desde CDN externo para evitar errores de ruta en producción -->
        <script src="https://socket.io"></script>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; background: #eef2f3; padding: 40px; margin: 0; }
            .card { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); display: inline-block; min-width: 300px; }
            h2 { color: #333; margin-top: 0; }
            #gas-val { font-size: 64px; font-weight: bold; color: #d35400; margin: 20px 0; }
            .status-box { font-size: 18px; margin-bottom: 25px; color: #555; }
            #estado-txt { padding: 4px 10px; border-radius: 5px; font-weight: bold; }
            .estado-ENCENDIDO { background: #2ecc71; color: white; }
            .estado-APAGADO { background: #e74c3c; color: white; }
            .btn-container { display: flex; justify-content: space-around; gap: 10px; }
            .btn { flex: 1; padding: 15px; font-size: 16px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; color: white; transition: background 0.2s; }
            .btn-on { background: #27ae60; }
            .btn-on:hover { background: #219653; }
            .btn-off { background: #c0392b; }
            .btn-off:hover { background: #962d22; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Sensor de Gas</h2>
            <div id="gas-val">${nivelGas}</div>
            
            <div class="status-box">
                Circuito: <span id="estado-txt" class="estado-${estadoCircuito}">${estadoCircuito}</span>
            </div>
            
            <div class="btn-container">
                <button class="btn btn-on" onclick="cambiarEstado('ENCENDIDO')">ENCENDER</button>
                <button class="btn btn-off" onclick="cambiarEstado('APAGADO')">APAGAR</button>
            </div>
        </div>

        <script>
            // Conexión automática al mismo host del servidor
            const socket = io();
            
            // Evento: Actualizar número del gas en tiempo real
            socket.on('actualizar_gas', (data) => {
                document.getElementById('gas-val').innerText = data.valor;
            });

            // Evento: Cambiar los estilos del texto de estado (Verde / Rojo)
            socket.on('cambio_estado', (nuevoEstado) => {
                const label = document.getElementById('estado-txt');
                label.innerText = nuevoEstado;
                label.className = 'estado-' + nuevoEstado;
            });

            // Función para enviar la orden al presionar botones
            function cambiarEstado(nuevoEstado) {
                fetch('/api/control', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: nuevoEstado })
                }).catch(err => console.error("Error al controlar:", err));
            }
        </script>
    </body>
    </html>
    `);
});

// Manejo de conexiones WebSocket de depuración
io.on('connection', (socket) => {
    console.log('Cliente web conectado ID:', socket.id);
});

// CONFIGURACIÓN CRUCIAL PARA RENDER: Escuchar en el puerto dinámico asignado por la plataforma [1]
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor activo y escuchando en el puerto ${PORT}`);
});
