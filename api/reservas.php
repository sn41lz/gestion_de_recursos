<?php
/**
 * SGR-IT - API de Reservas
 * CRUD completo para gestión de reservas
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

// Acción especial para verificar disponibilidad
if ($action === 'check_availability') {
    checkAvailability($pdo);
    exit;
}

// Obtener horarios ocupados de un recurso para un día
if ($action === 'get_day_schedule') {
    getDaySchedule($pdo);
    exit;
}

switch ($method) {
    case 'GET':
        getReservas($pdo);
        break;
    case 'POST':
        createReserva($pdo);
        break;
    case 'PUT':
        updateReserva($pdo);
        break;
    case 'DELETE':
        deleteReserva($pdo);
        break;
    default:
        sendResponse(false, null, 'Método no permitido', 405);
}

/**
 * Verificar disponibilidad de un recurso en un rango de fechas (AJAX real-time)
 */
function checkAvailability($pdo) {
    $idRecurso = $_GET['recurso_id'] ?? null;
    $fechaInicio = $_GET['fecha_inicio'] ?? null;
    $fechaFin = $_GET['fecha_fin'] ?? null;
    $excludeReservaId = $_GET['exclude_id'] ?? null;
    
    if (!$idRecurso || !$fechaInicio || !$fechaFin) {
        sendResponse(false, null, 'Faltan parámetros', 400);
    }
    
    try {
        // Verificar estado del recurso
        $stmt = $pdo->prepare("SELECT estado FROM recursos WHERE id_recurso = ?");
        $stmt->execute([$idRecurso]);
        $recurso = $stmt->fetch();
        
        if (!$recurso) {
            sendResponse(false, ['available' => false], 'Recurso no encontrado', 404);
        }
        
        if ($recurso['estado'] !== 'disponible') {
            sendResponse(true, [
                'available' => false,
                'reason' => 'El recurso está en mantenimiento o no disponible'
            ]);
        }
        
        // Verificar conflictos de horario
        $sql = "
            SELECT res.id_reserva, res.fecha_inicio, res.fecha_fin, u.nombre as usuario
            FROM reservas res
            JOIN usuarios u ON res.id_usuario = u.id_usuario
            WHERE res.id_recurso = ? 
            AND res.id_estado_reserva IN (1, 2)
            AND (
                (res.fecha_inicio < ? AND res.fecha_fin > ?)
                OR (res.fecha_inicio < ? AND res.fecha_fin > ?)
                OR (res.fecha_inicio >= ? AND res.fecha_fin <= ?)
            )
        ";
        
        $params = [$idRecurso, $fechaFin, $fechaInicio, $fechaInicio, $fechaInicio, $fechaInicio, $fechaFin];
        
        // Excluir reserva actual si se está editando
        if ($excludeReservaId) {
            $sql .= " AND res.id_reserva != ?";
            $params[] = $excludeReservaId;
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $conflicts = $stmt->fetchAll();
        
        if (count($conflicts) > 0) {
            $conflict = $conflicts[0];
            sendResponse(true, [
                'available' => false,
                'reason' => 'Conflicto con reserva existente',
                'conflict' => [
                    'usuario' => $conflict['usuario'],
                    'inicio' => $conflict['fecha_inicio'],
                    'fin' => $conflict['fecha_fin']
                ]
            ]);
        }
        
        sendResponse(true, ['available' => true]);
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al verificar: ' . $e->getMessage(), 500);
    }
}

/**
 * Obtener horario de reservas de un recurso para un día específico
 */
function getDaySchedule($pdo) {
    $idRecurso = $_GET['recurso_id'] ?? null;
    $fecha = $_GET['fecha'] ?? date('Y-m-d');
    
    if (!$idRecurso) {
        sendResponse(false, null, 'Falta recurso_id', 400);
    }
    
    try {
        $fechaInicio = $fecha . ' 00:00:00';
        $fechaFin = $fecha . ' 23:59:59';
        
        $sql = "
            SELECT 
                res.id_reserva,
                res.fecha_inicio,
                res.fecha_fin,
                res.id_estado_reserva,
                u.nombre as usuario_nombre,
                er.nombre as estado_nombre
            FROM reservas res
            JOIN usuarios u ON res.id_usuario = u.id_usuario
            JOIN estados_reserva er ON res.id_estado_reserva = er.id_estado_reserva
            WHERE res.id_recurso = ?
            AND res.id_estado_reserva IN (1, 2)
            AND (
                (res.fecha_inicio BETWEEN ? AND ?)
                OR (res.fecha_fin BETWEEN ? AND ?)
                OR (res.fecha_inicio <= ? AND res.fecha_fin >= ?)
            )
            ORDER BY res.fecha_inicio ASC
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$idRecurso, $fechaInicio, $fechaFin, $fechaInicio, $fechaFin, $fechaInicio, $fechaFin]);
        $reservas = $stmt->fetchAll();
        
        // Generar franjas horarias de 08:00 a 20:00
        $schedule = [];
        for ($hour = 8; $hour < 20; $hour++) {
            $slotStart = sprintf('%s %02d:00:00', $fecha, $hour);
            $slotEnd = sprintf('%s %02d:00:00', $fecha, $hour + 1);
            
            $slot = [
                'hour' => $hour,
                'start' => $slotStart,
                'end' => $slotEnd,
                'status' => 'available',
                'reserva' => null
            ];
            
            // Verificar si hay reserva en esta franja
            foreach ($reservas as $r) {
                $resInicio = strtotime($r['fecha_inicio']);
                $resFin = strtotime($r['fecha_fin']);
                $slotInicioTs = strtotime($slotStart);
                $slotFinTs = strtotime($slotEnd);
                
                // Si hay overlap
                if ($resInicio < $slotFinTs && $resFin > $slotInicioTs) {
                    $slot['status'] = $r['id_estado_reserva'] == 2 ? 'confirmed' : 'pending';
                    $slot['reserva'] = [
                        'id' => $r['id_reserva'],
                        'usuario' => $r['usuario_nombre'],
                        'estado' => $r['estado_nombre'],
                        'inicio' => $r['fecha_inicio'],
                        'fin' => $r['fecha_fin']
                    ];
                    break;
                }
            }
            
            $schedule[] = $slot;
        }
        
        sendResponse(true, [
            'fecha' => $fecha,
            'schedule' => $schedule,
            'reservas' => $reservas
        ]);
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error: ' . $e->getMessage(), 500);
    }
}

/**
 * Obtener todas las reservas o una específica
 */
function getReservas($pdo) {
    $id = $_GET['id'] ?? null;
    $userId = $_GET['user_id'] ?? null;
    $recursoId = $_GET['recurso_id'] ?? null;
    
    try {
        $sql = "
            SELECT 
                res.*, 
                u.nombre as usuario_nombre,
                u.email as usuario_email,
                r.nombre as recurso_nombre,
                tr.nombre as tipo_recurso,
                er.nombre as estado_nombre
            FROM reservas res
            JOIN usuarios u ON res.id_usuario = u.id_usuario
            JOIN recursos r ON res.id_recurso = r.id_recurso
            JOIN tipos_recurso tr ON r.id_tipo_recurso = tr.id_tipo_recurso
            JOIN estados_reserva er ON res.id_estado_reserva = er.id_estado_reserva
        ";
        
        $conditions = [];
        $params = [];
        
        if ($id) {
            $conditions[] = "res.id_reserva = ?";
            $params[] = $id;
        }
        
        if ($userId) {
            $conditions[] = "res.id_usuario = ?";
            $params[] = $userId;
        }
        
        if ($recursoId) {
            $conditions[] = "res.id_recurso = ?";
            $params[] = $recursoId;
        }
        
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(" AND ", $conditions);
        }
        
        $sql .= " ORDER BY res.fecha_inicio DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        if ($id) {
            $reserva = $stmt->fetch();
            if (!$reserva) {
                sendResponse(false, null, 'Reserva no encontrada', 404);
            }
            sendResponse(true, $reserva);
        } else {
            $reservas = $stmt->fetchAll();
            sendResponse(true, $reservas);
        }
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al obtener reservas: ' . $e->getMessage(), 500);
    }
}

/**
 * Crear una nueva reserva
 */
function createReserva($pdo) {
    $input = getJsonInput();
    
    $idUsuario = $input['id_usuario'] ?? null;
    $idRecurso = $input['id_recurso'] ?? null;
    $fechaInicio = $input['fecha_inicio'] ?? null;
    $fechaFin = $input['fecha_fin'] ?? null;
    $idEstado = $input['id_estado_reserva'] ?? 1; // Por defecto: Pendiente
    
    // Validaciones
    if (!$idUsuario || !$idRecurso || !$fechaInicio || !$fechaFin) {
        sendResponse(false, null, 'Todos los campos son requeridos', 400);
    }
    
    // Validar fechas
    $inicio = new DateTime($fechaInicio);
    $fin = new DateTime($fechaFin);
    
    if ($fin <= $inicio) {
        sendResponse(false, null, 'La fecha de fin debe ser posterior a la de inicio', 400);
    }
    
    try {
        // Verificar que el recurso existe y está disponible
        $stmt = $pdo->prepare("SELECT estado FROM recursos WHERE id_recurso = ?");
        $stmt->execute([$idRecurso]);
        $recurso = $stmt->fetch();
        
        if (!$recurso) {
            sendResponse(false, null, 'Recurso no encontrado', 404);
        }
        
        if ($recurso['estado'] !== 'disponible') {
            sendResponse(false, null, 'El recurso no está disponible', 400);
        }
        
        // Verificar conflictos de horario
        $stmt = $pdo->prepare("
            SELECT COUNT(*) FROM reservas 
            WHERE id_recurso = ? 
            AND id_estado_reserva IN (1, 2)
            AND (
                (fecha_inicio < ? AND fecha_fin > ?)
                OR (fecha_inicio < ? AND fecha_fin > ?)
                OR (fecha_inicio >= ? AND fecha_fin <= ?)
            )
        ");
        $stmt->execute([
            $idRecurso,
            $fechaFin, $fechaInicio,
            $fechaInicio, $fechaInicio,
            $fechaInicio, $fechaFin
        ]);
        
        if ($stmt->fetchColumn() > 0) {
            sendResponse(false, null, 'El recurso ya está reservado en ese horario', 400);
        }
        
        // Crear reserva
        $stmt = $pdo->prepare("
            INSERT INTO reservas (id_usuario, id_recurso, fecha_inicio, fecha_fin, id_estado_reserva)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$idUsuario, $idRecurso, $fechaInicio, $fechaFin, $idEstado]);
        
        $newId = $pdo->lastInsertId();
        
        sendResponse(true, ['id_reserva' => $newId], 'Reserva creada correctamente', 201);
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al crear reserva: ' . $e->getMessage(), 500);
    }
}

/**
 * Actualizar una reserva existente
 */
function updateReserva($pdo) {
    $input = getJsonInput();
    
    $id = $input['id_reserva'] ?? null;
    
    if (!$id) {
        sendResponse(false, null, 'ID de reserva requerido', 400);
    }
    
    // Construir query dinámicamente
    $fields = [];
    $values = [];
    
    if (isset($input['id_estado_reserva'])) {
        $fields[] = 'id_estado_reserva = ?';
        $values[] = $input['id_estado_reserva'];
    }
    
    if (isset($input['fecha_inicio'])) {
        $fields[] = 'fecha_inicio = ?';
        $values[] = $input['fecha_inicio'];
    }
    
    if (isset($input['fecha_fin'])) {
        $fields[] = 'fecha_fin = ?';
        $values[] = $input['fecha_fin'];
    }
    
    if (isset($input['id_recurso'])) {
        $fields[] = 'id_recurso = ?';
        $values[] = $input['id_recurso'];
    }
    
    if (empty($fields)) {
        sendResponse(false, null, 'No hay campos para actualizar', 400);
    }
    
    $values[] = $id;
    
    try {
        $sql = "UPDATE reservas SET " . implode(', ', $fields) . " WHERE id_reserva = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(false, null, 'Reserva no encontrada', 404);
        }
        
        sendResponse(true, null, 'Reserva actualizada correctamente');
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al actualizar reserva: ' . $e->getMessage(), 500);
    }
}

/**
 * Eliminar una reserva
 */
function deleteReserva($pdo) {
    $input = getJsonInput();
    $id = $input['id_reserva'] ?? null;
    
    if (!$id) {
        sendResponse(false, null, 'ID de reserva requerido', 400);
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM reservas WHERE id_reserva = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(false, null, 'Reserva no encontrada', 404);
        }
        
        sendResponse(true, null, 'Reserva eliminada correctamente');
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al eliminar reserva: ' . $e->getMessage(), 500);
    }
}
