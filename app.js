// app.js - Versión optimizada con mejor rendimiento
let deferredPrompt;
let videoStream = null;
let scanningActive = false;
let animationFrame = null;
let scanTimeout = null;
let lastScanTime = 0;
const SCAN_INTERVAL = 200; // Escanear cada 200ms para mejor rendimiento

// Elementos del DOM
const scanButton = document.getElementById('scanButton');
const videoContainer = document.getElementById('video-container');
const video = document.getElementById('qr-video');
const canvas = document.getElementById('qr-canvas');
const resultContainer = document.getElementById('result-container');
const scanResult = document.getElementById('scan-result');
const newScanBtn = document.getElementById('new-scan-btn');
const cancelScanBtn = document.getElementById('cancel-scan-btn');
const body = document.body;

// Inicializar cuando la página cargue
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM cargado');
    actualizarEstadosPWA();
    configurarBotones();
    
    // Verificar que jsQR esté disponible
    if (typeof jsQR !== 'undefined') {
        console.log('✅ jsQR cargado correctamente');
        mostrarMensajeCamara('Escáner listo para usar', 'success');
        habilitarBotonEscaneo();
    } else {
        console.error('❌ jsQR no está disponible');
        mostrarMensajeCamara('Error cargando el escáner', 'error');
    }
});

// Habilitar botón de escaneo
function habilitarBotonEscaneo() {
    if (scanButton) {
        scanButton.disabled = false;
        scanButton.style.opacity = '1';
        scanButton.style.cursor = 'pointer';
    }
}

// Configurar botones
function configurarBotones() {
    if (scanButton) {
        scanButton.addEventListener('click', iniciarEscaneo);
    }
    
    if (newScanBtn) {
        newScanBtn.addEventListener('click', resetearEscaneo);
    }
    
    if (cancelScanBtn) {
        cancelScanBtn.addEventListener('click', detenerEscaneo);
    }
}

// Mostrar mensaje de estado
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

// Crear overlay de escaneo
function crearOverlayEscaneo() {
    // Eliminar overlay anterior si existe
    const overlayAnterior = document.querySelector('.scanning-overlay');
    if (overlayAnterior) {
        overlayAnterior.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'scanning-overlay';
    overlay.innerHTML = `
        <div class="scanning-frame">
            <span></span>
            <div class="scanning-line"></div>
        </div>
    `;
    
    const instructions = document.createElement('div');
    instructions.className = 'scanning-instructions';
    instructions.textContent = 'Coloca el código QR dentro del recuadro';
    
    body.appendChild(overlay);
    body.appendChild(instructions);
}

// Actualizar estados de PWA
function actualizarEstadosPWA() {
    const pwaStatus = document.getElementById('pwaStatus');
    const modeStatus = document.getElementById('modeStatus');
    const swStatus = document.getElementById('swStatus');
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
        if (pwaStatus) {
            pwaStatus.textContent = '✅ Instalada';
            pwaStatus.className = 'status-value instalado';
        }
        if (modeStatus) {
            modeStatus.textContent = 'App Instalada';
            modeStatus.className = 'status-value instalado';
        }
    } else {
        if (pwaStatus) {
            pwaStatus.textContent = '🔄 Instalable';
            pwaStatus.className = 'status-value no-instalado';
        }
        if (modeStatus) {
            modeStatus.textContent = 'Navegador';
            modeStatus.className = 'status-value no-instalado';
        }
    }
    
    if (navigator.serviceWorker && swStatus) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            swStatus.textContent = regs.length > 0 ? '✅ Activo' : '❌ Inactivo';
            swStatus.className = regs.length > 0 ? 'status-value instalado' : 'status-value no-instalado';
        });
    }
}

// Evento de instalación PWA
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    mostrarBotonInstalacion();
});

function mostrarBotonInstalacion() {
    if (!document.getElementById('installButton')) {
        const btn = document.createElement('button');
        btn.id = 'installButton';
        btn.className = 'btn btn-primary';
        btn.innerHTML = '<span class="btn-icon">📲</span> Instalar App';
        btn.onclick = instalarPWA;
        btn.style.marginTop = '10px';
        document.querySelector('.container').appendChild(btn);
    }
}

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

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('✅ Service Worker registrado'))
            .catch(err => console.log('❌ Error SW:', err));
    });
}

// Detectar instalación
window.addEventListener('appinstalled', () => {
    alert('¡App instalada correctamente!');
    document.getElementById('installButton')?.remove();
    actualizarEstadosPWA();
});

// ===== FUNCIÓN PRINCIPAL DE ESCANEO OPTIMIZADA =====
async function iniciarEscaneo() {
    console.log('📱 Iniciando escaneo...');
    
    try {
        // Verificar soporte de cámara
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Tu navegador no soporta acceso a cámara');
        }
        
        // Mostrar loading
        mostrarMensajeCamara('📷 Iniciando cámara...', 'info');
        
        // Configuración optimizada para móviles
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 720 }, // Reducido para mejor rendimiento
                height: { ideal: 1280 },
                frameRate: { ideal: 15 } // Limitar FPS
            }
        });
        
        console.log('✅ Permiso de cámara concedido');
        
        // Configurar video
        video.srcObject = videoStream;
        video.setAttribute('playsinline', true);
        
        // Activar modo pantalla completa
        body.classList.add('scanning-active');
        
        // Crear overlay de escaneo
        crearOverlayEscaneo();
        
        // Mostrar contenedor de video
        videoContainer.style.display = 'flex';
        scanButton.style.display = 'none';
        resultContainer.style.display = 'none';
        
        // Esperar a que el video esté listo
        video.onloadedmetadata = () => {
            video.play().then(() => {
                console.log('✅ Video reproduciendo');
                scanningActive = true;
                
                // Pequeño delay para asegurar que el video esté listo
                setTimeout(() => {
                    escanearQRConIntervalo();
                }, 500);
            });
        };
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        let mensaje = 'Error al acceder a la cámara';
        if (error.name === 'NotAllowedError') {
            mensaje = '📷 Permiso de cámara denegado';
        } else if (error.name === 'NotFoundError') {
            mensaje = '📷 No se encontró cámara';
        } else {
            mensaje = '📷 ' + (error.message || 'Error desconocido');
        }
        
        mostrarMensajeCamara(mensaje, 'error');
        detenerEscaneo();
    }
}

// Escaneo por intervalo (más eficiente que requestAnimationFrame continuo)
function escanearQRConIntervalo() {
    if (!scanningActive) return;
    
    // Limpiar timeout anterior
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }
    
    // Ejecutar escaneo
    realizarEscaneo();
    
    // Programar siguiente escaneo
    scanTimeout = setTimeout(() => {
        escanearQRConIntervalo();
    }, SCAN_INTERVAL);
}

function realizarEscaneo() {
    if (!scanningActive || !video || video.readyState < 2) {
        return;
    }
    
    try {
        // Limitar tiempo de escaneo para no bloquear
        const startTime = performance.now();
        
        // Configurar canvas con dimensiones reducidas para mejor rendimiento
        const width = Math.min(video.videoWidth, 640);
        const height = Math.min(video.videoHeight, 480);
        
        canvas.width = width;
        canvas.height = height;
        
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(video, 0, 0, width, height);
        
        // Obtener datos de la imagen
        const imageData = context.getImageData(0, 0, width, height);
        
        // Escanear QR con jsQR
        const code = jsQR(imageData.data, width, height, {
            inversionAttempts: "dontInvert",
        });
        
        if (code) {
            console.log('✅ QR detectado:', code.data);
            procesarResultado(code.data);
        }
        
        // Medir tiempo de escaneo
        const scanTime = performance.now() - startTime;
        if (scanTime > 100) {
            console.log(`⚠️ Escaneo lento: ${scanTime.toFixed(0)}ms`);
        }
        
    } catch (error) {
        console.error('Error en escaneo:', error);
    }
}

// Procesar resultado del QR
function procesarResultado(data) {
    // Detener escaneo inmediatamente
    scanningActive = false;
    
    if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
    }
    
    // Detener video
    if (videoStream) {
        videoStream.getTracks().forEach(track => {
            track.stop();
        });
        videoStream = null;
    }
    
    if (video) {
        video.srcObject = null;
    }
    
    // Remover overlay de escaneo
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    
    // Desactivar modo pantalla completa
    body.classList.remove('scanning-active');
    
    // Vibrar si es posible
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(200);
    }
    
    // Mostrar resultado inmediatamente
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

// Detener escaneo (cancelar)
function detenerEscaneo() {
    console.log('Deteniendo escaneo...');
    
    scanningActive = false;
    
    if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
    }
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => {
            track.stop();
        });
        videoStream = null;
    }
    
    if (video) {
        video.srcObject = null;
    }
    
    // Remover overlay
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    
    // Desactivar modo pantalla completa
    body.classList.remove('scanning-active');
    
    // Restaurar UI
    scanButton.style.display = 'block';
    videoContainer.style.display = 'none';
    resultContainer.style.display = 'none';
    
    mostrarMensajeCamara('Escáner listo para usar', 'success');
}

// Resetear escaneo (nuevo escaneo)
function resetearEscaneo() {
    detenerEscaneo();
    // Pequeño delay antes de permitir nuevo escaneo
    setTimeout(() => {
        mostrarMensajeCamara('Escáner listo para usar', 'success');
    }, 300);
}

// Utilidades
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

// Limpiar al cerrar
window.addEventListener('beforeunload', () => {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }
});