<?php
/**
 * SGR-IT - API de Recursos
 * CRUD completo para gestión de recursos
 * 
 * NOTA: En producción, implementar autenticación JWT.
 * Las operaciones POST, PUT, DELETE deberían validar que el usuario sea admin.
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getRecursos($pdo);
        break;
    case 'POST':
        // Solo admin puede crear recursos
        createRecurso($pdo);
        break;
    case 'PUT':
        // Solo admin puede actualizar recursos
        updateRecurso($pdo);
        break;
    case 'DELETE':
        // Solo admin puede eliminar recursos
        deleteRecurso($pdo);
        break;
    default:
        sendResponse(false, null, 'Método no permitido', 405);
}

/**
 * Obtener todos los recursos o uno específico
 */
function getRecursos($pdo) {
    $id = $_GET['id'] ?? null;
    
    try {
        if ($id) {
            $stmt = $pdo->prepare("
                SELECT r.*, tr.nombre as tipo_nombre
                FROM recursos r
                JOIN tipos_recurso tr ON r.id_tipo_recurso = tr.id_tipo_recurso
                WHERE r.id_recurso = ?
            ");
            $stmt->execute([$id]);
            $recurso = $stmt->fetch();
            
            if (!$recurso) {
                sendResponse(false, null, 'Recurso no encontrado', 404);
            }
            
            sendResponse(true, $recurso);
        } else {
            $stmt = $pdo->query("
                SELECT r.*, tr.nombre as tipo_nombre
                FROM recursos r
                JOIN tipos_recurso tr ON r.id_tipo_recurso = tr.id_tipo_recurso
                ORDER BY tr.nombre, r.nombre
            ");
            $recursos = $stmt->fetchAll();
            
            sendResponse(true, $recursos);
        }
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al obtener recursos: ' . $e->getMessage(), 500);
    }
}

/**
 * Crear un nuevo recurso
 */
function createRecurso($pdo) {
    $input = getJsonInput();
    
    $nombre = trim($input['nombre'] ?? '');
    $idTipoRecurso = $input['id_tipo_recurso'] ?? null;
    $estado = $input['estado'] ?? 'disponible';
    $ubicacion = trim($input['ubicacion'] ?? '') ?: null;
    $fotoUrl = trim($input['foto_url'] ?? '') ?: null;
    $descripcion = trim($input['descripcion'] ?? '') ?: null;
    
    // Validaciones
    if (empty($nombre)) {
        sendResponse(false, null, 'El nombre es requerido', 400);
    }
    
    if (!$idTipoRecurso) {
        sendResponse(false, null, 'El tipo de recurso es requerido', 400);
    }
    
    if (!in_array($estado, ['disponible', 'no_disponible'])) {
        sendResponse(false, null, 'Estado no válido', 400);
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO recursos (nombre, id_tipo_recurso, estado, ubicacion, foto_url, descripcion)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$nombre, $idTipoRecurso, $estado, $ubicacion, $fotoUrl, $descripcion]);
        
        $newId = $pdo->lastInsertId();
        
        sendResponse(true, ['id_recurso' => $newId], 'Recurso creado correctamente', 201);
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al crear recurso: ' . $e->getMessage(), 500);
    }
}

/**
 * Actualizar un recurso existente
 */
function updateRecurso($pdo) {
    $input = getJsonInput();
    
    $id = $input['id_recurso'] ?? null;
    
    if (!$id) {
        sendResponse(false, null, 'ID de recurso requerido', 400);
    }
    
    // Construir query dinámicamente
    $fields = [];
    $values = [];
    
    if (isset($input['nombre'])) {
        $fields[] = 'nombre = ?';
        $values[] = trim($input['nombre']);
    }
    
    if (isset($input['id_tipo_recurso'])) {
        $fields[] = 'id_tipo_recurso = ?';
        $values[] = $input['id_tipo_recurso'];
    }
    
    if (isset($input['estado'])) {
        if (!in_array($input['estado'], ['disponible', 'no_disponible'])) {
            sendResponse(false, null, 'Estado no válido', 400);
        }
        $fields[] = 'estado = ?';
        $values[] = $input['estado'];
    }
    
    if (isset($input['ubicacion'])) {
        $fields[] = 'ubicacion = ?';
        $values[] = trim($input['ubicacion']) ?: null;
    }
    
    if (isset($input['foto_url'])) {
        $fields[] = 'foto_url = ?';
        $values[] = trim($input['foto_url']) ?: null;
    }
    
    if (isset($input['descripcion'])) {
        $fields[] = 'descripcion = ?';
        $values[] = trim($input['descripcion']) ?: null;
    }
    
    if (empty($fields)) {
        sendResponse(false, null, 'No hay campos para actualizar', 400);
    }
    
    $values[] = $id;
    
    try {
        $sql = "UPDATE recursos SET " . implode(', ', $fields) . " WHERE id_recurso = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(false, null, 'Recurso no encontrado', 404);
        }
        
        sendResponse(true, null, 'Recurso actualizado correctamente');
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al actualizar recurso: ' . $e->getMessage(), 500);
    }
}

/**
 * Eliminar un recurso
 */
function deleteRecurso($pdo) {
    $input = getJsonInput();
    $id = $input['id_recurso'] ?? null;
    
    if (!$id) {
        sendResponse(false, null, 'ID de recurso requerido', 400);
    }
    
    try {
        // Verificar si tiene reservas activas
        $stmt = $pdo->prepare("
            SELECT COUNT(*) FROM reservas 
            WHERE id_recurso = ? AND id_estado_reserva IN (1, 2)
        ");
        $stmt->execute([$id]);
        
        if ($stmt->fetchColumn() > 0) {
            sendResponse(false, null, 'No se puede eliminar: el recurso tiene reservas activas', 400);
        }
        
        $stmt = $pdo->prepare("DELETE FROM recursos WHERE id_recurso = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(false, null, 'Recurso no encontrado', 404);
        }
        
        sendResponse(true, null, 'Recurso eliminado correctamente');
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al eliminar recurso: ' . $e->getMessage(), 500);
    }
}
