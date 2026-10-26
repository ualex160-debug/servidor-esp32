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
        io.emit('cambio_estado', estadoCircuito);
    }
    res.status(200).json({ status: "ok", estado: estadoCircuito });
});

// --- INTERFAZ GRÁFICA WEB PRINCIPAL ---
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
                font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                background-color: var(--bg-color); 
                color: var(--text-color);
                margin: 0; 
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .dashboard { 
                background: var(--card-bg); 
                padding: 40px; 
                border-radius: 20px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.5); 
                text-align: center;
                width: 360px;
                border: 1px solid #2a2a30;
            }
            h1 { font-size: 24px; margin-bottom: 5px; color: #a0a0b0; text-transform: uppercase; letter-spacing: 1px; }
            h2 { font-size: 14px; margin-top: 0; margin-bottom: 30px; color: #606070; }
            
            /* Visualizador del Sensor de Gas */
            .gas-display {
                background: #222226;
                border-radius: 15px;
                padding: 20px;
                margin-bottom: 30px;
                border-bottom: 4px solid var(--accent-orange);
            }
            .gas-label { font-size: 12px; color: #808090; text-transform: uppercase; font-weight: bold; }
            #gas-val { font-size: 64px; font-weight: 300; color: var(--accent-orange); margin: 10px 0; font-family: monospace; }
            
            /* Caja de Estado */
            .status-container {
                font-size: 16px;
                margin-bottom: 30px;
                color: #b0b0c0;
            }
            #estado-txt {
                padding: 6px 16px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 14px;
                letter-spacing: 0.5px;
                display: inline-block;
                margin-left: 8px;
            }
            .estado-ENCENDIDO { background: rgba(0, 230, 118, 0.15); color: var(--accent-green); border: 1px solid var(--accent-green); }
            .estado-APAGADO { background: rgba(255, 61, 0, 0.15); color: var(--accent-red); border: 1px solid var(--accent-red); }
            
            /* Botones de Control */
            .btn-group { display: flex; gap: 15px; }
            .btn { 
                flex: 1; 
                padding: 16px; 
                font-size: 15px; 
                font-weight: bold; 
                border: none; 
                border-radius: 12px; 
                cursor: pointer; 
                color: white; 
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
            .btn-on { background: var(--accent-green); color: #000; }
            .btn-on:hover { background: #00c864; transform: translateY(-2px); }
            .btn-off { background: #323238; color: #fff; border: 1px solid #424248; }
            .btn-off:hover { background: var(--accent-red); border-color: var(--accent-red); transform: translateY(-2px); }
        </style>
    </head>
    <body>
        <div class="dashboard">
            <h1>Panel de Control</h1>
            <h2>Monitoreo de Sensor & Circuito Wokwi</h2>
            
            <!-- Pantalla del Sensor -->
            <div class="gas-display">
                <div class="gas-label">Nivel de Gas detectado</div>
                <div id="gas-val">${nivelGas}</div>
            </div>
            
            <!-- Estado Actual -->
            <div class="status-container">
                Circuito Wokwi: <span id="estado-txt" class="estado-${estadoCircuito}">${estadoCircuito}</span>
            </div>
            
            <!-- Botones de Encendido y Apagado -->
            <div class="btn-group">
                <button class="btn btn-on" onclick="cambiarEstado('ENCENDIDO')">ENCENDER</button>
                <button class="btn btn-off" onclick="cambiarEstado('APAGADO')">APAGAR</button>
            </div>
        </div>

        <script>
            // Conexión en tiempo real con Socket.io
            const socket = io();
            
            // Actualizar datos del sensor en la pantalla
            socket.on('actualizar_gas', (data) => {
                document.getElementById('gas-val').innerText = data.valor;
                
                // Efecto visual dinámico basado en la concentración de gas
                const gasValElement = document.getElementById('gas-val');
                if(data.valor > 600) {
                    gasValElement.style.color = '#ff3d00'; // Alerta roja si es muy alto
                } else {
                    gasValElement.style.color = '#ff9100'; // Naranja normal
                }
            });

            // Actualizar gráficamente la etiqueta de estado de los botones
            socket.on('cambio_estado', (nuevoEstado) => {
                const label = document.getElementById('estado-txt');
                label.innerText = nuevoEstado;
                label.className = 'estado-' + nuevoEstado;
            });

            // Función HTTP POST para alternar la orden desde la web
            function cambiarEstado(nuevoEstado) {
                fetch('/api/control', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: nuevoEstado })
                }).catch(err => console.error("Error al enviar comando:", err));
            }
        </script>
    </body>
    </html>
    `);
});

// Monitoreo de conexiones del WebSocket en consola
io.on('connection', (socket) => {
    console.log('Dispositivo Web sincronizado con éxito. ID:', socket.id);
});

// Configuración del puerto dinámico para Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});
