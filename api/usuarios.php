<?php
/**
 * SGR-IT - API de Usuarios
 * CRUD completo para gestión de usuarios
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getUsuarios($pdo);
        break;
    case 'POST':
        createUsuario($pdo);
        break;
    case 'PUT':
        updateUsuario($pdo);
        break;
    case 'DELETE':
        deleteUsuario($pdo);
        break;
    default:
        sendResponse(false, null, 'Método no permitido', 405);
}

/**
 * Obtener todos los usuarios o uno específico
 */
function getUsuarios($pdo) {
    $id = $_GET['id'] ?? null;
    
    try {
        if ($id) {
            $stmt = $pdo->prepare("
                SELECT id_usuario, nombre, email, rol, foto_url 
                FROM usuarios 
                WHERE id_usuario = ?
            ");
            $stmt->execute([$id]);
            $usuario = $stmt->fetch();
            
            if (!$usuario) {
                sendResponse(false, null, 'Usuario no encontrado', 404);
            }
            
            sendResponse(true, $usuario);
        } else {
            $stmt = $pdo->query("
                SELECT id_usuario, nombre, email, rol, foto_url 
                FROM usuarios 
                ORDER BY nombre
            ");
            $usuarios = $stmt->fetchAll();
            
            sendResponse(true, $usuarios);
        }
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al obtener usuarios: ' . $e->getMessage(), 500);
    }
}

/**
 * Crear un nuevo usuario
 */
function createUsuario($pdo) {
    $input = getJsonInput();
    
    $nombre = trim($input['nombre'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $rol = $input['rol'] ?? 'empleado';
    
    // Validaciones
    if (empty($nombre)) {
        sendResponse(false, null, 'El nombre es requerido', 400);
    }
    
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(false, null, 'Email válido es requerido', 400);
    }
    
    if (empty($password) || strlen($password) < 6) {
        sendResponse(false, null, 'La contraseña debe tener al menos 6 caracteres', 400);
    }
    
    if (!in_array($rol, ['admin', 'empleado'])) {
        sendResponse(false, null, 'Rol no válido', 400);
    }
    
    try {
        // Verificar email único
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->fetchColumn() > 0) {
            sendResponse(false, null, 'El email ya está registrado', 400);
        }
        
        // Hash de contraseña
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("
            INSERT INTO usuarios (nombre, email, password_hash, rol)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$nombre, $email, $passwordHash, $rol]);
        
        $newId = $pdo->lastInsertId();
        
        sendResponse(true, ['id_usuario' => $newId], 'Usuario creado correctamente', 201);
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al crear usuario: ' . $e->getMessage(), 500);
    }
}

/**
 * Actualizar un usuario existente
 */
function updateUsuario($pdo) {
    $input = getJsonInput();
    
    $id = $input['id_usuario'] ?? null;
    
    if (!$id) {
        sendResponse(false, null, 'ID de usuario requerido', 400);
    }
    
    // Construir query dinámicamente
    $fields = [];
    $values = [];
    
    if (isset($input['nombre'])) {
        $fields[] = 'nombre = ?';
        $values[] = trim($input['nombre']);
    }
    
    if (isset($input['email'])) {
        $email = trim($input['email']);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendResponse(false, null, 'Email no válido', 400);
        }
        
        // Verificar email único (excepto el propio usuario)
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE email = ? AND id_usuario != ?");
        $stmt->execute([$email, $id]);
        
        if ($stmt->fetchColumn() > 0) {
            sendResponse(false, null, 'El email ya está registrado por otro usuario', 400);
        }
        
        $fields[] = 'email = ?';
        $values[] = $email;
    }
    
    if (isset($input['password']) && !empty($input['password'])) {
        if (strlen($input['password']) < 6) {
            sendResponse(false, null, 'La contraseña debe tener al menos 6 caracteres', 400);
        }
        $fields[] = 'password_hash = ?';
        $values[] = password_hash($input['password'], PASSWORD_DEFAULT);
    }
    
    if (isset($input['rol'])) {
        if (!in_array($input['rol'], ['admin', 'empleado'])) {
            sendResponse(false, null, 'Rol no válido', 400);
        }
        $fields[] = 'rol = ?';
        $values[] = $input['rol'];
    }
    
    if (isset($input['foto_url'])) {
        $fields[] = 'foto_url = ?';
        $values[] = trim($input['foto_url']) ?: null;
    }
    
    if (empty($fields)) {
        sendResponse(false, null, 'No hay campos para actualizar', 400);
    }
    
    $values[] = $id;
    
    try {
        $sql = "UPDATE usuarios SET " . implode(', ', $fields) . " WHERE id_usuario = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(false, null, 'Usuario no encontrado o sin cambios', 404);
        }
        
        sendResponse(true, null, 'Usuario actualizado correctamente');
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al actualizar usuario: ' . $e->getMessage(), 500);
    }
}

/**
 * Eliminar un usuario
 */
function deleteUsuario($pdo) {
    $input = getJsonInput();
    $id = $input['id_usuario'] ?? null;
    
    if (!$id) {
        sendResponse(false, null, 'ID de usuario requerido', 400);
    }
    
    try {
        // Verificar si tiene reservas activas
        $stmt = $pdo->prepare("
            SELECT COUNT(*) FROM reservas 
            WHERE id_usuario = ? AND id_estado_reserva IN (1, 2)
        ");
        $stmt->execute([$id]);
        
        if ($stmt->fetchColumn() > 0) {
            sendResponse(false, null, 'No se puede eliminar: el usuario tiene reservas activas', 400);
        }
        
        $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id_usuario = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(false, null, 'Usuario no encontrado', 404);
        }
        
        sendResponse(true, null, 'Usuario eliminado correctamente');
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al eliminar usuario: ' . $e->getMessage(), 500);
    }
}
