const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Permite conexiones desde Wokwi o el ESP32 físico
});

const PORT = process.env.PORT || 3000;
const UMBRAL_GAS = 400; // Si el sensor supera este valor, se activa la alerta

// Ruta de prueba para verificar en el navegador
app.get('/', (req, res) => {
    res.send('Servidor de Monitoreo de Gas Activo y Conectado');
});

// Comunicación por WebSockets con el ESP32
io.on('connection', (socket) => {
    console.log(`[Render] Nuevo dispositivo conectado: ${socket.id}`);

    // Escuchar los datos que envía el ESP32
    socket.on('datos_sensor', (data) => {
        console.log(`[Sensor] Nivel de gas/humo recibido: ${data.nivel}`);
        
        // Lógica de control remota
        let estadoLED = false;
        if (data.nivel > UMBRAL_GAS) {
            estadoLED = true; // Activar alerta si supera el umbral
        }

        // Enviar la orden de regreso al ESP32 (Formato compatible con Socket.io)
        socket.emit('control_led', { encender: estadoLED });
    });

    socket.on('disconnect', () => {
        console.log(`[Render] Dispositivo desconectado: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`Servidor IoT corriendo en el puerto ${PORT}`);
});
