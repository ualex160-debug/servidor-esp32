// server.js
// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let nivelGas = 0;
let estadoCircuito = "APAGADO"; 

// --- ENDPOINTS PARA EL NAVEGADOR Y WOKWI ---

// Obtener el estado actual (Gas y Botón)
app.get('/api/datos', (req, res) => {
    res.status(200).json({ valor: nivelGas, comando: estadoCircuito });
});

// Guardar datos nuevos (llamado por el puente del navegador)
app.post('/api/actualizar', (req, res) => {
    if (req.body) {
        if (req.body.valor !== undefined) nivelGas = parseInt(req.body.valor);
        if (req.body.estado !== undefined) estadoCircuito = req.body.estado;
        
        io.emit('actualizar_web', { valor: nivelGas, estado: estadoCircuito });
    }
    res.status(200).json({ status: "ok" });
});

// --- INTERFAZ WEB GRÁFICA ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Panel Control Gas</title>
        <script src="https://socket.io"></script>
        <style>
            body { font-family: sans-serif; background: #121214; color: #fff; text-align: center; padding-top: 50px; }
            .card { background: #1a1a1e; display: inline-block; padding: 40px; border-radius: 15px; border: 1px solid #2a2a30; }
            #gas-val { font-size: 70px; color: #ff9100; font-family: monospace; margin: 20px 0; }
            .btn { padding: 15px 35px; font-size: 16px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; margin: 10px; }
            .btn-on { background: #00e676; color: #000; }
            .btn-off { background: #ff3d00; color: #fff; }
            #estado-txt { font-weight: bold; color: #ff3d00; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Sensor de Gas (Wokwi Link)</h2>
            <div id="gas-val">${nivelGas}</div>
            <p>Circuito Embebido: <span id="estado-txt">${estadoCircuito}</span></p>
            <button class="btn btn-on" onclick="cambiarEstado('ENCENDIDO')">ENCENDER</button>
            <button class="btn btn-off" onclick="cambiarEstado('APAGADO')">APAGAR</button>
        </div>

        <script>
            const socket = io();
            
            // Recibir actualizaciones en tiempo real
            socket.on('actualizar_web', (data) => {
                document.getElementById('gas-val').innerText = data.valor;
                document.getElementById('gas-val').style.color = data.valor > 2500 ? '#ff3d00' : '#ff9100';
                
                const txt = document.getElementById('estado-txt');
                txt.innerText = data.estado;
                txt.style.color = data.estado === 'ENCENDIDO' ? '#00e676' : '#ff3d00';
            });

            // Enviar orden del botón al servidor de Render
            function cambiarEstado(nuevoEstado) {
                fetch('/api/actualizar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: nuevoEstado })
                });
            }

            // PUENTE AUTOMÁTICO NAVEGADOR -> WOKWI LOCAL (Cada 1.5 segundos)
            setInterval(async () => {
                try {
                    // 1. Leer los datos reales del circuito local de Wokwi en tu PC
                    const resWokwi = await fetch('http://10.10.0', { mode: 'cors' });
                    const dataWokwi = await resWokwi.json();
                    
                    // 2. Leer cuál es el botón presionado actualmente en Render
                    const resRender = await fetch('/api/datos');
                    const dataRender = await resRender.json();

                    // 3. Enviar el gas de Wokwi a Render
                    await fetch('/api/actualizar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ valor: dataWokwi.valor })
                    });

                    // 4. Enviar la orden del botón de Render hacia el circuito de Wokwi
                    await fetch('http://10.10.0', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ estado: dataRender.comando }),
                        mode: 'cors'
                    });
                } catch (e) {
                    // Ignora errores si Wokwi está en pausa
                }
            }, 1500);
        </script>
    </body>
    </html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
