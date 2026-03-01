// app.js mejorado con escáner QR
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
    mostrarMensaje('¡App instalada correctamente!', 'success');
    document.getElementById('installButton')?.remove();
});

// ========== FUNCIONALIDAD DEL ESCÁNER QR ==========

document.addEventListener('DOMContentLoaded', function() {
    const scanButton = document.getElementById('scanButton');
    const reader = document.getElementById('reader');
    const modal = document.getElementById('resultModal');
    const closeBtn = document.querySelector('.close');
    const copyBtn = document.getElementById('copyResult');
    
    // Configurar botón de escaneo
    scanButton.addEventListener('click', toggleScanner);
    
    // Cerrar modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Copiar resultado
    copyBtn.addEventListener('click', function() {
        const resultText = document.getElementById('qrResult').textContent;
        navigator.clipboard.writeText(resultText).then(function() {
            mostrarMensaje('¡Copiado al portapapeles!', 'success');
        }).catch(function() {
            mostrarMensaje('Error al copiar', 'error');
        });
    });
});

function toggleScanner() {
    const reader = document.getElementById('reader');
    const scanButton = document.getElementById('scanButton');
    
    if (!isScanning) {
        // Iniciar escáner
        reader.style.display = 'block';
        scanButton.textContent = '❌ CERRAR ESCÁNER';
        scanButton.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
        iniciarScanner();
    } else {
        // Detener escáner
        detenerScanner();
        reader.style.display = 'none';
        scanButton.textContent = '📷 ESCANEAR QR';
        scanButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}

function iniciarScanner() {
    const reader = document.getElementById('reader');
    
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }
    
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        // Detener escáner automáticamente al leer un código
        detenerScanner();
        
        // Mostrar resultado
        mostrarResultado(decodedText);
        
        // Ocultar escáner
        document.getElementById('reader').style.display = 'none';
        document.getElementById('scanButton').textContent = '📷 ESCANEAR QR';
        document.getElementById('scanButton').style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    };
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        qrCodeSuccessCallback,
        (errorMessage) => {
            // Ignorar errores de escaneo (son normales)
        }
    ).catch((err) => {
        console.error("Error al iniciar escáner:", err);
        mostrarMensaje('Error al acceder a la cámara', 'error');
        toggleScanner();
    });
    
    isScanning = true;
}

function detenerScanner() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            isScanning = false;
        }).catch((err) => {
            console.error("Error al detener escáner:", err);
        });
    }
}

function mostrarResultado(texto) {
    const modal = document.getElementById('resultModal');
    const qrResult = document.getElementById('qrResult');
    
    // Intentar detectar si es una URL
    if (esURL(texto)) {
        qrResult.innerHTML = `
            <p><strong>🔗 URL Detectada:</strong></p>
            <p>${texto}</p>
            <a href="${texto}" target="_blank" class="copy-btn" style="display: inline-block; margin-top: 10px; text-decoration: none;">🌐 Abrir enlace</a>
        `;
    } else {
        qrResult.innerHTML = `
            <p><strong>📄 Contenido:</strong></p>
            <p>${texto}</p>
        `;
    }
    
    modal.style.display = 'flex';
}

function esURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById('scanMessage');
    mensaje.textContent = texto;
    mensaje.className = `scan-message ${tipo}`;
    mensaje.style.display = 'block';
    
    setTimeout(() => {
        mensaje.style.display = 'none';
    }, 3000);
}

// Limpiar al salir de la página
window.addEventListener('beforeunload', function() {
    if (isScanning) {
        detenerScanner();
    }
});