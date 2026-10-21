const express = require('express');
const mqtt = require('mqtt');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const UMBRAL_GAS = 400; 

let ultimoNivelGas = 0;
let modoAutomatico = true; 
let estadoLedManual = false; 
let historialLecturas = []; // Guarda las últimas 15 lecturas para la gráfica

// CONFIGURACIÓN CORREGIDA: Servidor empresarial EMQX libre de bloqueos
const clientMqtt = mqtt.connect('mqtt://broker.emqx.io:1883');

clientMqtt.on('connect', () => {
    console.log('[MQTT] Conectado exitosamente al Broker de EMQX');
    // Suscribirse al canal donde el ESP32 publica los datos del sensor
    clientMqtt.subscribe('servidor-esp32-uuuu/sensor');
});

clientMqtt.on('message', (topic, message) => {
    if (topic === 'servidor-esp32-uuuu/sensor') {
        try {
            const datos = JSON.parse(message.toString());
            ultimoNivelGas = datos.nivel || 0;
            
            // Guardar en el historial manteniendo un límite de 15 datos
            const horaActual = new Date().toLocaleTimeString();
            historialLecturas.push({ hora: horaActual, valor: ultimoNivelGas });
            if (historialLecturas.length > 15) historialLecturas.shift();

            console.log(`[MQTT] Lectura recibida: ${ultimoNivelGas} PPM`);

            // Si está en modo automático, envía la respuesta inmediata al LED
            if (modoAutomatico) {
                let encender = ultimoNivelGas > UMBRAL_GAS;
                clientMqtt.publish('servidor-esp32-uuuu/led', JSON.stringify({ encender }));
            }
        } catch (e) {
            console.log('[MQTT] Error al procesar JSON');
        }
    }
});

// Endpoint para que la gráfica obtenga el historial en vivo sin recargar la página completa
app.get('/api/historial', (req, res) => {
    res.json({
        nivelActual: ultimoNivelGas,
        modoAutomatico: modoAutomatico,
        estadoLedManual: estadoLedManual,
        umbral: UMBRAL_GAS,
        datos: historialLecturas
    });
});

// Interfaz Gráfica Avanzada con Chart.js (Dashboard en Inglés)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>IoT Control Panel - ESP32</title>
            <script src="https://jsdelivr.net"></script>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background: #121212; color: white; padding: 20px; }
                .container { display: flex; flex-wrap: wrap; justify-content: center; max-width: 1000px; margin: 0 auto; }
                .card { background: #1e1e1e; padding: 20px; border-radius: 12px; margin: 15px; flex: 1; min-width: 280px; box-shadow: 0 4px 10px rgba(0,0,0,0.6); }
                .card-grafica { flex: 2; min-width: 450px; }
                h1 { color: #00e676; }
                .valor { font-size: 2.5rem; font-weight: bold; color: #ffeb3b; margin: 10px 0; }
                .btn { padding: 12px 24px; margin: 10px; font-weight: bold; cursor: pointer; border-radius: 5px; border: none; font-size: 1rem; width: 80%; }
                .btn-action { background: #2979ff; color: white; }
                .status { font-weight: bold; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 10px; }
                .danger { background: #ff1744; color: white; }
                .ok { background: #00e676; color: black; }
                canvas { background: #151515; border-radius: 8px; padding: 10px; }
            </style>
        </head>
        <body>
            <h1>📡 IoT Remote Dashboard & Real-Time Graph</h1>
            
            <div class="container">
                <div class="card card-grafica">
                    <h3>Smoke / Gas Concentration History (PPM)</h3>
                    <canvas id="iotChart" width="400" height="200"></canvas>
                </div>

                <div class="card">
                    <h3>Current Status</h3>
                    <div class="valor" id="txtPPM">0 PPM</div>
                    <div id="lblStatus" class="status ok">SAFE STATUS</div>
                    <hr style="border-color:#333; margin: 20px 0;">
                    <h3>Remote Controls</h3>
                    <p>Mode: <strong id="txtModo">AUTOMATIC</strong></p>
                    <button class="btn btn-action" onclick="cambiarModo()">Change Mode</button>
                    <button class="btn" id="btnLed" onclick="alternarLed()">TURN LED ON</button>
                </div>
            </div>

            <script>
                const ctx = document.getElementById('iotChart').getContext('2d');
                const iotChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Gas Level (PPM)',
                            data: [],
                            borderColor: '#00e676',
                            backgroundColor: 'rgba(0, 230, 118, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3
                        }]
                    },
                    options: {
                        scales: {
                            y: { beginAtZero: true, max: 1000, grid: { color: '#333' }, ticks: { color: '#fff' } },
                            x: { grid: { color: '#333' }, ticks: { color: '#fff' } }
                        },
                        plugins: { legend: { labels: { color: '#fff' } } }
                    }
                });

                function cambiarModo() { fetch('/api/config/modo', { method: 'POST' }); }
                function alternarLed() { fetch('/api/config/led', { method: 'POST' }); }

                async function actualizarDashboard() {
                    try {
                        const res = await fetch('/api/historial');
                        const data = await res.json();
                        
                        document.getElementById('txtPPM').innerText = data.nivelActual + " PPM";
                        document.getElementById('txtModo').innerText = data.modoAutomatico ? "AUTOMATIC" : "MANUAL";
                        
                        const lblStatus = document.getElementById('lblStatus');
                        if(data.nivelActual > data.umbral) {
                            lblStatus.innerText = "⚠️ SMOKE DETECTED";
                            lblStatus.className = "status danger";
                        } else {
                            lblStatus.innerText = "✅ SAFE STATUS";
                            lblStatus.className = "status ok";
                        }

                        const btnLed = document.getElementById('btnLed');
                        if(data.modoAutomatico) {
                            btnLed.disabled = true;
                            btnLed.style.opacity = "0.4";
                            btnLed.style.cursor = "not-allowed";
                            btnLed.style.background = "#424242";
                            btnLed.innerText = data.nivelActual > data.umbral ? "LED ON (AUTO)" : "LED OFF (AUTO)";
                        } else {
                            btnLed.disabled = false;
                            btnLed.style.opacity = "1";
                            btnLed.style.cursor = "pointer";
                            btnLed.style.background = data.estadoLedManual ? "#ff1744" : "#424242";
                            btnLed.innerText = data.estadoLedManual ? "TURN LED OFF" : "TURN LED ON";
                        }

                        const horas = data.datos.map(d => d.hora);
                        const valores = data.datos.map(d => d.valor);
                        
                        iotChart.data.labels = horas;
                        iotChart.data.datasets[0].data = valores;
                        iotChart.update('none'); 

                    } catch(e) { console.log("Error al actualizar interfaz"); }
                }

                setInterval(actualizarDashboard, 2000);
            </script>
        </body>
        </html>
    `);
});

app.post('/api/config/modo', (req, res) => {
    modoAutomatico = !modoAutomatico;
    res.json({ success: true });
});

app.post('/api/config/led', (req, res) => {
    estadoLedManual = !estadoLedManual;
    clientMqtt.publish('servidor-esp32-uuuu/led', JSON.stringify({ encender: estadoLedManual }));
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Servidor IoT activo en el puerto ${PORT}`);
});



