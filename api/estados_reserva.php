<?php
/**
 * SGR-IT - API de Estados de Reserva
 * Obtener estados de reserva disponibles
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    sendResponse(false, null, 'Método no permitido', 405);
}

try {
    $id = $_GET['id'] ?? null;
    
    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM estados_reserva WHERE id_estado_reserva = ?");
        $stmt->execute([$id]);
        $estado = $stmt->fetch();
        
        if (!$estado) {
            sendResponse(false, null, 'Estado de reserva no encontrado', 404);
        }
        
        sendResponse(true, $estado);
    } else {
        $stmt = $pdo->query("SELECT * FROM estados_reserva ORDER BY id_estado_reserva");
        $estados = $stmt->fetchAll();
        
        sendResponse(true, $estados);
    }
    
} catch (PDOException $e) {
    sendResponse(false, null, 'Error al obtener estados de reserva: ' . $e->getMessage(), 500);
}
