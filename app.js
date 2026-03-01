// app.js - Versión simplificada y funcional
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

// ========== ESCÁNER QR SIMPLIFICADO ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado');
    
    const scanButton = document.getElementById('scanButton');
    const closeScannerBtn = document.getElementById('closeScanner');
    const closeButtons = document.querySelectorAll('.close, #closeResult');
    
    if (scanButton) {
        scanButton.addEventListener('click', abrirScanner);
    }
    
    if (closeScannerBtn) {
        closeScannerBtn.addEventListener('click', cerrarScanner);
    }
    
    // Cerrar modal con cualquier botón de cierre
    closeButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', function() {
                document.getElementById('resultModal').style.display = 'none';
            });
        }
    });
    
    // Copiar resultado
    const copyBtn = document.getElementById('copyResult');
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
});

function abrirScanner() {
    console.log('Abriendo escáner...');
    
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('scannerScreen').style.display = 'flex';
    
    // Iniciar escáner después de que la pantalla esté visible
    setTimeout(() => {
        iniciarScanner();
    }, 500);
}

function cerrarScanner() {
    console.log('Cerrando escáner...');
    
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
        }).catch(err => console.log('Error al detener:', err));
    }
    
    document.getElementById('mainScreen').style.display = 'flex';
    document.getElementById('scannerScreen').style.display = 'none';
}

function iniciarScanner() {
    const qrReaderElement = document.getElementById('qr-reader');
    
    if (!qrReaderElement) {
        console.error('No se encontró el elemento qr-reader');
        mostrarMensaje('Error al inicializar la cámara', 'error');
        cerrarScanner();
        return;
    }
    
    // Limpiar el contenedor
    qrReaderElement.innerHTML = '';
    
    try {
        // Crear nueva instancia del escáner
        html5QrCode = new Html5Qrcode("qr-reader");
        
        // Configuración del escáner
        const config = {
            fps: 10, // Frames por segundo
            qrbox: { width: 250, height: 250 }, // Tamaño del recuadro de escaneo
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
        };
        
        // Callback para errores de escaneo (opcional)
        const onScanFailure = (error) => {
            // No mostrar errores, solo ignorar
            // console.warn(error);
        };
        
        // Iniciar el escáner con la cámara trasera
        html5QrCode.start(
            { facingMode: "environment" }, // Usar cámara trasera
            config,
            onScanSuccess,
            onScanFailure
        ).then(() => {
            console.log('✅ Escáner iniciado correctamente');
            mostrarMensaje('Cámara iniciada, apunta al código QR', 'success');
        }).catch((err) => {
            console.error('❌ Error al iniciar escáner:', err);
            
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
            setTimeout(cerrarScanner, 2000);
        });
        
    } catch (error) {
        console.error('Error al crear el escáner:', error);
        mostrarMensaje('Error al inicializar el escáner', 'error');
        cerrarScanner();
    }
}

function mostrarResultado(texto) {
    const modal = document.getElementById('resultModal');
    const qrResult = document.getElementById('qrResult');
    
    if (!modal || !qrResult) return;
    
    // Detectar si es URL
    if (esURL(texto)) {
        qrResult.innerHTML = `
            <p><strong>🔗 URL Detectada:</strong></p>
            <p style="word-break: break-all; margin: 10px 0;">${texto}</p>
            <a href="${texto}" target="_blank" style="display: inline-block; padding: 10px; background: #0d6efd; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">🌐 Abrir enlace</a>
        `;
    } else {
        qrResult.innerHTML = `
            <p><strong>📄 Contenido:</strong></p>
            <p style="word-break: break-all; margin: 10px 0;">${texto}</p>
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
    const mensaje = document.getElementById('scanMessage');
    if (!mensaje) return;
    
    mensaje.textContent = texto;
    mensaje.className = `scan-message ${tipo}`;
    mensaje.style.display = 'block';
    
    setTimeout(() => {
        mensaje.style.display = 'none';
    }, 3000);
}