// app.js - Funcionalidad completa de escaneo con registro de asistencia
let deferredPrompt;
let videoStream = null;
let scanningActive = false;
let scanTimeout = null;
const SCAN_INTERVAL = 200;

// Estado de la aplicación
let currentAction = null; // 'entrada' o 'salida'
let attendanceHistory = []; // Historial de asistencias

// Elementos del DOM
const scanButton = document.getElementById('scanButton');
const loginButton = document.getElementById('loginButton');
const historyButton = document.getElementById('historyButton');
const videoContainer = document.getElementById('video-container');
const video = document.getElementById('qr-video');
const canvas = document.getElementById('qr-canvas');
const resultContainer = document.getElementById('result-container');
const scanResult = document.getElementById('scan-result');
const newScanBtn = document.getElementById('new-scan-btn');
const cancelScanBtn = document.getElementById('cancel-scan-btn');
const actionSelectionScreen = document.getElementById('action-selection-screen');
const entryBtn = document.getElementById('entry-btn');
const exitBtn = document.getElementById('exit-btn');
const backFromActionBtn = document.getElementById('back-from-action-btn');
const historyScreen = document.getElementById('history-screen');
const historyList = document.getElementById('history-list');
const backFromHistoryBtn = document.getElementById('back-from-history-btn');
const body = document.body;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ App iniciada');
    configurarBotones();
    registrarServiceWorker();
    cargarHistorial();
    
    if (typeof jsQR !== 'undefined') {
        console.log('✅ jsQR listo');
        if (scanButton) {
            scanButton.disabled = false;
        }
    }
});

function configurarBotones() {
    if (scanButton) {
        scanButton.addEventListener('click', mostrarPantallaAccion);
    }
    
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            alert('Funcionalidad de inicio de sesión en desarrollo');
        });
    }
    
    if (historyButton) {
        historyButton.addEventListener('click', mostrarHistorial);
    }
    
    if (entryBtn) {
        entryBtn.addEventListener('click', () => iniciarEscaneoConAccion('entrada'));
    }
    
    if (exitBtn) {
        exitBtn.addEventListener('click', () => iniciarEscaneoConAccion('salida'));
    }
    
    if (backFromActionBtn) {
        backFromActionBtn.addEventListener('click', volverInicio);
    }
    
    if (backFromHistoryBtn) {
        backFromHistoryBtn.addEventListener('click', volverInicio);
    }
    
    if (newScanBtn) {
        newScanBtn.addEventListener('click', resetearEscaneo);
    }
    
    if (cancelScanBtn) {
        cancelScanBtn.addEventListener('click', detenerEscaneo);
    }
}

function cargarHistorial() {
    const historialGuardado = localStorage.getItem('attendanceHistory');
    if (historialGuardado) {
        attendanceHistory = JSON.parse(historialGuardado);
    }
}

function guardarHistorial() {
    localStorage.setItem('attendanceHistory', JSON.stringify(attendanceHistory));
}

function mostrarPantallaAccion() {
    document.querySelector('.buttons-container').style.display = 'none';
    actionSelectionScreen.style.display = 'flex';
    historyScreen.style.display = 'none';
}

function mostrarHistorial() {
    document.querySelector('.buttons-container').style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'flex';
    actualizarListaHistorial();
}

function actualizarListaHistorial() {
    historyList.innerHTML = '';
    
    // Mostrar últimos 5 registros (más recientes primero)
    const ultimosRegistros = [...attendanceHistory].reverse().slice(0, 5);
    
    if (ultimosRegistros.length === 0) {
        historyList.innerHTML = '<div class="no-history">No hay registros de asistencia</div>';
        return;
    }
    
    ultimosRegistros.forEach(registro => {
        const item = document.createElement('div');
        item.className = `history-item ${registro.accion}`;
        
        const fecha = new Date(registro.timestamp);
        const fechaFormateada = fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const horaFormateada = fecha.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        item.innerHTML = `
            <div class="history-empleado">${registro.empleado}</div>
            <div class="history-accion ${registro.accion}">${registro.accion === 'entrada' ? '🚪 ENTRADA' : '🚶 SALIDA'}</div>
            <div class="history-fecha">${fechaFormateada} ${horaFormateada}</div>
        `;
        
        historyList.appendChild(item);
    });
}

function volverInicio() {
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    document.querySelector('.buttons-container').style.display = 'flex';
}

function iniciarEscaneoConAccion(accion) {
    currentAction = accion;
    actionSelectionScreen.style.display = 'none';
    iniciarEscaneo();
}

function registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('✅ Service Worker registrado'))
                .catch(err => console.log('❌ Error SW:', err));
        });
    }
}

function crearOverlayEscaneo() {
    const overlayAnterior = document.querySelector('.scanning-overlay');
    if (overlayAnterior) {
        overlayAnterior.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'scanning-overlay';
    overlay.innerHTML = `
        <div class="scanning-frame">
            <div class="scanning-line"></div>
        </div>
    `;
    
    const instructions = document.createElement('div');
    instructions.className = 'scanning-instructions';
    instructions.textContent = 'Coloca el código QR dentro del recuadro';
    
    body.appendChild(overlay);
    body.appendChild(instructions);
}

async function iniciarEscaneo() {
    console.log('📱 Iniciando escaneo...');
    
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Cámara no soportada');
        }
        
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        video.srcObject = videoStream;
        video.setAttribute('playsinline', true);
        
        body.classList.add('scanning-active');
        crearOverlayEscaneo();
        
        videoContainer.style.display = 'flex';
        scanButton.style.display = 'none';
        resultContainer.style.display = 'none';
        
        video.onloadedmetadata = () => {
            video.play().then(() => {
                console.log('✅ Video reproduciendo');
                scanningActive = true;
                setTimeout(() => {
                    escanearQRConIntervalo();
                }, 500);
            });
        };
        
    } catch (error) {
        console.error('❌ Error:', error);
        detenerEscaneo();
    }
}

function escanearQRConIntervalo() {
    if (!scanningActive) return;
    
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }
    
    realizarEscaneo();
    
    scanTimeout = setTimeout(() => {
        escanearQRConIntervalo();
    }, SCAN_INTERVAL);
}

function realizarEscaneo() {
    if (!scanningActive || !video || video.readyState < 2) {
        return;
    }
    
    try {
        const width = Math.min(video.videoWidth, 640);
        const height = Math.min(video.videoHeight, 480);
        
        canvas.width = width;
        canvas.height = height;
        
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(video, 0, 0, width, height);
        
        const imageData = context.getImageData(0, 0, width, height);
        
        const code = jsQR(imageData.data, width, height, {
            inversionAttempts: "dontInvert",
        });
        
        if (code) {
            console.log('✅ QR detectado:', code.data);
            procesarResultado(code.data);
        }
        
    } catch (error) {
        console.error('Error en escaneo:', error);
    }
}

function procesarResultado(data) {
    scanningActive = false;
    
    if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
    }
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    if (video) {
        video.srcObject = null;
    }
    
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    
    body.classList.remove('scanning-active');
    
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(200);
    }
    
    videoContainer.style.display = 'none';
    
    // Guardar en historial
    const ahora = new Date();
    const registro = {
        empleado: data,
        accion: currentAction,
        timestamp: ahora.toISOString()
    };
    
    attendanceHistory.push(registro);
    guardarHistorial();
    
    // Mostrar resultado temporal
    const fechaFormateada = ahora.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const horaFormateada = ahora.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const accionTexto = currentAction === 'entrada' ? 'ENTRADA' : 'SALIDA';
    const colorAccion = currentAction === 'entrada' ? '#4CAF50' : '#f44336';
    
    resultContainer.style.display = 'block';
    scanResult.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px; color: ${colorAccion};">${accionTexto} REGISTRADA</div>
            <div class="qr-content" style="font-size: 20px; margin-bottom: 15px;">${data}</div>
            <div style="font-size: 18px; margin: 10px 0;">${fechaFormateada}</div>
            <div style="font-size: 24px; font-weight: bold; color: #0066B3;">${horaFormateada}</div>
        </div>
    `;
    
    // Auto-retorno después de 3 segundos
    setTimeout(() => {
        resultContainer.style.display = 'none';
        scanButton.style.display = 'block';
        currentAction = null;
        volverInicio();
    }, 3000);
}

function detenerEscaneo() {
    scanningActive = false;
    
    if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
    }
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    if (video) {
        video.srcObject = null;
    }
    
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    
    body.classList.remove('scanning-active');
    
    scanButton.style.display = 'block';
    videoContainer.style.display = 'none';
    resultContainer.style.display = 'none';
    currentAction = null;
    volverInicio();
}

function resetearEscaneo() {
    detenerEscaneo();
}

function esURL(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function esTelefono(string) {
    const numeros = string.replace(/\D/g, '');
    return numeros.length >= 7 && numeros.length <= 15;
}

function esEmail(string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(string);
}

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    if (!document.getElementById('installButton')) {
        const btn = document.createElement('button');
        btn.id = 'installButton';
        btn.className = 'btn btn-primary';
        btn.textContent = '📲 INSTALAR APP';
        btn.onclick = instalarPWA;
        document.querySelector('.buttons-container').appendChild(btn);
    }
});

function instalarPWA() {
    if (!deferredPrompt) {
        alert('No disponible para instalar ahora');
        return;
    }
    
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('Usuario aceptó instalar');
        }
        deferredPrompt = null;
        document.getElementById('installButton')?.remove();
    });
}

window.addEventListener('appinstalled', () => {
    document.getElementById('installButton')?.remove();
});

window.addEventListener('beforeunload', () => {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }
});