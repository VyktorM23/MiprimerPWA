// app.js mejorado con escáner QR fullscreen - VERSIÓN CORREGIDA
let deferredPrompt;
let html5QrCode = null;
let isScanning = false;

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
    mostrarMensaje('¡App instalada correctamente!', 'success');
    document.getElementById('installButton')?.remove();
});

// ========== FUNCIONALIDAD DEL ESCÁNER QR FULLSCREEN ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, inicializando eventos...');
    
    const scanButton = document.getElementById('scanButton');
    const closeScannerBtn = document.getElementById('closeScanner');
    const modal = document.getElementById('resultModal');
    const closeBtn = document.querySelector('.close');
    const copyBtn = document.getElementById('copyResult');
    
    // Verificar que los elementos existen
    if (scanButton) {
        console.log('Botón de escanear encontrado');
        scanButton.addEventListener('click', function() {
            console.log('Botón de escanear clickeado');
            abrirScanner();
        });
    } else {
        console.error('No se encontró el botón de escanear');
    }
    
    if (closeScannerBtn) {
        closeScannerBtn.addEventListener('click', cerrarScanner);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const resultText = document.getElementById('qrResult').textContent;
            navigator.clipboard.writeText(resultText).then(function() {
                mostrarMensaje('¡Copiado al portapapeles!', 'success');
            }).catch(function() {
                mostrarMensaje('Error al copiar', 'error');
            });
        });
    }
});

function abrirScanner() {
    console.log('Abriendo scanner...');
    
    const mainScreen = document.getElementById('mainScreen');
    const scannerScreen = document.getElementById('scannerScreen');
    
    if (!mainScreen || !scannerScreen) {
        console.error('No se encontraron las pantallas necesarias');
        return;
    }
    
    // Ocultar pantalla principal y mostrar escáner
    mainScreen.style.display = 'none';
    scannerScreen.style.display = 'flex';
    
    // Iniciar escáner después de un pequeño retraso
    setTimeout(() => {
        iniciarScanner();
    }, 500);
}

function cerrarScanner() {
    console.log('Cerrando scanner...');
    
    const mainScreen = document.getElementById('mainScreen');
    const scannerScreen = document.getElementById('scannerScreen');
    
    // Detener escáner
    detenerScanner();
    
    // Mostrar pantalla principal y ocultar escáner
    if (mainScreen && scannerScreen) {
        mainScreen.style.display = 'flex';
        scannerScreen.style.display = 'none';
    }
}

function iniciarScanner() {
    console.log('Iniciando scanner...');
    
    const reader = document.getElementById('reader');
    
    if (!reader) {
        console.error('No se encontró el elemento reader');
        mostrarMensaje('Error: No se pudo inicializar la cámara', 'error');
        cerrarScanner();
        return;
    }
    
    // Limpiar el contenedor
    reader.innerHTML = '';
    
    // Crear nueva instancia del escáner
    try {
        html5QrCode = new Html5Qrcode("reader");
    } catch (error) {
        console.error('Error al crear Html5Qrcode:', error);
        mostrarMensaje('Error al inicializar el escáner', 'error');
        cerrarScanner();
        return;
    }
    
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        console.log("✅ QR detectado:", decodedText);
        
        // Vibrar si está disponible
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
        
        // Detener escáner
        detenerScanner();
        
        // Cerrar pantalla de escáner
        cerrarScanner();
        
        // Mostrar resultado
        setTimeout(() => {
            mostrarResultado(decodedText);
        }, 300);
    };
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    // Solicitar permisos de cámara y comenzar
    html5QrCode.start(
        { facingMode: "environment" }, // Usar cámara trasera
        config,
        qrCodeSuccessCallback,
        (errorMessage) => {
            // Ignorar errores de escaneo (son normales durante el escaneo)
            // console.log(errorMessage);
        }
    ).then(() => {
        console.log("✅ Escáner iniciado correctamente");
        isScanning = true;
    }).catch((err) => {
        console.error("❌ Error al iniciar escáner:", err);
        
        let mensajeError = 'Error al acceder a la cámara';
        if (err.toString().includes('NotAllowedError')) {
            mensajeError = 'Permiso de cámara denegado. Por favor, concede permisos en la configuración.';
        } else if (err.toString().includes('NotFoundError')) {
            mensajeError = 'No se encontró ninguna cámara en este dispositivo.';
        } else if (err.toString().includes('NotReadableError')) {
            mensajeError = 'La cámara está siendo usada por otra aplicación.';
        }
        
        mostrarMensaje(mensajeError, 'error');
        
        // Cerrar escáner después del error
        setTimeout(() => {
            cerrarScanner();
        }, 2000);
    });
}

function detenerScanner() {
    if (html5QrCode && isScanning) {
        console.log('Deteniendo scanner...');
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
            isScanning = false;
            console.log("✅ Escáner detenido");
        }).catch((err) => {
            console.error("Error al detener escáner:", err);
        });
    }
}

function mostrarResultado(texto) {
    const modal = document.getElementById('resultModal');
    const qrResult = document.getElementById('qrResult');
    
    if (!modal || !qrResult) {
        console.error('No se encontraron elementos del modal');
        return;
    }
    
    // Intentar detectar si es una URL
    if (esURL(texto)) {
        qrResult.innerHTML = `
            <p><strong>🔗 URL Detectada:</strong></p>
            <p style="word-break: break-all; margin: 10px 0;">${texto}</p>
            <a href="${texto}" target="_blank" class="copy-btn" style="display: inline-block; margin-top: 10px; text-decoration: none; background-color: #0d6efd;">🌐 Abrir enlace</a>
        `;
    } else {
        // Intentar detectar si es JSON
        try {
            const jsonObj = JSON.parse(texto);
            qrResult.innerHTML = `
                <p><strong>📋 JSON Detectado:</strong></p>
                <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; overflow: auto; margin: 10px 0;">${JSON.stringify(jsonObj, null, 2)}</pre>
            `;
        } catch (e) {
            // Texto plano
            qrResult.innerHTML = `
                <p><strong>📄 Contenido:</strong></p>
                <p style="word-break: break-all; margin: 10px 0;">${texto}</p>
            `;
        }
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

// Prevenir que el navegador recargue al hacer swipe en el escáner
window.addEventListener('touchstart', (e) => {
    const scannerScreen = document.getElementById('scannerScreen');
    if (scannerScreen && scannerScreen.style.display === 'flex') {
        e.preventDefault();
    }
}, { passive: false });