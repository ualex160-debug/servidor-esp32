const express = require('express');
const mqtt = require('mqtt');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const UMBRAL_GAS = 400; 

// Variables globales actualizadas
let ultimoNivelGas = 0;
let modoAutomatico = true; 
let estadoLedManual = false; 
let sistemaEncendido = true; // true = En línea, false = Apagado Remoto
let alarmaSonando = false;   // Monitoreo del estado de la sirena
let historialLecturas = []; 

// Conexión al Broker de EMQX
const clientMqtt = mqtt.connect('mqtt://broker.emqx.io:1883');

clientMqtt.on('connect', () => {
    console.log('[MQTT] Conectado exitosamente al Broker de EMQX');
    clientMqtt.subscribe('servidor-esp32-uuuu/sensor');
});

clientMqtt.on('message', (topic, message) => {
    if (topic === 'servidor-esp32-uuuu/sensor') {
        try {
            const datos = JSON.parse(message.toString());
            ultimoNivelGas = datos.nivel || 0;
            
            // Si el sistema está encendido, registramos los datos reales
            const horaActual = new Date().toLocaleTimeString();
            historialLecturas.push({ hora: horaActual, valor: sistemaEncendido ? ultimoNivelGas : 0 });
            if (historialLecturas.length > 15) historialLecturas.shift();

            // Lógica de control de actuadores enviada por MQTT hacia Wokwi
            let encenderLED = false;
            
            if (sistemaEncendido) {
                if (modoAutomatico) {
                    encenderLED = ultimoNivelGas > UMBRAL_GAS;
                } else {
                    encenderLED = estadoLedManual;
                }
            } else {
                // Si el sistema se apaga remotamente, todo va a falso obligatoriamente
                encenderLED = false;
                ultimoNivelGas = 0;
            }

            alarmaSonando = encenderLED; // Sincronizamos el monitoreo de la alarma

            // Publicamos el paquete de control consolidado hacia Wokwi
            clientMqtt.publish('servidor-esp32-uuuu/led', JSON.stringify({ 
                encender: encenderLED,
                sistemaActivo: sistemaEncendido
            }));

        } catch (e) {
            console.log('[MQTT] Error al procesar datos');
        }
    }
});

// Endpoint de monitoreo dinámico para la gráfica
app.get('/api/historial', (req, res) => {
    res.json({
        nivelActual: ultimoNivelGas,
        modoAutomatico: modoAutomatico,
        estadoLedManual: estadoLedManual,
        sistemaEncendido: sistemaEncendido,
        alarmaSonando: alarmaSonando,
        umbral: UMBRAL_GAS,
        datos: historialLecturas
    });
});

// Interfaz Web de Control Total
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>IoT Advanced Control Panel</title>
            <script src="https://jsdelivr.net"></script>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background: #121212; color: white; padding: 20px; }
                .container { display: flex; flex-wrap: wrap; justify-content: center; max-width: 1100px; margin: 0 auto; }
                .card { background: #1e1e1e; padding: 20px; border-radius: 12px; margin: 15px; flex: 1; min-width: 280px; box-shadow: 0 4px 10px rgba(0,0,0,0.6); }
                .card-grafica { flex: 2; min-width: 450px; }
                h1 { color: #00e676; }
                .valor { font-size: 2.5rem; font-weight: bold; color: #ffeb3b; margin: 10px 0; }
                .btn { padding: 12px 24px; margin: 8px; font-weight: bold; cursor: pointer; border-radius: 5px; border: none; font-size: 1rem; width: 85%; }
                .btn-action { background: #2979ff; color: white; }
                .btn-power { font-size: 1.1rem; letter-spacing: 1px; }
                .status { font-weight: bold; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 5px; width: 80%; }
                .danger { background: #ff1744; color: white; animation: blink 0.8s infinite; }
                .ok { background: #00e676; color: black; }
                .off { background: #757575; color: white; }
                @keyframes blink { 50% { opacity: 0.4; } }
                canvas { background: #151515; border-radius: 8px; padding: 10px; }
            </style>
        </head>
        <body>
            <h1 id="mainTitle">📡 IoT Remote Dashboard & Mission Control</h1>
            
            <div class="container">
                <div class="card card-grafica">
                    <h3>Real-Time Gas Curve (PPM)</h3>
                    <canvas id="iotChart" width="400" height="200"></canvas>
                </div>

                <div class="card">
                    <h3>System Power</h3>
                    <button class="btn btn-power" id="btnPower" onclick="alternarEnergia()" style="background:#ff1744; color:white;">SHUTDOWN SYSTEM</button>
                    
                    <hr style="border-color:#333; margin: 15px 0;">
                    
                    <h3>Live Status</h3>
                    <div class="valor" id="txtPPM">0 PPM</div>
                    <div id="lblStatus" class="status ok">SAFE STATUS</div>
                    <div id="lblSiren" class="status off" style="margin-top:8px; display:none;">🚨 SIREN ACTIVE</div>
                    
                    <hr style="border-color:#333; margin: 15px 0;">
                    
                    <h3>Hardware Controls</h3>
                    <p>Mode: <strong id="txtModo">AUTOMATIC</strong></p>
                    <button class="btn btn-action" id="btnMode" onclick="cambiarModo()">Change Mode</button>
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
                function alternarEnergia() { fetch('/api/config/energia', { method: 'POST' }); }

                async function actualizarDashboard() {
                    try {
                        const res = await fetch('/api/historial');
                        const data = await res.json();
                        
                        const btnPower = document.getElementById('btnPower');
                        const mainTitle = document.getElementById('mainTitle');
                        
                        if(!data.sistemaEncendido) {
                            // Cambios visuales si el usuario apaga el circuito remotamente
                            mainTitle.innerText = "🛑 IoT System Offline (Remote Shutdown)";
                            mainTitle.style.color = "#ff1744";
                            btnPower.innerText = "POWER ON SYSTEM";
                            btnPower.style.background = "#00e676";
                            btnPower.style.color = "black";
                            
                            document.getElementById('txtPPM').innerText = "OFFLINE";
                            document.getElementById('lblStatus').innerText = "SYSTEM DISABLED";
                            document.getElementById('lblStatus').className = "status off";
                            document.getElementById('lblSiren').style.display = "none";
                            
                            document.getElementById('btnMode').disabled = true;
                            document.getElementById('btnLed').disabled = true;
                            return;
                        }

                        // Restaurar panel si está activo
                        mainTitle.innerText = "📡 IoT Remote Dashboard & Mission Control";
                        mainTitle.style.color = "#00e676";
                        btnPower.innerText = "SHUTDOWN SYSTEM";
                        btnPower.style.background = "#ff1744";
                        btnPower.style.color = "white";
                        document.getElementById('btnMode').disabled = false;

                        document.getElementById('txtPPM').innerText = data.nivelActual + " PPM";
                        document.getElementById('txtModo').innerText = data.modoAutomatico ? "AUTOMATIC" : "MANUAL";
                        
                        // Letrero de estado de peligro
                        const lblStatus = document.getElementById('lblStatus');
                        if(data.nivelActual > data.umbral) {
                            lblStatus.innerText = "⚠️ SMOKE DETECTED";
                            lblStatus.className = "status danger";
                        } else {
                            lblStatus.innerText = "✅ SAFE STATUS";





