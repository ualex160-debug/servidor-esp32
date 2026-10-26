// server.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

let nivelGas = 0;
let estadoCircuito = "APAGADO";

// Endpoint unificado: Recibe gas y responde con el comando del LED
app.post('/api/gas', (req, res) => {
    if (req.body && req.body.valor !== undefined) {
        nivelGas = parseInt(req.body.valor);
    }
    // Responde en formato JSON plano directo
    res.status(200).json({ comando: estadoCircuito });
});

// Cambiar estado desde los botones
app.post('/api/control', (req, res) => {
    if (req.body && req.body.estado) {
        estadoCircuito = req.body.estado;
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
        <title>Panel Render Forzado</title>
        <style>
            body { font-family: Arial, sans-serif; background: #121214; color: #fff; text-align: center; padding-top: 50px; }
            .card { background: #1a1a1e; display: inline-block; padding: 40px; border-radius: 15px; border: 1px solid #2a2a30; }
            #gas-val { font-size: 70px; color: #ff9100; font-family: monospace; margin: 20px 0; }
            .btn { padding: 15px 35px; font-size: 16px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; margin: 10px; color: white; }
            .btn-on { background: #00e676; color: #000; }
            .btn-off { background: #ff3d00; }
        </style>
        <script>
            setInterval(() => { location.reload(); }, 2500);

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
            <h2>Consola de Gas Directa (Render)</h2>
            <div id="gas-val" style="color: ${nivelGas > 2500 ? '#ff3d00' : '#ff9100'}">${nivelGas}</div>
            <p>Estado Remoto: <strong>${estadoCircuito}</strong></p>
            <button class="btn btn-on" onclick="cambiarEstado('ENCENDIDO')">ENCENDER</button>
            <button class="btn btn-off" onclick="cambiarEstado('APAGADO')">APAGAR</button>
        </div>
    </body>
    </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo`));
(`Servidor activo`));
