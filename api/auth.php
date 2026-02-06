<?php
/**
 * SGR-IT - API de Autenticación
 * Maneja login y verificación de usuarios
 */

require_once 'config.php';

$input = getJsonInput();
$action = $input['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin($pdo, $input);
        break;
    case 'verify':
        handleVerify($pdo, $input);
        break;
    default:
        sendResponse(false, null, 'Acción no válida', 400);
}

/**
 * Manejar inicio de sesión
 */
function handleLogin($pdo, $input) {
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        sendResponse(false, null, 'Email y contraseña son requeridos', 400);
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT id_usuario, nombre, email, password_hash, rol, foto_url 
            FROM usuarios 
            WHERE email = ?
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user) {
            sendResponse(false, null, 'Usuario no encontrado', 401);
        }
        
        // Verificar contraseña
        if (!password_verify($password, $user['password_hash'])) {
            sendResponse(false, null, 'Contraseña incorrecta', 401);
        }
        
        // Eliminar hash de la respuesta
        unset($user['password_hash']);
        
        sendResponse(true, ['user' => $user], 'Login exitoso');
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al autenticar: ' . $e->getMessage(), 500);
    }
}

/**
 * Verificar token/sesión (para uso futuro con JWT)
 */
function handleVerify($pdo, $input) {
    $userId = $input['user_id'] ?? null;
    
    if (!$userId) {
        sendResponse(false, null, 'ID de usuario requerido', 400);
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT id_usuario, nombre, email, rol 
            FROM usuarios 
            WHERE id_usuario = ?
        ");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user) {
            sendResponse(false, null, 'Usuario no encontrado', 401);
        }
        
        sendResponse(true, ['user' => $user], 'Usuario verificado');
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al verificar: ' . $e->getMessage(), 500);
    }
}
