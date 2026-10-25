const express = require('express');
const app = express();
app.use(express.json());

// Estado del sistema en memoria
let datosSensor = { gas: 0, alertaActiva: false };
let comandoControl = { forzarAlerta: false };

// Servir una interfaz web simple
app.get('/', (req, res) => {
    res.send(`
        <h1>Monitoreo de Gas ESP32</h1>
        <p><strong>Nivel de Gas:</strong> ${datosSensor.gas}</p>
        <p><strong>Estado Fuga:</strong> ${datosSensor.alertaActiva ? "⚠️ PELIGRO" : "✅ NORMAL"}</p>
        <hr>
        <button onclick="enviarComando(true)">ENCENDER LED/BUZZER REMOTO</button>
        <button onclick="enviarComando(false)">APAGAR REMOTO</button>
        <script>
            function enviarComando(estado) {
                fetch('/api/control', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ forzarAlerta: estado })
                }).then(() => location.reload());
            }
        </script>
    `);
});

// Endpoint para que el ESP32 envíe datos (Monitoreo)
app.post('/api/sensor', (req, res) => {
    datosSensor.gas = req.body.gas;
    datosSensor.alertaActiva = req.body.gas > 1500; // Umbral de ejemplo
    
    // Le respondemos al ESP32 si queremos forzar el Buzzer/LED desde la web
    res.json({ forzarAlerta: comandoControl.forzarAlerta });
});

// Endpoint para que la interfaz web cambie el estado del LED/Buzzer (Control)
app.post('/api/control', (req, res) => {
    comandoControl.forzarAlerta = req.body.forzarAlerta;
    res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));


