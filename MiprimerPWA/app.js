(function() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            // Especifica el scope correcto
            navigator.serviceWorker.register('/MiprimerPWA/sw.js', {
                scope: '/MiprimerPWA/'
            })
            .then(function(registration) {
                console.log('Service Worker registrado con éxito');
                
                // Mostrar mensaje en pantalla para depuración
                const div = document.createElement('div');
                div.style.backgroundColor = 'green';
                div.style.color = 'white';
                div.style.padding = '10px';
                div.style.position = 'fixed';
                div.style.bottom = '0';
                div.style.left = '0';
                div.style.right = '0';
                div.style.zIndex = '9999';
                div.textContent = '✅ Service Worker activo - Scope: /MiprimerPWA/';
                document.body.appendChild(div);
                
                setTimeout(() => div.remove(), 5000);
            })
            .catch(function(error) {
                console.log('Error al registrar:', error);
                
                const div = document.createElement('div');
                div.style.backgroundColor = 'red';
                div.style.color = 'white';
                div.style.padding = '10px';
                div.style.position = 'fixed';
                div.style.bottom = '0';
                div.style.left = '0';
                div.style.right = '0';
                div.style.zIndex = '9999';
                div.textContent = '❌ Error: ' + error.message;
                document.body.appendChild(div);
            });
        });
    }
})();