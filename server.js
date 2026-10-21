const express = require('express');
const app = express();

app.use(express.json()); // Permite leer los datos del ESP32

const PORT = process.env.PORT || 3000;
const UMBRAL_GAS = 400; 

// Esta es la ruta base que ya te funciona en el navegador
app.get('/', (req, res) => {
    res.send('Servidor de Monitoreo de Gas Activo y Conectado');
});

// Esta es la ruta que procesará los datos de Wokwi
app.post('/api/sensor', (req, res) => {
    const nivelGas = req.body.nivel;
    console.log(`[Render] Nivel de gas recibido: ${nivelGas}`);

    let estadoLED = false;
    if (nivelGas > UMBRAL_GAS) {
        estadoLED = true; 
    }

    res.json({ encender: estadoLED });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});


});
