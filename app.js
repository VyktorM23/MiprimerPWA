// app.js - Versión con carga garantizada de librería
let deferredPrompt;
let html5QrCode = null;
let scannerInitialized = false;
let libraryCheckAttempts = 0;
const MAX_ATTEMPTS = 50; // 50 * 200ms = 10 segundos máximo de espera

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
    console.log('✅ DOM cargado completamente');
    actualizarEstadosPWA();
    configurarBotones();
    
    // Verificar si la librería ya está cargada
    if (typeof Html5Qrcode !== 'undefined') {
        console.log('✅ Librería HTML5-QRCode ya está disponible');
        scannerInitialized = true;
        habilitarBotonEscaneo();
    } else {
        console.log('⏳ Esperando carga de librería HTML5-QRCode...');
        // Intentar cargar la librería manualmente si es necesario
        cargarLibreriaQR();
    }
});

// Función para cargar la librería manualmente si es necesario
function cargarLibreriaQR() {
    // Si ya pasamos los intentos máximos, mostrar error
    if (libraryCheckAttempts >= MAX_ATTEMPTS) {
        console.error('❌ No se pudo cargar la librería HTML5-QRCode');
        mostrarMensajeCamara(
            'Error cargando el escáner. Por favor, recarga la página.', 
            'error'
        );
        return;
    }
    
    libraryCheckAttempts++;
    
    // Verificar si ya está disponible
    if (typeof Html5Qrcode !== 'undefined') {
        console.log('✅ Librería HTML5-QRCode cargada exitosamente');
        scannerInitialized = true;
        habilitarBotonEscaneo();
        mostrarMensajeCamara('Escáner listo para usar', 'success');
        return;
    }
    
    // Si no está disponible, esperar y volver a intentar
    console.log(`⏳ Intento ${libraryCheckAttempts}/${MAX_ATTEMPTS} de carga de librería...`);
    setTimeout(() => cargarLibreriaQR(), 200);
}

// Habilitar el botón de escaneo
function habilitarBotonEscaneo() {
    if (scanButton) {
        scanButton.disabled = false;
        scanButton.classList.remove('btn-primary:disabled');
        scanButton.style.opacity = '1';
        scanButton.style.cursor = 'pointer';
        console.log('✅ Botón de escaneo habilitado');
    }
}

// Configurar botones
function configurarBotones() {
    if (scanButton) {
        scanButton.addEventListener('click', iniciarEscaneo);
        // Inicialmente deshabilitado hasta que cargue la librería
        scanButton.disabled = true;
        scanButton.style.opacity = '0.6';
        scanButton.style.cursor = 'not-allowed';
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
    statusDiv.style.cssText = `
        margin: 10px 0;
        padding: 12px;
        border-radius: 8px;
        text-align: center;
        font-size: 14px;
        background-color: ${tipo === 'success' ? '#d4edda' : 
                          tipo === 'error' ? '#f8d7da' : 
                          tipo === 'warning' ? '#fff3cd' : '#d1ecf1'};
        color: ${tipo === 'success' ? '#155724' : 
                tipo === 'error' ? '#721c24' : 
                tipo === 'warning' ? '#856404' : '#0c5460'};
        border: 1px solid ${tipo === 'success' ? '#c3e6cb' : 
                          tipo === 'error' ? '#f5c6cb' : 
                          tipo === 'warning' ? '#ffeeba' : '#bee5eb'};
    `;
    
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
        btn.style.width = '100%';
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
            .then(reg => console.log('✅ Service Worker registrado:', reg.scope))
            .catch(err => console.log('❌ Error SW:', err));
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
    console.log('📱 Iniciando escaneo...');
    
    // Verificar si la librería está disponible
    if (typeof Html5Qrcode === 'undefined') {
        console.error('❌ Html5Qrcode no está definido');
        mostrarMensajeCamara(
            'Error: Librería de escaneo no disponible. Recarga la página.', 
            'error'
        );
        return;
    }
    
    if (!scannerInitialized) {
        console.warn('⚠️ Scanner no inicializado, pero la librería existe');
        scannerInitialized = true; // Forzar inicialización si la librería existe
    }
    
    try {
        // Verificar soporte de cámara
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            mostrarMensajeCamara(
                '❌ Tu navegador no soporta acceso a cámara', 
                'error'
            );
            return;
        }
        
        // Verificar contexto seguro
        if (!window.isSecureContext) {
            console.warn('⚠️ Contexto no seguro detectado');
            mostrarMensajeCamara(
                '⚠️ Esta app requiere HTTPS para usar la cámara', 
                'warning'
            );
        }
        
        // Solicitar permisos de cámara
        mostrarMensajeCamara('📷 Solicitando permiso para usar la cámara...', 'info');
        console.log('Solicitando permisos de cámara...');
        
        // Intentar obtener acceso a la cámara
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        }).catch(err => {
            console.error('Error al solicitar cámara:', err);
            throw err;
        });
        
        // Permiso concedido
        console.log('✅ Permiso de cámara concedido');
        stream.getTracks().forEach(track => track.stop()); // Detener stream de prueba
        
        mostrarMensajeCamara('✅ Cámara lista para escanear', 'success');
        
        // Ocultar/mostrar elementos
        scanButton.style.display = 'none';
        qrReaderContainer.style.display = 'block';
        resultContainer.style.display = 'none';
        
        // Limpiar contenedor del lector
        qrReader.innerHTML = '';
        
        // Crear instancia del escáner
        console.log('Creando instancia de Html5Qrcode...');
        html5QrCode = new Html5Qrcode("qr-reader");
        
        // Configuración del escáner
        const config = {
            fps: 10, // Frames por segundo
            qrbox: { width: 250, height: 250 }, // Tamaño del cuadro de escaneo
            aspectRatio: 1.0,
            disableFlip: false, // Permitir voltear la imagen
        };
        
        // Intentar iniciar con cámara trasera
        console.log('Iniciando escáner con cámara trasera...');
        
        try {
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                onScanError
            );
            console.log('✅ Escáner iniciado correctamente');
        } catch (cameraError) {
            console.warn('Error con cámara trasera, intentando con cualquier cámara:', cameraError);
            
            // Si falla, intentar obtener lista de cámaras
            try {
                const cameras = await Html5Qrcode.getCameras();
                if (cameras && cameras.length > 0) {
                    console.log('Cámaras disponibles:', cameras);
                    await html5QrCode.start(
                        cameras[0].id,
                        config,
                        onScanSuccess,
                        onScanError
                    );
                    console.log('✅ Escáner iniciado con cámara alternativa');
                } else {
                    throw new Error('No se encontraron cámaras');
                }
            } catch (fallbackError) {
                console.error('Error en fallback:', fallbackError);
                throw fallbackError;
            }
        }
        
    } catch (err) {
        console.error('❌ Error detallado:', err);
        
        let mensaje = 'Error al acceder a la cámara';
        let tipo = 'error';
        
        if (err.name === 'NotAllowedError' || err.message.includes('permission')) {
            mensaje = '📷 Permiso de cámara denegado. Habilítalo en configuración.';
            tipo = 'error';
        } else if (err.name === 'NotFoundError' || err.message.includes('not found')) {
            mensaje = '📷 No se encontró cámara en el dispositivo';
            tipo = 'error';
        } else if (err.name === 'NotReadableError') {
            mensaje = '📷 La cámara está siendo usada por otra aplicación';
            tipo = 'warning';
        } else if (err.message.includes('gUM')) {
            mensaje = '📷 Error de getUserMedia. ¿Usas HTTPS?';
            tipo = 'warning';
        } else {
            mensaje = '📷 Error: ' + (err.message || 'Error desconocido');
            tipo = 'error';
        }
        
        mostrarMensajeCamara(mensaje, tipo);
        
        // Resetear UI
        scanButton.style.display = 'block';
        qrReaderContainer.style.display = 'none';
    }
}

// Éxito al escanear
function onScanSuccess(decodedText, decodedResult) {
    console.log("✅ QR escaneado:", decodedText);
    
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
            
            // Construir HTML del resultado
            let resultHTML = `<div class="qr-content">${decodedText}</div>`;
            
            if (esURL(decodedText)) {
                resultHTML += `<a href="${decodedText}" target="_blank" class="qr-action-btn">🔗 Abrir enlace</a>`;
            } else if (esTelefono(decodedText)) {
                const telefono = decodedText.replace(/\D/g, '');
                resultHTML += `<a href="tel:${telefono}" class="qr-action-btn">📞 Llamar</a>`;
            } else if (esEmail(decodedText)) {
                resultHTML += `<a href="mailto:${decodedText}" class="qr-action-btn">📧 Enviar email</a>`;
            } else if (decodedText.startsWith('WIFI:')) {
                resultHTML += `<p class="info-text">🔐 Red WiFi detectada. Usa la información para conectarte.</p>`;
            }
            
            scanResult.innerHTML = resultHTML;
        }).catch(err => console.error('Error al detener escáner:', err));
    }
}

// Error al escanear
function onScanError(error) {
    // Solo mostrar errores importantes en consola
    if (error && !error.includes('NotFoundException')) {
        console.debug('Error de escaneo:', error);
    }
}

// Resetear escaneo
function resetearEscaneo() {
    console.log('Resetando escáner...');
    
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
    
    // Mostrar mensaje de que el escáner está listo
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
    // Eliminar caracteres no numéricos y verificar longitud
    const numeros = string.replace(/\D/g, '');
    return numeros.length >= 7 && numeros.length <= 15;
}

function esEmail(string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(string);
}

// Escuchar cambios en modo standalone
if (window.matchMedia) {
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
        console.log('Modo cambiado:', e.matches ? 'standalone' : 'navegador');
        actualizarEstadosPWA();
    });
}