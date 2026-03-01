// app.js - Versión CORREGIDA y funcional
let deferredPrompt;
let html5QrCode = null;

// Evento de instalación PWA
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('✅ Listo para instalar');
    e.preventDefault();
    deferredPrompt = e;
    mostrarBotonInstalacion();
});

function mostrarBotonInstalacion() {
    if (!document.getElementById('installButton') && !window.matchMedia('(display-mode: standalone)').matches) {
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
            .then(reg => console.log('Service Worker registrado:', reg.scope))
            .catch(err => console.log('Error:', err));
    });
}

// Detectar cuando se instala
window.addEventListener('appinstalled', (e) => {
    console.log('✅ PWA instalada correctamente');
    mostrarMensaje('¡App instalada correctamente!', 'success');
    document.getElementById('installButton')?.remove();
});

// ========== ESCÁNER QR - VERSIÓN SIMPLIFICADA ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado - Inicializando eventos');
    
    const scanButton = document.getElementById('scanButton');
    const closeScannerBtn = document.getElementById('closeScanner');
    const closeModalBtn = document.querySelector('.close');
    const closeResultBtn = document.getElementById('closeResult');
    const copyBtn = document.getElementById('copyResult');
    
    // Botón para abrir escáner
    if (scanButton) {
        scanButton.addEventListener('click', function() {
            console.log('Botón ESCANEAR clickeado');
            abrirScanner();
        });
    } else {
        console.error('❌ No se encontró el botón scanButton');
    }
    
    // Botón para cerrar escáner
    if (closeScannerBtn) {
        closeScannerBtn.addEventListener('click', cerrarScanner);
    }
    
    // Botones para cerrar modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            document.getElementById('resultModal').style.display = 'none';
        });
    }
    
    if (closeResultBtn) {
        closeResultBtn.addEventListener('click', function() {
            document.getElementById('resultModal').style.display = 'none';
        });
    }
    
    // Botón para copiar resultado
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const resultText = document.getElementById('qrResult').textContent;
            navigator.clipboard.writeText(resultText).then(() => {
                mostrarMensaje('¡Copiado al portapapeles!', 'success');
            }).catch(() => {
                mostrarMensaje('Error al copiar', 'error');
            });
        });
    }
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('resultModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

function abrirScanner() {
    console.log('Abriendo pantalla de escáner...');
    
    const mainScreen = document.getElementById('mainScreen');
    const scannerScreen = document.getElementById('scannerScreen');
    
    if (!mainScreen || !scannerScreen) {
        console.error('❌ No se encontraron las pantallas');
        return;
    }
    
    mainScreen.style.display = 'none';
    scannerScreen.style.display = 'flex';
    
    // Iniciar escáner después de que la pantalla esté visible
    setTimeout(() => {
        iniciarScanner();
    }, 500);
}

function cerrarScanner() {
    console.log('Cerrando escáner...');
    
    // Detener el escáner si está activo
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
            console.log('✅ Escáner detenido');
        }).catch(err => {
            console.log('Error al detener:', err);
        });
    }
    
    const mainScreen = document.getElementById('mainScreen');
    const scannerScreen = document.getElementById('scannerScreen');
    
    if (mainScreen && scannerScreen) {
        mainScreen.style.display = 'flex';
        scannerScreen.style.display = 'none';
    }
}

function iniciarScanner() {
    console.log('Iniciando escáner...');
    
    // IMPORTANTE: Usar el ID correcto del HTML
    const qrReaderElement = document.getElementById('qr-reader');
    
    if (!qrReaderElement) {
        console.error('❌ No se encontró el elemento qr-reader');
        mostrarMensaje('Error: No se encontró el contenedor de la cámara', 'error');
        cerrarScanner();
        return;
    }
    
    // Limpiar el contenedor
    qrReaderElement.innerHTML = '';
    
    try {
        // Verificar si la librería está disponible
        if (typeof Html5Qrcode === 'undefined') {
            console.error('❌ La librería Html5Qrcode no está cargada');
            mostrarMensaje('Error: Librería no cargada', 'error');
            cerrarScanner();
            return;
        }
        
        // Crear nueva instancia del escáner
        html5QrCode = new Html5Qrcode("qr-reader");
        
        // Configuración del escáner
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        // Callback cuando se detecta un código QR
        const onScanSuccess = (decodedText, decodedResult) => {
            console.log('✅ QR detectado:', decodedText);
            
            // Vibrar si está disponible
            if (navigator.vibrate) {
                navigator.vibrate(200);
            }
            
            // Detener el escáner
            if (html5QrCode) {
                html5QrCode.stop().then(() => {
                    html5QrCode.clear();
                    html5QrCode = null;
                    
                    // Cerrar pantalla de escáner
                    cerrarScanner();
                    
                    // Mostrar resultado
                    setTimeout(() => {
                        mostrarResultado(decodedText);
                    }, 300);
                }).catch(err => {
                    console.error('Error al detener:', err);
                });
            }
        };
        
        // Callback para errores de escaneo
        const onScanFailure = (error) => {
            // Solo mostrar errores importantes en consola
            if (error && !error.includes('NotFound')) {
                console.log('Error de escaneo:', error);
            }
        };
        
        // Solicitar permisos y iniciar la cámara
        console.log('Solicitando permisos de cámara...');
        
        html5QrCode.start(
            { facingMode: "environment" }, // Cámara trasera
            config,
            onScanSuccess,
            onScanFailure
        ).then(() => {
            console.log('✅ Cámara iniciada correctamente');
            mostrarMensaje('Cámara activada. Apunta al código QR', 'success');
        }).catch((err) => {
            console.error('❌ Error al iniciar cámara:', err);
            
            let mensaje = 'Error al acceder a la cámara';
            if (err.toString().includes('NotAllowedError')) {
                mensaje = 'Permiso de cámara denegado. Concede permisos en la configuración.';
            } else if (err.toString().includes('NotFoundError')) {
                mensaje = 'No se encontró ninguna cámara en este dispositivo.';
            } else if (err.toString().includes('NotReadableError')) {
                mensaje = 'La cámara está siendo usada por otra aplicación.';
            }
            
            mostrarMensaje(mensaje, 'error');
            
            // Cerrar escáner después del error
            setTimeout(cerrarScanner, 3000);
        });
        
    } catch (error) {
        console.error('❌ Error al crear el escáner:', error);
        mostrarMensaje('Error al inicializar el escáner', 'error');
        cerrarScanner();
    }
}

function mostrarResultado(texto) {
    console.log('Mostrando resultado:', texto);
    
    const modal = document.getElementById('resultModal');
    const qrResult = document.getElementById('qrResult');
    
    if (!modal || !qrResult) {
        console.error('No se encontraron elementos del modal');
        return;
    }
    
    // Detectar si es URL
    if (esURL(texto)) {
        qrResult.innerHTML = `
            <p><strong>🔗 URL Detectada:</strong></p>
            <p style="word-break: break-all; margin: 15px 0; padding: 10px; background: #f0f0f0; border-radius: 5px;">${texto}</p>
            <a href="${texto}" target="_blank" style="display: inline-block; padding: 12px 20px; background: #0d6efd; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; width: 100%; text-align: center; box-sizing: border-box;">🌐 Abrir enlace</a>
        `;
    } else {
        qrResult.innerHTML = `
            <p><strong>📄 Contenido:</strong></p>
            <p style="word-break: break-all; margin: 15px 0; padding: 15px; background: #f0f0f0; border-radius: 5px; max-height: 200px; overflow: auto;">${texto}</p>
        `;
    }
    
    modal.style.display = 'flex';
}

function esURL(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function mostrarMensaje(texto, tipo) {
    console.log('Mensaje:', texto, 'Tipo:', tipo);
    
    const mensaje = document.getElementById('scanMessage');
    if (!mensaje) return;
    
    mensaje.textContent = texto;
    mensaje.className = `scan-message ${tipo}`;
    mensaje.style.display = 'block';
    
    setTimeout(() => {
        mensaje.style.display = 'none';
    }, 3000);
}