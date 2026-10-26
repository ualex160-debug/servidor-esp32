// server.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

let datosDeGas = 0;
let botonPresionado = "APAGADO";

// 1. El ESP32 de Wokwi entrega el valor aquí y recoge la orden del botón
app.post('/api/gas', (req, res) => {
    if (req.body && req.body.valor !== undefined) {
        datosDeGas = parseInt(req.body.valor);
    }
    res.status(200).json({ comando: botonPresionado });
});

// 2. Ruta para los botones de la pantalla HTML
app.post('/api/control', (req, res) => {
    if (req.body && req.body.estado) {
        botonPresionado = req.body.estado;
    }
    res.status(200).json({ status: "ok" });
});

// 3. Interfaz Gráfica para el Usuario
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Consola de Gas Directa</title>
        <style>
            body { font-family: Arial, sans-serif; background: #121214; color: #fff; text-align: center; padding-top: 60px; }
            .card { background: #1a1a1e; display: inline-block; padding: 40px; border-radius: 15px; border: 1px solid #2a2a30; }
            #gas-val { font-size: 75px; font-family: monospace; margin: 20px 0; font-weight: bold; }
            .btn { padding: 16px 36px; font-size: 16px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; margin: 10px; color: white; }
            .btn-on { background: #00e676; color: #000; }
            .btn-off { background: #ff3d00; }
        </style>
        <script>
            // Forzar actualización de pantalla cada 2 segundos sin usar WebSockets complejos
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
            <h2>Nivel de Gas en Tiempo Real</h2>
            <div id="gas-val" style="color: ${datosDeGas > 2500 ? '#ff3d00' : '#ff9100'}">${datosDeGas}</div>
            <p>Circuito Remoto: <strong style="color: ${botonPresionado === 'ENCENDIDO' ? '#00e676' : '#ff3d00'}">${botonPresionado}</strong></p>
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
