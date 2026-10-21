const express = require('express');
const app = express();

// Permitir que el servidor entienda datos en formato JSON
app.use(express.json());

const PORT = process.env.PORT || 3000;
const UMBRAL_GAS = 400; // Límite de peligro

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Servidor HTTP para ESP32 Activo en Render');
});

// Ruta donde el ESP32 enviará sus datos
app.post('/api/sensor', (req, res) => {
    const nivelGas = req.body.nivel;
    console.log(`[Render] Nivel de gas recibido: ${nivelGas}`);

    let estadoLED = false;
    if (nivelGas > UMBRAL_GAS) {
        estadoLED = true; // Peligro: ordenar encender el LED
    }

    // Responder al ESP32 con la orden del LED
    res.json({ encender: estadoLED });
});

server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

});
