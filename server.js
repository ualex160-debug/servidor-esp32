// server.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Variables globales sencillas
let datosDeGas = 0;
let botonPresionado = "APAGADO";

// 1. El ESP32 de Wokwi entra aquí para dejar el valor del gas y llevarse la orden del botón
app.post('/api/gas', (req, res) => {
    if (req.body && req.body.valor !== undefined) {
        datosDeGas = req.body.valor; // Guarda el valor que viene de Wokwi
    }
    // Le responde a Wokwi qué hacer
    res.json({ comando: botonPresionado });
});

// 2. Los botones de la página web entran aquí para cambiar el estado
app.post('/api/boton', (req, res) => {
    if (req.body && req.body.estado) {
        botonPresionado = req.body.estado;
    }
    res.json({ status: "ok" });
});

// 3. La pantalla web que tú ves en tu navegador
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Panel Simple</title>
        <style>
            body { font-family: Arial; text-align: center; background: #121214; color: white; padding-top: 50px; }
            h1 { font-size: 80px; color: #ff9100; margin: 20px 0; }
            .btn { padding: 20px 40px; font-size: 20px; font-weight: bold; border: none; border-radius: 10px; cursor: pointer; margin: 10px; color: white; }
            .on { background: #00e676; color: black; }
            .off { background: #ff3d00; }
        </style>
        <script>
            // Recargar la página automáticamente cada 2 segundos para ver los datos nuevos
            setInterval(() => { location.reload(); }, 2000);

            function presionar(accion) {
                fetch('/api/boton', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: accion })
                }).then(() => location.reload());
            }
        </script>
    </head>
    <body>
        <h2>Nivel de Gas:</h2>
        <h1>${datosDeGas}</h1>
        <p>El circuito está: <strong>${botonPresionado}</strong></p>
        <button class="btn on" onclick="presionar('ENCENDIDO')">ENCENDER LED</button>
        <button class="btn off" onclick="presionar('APAGADO')">APAGAR LED</button>
    </body>
    </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor corriendo"));
