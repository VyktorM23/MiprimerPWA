// app.js - Sistema de Control de Asistencia RRHH

let deferredPrompt;
let videoStream = null;
let scanningActive = false;
let scanTimeout = null;
const SCAN_INTERVAL = 200;

// Elementos del DOM - Escaneo
const scanButton = document.getElementById('scanButton');
const videoContainer = document.getElementById('video-container');
const video = document.getElementById('qr-video');
const canvas = document.getElementById('qr-canvas');
const resultContainer = document.getElementById('result-container');
const scanResult = document.getElementById('scan-result');
const newScanBtn = document.getElementById('new-scan-btn');
const cancelScanBtn = document.getElementById('cancel-scan-btn');
const body = document.body;

// Elementos del DOM - Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// Elementos del DOM - Empleados
const addEmployeeBtn = document.getElementById('addEmployeeBtn');
const employeeForm = document.getElementById('employee-form');
const employeeFormElement = document.getElementById('employeeForm');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const employeesTable = document.getElementById('employeesTable');

// Elementos del DOM - Registros
const recordsTable = document.getElementById('recordsTable');
const filterDate = document.getElementById('filterDate');
const exportBtn = document.getElementById('exportBtn');

// Inicializar cuando la página cargue
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM cargado - Sistema RRHH');
    actualizarEstadosPWA();
    configurarBotones();
    configurarTabs();
    cargarEmpleados();
    cargarRegistros();
    
    // Establecer fecha por defecto en el filtro
    if (filterDate) {
        const today = new Date().toISOString().split('T')[0];
        filterDate.value = today;
        filterDate.addEventListener('change', () => cargarRegistros(filterDate.value));
    }
});

// Configurar tabs
function configurarTabs() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Actualizar botones
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Actualizar paneles
            tabPanels.forEach(panel => panel.classList.remove('active'));
            document.getElementById(`${tabId}-panel`).classList.add('active');
            
            // Recargar datos si es necesario
            if (tabId === 'employees') {
                cargarEmpleados();
            } else if (tabId === 'records') {
                cargarRegistros(filterDate?.value);
            }
        });
    });
}

// Configurar botones
function configurarBotones() {
    if (scanButton) {
        scanButton.addEventListener('click', iniciarEscaneo);
    }
    
    if (newScanBtn) {
        newScanBtn.addEventListener('click', resetearEscaneo);
    }
    
    if (cancelScanBtn) {
        cancelScanBtn.addEventListener('click', detenerEscaneo);
    }
    
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => {
            employeeForm.style.display = 'block';
            addEmployeeBtn.style.display = 'none';
        });
    }
    
    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', () => {
            employeeForm.style.display = 'none';
            addEmployeeBtn.style.display = 'block';
            employeeFormElement.reset();
        });
    }
    
    if (employeeFormElement) {
        employeeFormElement.addEventListener('submit', guardarEmpleado);
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportarACSV);
    }
}

// ===== FUNCIONES DE EMPLEADOS =====

async function guardarEmpleado(e) {
    e.preventDefault();
    
    const employee = {
        name: document.getElementById('empName').value.trim(),
        dni: document.getElementById('empDni').value.trim(),
        position: document.getElementById('empPosition').value.trim(),
        department: document.getElementById('empDepartment').value,
        registeredAt: new Date().toISOString()
    };
    
    try {
        await addEmployee(employee);
        alert('✅ Empleado registrado correctamente');
        employeeForm.style.display = 'none';
        addEmployeeBtn.style.display = 'block';
        employeeFormElement.reset();
        cargarEmpleados();
    } catch (error) {
        alert('❌ Error: ' + error);
    }
}

async function cargarEmpleados() {
    try {
        const employees = await getAllEmployees();
        mostrarEmpleados(employees);
    } catch (error) {
        console.error('Error cargando empleados:', error);
        employeesTable.innerHTML = '<p class="error">Error al cargar empleados</p>';
    }
}

function mostrarEmpleados(employees) {
    if (!employeesTable) return;
    
    if (employees.length === 0) {
        employeesTable.innerHTML = '<p class="text-center">No hay empleados registrados</p>';
        return;
    }
    
    let html = '<div class="employee-cards">';
    employees.forEach(emp => {
        html += `
            <div class="employee-card">
                <div class="employee-info">
                    <h4>${emp.name}</h4>
                    <p><strong>DNI:</strong> ${emp.dni}</p>
                    <p><strong>Cargo:</strong> ${emp.position}</p>
                    <p><strong>Departamento:</strong> ${emp.department}</p>
                    <p class="qr-data" style="display: none;">${generateQRData(emp)}</p>
                </div>
                <div class="employee-actions">
                    <button class="btn-small btn-primary" onclick="generarQR(${emp.id})">📱 Generar QR</button>
                    <button class="btn-small btn-danger" onclick="eliminarEmpleado(${emp.id})">🗑️ Eliminar</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    employeesTable.innerHTML = html;
}

function generateQRData(employee) {
    return JSON.stringify({
        id: employee.id,
        dni: employee.dni,
        name: employee.name,
        department: employee.department
    });
}

async function generarQR(employeeId) {
    try {
        const employee = await getEmployeeById(employeeId);
        if (!employee) {
            alert('Empleado no encontrado');
            return;
        }
        
        const qrData = generateQRData(employee);
        
        // Crear modal con QR
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>QR de ${employee.name}</h3>
                <div id="qrcode-${employee.id}" class="qrcode-container"></div>
                <p><strong>DNI:</strong> ${employee.dni}</p>
                <p><strong>Cargo:</strong> ${employee.position}</p>
                <button class="btn btn-primary" onclick="descargarQR('${qrData}', '${employee.name}')">📥 Descargar QR</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cerrar</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Generar QR usando QRCode library (cargar dinámicamente)
        if (typeof QRCode === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
            script.onload = () => {
                QRCode.toCanvas(document.getElementById(`qrcode-${employee.id}`), qrData, {
                    width: 250,
                    margin: 2
                });
            };
            document.head.appendChild(script);
        } else {
            QRCode.toCanvas(document.getElementById(`qrcode-${employee.id}`), qrData, {
                width: 250,
                margin: 2
            });
        }
    } catch (error) {
        alert('Error al generar QR: ' + error);
    }
}

function descargarQR(data, name) {
    // Crear canvas con QR
    const canvas = document.createElement('canvas');
    QRCode.toCanvas(canvas, data, { width: 300, margin: 2 }, (error) => {
        if (error) {
            alert('Error al generar QR');
            return;
        }
        
        // Descargar
        const link = document.createElement('a');
        link.download = `QR_${name.replace(/\s/g, '_')}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
}

async function eliminarEmpleado(id) {
    if (!confirm('¿Estás seguro de eliminar este empleado? Se eliminarán también todos sus registros de asistencia.')) {
        return;
    }
    
    try {
        await deleteEmployee(id);
        cargarEmpleados();
        alert('Empleado eliminado correctamente');
    } catch (error) {
        alert('Error al eliminar: ' + error);
    }
}

// ===== FUNCIONES DE REGISTROS =====

async function cargarRegistros(fecha = null) {
    try {
        let records;
        if (fecha) {
            records = await getAttendanceByDate(fecha);
        } else {
            records = await getAllAttendanceRecords();
        }
        mostrarRegistros(records);
    } catch (error) {
        console.error('Error cargando registros:', error);
        recordsTable.innerHTML = '<p class="error">Error al cargar registros</p>';
    }
}

async function mostrarRegistros(records) {
    if (!recordsTable) return;
    
    if (records.length === 0) {
        recordsTable.innerHTML = '<p class="text-center">No hay registros de asistencia</p>';
        return;
    }
    
    // Obtener nombres de empleados
    const employees = await getAllEmployees();
    const employeeMap = {};
    employees.forEach(emp => {
        employeeMap[emp.id] = emp.name;
    });
    
    let html = '<div class="records-list">';
    records.forEach(record => {
        const date = new Date(record.timestamp);
        const timeStr = date.toLocaleTimeString('es-ES');
        const dateStr = date.toLocaleDateString('es-ES');
        const typeIcon = record.type === 'entrada' ? '🟢' : '🔴';
        const typeText = record.type === 'entrada' ? 'ENTRADA' : 'SALIDA';
        
        html += `
            <div class="record-item ${record.type}">
                <div class="record-icon">${typeIcon}</div>
                <div class="record-info">
                    <strong>${employeeMap[record.employeeId] || 'Empleado #' + record.employeeId}</strong>
                    <span class="record-type">${typeText}</span>
                    <span class="record-time">${dateStr} - ${timeStr}</span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    recordsTable.innerHTML = html;
}

async function exportarACSV() {
    try {
        const records = await getAllAttendanceRecords();
        const employees = await getAllEmployees();
        const employeeMap = {};
        employees.forEach(emp => {
            employeeMap[emp.id] = emp;
        });
        
        let csv = 'Fecha,Hora,Empleado,DNI,Cargo,Departamento,Tipo\n';
        
        records.forEach(record => {
            const emp = employeeMap[record.employeeId];
            if (emp) {
                const date = new Date(record.timestamp);
                csv += `${date.toLocaleDateString()},`;
                csv += `${date.toLocaleTimeString()},`;
                csv += `"${emp.name}",`;
                csv += `${emp.dni},`;
                csv += `"${emp.position}",`;
                csv += `"${emp.department}",`;
                csv += `${record.type}\n`;
            }
        });
        
        // Descargar
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `asistencia_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    } catch (error) {
        alert('Error al exportar: ' + error);
    }
}

// ===== FUNCIONES DE ESCANEO =====

function mostrarMensajeCamara(mensaje, tipo = 'info') {
    const mensajeAnterior = document.querySelector('.camera-status');
    if (mensajeAnterior) {
        mensajeAnterior.remove();
    }
    
    const statusDiv = document.createElement('div');
    statusDiv.className = `camera-status ${tipo}`;
    statusDiv.textContent = mensaje;
    
    if (scanButton) {
        scanButton.parentNode.insertBefore(statusDiv, scanButton.nextSibling);
    }
}

function crearOverlayEscaneo() {
    const overlayAnterior = document.querySelector('.scanning-overlay');
    if (overlayAnterior) {
        overlayAnterior.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'scanning-overlay';
    overlay.innerHTML = `
        <div class="scanning-frame">
            <span></span>
            <div class="scanning-line"></div>
        </div>
    `;
    
    const instructions = document.createElement('div');
    instructions.className = 'scanning-instructions';
    instructions.textContent = 'Escanea el QR del empleado';
    
    body.appendChild(overlay);
    body.appendChild(instructions);
}

function actualizarEstadosPWA() {
    const pwaStatus = document.getElementById('pwaStatus');
    const modeStatus = document.getElementById('modeStatus');
    const swStatus = document.getElementById('swStatus');
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
        if (pwaStatus) {
            pwaStatus.textContent = '✅ Instalada';
            pwaStatus.className = 'status-value instalado';
        }
        if (modeStatus) {
            modeStatus.textContent = 'App Instalada';
            modeStatus.className = 'status-value instalado';
        }
    } else {
        if (pwaStatus) {
            pwaStatus.textContent = '🔄 Instalable';
            pwaStatus.className = 'status-value no-instalado';
        }
        if (modeStatus) {
            modeStatus.textContent = 'Navegador';
            modeStatus.className = 'status-value no-instalado';
        }
    }
    
    if (navigator.serviceWorker && swStatus) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            swStatus.textContent = regs.length > 0 ? '✅ Activo' : '❌ Inactivo';
            swStatus.className = regs.length > 0 ? 'status-value instalado' : 'status-value no-instalado';
        });
    }
}

// Evento de instalación PWA
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    mostrarBotonInstalacion();
});

function mostrarBotonInstalacion() {
    if (!document.getElementById('installButton')) {
        const btn = document.createElement('button');
        btn.id = 'installButton';
        btn.className = 'btn btn-primary';
        btn.innerHTML = '<span class="btn-icon">📲</span> Instalar App';
        btn.onclick = instalarPWA;
        btn.style.marginTop = '10px';
        document.querySelector('.container').appendChild(btn);
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
            .then(reg => console.log('✅ Service Worker registrado'))
            .catch(err => console.log('❌ Error SW:', err));
    });
}

window.addEventListener('appinstalled', () => {
    alert('¡App instalada correctamente!');
    document.getElementById('installButton')?.remove();
    actualizarEstadosPWA();
});

// ===== FUNCIÓN PRINCIPAL DE ESCANEO =====
async function iniciarEscaneo() {
    console.log('📱 Iniciando escaneo...');
    
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Tu navegador no soporta acceso a cámara');
        }
        
        mostrarMensajeCamara('📷 Iniciando cámara...', 'info');
        
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                aspectRatio: { ideal: 16/9 }
            }
        });
        
        console.log('✅ Permiso de cámara concedido');
        
        video.srcObject = videoStream;
        video.setAttribute('playsinline', true);
        
        body.classList.add('scanning-active');
        crearOverlayEscaneo();
        
        videoContainer.style.display = 'flex';
        scanButton.style.display = 'none';
        resultContainer.style.display = 'none';
        
        video.onloadedmetadata = () => {
            video.play().then(() => {
                console.log('✅ Video reproduciendo');
                scanningActive = true;
                
                setTimeout(() => {
                    escanearQRConIntervalo();
                }, 500);
            });
        };
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        let mensaje = 'Error al acceder a la cámara';
        if (error.name === 'NotAllowedError') {
            mensaje = '📷 Permiso de cámara denegado';
        } else if (error.name === 'NotFoundError') {
            mensaje = '📷 No se encontró cámara';
        } else {
            mensaje = '📷 ' + (error.message || 'Error desconocido');
        }
        
        mostrarMensajeCamara(mensaje, 'error');
        detenerEscaneo();
    }
}

function escanearQRConIntervalo() {
    if (!scanningActive) return;
    
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }
    
    realizarEscaneo();
    
    scanTimeout = setTimeout(() => {
        escanearQRConIntervalo();
    }, SCAN_INTERVAL);
}

function realizarEscaneo() {
    if (!scanningActive || !video || video.readyState < 2) {
        return;
    }
    
    try {
        const width = Math.min(video.videoWidth, 640);
        const height = Math.min(video.videoHeight, 480);
        
        canvas.width = width;
        canvas.height = height;
        
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(video, 0, 0, width, height);
        
        const imageData = context.getImageData(0, 0, width, height);
        
        const code = jsQR(imageData.data, width, height, {
            inversionAttempts: "dontInvert",
        });
        
        if (code) {
            console.log('✅ QR detectado:', code.data);
            procesarQR(code.data);
        }
        
    } catch (error) {
        console.error('Error en escaneo:', error);
    }
}

async function procesarQR(data) {
    // Detener escaneo inmediatamente
    scanningActive = false;
    
    if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
    }
    
    // Detener video
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    if (video) {
        video.srcObject = null;
    }
    
    // Remover overlay
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    
    body.classList.remove('scanning-active');
    
    // Vibrar
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(200);
    }
    
    // Procesar datos del QR
    try {
        const qrData = JSON.parse(data);
        
        // Validar que tenga los campos necesarios
        if (!qrData.id || !qrData.dni || !qrData.name) {
            throw new Error('QR inválido: Faltan datos del empleado');
        }
        
        // Verificar que el empleado exista en la BD
        const employee = await getEmployeeById(qrData.id);
        if (!employee) {
            throw new Error('Empleado no registrado en el sistema');
        }
        
        // Determinar si es entrada o salida
        const lastRecord = await getLastEmployeeRecord(employee.id);
        const recordType = !lastRecord || lastRecord.type === 'salida' ? 'entrada' : 'salida';
        
        // Crear registro de asistencia
        const now = new Date();
        const record = {
            employeeId: employee.id,
            type: recordType,
            date: now.toISOString().split('T')[0],
            timestamp: now.getTime()
        };
        
        await addAttendanceRecord(record);
        
        // Mostrar resultado exitoso
        videoContainer.style.display = 'none';
        resultContainer.style.display = 'block';
        
        const icon = recordType === 'entrada' ? '🟢' : '🔴';
        const typeText = recordType === 'entrada' ? 'ENTRADA' : 'SALIDA';
        
        scanResult.innerHTML = `
            <div class="success-message">
                <h3>✅ Registro exitoso</h3>
                <div class="employee-details">
                    <p><strong>${employee.name}</strong></p>
                    <p>DNI: ${employee.dni}</p>
                    <p>Departamento: ${employee.department}</p>
                    <p class="record-type-badge ${recordType}">${icon} ${typeText} registrada</p>
                    <p class="record-time">${now.toLocaleTimeString()} - ${now.toLocaleDateString()}</p>
                </div>
            </div>
        `;
        
        // Actualizar lista de registros si está visible
        if (document.getElementById('records-panel').classList.contains('active')) {
            cargarRegistros(filterDate?.value);
        }
        
    } catch (error) {
        // Mostrar error
        videoContainer.style.display = 'none';
        resultContainer.style.display = 'block';
        
        scanResult.innerHTML = `
            <div class="error-message">
                <h3>❌ Error</h3>
                <p>${error.message}</p>
                <p class="error-details">Asegúrate de escanear un QR válido de empleado</p>
            </div>
        `;
    }
}

function detenerEscaneo() {
    console.log('Deteniendo escaneo...');
    
    scanningActive = false;
    
    if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
    }
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    if (video) {
        video.srcObject = null;
    }
    
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    
    body.classList.remove('scanning-active');
    
    scanButton.style.display = 'block';
    videoContainer.style.display = 'none';
    resultContainer.style.display = 'none';
    
    mostrarMensajeCamara('Escáner listo para usar', 'success');
}

function resetearEscaneo() {
    detenerEscaneo();
    setTimeout(() => {
        mostrarMensajeCamara('Escáner listo para usar', 'success');
    }, 300);
}

// Limpiar al cerrar
window.addEventListener('beforeunload', () => {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }
});

// Exponer funciones globales para los botones onclick
window.generarQR = generarQR;
window.eliminarEmpleado = eliminarEmpleado;
window.descargarQR = descargarQR;