// db.js - Manejo de IndexedDB para empleados y asistencias

const DB_NAME = 'RRHH_Asistencia_DB';
const DB_VERSION = 1;
let db = null;

// Inicializar la base de datos
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('Error al abrir la base de datos');
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('✅ Base de datos inicializada');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Almacén de empleados
            if (!db.objectStoreNames.contains('employees')) {
                const employeeStore = db.createObjectStore('employees', { keyPath: 'id', autoIncrement: true });
                employeeStore.createIndex('dni', 'dni', { unique: true });
                employeeStore.createIndex('name', 'name', { unique: false });
                employeeStore.createIndex('department', 'department', { unique: false });
            }
            
            // Almacén de registros de asistencia
            if (!db.objectStoreNames.contains('attendance')) {
                const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
                attendanceStore.createIndex('employeeId', 'employeeId', { unique: false });
                attendanceStore.createIndex('date', 'date', { unique: false });
                attendanceStore.createIndex('type', 'type', { unique: false });
                attendanceStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            
            console.log('✅ Estructura de base de datos creada');
        };
    });
}

// ===== OPERACIONES DE EMPLEADOS =====

// Agregar empleado
function addEmployee(employee) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de datos no inicializada');
            return;
        }
        
        const transaction = db.transaction(['employees'], 'readwrite');
        const store = transaction.objectStore('employees');
        
        // Verificar si ya existe un empleado con el mismo DNI
        const dniIndex = store.index('dni');
        const dniRequest = dniIndex.get(employee.dni);
        
        dniRequest.onsuccess = () => {
            if (dniRequest.result) {
                reject('Ya existe un empleado con este DNI');
                return;
            }
            
            const request = store.add(employee);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        };
        
        dniRequest.onerror = () => {
            reject(dniRequest.error);
        };
    });
}

// Obtener todos los empleados
function getAllEmployees() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de datos no inicializada');
            return;
        }
        
        const transaction = db.transaction(['employees'], 'readonly');
        const store = transaction.objectStore('employees');
        const request = store.getAll();
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Obtener empleado por ID
function getEmployeeById(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de datos no inicializada');
            return;
        }
        
        const transaction = db.transaction(['employees'], 'readonly');
        const store = transaction.objectStore('employees');
        const request = store.get(Number(id));
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Obtener empleado por DNI
function getEmployeeByDni(dni) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de datos no inicializada');
            return;
        }
        
        const transaction = db.transaction(['employees'], 'readonly');
        const store = transaction.objectStore('employees');
        const index = store.index('dni');
        const request = index.get(dni);
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Eliminar empleado
function deleteEmployee(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de datos no inicializada');
            return;
        }
        
        const transaction = db.transaction(['employees', 'attendance'], 'readwrite');
        const employeeStore = transaction.objectStore('employees');
        const attendanceStore = transaction.objectStore('attendance');
        
        // Eliminar registros de asistencia del empleado
        const attendanceIndex = attendanceStore.index('employeeId');
        const attendanceRequest = attendanceIndex.getAll(Number(id));
        
        attendanceRequest.onsuccess = () => {
            const records = attendanceRequest.result;
            records.forEach(record => {
                attendanceStore.delete(record.id);
            });
        };
        
        // Eliminar empleado
        const request = employeeStore.delete(Number(id));
        
        request.onsuccess = () => {
            resolve();
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

// ===== OPERACIONES DE ASISTENCIA =====

// Registrar entrada o salida
function addAttendanceRecord(record) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de datos no inicializada');
            return;
        }
        
        const transaction = db.transaction(['attendance'], 'readwrite');
        const store = transaction.objectStore('attendance');
        const request = store.add(record);
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Obtener todos los registros de asistencia
function getAllAttendanceRecords() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de datos no inicializada');
            return;
        }
        
        const transaction = db.transaction(['attendance'], 'readonly');
        const store = transaction.objectStore('attendance');
        const request = store.getAll();
        
        request.onsuccess = () => {
            // Ordenar por timestamp descendente
            const records = request.result.sort((a, b) => b.timestamp - a.timestamp);
            resolve(records);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Obtener registros por fecha
function getAttendanceByDate(date) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de datos no inicializada');
            return;
        }
        
        const transaction = db.transaction(['attendance'], 'readonly');
        const store = transaction.objectStore('attendance');
        const index = store.index('date');
        const request = index.getAll(date);
        
        request.onsuccess = () => {
            const records = request.result.sort((a, b) => b.timestamp - a.timestamp);
            resolve(records);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Obtener el último registro de un empleado (para saber si fue entrada o salida)
function getLastEmployeeRecord(employeeId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de datos no inicializada');
            return;
        }
        
        const transaction = db.transaction(['attendance'], 'readonly');
        const store = transaction.objectStore('attendance');
        const index = store.index('employeeId');
        const request = index.getAll(Number(employeeId));
        
        request.onsuccess = () => {
            const records = request.result.sort((a, b) => b.timestamp - a.timestamp);
            resolve(records.length > 0 ? records[0] : null);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Inicializar la base de datos al cargar
document.addEventListener('DOMContentLoaded', () => {
    initDB().catch(error => {
        console.error('Error inicializando DB:', error);
        alert('Error al inicializar la base de datos local');
    });
});