<?php
/**
 * SGR-IT - API de Dashboard/Estadísticas
 * Obtener datos agregados para el dashboard
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    sendResponse(false, null, 'Método no permitido', 405);
}

$action = $_GET['action'] ?? 'summary';

try {
    switch ($action) {
        case 'summary':
            getSummary($pdo);
            break;
        case 'recursos_por_tipo':
            getRecursosPorTipo($pdo);
            break;
        case 'reservas_por_estado':
            getReservasPorEstado($pdo);
            break;
        case 'actividad_semanal':
            getActividadSemanal($pdo);
            break;
        case 'uso_recursos':
            getUsoRecursos($pdo);
            break;
        case 'actividad_usuarios':
            getActividadUsuarios($pdo);
            break;
        default:
            getSummary($pdo);
    }
} catch (PDOException $e) {
    sendResponse(false, null, 'Error al obtener estadísticas: ' . $e->getMessage(), 500);
}

/**
 * Resumen general del sistema
 */
function getSummary($pdo) {
    // Total recursos
    $totalRecursos = $pdo->query("SELECT COUNT(*) FROM recursos")->fetchColumn();
    
    // Recursos disponibles
    $recursosDisponibles = $pdo->query("
        SELECT COUNT(*) FROM recursos WHERE estado = 'disponible'
    ")->fetchColumn();
    
    // Recursos no disponibles
    $recursosNoDisponibles = $pdo->query("
        SELECT COUNT(*) FROM recursos WHERE estado = 'no_disponible'
    ")->fetchColumn();
    
    // Total reservas activas (pendientes + confirmadas)
    $reservasActivas = $pdo->query("
        SELECT COUNT(*) FROM reservas WHERE id_estado_reserva IN (1, 2)
    ")->fetchColumn();
    
    // Reservas de hoy
    $reservasHoy = $pdo->query("
        SELECT COUNT(*) FROM reservas 
        WHERE DATE(fecha_inicio) = CURDATE() 
        AND id_estado_reserva IN (1, 2)
    ")->fetchColumn();
    
    // Total usuarios
    $totalUsuarios = $pdo->query("SELECT COUNT(*) FROM usuarios")->fetchColumn();
    
    sendResponse(true, [
        'total_recursos' => (int)$totalRecursos,
        'recursos_disponibles' => (int)$recursosDisponibles,
        'recursos_no_disponibles' => (int)$recursosNoDisponibles,
        'reservas_activas' => (int)$reservasActivas,
        'reservas_hoy' => (int)$reservasHoy,
        'total_usuarios' => (int)$totalUsuarios
    ]);
}

/**
 * Cantidad de recursos por tipo
 */
function getRecursosPorTipo($pdo) {
    $stmt = $pdo->query("
        SELECT tr.nombre, COUNT(r.id_recurso) as cantidad
        FROM tipos_recurso tr
        LEFT JOIN recursos r ON tr.id_tipo_recurso = r.id_tipo_recurso
        GROUP BY tr.id_tipo_recurso, tr.nombre
        ORDER BY tr.nombre
    ");
    
    sendResponse(true, $stmt->fetchAll());
}

/**
 * Cantidad de reservas por estado
 */
function getReservasPorEstado($pdo) {
    $stmt = $pdo->query("
        SELECT er.nombre, COUNT(res.id_reserva) as cantidad
        FROM estados_reserva er
        LEFT JOIN reservas res ON er.id_estado_reserva = res.id_estado_reserva
        GROUP BY er.id_estado_reserva, er.nombre
        ORDER BY er.id_estado_reserva
    ");
    
    sendResponse(true, $stmt->fetchAll());
}

/**
 * Actividad de reservas de la última semana
 */
function getActividadSemanal($pdo) {
    $stmt = $pdo->query("
        SELECT 
            DATE(fecha_inicio) as fecha,
            DAYNAME(fecha_inicio) as dia,
            COUNT(*) as cantidad
        FROM reservas
        WHERE fecha_inicio >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(fecha_inicio)
        ORDER BY fecha
    ");
    
    sendResponse(true, $stmt->fetchAll());
}

/**
 * Recursos más utilizados
 */
function getUsoRecursos($pdo) {
    $stmt = $pdo->query("
        SELECT 
            r.nombre,
            tr.nombre as tipo,
            COUNT(res.id_reserva) as total_reservas
        FROM recursos r
        JOIN tipos_recurso tr ON r.id_tipo_recurso = tr.id_tipo_recurso
        LEFT JOIN reservas res ON r.id_recurso = res.id_recurso
        GROUP BY r.id_recurso, r.nombre, tr.nombre
        ORDER BY total_reservas DESC
        LIMIT 10
    ");
    
    sendResponse(true, $stmt->fetchAll());
}

/**
 * Actividad por usuario
 */
function getActividadUsuarios($pdo) {
    $stmt = $pdo->query("
        SELECT 
            u.nombre,
            u.rol,
            COUNT(res.id_reserva) as total_reservas,
            SUM(CASE WHEN res.id_estado_reserva = 2 THEN 1 ELSE 0 END) as confirmadas,
            SUM(CASE WHEN res.id_estado_reserva = 3 THEN 1 ELSE 0 END) as canceladas
        FROM usuarios u
        LEFT JOIN reservas res ON u.id_usuario = res.id_usuario
        GROUP BY u.id_usuario, u.nombre, u.rol
        ORDER BY total_reservas DESC
    ");
    
    sendResponse(true, $stmt->fetchAll());
}
