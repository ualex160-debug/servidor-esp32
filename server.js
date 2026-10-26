// server.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

let nivelGas = 0;
let estadoCircuito = "APAGADO";

// Ruta directa donde golpea el ESP32 por el puerto seguro
app.post('/api/gas', (req, res) => {
    if (req.body && req.body.valor !== undefined) {
        nivelGas = parseInt(req.body.valor);
    }
    // Responde de inmediato en el mismo canal HTTP
    res.status(200).json({ comando: estadoCircuito });
});

// Control desde los botones del Dashboard Web
app.post('/api/control', (req, res) => {
    if (req.body && req.body.estado) {
        estadoCircuito = req.body.estado;
    }
    res.status(200).json({ status: "ok" });
});

// Interfaz Gráfica con auto-refresco directo de puerto
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Panel Puerto 443</title>
        <style>
            body { font-family: sans-serif; background: #121214; color: #fff; text-align: center; padding-top: 50px; }
            .card { background: #1a1a1e; display: inline-block; padding: 40px; border-radius: 15px; border: 1px solid #2a2a30; }
            #gas-val { font-size: 70px; color: #ff9100; font-family: monospace; margin: 20px 0; }
            .btn { padding: 15px 35px; font-size: 16px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; margin: 10px; color: white; }
            .btn-on { background: #00e676; color: #000; }
            .btn-off { background: #ff3d00; }
        </style>
        <script>
            // Sincronizar pantalla refrescando el árbol DOM cada 2 segundos
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
            <h2>Dashboard Enlazado por Puerto Directo</h2>
            <div id="gas-val">${nivelGas}</div>
            <p>Circuito Embebido: <strong>${estadoCircuito}</strong></p>
            <button class="btn btn-on" onclick="cambiarEstado('ENCENDIDO')">ENCENDER</button>
            <button class="btn btn-off" onclick="cambiarEstado('APAGADO')">APAGAR</button>
        </div>
    </body>
    </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
