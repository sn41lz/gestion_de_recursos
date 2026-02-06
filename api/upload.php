<?php
/**
 * SGR-IT - API de Subida de Archivos
 * Permite subir fotos de perfil
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuración
$uploadDir = __DIR__ . '/../uploads/';
$maxFileSize = 2 * 1024 * 1024; // 2MB
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Crear directorio si no existe
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

function sendResponse($success, $data = null, $message = '', $code = 200) {
    header('Content-Type: application/json');
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, null, 'Método no permitido', 405);
}

// Verificar que se envió un archivo
if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    $errorMsg = 'No se recibió ningún archivo';
    if (isset($_FILES['photo'])) {
        switch ($_FILES['photo']['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $errorMsg = 'El archivo es demasiado grande';
                break;
            case UPLOAD_ERR_NO_FILE:
                $errorMsg = 'No se seleccionó ningún archivo';
                break;
        }
    }
    sendResponse(false, null, $errorMsg, 400);
}

$file = $_FILES['photo'];

// Validar tamaño
if ($file['size'] > $maxFileSize) {
    sendResponse(false, null, 'El archivo excede el límite de 2MB', 400);
}

// Validar tipo MIME
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);

if (!in_array($mimeType, $allowedTypes)) {
    sendResponse(false, null, 'Tipo de archivo no permitido. Solo JPG, PNG, GIF o WebP', 400);
}

// Generar nombre único
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$extension = strtolower($extension);
if (!in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
    $extension = 'jpg';
}
$newFilename = 'profile_' . uniqid() . '_' . time() . '.' . $extension;
$destination = $uploadDir . $newFilename;

// Mover archivo
if (!move_uploaded_file($file['tmp_name'], $destination)) {
    sendResponse(false, null, 'Error al guardar el archivo', 500);
}

// Devolver URL relativa
$baseUrl = 'uploads/' . $newFilename;

sendResponse(true, ['url' => $baseUrl], 'Foto subida correctamente');
