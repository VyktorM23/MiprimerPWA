// app.js - Versión con jsQR y pantalla completa
let deferredPrompt;
let videoStream = null;
let scanningActive = false;
let animationFrame = null;

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

// ===== FUNCIÓN PRINCIPAL DE ESCANEO =====
async function iniciarEscaneo() {
    console.log('📱 Iniciando escaneo...');
    
    try {
        // Verificar soporte de cámara
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Tu navegador no soporta acceso a cámara');
        }
        
        // Solicitar permisos de cámara
        mostrarMensajeCamara('📷 Solicitando permiso para usar la cámara...', 'info');
        
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Cámara trasera
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        
        console.log('✅ Permiso de cámara concedido');
        
        // Configurar video
        video.srcObject = videoStream;
        video.setAttribute('playsinline', true); // Importante para iOS
        
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
            video.play();
            scanningActive = true;
            escanearQR(); // Iniciar escaneo continuo
        };
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        let mensaje = 'Error al acceder a la cámara';
        if (error.name === 'NotAllowedError') {
            mensaje = '📷 Permiso de cámara denegado. Habilítalo en configuración.';
        } else if (error.name === 'NotFoundError') {
            mensaje = '📷 No se encontró cámara en el dispositivo';
        } else {
            mensaje = '📷 ' + error.message;
        }
        
        mostrarMensajeCamara(mensaje, 'error');
        detenerEscaneo();
    }
}

// Función para escanear QR continuamente
function escanearQR() {
    if (!scanningActive) return;
    
    try {
        // Verificar que el video tenga dimensiones
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            // Configurar canvas
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Obtener datos de la imagen
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            // Escanear QR con jsQR
            const code = jsQR(imageData.data, canvas.width, canvas.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (code) {
                console.log('✅ QR detectado:', code.data);
                procesarResultado(code.data);
                return;
            }
        }
        
        // Continuar escaneando
        animationFrame = requestAnimationFrame(escanearQR);
        
    } catch (error) {
        console.error('Error en escaneo:', error);
        animationFrame = requestAnimationFrame(escanearQR);
    }
}

// Procesar resultado del QR
function procesarResultado(data) {
    // Detener escaneo
    scanningActive = false;
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    // Detener video
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
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
    
    // Mostrar resultado
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
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
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
    
    // Restaurar UI normal
    scanButton.style.display = 'block';
    videoContainer.style.display = 'none';
    resultContainer.style.display = 'none';
}

// Resetear escaneo (nuevo escaneo)
function resetearEscaneo() {
    detenerEscaneo();
    mostrarMensajeCamara('Escáner listo para usar', 'success');
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
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
});