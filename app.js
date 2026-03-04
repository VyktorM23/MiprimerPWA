// app.js mejorado con escáner QR y detección mejorada de cámara
let deferredPrompt;
let html5QrCode = null;
let isLibraryLoaded = false;

// Elementos del DOM
const scanButton = document.getElementById('scanButton');
const qrReader = document.getElementById('qr-reader');
const resultContainer = document.getElementById('result-container');
const scanResult = document.getElementById('scan-result');
const newScanBtn = document.getElementById('new-scan-btn');

// Verificar si la librería está cargada
function checkLibraryLoaded() {
    if (typeof Html5Qrcode !== 'undefined') {
        isLibraryLoaded = true;
        console.log('✅ Librería HTML5-QRCode cargada correctamente');
        if (scanButton) {
            scanButton.disabled = false;
            scanButton.style.opacity = '1';
        }
    } else {
        console.log('⏳ Esperando carga de librería...');
        setTimeout(checkLibraryLoaded, 200);
    }
}

// Iniciar verificación después de cargar la página
window.addEventListener('load', () => {
    checkLibraryLoaded();
    verificarCompatibilidadCamara();
});

// Verificar compatibilidad de cámara
function verificarCompatibilidadCamara() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'camera-status';
    statusDiv.style.cssText = `
        font-size: 14px;
        margin: 10px auto;
        padding: 10px;
        border-radius: 5px;
        max-width: 300px;
    `;
    
    // Verificar si el contexto es seguro
    const isSecure = window.isSecureContext;
    console.log('Contexto seguro (HTTPS):', isSecure);
    
    // Verificar soporte de getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        statusDiv.textContent = '✅ Cámara compatible';
        statusDiv.style.backgroundColor = '#d4edda';
        statusDiv.style.color = '#155724';
        statusDiv.style.border = '1px solid #c3e6cb';
    } else {
        statusDiv.textContent = '❌ Cámara no compatible. Asegúrate de usar HTTPS y tener permisos.';
        statusDiv.style.backgroundColor = '#f8d7da';
        statusDiv.style.color = '#721c24';
        statusDiv.style.border = '1px solid #f5c6cb';
    }
    
    // Insertar después del botón
    if (scanButton) {
        scanButton.insertAdjacentElement('afterend', statusDiv);
    }
}

// Evento para instalar PWA
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
        btn.textContent = '📲 Instalar App';
        btn.onclick = instalarPWA;
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            padding: 15px;
            background: #0d6efd;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(btn);
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
            .then(reg => {
                console.log('Service Worker registrado:', reg.scope);
                verificarInstalacion();
            })
            .catch(err => console.log('Error:', err));
    });
}

function verificarInstalacion() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('App ejecutándose como standalone');
        document.getElementById('installButton')?.remove();
    }
}

// Detectar cuando se instala
window.addEventListener('appinstalled', (e) => {
    console.log('✅ PWA instalada correctamente');
    alert('¡App instalada correctamente!');
    document.getElementById('installButton')?.remove();
});

// ===== FUNCIONALIDAD DE ESCÁNER QR =====
if (scanButton) {
    scanButton.addEventListener('click', iniciarEscaneo);
}

if (newScanBtn) {
    newScanBtn.addEventListener('click', resetearEscaneo);
}

async function iniciarEscaneo() {
    // Verificar si la librería está cargada
    if (!isLibraryLoaded) {
        alert('Cargando librería de escaneo, intenta de nuevo en un momento...');
        return;
    }
    
    // Verificar contexto seguro
    if (!window.isSecureContext) {
        alert('⚠️ El acceso a cámara requiere HTTPS. Esta app necesita ejecutarse en un contexto seguro (HTTPS o localhost).');
        console.warn('Contexto inseguro detectado');
        return;
    }
    
    // Verificar soporte de cámara
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('❌ Tu navegador no soporta el acceso a la cámara. Prueba con Chrome o Safari en iOS.');
        return;
    }
    
    try {
        // Solicitar permisos de cámara explícitamente
        console.log('Solicitando permisos de cámara...');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                facingMode: 'environment' // Preferir cámara trasera
            } 
        });
        
        // Si llegamos aquí, los permisos fueron concedidos
        console.log('✅ Permisos de cámara concedidos');
        
        // Detener el stream de prueba
        stream.getTracks().forEach(track => track.stop());
        
        // Ocultar botón de escaneo y mostrar lector QR
        scanButton.style.display = 'none';
        qrReader.style.display = 'block';
        resultContainer.style.display = 'none';
        
        // Limpiar el contenedor
        qrReader.innerHTML = '';
        
        // Configurar y iniciar el escáner
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true // Botón de linterna en iOS
        };
        
        html5QrCode = new Html5Qrcode("qr-reader");
        
        // En dispositivos móviles, es más simple usar facingMode
        html5QrCode.start(
            { facingMode: "environment" }, // Cámara trasera
            config,
            onScanSuccess,
            onScanError
        ).catch(async (err) => {
            console.error("Error con cámara trasera:", err);
            
            // Intentar con cualquier cámara disponible
            try {
                const cameras = await Html5Qrcode.getCameras();
                if (cameras && cameras.length > 0) {
                    await html5QrCode.start(
                        cameras[0].id,
                        config,
                        onScanSuccess,
                        onScanError
                    );
                } else {
                    throw new Error("No se encontraron cámaras");
                }
            } catch (cameraError) {
                console.error("Error al iniciar cámara:", cameraError);
                alert("No se pudo acceder a la cámara. Verifica los permisos en la configuración de tu dispositivo.");
                resetearEscaneo();
            }
        });
        
    } catch (err) {
        console.error("Error al solicitar permisos de cámara:", err);
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            alert('📷 Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu dispositivo y recarga la página.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            alert('📷 No se encontró ninguna cámara en este dispositivo.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            alert('📷 La cámara está siendo usada por otra aplicación. Ciérrala e intenta de nuevo.');
        } else {
            alert('📷 Error al acceder a la cámara: ' + (err.message || 'Error desconocido'));
        }
        
        resetearEscaneo();
    }
}

function onScanSuccess(decodedText, decodedResult) {
    console.log("QR escaneado:", decodedText);
    
    // Vibrar si está disponible (solo en contexto seguro)
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(200); // Vibrar 200ms
    }
    
    // Detener el escáner
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
            
            // Mostrar resultado
            qrReader.style.display = 'none';
            resultContainer.style.display = 'block';
            
            let resultHTML = `<p><strong>Contenido del QR:</strong></p>
                              <div class="qr-content">${decodedText}</div>`;
            
            if (esURL(decodedText)) {
                resultHTML += `<p><a href="${decodedText}" target="_blank" rel="noopener noreferrer" class="qr-action-btn">🔗 Abrir enlace</a></p>`;
            } else if (esNumeroTelefono(decodedText)) {
                resultHTML += `<p><a href="tel:${decodedText}" class="qr-action-btn">📞 Llamar al ${decodedText}</a></p>`;
            } else if (esEmail(decodedText)) {
                resultHTML += `<p><a href="mailto:${decodedText}" class="qr-action-btn">📧 Enviar email</a></p>`;
            } else if (esWiFi(decodedText)) {
                resultHTML += `<p>🔐 Red WiFi detectada. Usa la información para conectarte.</p>`;
            }
            
            scanResult.innerHTML = resultHTML;
        }).catch(err => console.error("Error al detener escáner:", err));
    }
}

function onScanError(error) {
    // Solo mostrar errores importantes para no saturar la consola
    if (error && error.includes("NotFoundException")) {
        console.log("Escaneando... (esperando QR válido)");
    }
}

function resetearEscaneo() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
        }).catch(err => console.error("Error:", err));
    }
    
    scanButton.style.display = 'block';
    qrReader.style.display = 'none';
    qrReader.innerHTML = '';
    resultContainer.style.display = 'none';
    scanResult.innerHTML = '';
}

// Funciones de utilidad
function esURL(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function esNumeroTelefono(string) {
    return /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/.test(string);
}

function esEmail(string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(string);
}

function esWiFi(string) {
    return string.toLowerCase().startsWith('wifi:');
}

// Detectar cambios en el modo standalone
if (window.matchMedia) {
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
        if (e.matches) {
            console.log('App ahora en modo standalone');
        } else {
            console.log('App ahora en modo navegador');
        }
    });
}

// Deshabilitar botón inicialmente si la librería no está cargada
if (scanButton && !isLibraryLoaded) {
    scanButton.disabled = true;
    scanButton.style.opacity = '0.5';
    scanButton.title = 'Cargando librería de escaneo...';
}