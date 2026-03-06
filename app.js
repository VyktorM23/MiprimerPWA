// app.js - Funcionalidad completa de escaneo (sin cambios)
let deferredPrompt;
let videoStream = null;
let scanningActive = false;
let scanTimeout = null;
const SCAN_INTERVAL = 200;

// Elementos del DOM
const scanButton = document.getElementById('scanButton');
const loginButton = document.getElementById('loginButton');
const videoContainer = document.getElementById('video-container');
const video = document.getElementById('qr-video');
const canvas = document.getElementById('qr-canvas');
const resultContainer = document.getElementById('result-container');
const scanResult = document.getElementById('scan-result');
const newScanBtn = document.getElementById('new-scan-btn');
const cancelScanBtn = document.getElementById('cancel-scan-btn');
const body = document.body;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ App iniciada');
    configurarBotones();
    registrarServiceWorker();
    
    if (typeof jsQR !== 'undefined') {
        console.log('✅ jsQR listo');
        habilitarBotonEscaneo();
    }
});

function habilitarBotonEscaneo() {
    if (scanButton) {
        scanButton.disabled = false;
    }
}

function configurarBotones() {
    if (scanButton) {
        scanButton.addEventListener('click', iniciarEscaneo);
    }
    
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            alert('Funcionalidad de inicio de sesión en desarrollo');
        });
    }
    
    if (newScanBtn) {
        newScanBtn.addEventListener('click', resetearEscaneo);
    }
    
    if (cancelScanBtn) {
        cancelScanBtn.addEventListener('click', detenerEscaneo);
    }
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

function mostrarMensajeCamara(mensaje, tipo = 'info') {
    const mensajeAnterior = document.querySelector('.camera-status');
    if (mensajeAnterior) {
        mensajeAnterior.remove();
    }
    
    const statusDiv = document.createElement('div');
    statusDiv.className = `camera-status ${tipo}`;
    statusDiv.textContent = mensaje;
    
    if (scanButton) {
        scanButton.parentNode.insertBefore(statusDiv, scanButton.nextSibling);
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
        
        mostrarMensajeCamara('📷 Iniciando cámara...', 'info');
        
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
        let mensaje = 'Error al acceder a la cámara';
        if (error.name === 'NotAllowedError') {
            mensaje = '📷 Permiso denegado';
        } else if (error.name === 'NotFoundError') {
            mensaje = '📷 No se encontró cámara';
        }
        
        mostrarMensajeCamara(mensaje, 'error');
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
    resultContainer.style.display = 'block';
    
    let resultHTML = `<div class="qr-content">${data}</div>`;
    
    if (esURL(data)) {
        resultHTML += `<a href="${data}" target="_blank" class="qr-action-btn">🔗 Abrir enlace</a>`;
    } else if (esTelefono(data)) {
        const telefono = data.replace(/\D/g, '');
        resultHTML += `<a href="tel:${telefono}" class="qr-action-btn">📞 Llamar</a>`;
    } else if (esEmail(data)) {
        resultHTML += `<a href="mailto:${data}" class="qr-action-btn">📧 Enviar email</a>`;
    }
    
    scanResult.innerHTML = resultHTML;
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
    
    mostrarMensajeCamara('Escáner listo', 'success');
}

function resetearEscaneo() {
    detenerEscaneo();
    setTimeout(() => {
        mostrarMensajeCamara('Escáner listo', 'success');
    }, 300);
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