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
const hospitalTitle = document.querySelector('.hospital-title');
const container = document.querySelector('.container');

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
        try {
            attendanceHistory = JSON.parse(historialGuardado);
        } catch (e) {
            attendanceHistory = [];
        }
    }
}

function guardarHistorial() {
    localStorage.setItem('attendanceHistory', JSON.stringify(attendanceHistory));
}

function mostrarPantallaAccion() {
    hospitalTitle.style.display = 'none';
    document.querySelector('.buttons-container').style.display = 'none';
    actionSelectionScreen.style.display = 'flex';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    container.style.overflow = 'hidden';
}

function mostrarHistorial() {
    hospitalTitle.style.display = 'none';
    document.querySelector('.buttons-container').style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'flex';
    resultContainer.style.display = 'none';
    container.style.overflow = 'hidden';
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
            <div class="history-nombre">${registro.nombre}</div>
            <div class="history-cedula">C.I: ${registro.cedula}</div>
            <div class="history-accion ${registro.accion}">${registro.accion === 'entrada' ? '🚪 ENTRADA' : '🚶 SALIDA'}</div>
            <div class="history-fecha">${fechaFormateada} ${horaFormateada}</div>
        `;
        
        historyList.appendChild(item);
    });
}

function volverInicio() {
    hospitalTitle.style.display = 'block';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    videoContainer.style.display = 'none';
    document.querySelector('.buttons-container').style.display = 'flex';
    container.style.overflow = 'hidden';
    
    // Limpiar cualquier overlay residual
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    body.classList.remove('scanning-active');
    
    currentAction = null;
}

function iniciarEscaneoConAccion(accion) {
    currentAction = accion;
    hospitalTitle.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
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
        container.style.overflow = 'hidden';
        
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
    
    // Parsear datos del QR (formato: {"empleado_id":"27642824","nombre":"Victor Medina"})
    let nombre = 'No disponible';
    let cedula = 'No disponible';
    
    try {
        // Intentar parsear como JSON
        const datos = JSON.parse(data);
        cedula = datos.empleado_id || 'No disponible';
        nombre = datos.nombre || 'No disponible';
    } catch (e) {
        // Si no es JSON, intentar con formato alternativo
        console.log('No es JSON válido, usando formato alternativo');
        
        if (data.includes('empleado_id') && data.includes('nombre')) {
            // Intentar extraer con regex
            const cedulaMatch = data.match(/"empleado_id"\s*:\s*"([^"]+)"/);
            const nombreMatch = data.match(/"nombre"\s*:\s*"([^"]+)"/);
            
            if (cedulaMatch) cedula = cedulaMatch[1];
            if (nombreMatch) nombre = nombreMatch[1];
        } else {
            // Si no se puede parsear, usar todo el contenido como nombre
            nombre = data;
        }
    }
    
    // Obtener fecha y hora actual
    const ahora = new Date();
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
    
    // Guardar en historial
    const registro = {
        nombre: nombre,
        cedula: cedula,
        accion: currentAction,
        timestamp: ahora.toISOString()
    };
    
    attendanceHistory.push(registro);
    guardarHistorial();
    
    const accionTexto = currentAction === 'entrada' ? 'ENTRADA' : 'SALIDA';
    const colorAccion = currentAction === 'entrada' ? '#4CAF50' : '#f44336';
    
    // Ocultar todas las otras pantallas
    hospitalTitle.style.display = 'none';
    document.querySelector('.buttons-container').style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    
    // Mostrar resultado
    resultContainer.style.display = 'block';
    scanResult.innerHTML = `
        <div class="result-card">
            <div class="result-header" style="background: ${colorAccion};">
                <span class="result-action-icon">${currentAction === 'entrada' ? '🚪' : '🚶'}</span>
                <span class="result-action-text">${accionTexto}</span>
            </div>
            
            <div class="result-body">
                <div class="result-field">
                    <span class="field-label">NOMBRES:</span>
                    <span class="field-value">${nombre}</span>
                </div>
                
                <div class="result-field">
                    <span class="field-label">CEDULA:</span>
                    <span class="field-value">${cedula}</span>
                </div>
                
                <div class="result-field">
                    <span class="field-label">FECHA:</span>
                    <span class="field-value">${fechaFormateada}</span>
                </div>
                
                <div class="result-field">
                    <span class="field-label">HORA:</span>
                    <span class="field-value result-time">${horaFormateada}</span>
                </div>
            </div>
            
            <div class="result-footer">
                <button id="back-to-home-btn" class="btn btn-primary result-home-btn">
                    ← VOLVER AL INICIO
                </button>
            </div>
        </div>
    `;
    
    // Re-asignar evento al botón de volver
    document.getElementById('back-to-home-btn').addEventListener('click', volverInicio);
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
    
    volverInicio();
}

function resetearEscaneo() {
    detenerEscaneo();
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