// app.js - Versión simplificada y funcional
let deferredPrompt;
let html5QrCode = null;
let scannerInitialized = false;

// Elementos del DOM
const scanButton = document.getElementById('scanButton');
const qrReaderContainer = document.getElementById('qr-reader-container');
const qrReader = document.getElementById('qr-reader');
const resultContainer = document.getElementById('result-container');
const scanResult = document.getElementById('scan-result');
const newScanBtn = document.getElementById('new-scan-btn');
const cancelScanBtn = document.getElementById('cancel-scan-btn');

// Inicializar cuando la página cargue
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado');
    actualizarEstadosPWA();
    configurarBotones();
    verificarLibreria();
});

// Verificar que la librería esté cargada
function verificarLibreria() {
    if (typeof Html5Qrcode !== 'undefined') {
        console.log('✅ Librería HTML5-QRCode cargada');
        scannerInitialized = true;
        if (scanButton) {
            scanButton.disabled = false;
            scanButton.classList.remove('btn-primary:disabled');
        }
        mostrarMensajeCamara('Librería cargada correctamente', 'success');
    } else {
        console.log('⏳ Esperando librería...');
        setTimeout(verificarLibreria, 200);
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
        cancelScanBtn.addEventListener('click', resetearEscaneo);
    }
}

// Mostrar mensaje de estado de cámara
function mostrarMensajeCamara(mensaje, tipo = 'info') {
    // Eliminar mensaje anterior si existe
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

// Actualizar estados de PWA
function actualizarEstadosPWA() {
    const pwaStatus = document.getElementById('pwaStatus');
    const modeStatus = document.getElementById('modeStatus');
    const swStatus = document.getElementById('swStatus');
    
    // Verificar modo standalone
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
    
    // Verificar Service Worker
    if (navigator.serviceWorker && swStatus) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            if (regs.length > 0) {
                swStatus.textContent = '✅ Activo';
                swStatus.className = 'status-value instalado';
            } else {
                swStatus.textContent = '❌ Inactivo';
                swStatus.className = 'status-value no-instalado';
            }
        });
    }
}

// Evento de instalación PWA
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('✅ Listo para instalar');
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
            .then(reg => console.log('Service Worker registrado:', reg.scope))
            .catch(err => console.log('Error SW:', err));
    });
}

// Detectar instalación
window.addEventListener('appinstalled', (e) => {
    console.log('✅ PWA instalada');
    alert('¡App instalada correctamente!');
    document.getElementById('installButton')?.remove();
    actualizarEstadosPWA();
});

// Función para iniciar escaneo
async function iniciarEscaneo() {
    console.log('Iniciando escaneo...');
    
    if (!scannerInitialized) {
        alert('Cargando escáner, intenta de nuevo...');
        return;
    }
    
    try {
        // Verificar soporte de cámara
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            mostrarMensajeCamara('Tu navegador no soporta acceso a cámara', 'error');
            return;
        }
        
        // Solicitar permisos
        mostrarMensajeCamara('Solicitando permiso para usar la cámara...', 'info');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        
        // Permiso concedido
        stream.getTracks().forEach(track => track.stop());
        mostrarMensajeCamara('✅ Cámara lista', 'success');
        
        // Mostrar lector QR
        scanButton.style.display = 'none';
        qrReaderContainer.style.display = 'block';
        resultContainer.style.display = 'none';
        
        // Limpiar contenedor
        qrReader.innerHTML = '';
        
        // Configurar escáner
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        html5QrCode = new Html5Qrcode("qr-reader");
        
        // Iniciar escáner
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanError
        );
        
    } catch (err) {
        console.error('Error:', err);
        
        if (err.name === 'NotAllowedError') {
            mostrarMensajeCamara('Permiso de cámara denegado. Habilítalo en configuración.', 'error');
        } else if (err.name === 'NotFoundError') {
            mostrarMensajeCamara('No se encontró cámara en el dispositivo', 'error');
        } else {
            mostrarMensajeCamara('Error al acceder a la cámara: ' + err.message, 'error');
        }
        
        resetearEscaneo();
    }
}

// Éxito al escanear
function onScanSuccess(decodedText, decodedResult) {
    console.log("QR escaneado:", decodedText);
    
    // Vibrar si es posible
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(200);
    }
    
    // Detener escáner
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
            
            // Mostrar resultado
            qrReaderContainer.style.display = 'none';
            resultContainer.style.display = 'block';
            
            let resultHTML = `<div class="qr-content">${decodedText}</div>`;
            
            if (esURL(decodedText)) {
                resultHTML += `<a href="${decodedText}" target="_blank" class="qr-action-btn">🔗 Abrir enlace</a>`;
            } else if (esTelefono(decodedText)) {
                resultHTML += `<a href="tel:${decodedText}" class="qr-action-btn">📞 Llamar</a>`;
            } else if (esEmail(decodedText)) {
                resultHTML += `<a href="mailto:${decodedText}" class="qr-action-btn">📧 Enviar email</a>`;
            }
            
            scanResult.innerHTML = resultHTML;
        });
    }
}

// Error al escanear
function onScanError(error) {
    // Solo mostrar errores importantes
    if (error && error.includes("NotFoundException")) {
        // Ignorar errores de escaneo normales
    }
}

// Resetear escaneo
function resetearEscaneo() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
        }).catch(console.error);
    }
    
    scanButton.style.display = 'block';
    qrReaderContainer.style.display = 'none';
    resultContainer.style.display = 'none';
    qrReader.innerHTML = '';
    scanResult.innerHTML = '';
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
    return /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/.test(string);
}

function esEmail(string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(string);
}