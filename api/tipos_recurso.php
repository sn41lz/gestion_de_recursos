<?php
/**
 * SGR-IT - API de Tipos de Recurso
 * Obtener tipos de recurso disponibles
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    sendResponse(false, null, 'Método no permitido', 405);
}

try {
    $id = $_GET['id'] ?? null;
    
    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM tipos_recurso WHERE id_tipo_recurso = ?");
        $stmt->execute([$id]);
        $tipo = $stmt->fetch();
        
        if (!$tipo) {
            sendResponse(false, null, 'Tipo de recurso no encontrado', 404);
        }
        
        sendResponse(true, $tipo);
    } else {
        $stmt = $pdo->query("SELECT * FROM tipos_recurso ORDER BY nombre");
        $tipos = $stmt->fetchAll();
        
        sendResponse(true, $tipos);
    }
    
} catch (PDOException $e) {
    sendResponse(false, null, 'Error al obtener tipos de recurso: ' . $e->getMessage(), 500);
}
