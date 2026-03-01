// app.js mejorado
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('✅ Listo para instalar');
    e.preventDefault();
    deferredPrompt = e;
    
    // Mostrar botón de instalación
    mostrarBotonInstalacion();
});

function mostrarBotonInstalacion() {
    // Crear botón si no existe
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
    // Verificar si ya está instalada como standalone
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
