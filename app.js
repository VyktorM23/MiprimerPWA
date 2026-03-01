// app.js completo
let deferredPrompt;
const installButton = document.getElementById('installButton');

// Detectar cuando la app es instalable
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('✅ Evento beforeinstallprompt disparado');
    // Prevenir que Chrome muestre automáticamente el botón
    e.preventDefault();
    // Guardar el evento para usarlo después
    deferredPrompt = e;
    // Mostrar el botón de instalación
    if (installButton) {
        installButton.style.display = 'block';
        console.log('Botón de instalación visible');
    }
});

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js')
            .then(function(registration) {
                console.log('✅ Service Worker registrado');
                mostrarMensaje('✅ PWA lista para instalar', 'green');
                
                // Verificar si ya está instalada
                if (window.matchMedia('(display-mode: standalone)').matches) {
                    console.log('App ejecutándose como standalone');
                    if (installButton) installButton.style.display = 'none';
                }
            })
            .catch(function(error) {
                console.log('❌ Error Service Worker:', error);
                mostrarMensaje('❌ Error al registrar', 'red');
            });
    });
}

// Función para mostrar mensajes
function mostrarMensaje(texto, color) {
    const msg = document.createElement('div');
    msg.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        right: 10px;
        background-color: ${color};
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 9999;
        text-align: center;
        font-size: 16px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    msg.textContent = texto;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 4000);
}

// Función para instalar la PWA
function installPWA() {
    if (!deferredPrompt) {
        console.log('No hay evento de instalación disponible');
        mostrarMensaje('❌ No se puede instalar ahora', 'red');
        return;
    }
    
    // Mostrar el prompt de instalación
    deferredPrompt.prompt();
    
    // Esperar la respuesta del usuario
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('✅ Usuario aceptó instalar la PWA');
            mostrarMensaje('✅ Instalando aplicación...', 'green');
        } else {
            console.log('❌ Usuario canceló la instalación');
            mostrarMensaje('❌ Instalación cancelada', 'orange');
        }
        // Limpiar el evento
        deferredPrompt = null;
        // Ocultar el botón
        if (installButton) installButton.style.display = 'none';
    });
}
