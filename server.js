// server.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// Variables persistentes en el puerto del servidor
let nivelGas = 0;
let estadoCircuito = "APAGADO";

// Endpoint de enlace directo con el ESP32
app.post('/api/gas', (req, res) => {
    if (req.body && req.body.valor !== undefined) {
        nivelGas = parseInt(req.body.valor);
    }
    // Envia en la misma respuesta la orden del botón actual
    res.status(200).json({ comando: estadoCircuito });
});

// Endpoint que activan los botones de la pantalla HTML
app.post('/api/control', (req, res) => {
    if (req.body && req.body.estado) {
        estadoCircuito = req.body.estado;
    }
    res.status(200).json({ status: "ok" });
});

// Interfaz Web Gráfica Integrada
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Panel Control Gas</title>
        <style>
            body { font-family: Arial, sans-serif; background: #121214; color: #fff; text-align: center; padding-top: 60px; margin: 0; }
            .card { background: #1a1a1e; display: inline-block; padding: 40px; border-radius: 15px; border: 1px solid #2a2a30; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
            #gas-val { font-size: 75px; font-family: monospace; margin: 20px 0; font-weight: bold; }
            .btn { padding: 16px 36px; font-size: 16px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; margin: 10px; color: white; transition: transform 0.1s; }
            .btn:active { transform: scale(0.95); }
            .btn-on { background: #00e676; color: #000; }
            .btn-off { background: #ff3d00; }
            strong { font-size: 18px; }
        </style>
        <script>
            // Bucle automático de refresco de pantalla cada 2 segundos para actualizar el gas
            setInterval(() => { location.reload(); }, 2000);

            function cambiarEstado(nuevoEstado) {
                fetch('/api/control', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: nuevoEstado })
                }).then(() => location.reload());
            }
        </script>
    </head>
    <body>
        <div class="card">
            <h2>Panel de Control - Sensor de Gas</h2>
            <div id="gas-val" style="color: ${nivelGas > 2500 ? '#ff3d00' : '#ff9100'}">${nivelGas}</div>
            <p>Estado del Circuito: <strong style="color: ${estadoCircuito === 'ENCENDIDO' ? '#00e676' : '#ff3d00'}">${estadoCircuito}</strong></p>
            <br>
            <button class="btn btn-on" onclick="cambiarEstado('ENCENDIDO')">ENCENDER LED</button>
            <button class="btn btn-off" onclick="cambiarEstado('APAGADO')">APAGAR LED</button>
        </div>
    </body>
    </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo`));
