<?php
/**
 * SGR-IT - Configuración de Base de Datos
 * Conexión a MySQL usando PDO
 */

// Headers para API REST - DEBEN IR PRIMERO
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuración de la base de datos
define('DB_HOST', 'localhost');
define('DB_PORT', '3307');
define('DB_NAME', 'sgr_it_simple');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Opciones de PDO
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

// DSN
$dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos: ' . $e->getMessage()
    ]);
    exit;
}

/**
 * Función para obtener datos JSON del body
 */
function getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

/**
 * Función para enviar respuesta JSON
 */
function sendResponse($success, $data = null, $message = null, $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ]);
    exit;
}
