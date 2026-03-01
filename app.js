// app.js simplificado
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Intenta registrar el service worker
        navigator.serviceWorker.register('sw.js')
            .then(function(reg) {
                console.log('✅ Service Worker registrado');
                
                // Muestra mensaje en pantalla
                const msg = document.createElement('div');
                msg.style.cssText = 'position:fixed;bottom:10px;left:10px;right:10px;background:green;color:white;padding:10px;z-index:9999';
                msg.textContent = '✅ PWA lista para instalar';
                document.body.appendChild(msg);
                setTimeout(() => msg.remove(), 3000);
            })
            .catch(function(err) {
                console.log('❌ Error:', err);
                
                // Muestra el error
                const msg = document.createElement('div');
                msg.style.cssText = 'position:fixed;bottom:10px;left:10px;right:10px;background:red;color:white;padding:10px;z-index:9999';
                msg.textContent = '❌ Error: ' + err.message;
                document.body.appendChild(msg);
            });
    });
}