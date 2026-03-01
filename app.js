// app.js mejorado con depuración
(function() {
    if ('serviceWorker' in navigator) {
        console.log('Service Worker es soportado');
        
        window.addEventListener('load', function() {
            // Intenta registrar el Service Worker
            navigator.serviceWorker.register('sw.js', { scope: '/' })
                .then(function(registration) {
                    console.log('Service Worker registrado con éxito:', registration.scope);
                    
                    // Mostrar en la consola del celular
                    mostrarMensaje('Service Worker OK', 'green');
                    
                    // Verificar si está activo
                    if (registration.active) {
                        console.log('Service Worker está activo');
                    }
                    
                    // Escuchar actualizaciones
                    registration.addEventListener('updatefound', function() {
                        console.log('Nueva versión del Service Worker encontrada');
                    });
                })
                .catch(function(error) {
                    console.log('Error al registrar Service Worker:', error);
                    mostrarMensaje('Error: ' + error.message, 'red');
                });
            
            // Verificar controlador activo
            if (navigator.serviceWorker.controller) {
                console.log('Página controlada por Service Worker');
            } else {
                console.log('Página NO controlada por Service Worker');
            }
        });
        
        // Función para mostrar mensajes en la página (útil para depuración en celular)
        function mostrarMensaje(texto, color) {
            const div = document.createElement('div');
            div.style.position = 'fixed';
            div.style.bottom = '10px';
            div.style.left = '10px';
            div.style.right = '10px';
            div.style.backgroundColor = color;
            div.style.color = 'white';
            div.style.padding = '10px';
            div.style.borderRadius = '5px';
            div.style.zIndex = '9999';
            div.style.fontSize = '12px';
            div.textContent = texto;
            document.body.appendChild(div);
            
            // Eliminar después de 5 segundos
            setTimeout(function() {
                div.remove();
            }, 5000);
        }
    } else {
        console.log('Service Worker NO es soportado');
        alert('Este navegador no soporta PWA');
    }
})();