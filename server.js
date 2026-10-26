/// server.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// !!! REEMPLAZA CON TU CHANNEL ID Y TU WRITE API KEY !!!
const CHANNEL_ID = "123456";
const WRITE_API_KEY = "TU_WRITE_API_KEY";

let nivelGas = 0;
let estadoCircuito = "APAGADO";

// Modificar estado del botón desde la interfaz web de Render
app.post('/api/control', async (req, res) => {
    if (req.body && req.body.estado) {
        estadoCircuito = req.body.estado;
        const valorBoton = estadoCircuito === "ENCENDIDO" ? 1 : 0;
        
        // Guardar la orden en el Field 2 de ThingSpeak
        try {
            await fetch(`https://thingspeak.com{WRITE_API_KEY}&field2=${valorBoton}`);
        } catch (e) { console.error(e); }
    }
    res.status(200).json({ status: "ok" });
});

// Interfaz Web Gráfica
app.get('/', async (req, res) => {
    try {
        // Consultar el último dato seguro registrado en el feed de ThingSpeak
        const response = await fetch(`https://thingspeak.com{CHANNEL_ID}/feeds/last.json`);
        const data = await response.json();
        if (data) {
            nivelGas = data.field1 ? parseInt(data.field1) : 0;
            if (data.field2 !== undefined) {
                estadoCircuito = parseInt(data.field2) === 1 ? "ENCENDIDO" : "APAGADO";
            }
        }
    } catch (e) {}

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Panel de Gas por ThingSpeak</title>
        <style>
            body { font-family: sans-serif; background: #121214; color: #fff; text-align: center; padding-top: 50px; }
            .card { background: #1a1a1e; display: inline-block; padding: 40px; border-radius: 15px; border: 1px solid #2a2a30; }
            #gas-val { font-size: 70px; color: #ff9100; font-family: monospace; margin: 20px 0; }
            .btn { padding: 15px 35px; font-size: 16px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; margin: 10px; color: white; }
            .btn-on { background: #00e676; color: #000; }
            .btn-off { background: #ff3d00; }
        </style>
        <script>
            // Recargar la pantalla para consultar a ThingSpeak el valor actual
            setInterval(() => { location.reload(); }, 15000); // Sincronizado a 15 segundos

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
            <h2>Sensor de Gas (Puente ThingSpeak Activo)</h2>
            <div id="gas-val">${nivelGas}</div>
            <p>Circuito: <strong>${estadoCircuito}</strong></p>
            <button class="btn btn-on" onclick="cambiarEstado('ENCENDIDO')">ENCENDER</button>
            <button class="btn btn-off" onclick="cambiarEstado('APAGADO')">APAGAR</button>
        </div>
    </body>
    </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo`));
