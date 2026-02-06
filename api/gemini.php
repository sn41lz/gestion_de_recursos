<?php
/**
 * API Endpoint para IA (Groq)
 * Genera resúmenes ejecutivos usando Groq API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Cargar claves API desde archivo privado
$apiKeysFile = __DIR__ . '/api_keys.php';
if (file_exists($apiKeysFile)) {
    require_once $apiKeysFile;
} else {
    define('GROQ_API_KEY', '');
}

define('GROQ_API_URL', 'https://api.groq.com/openai/v1/chat/completions');

/**
 * Enviar respuesta JSON
 */
function sendResponse($success, $data = null, $message = '', $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Llamar a la API de Groq
 */
function callGroq($prompt) {
    $apiKey = defined('GROQ_API_KEY') ? GROQ_API_KEY : '';
    
    if (empty($apiKey) || $apiKey === 'TU_GROQ_API_KEY_AQUI') {
        return ['error' => 'API Key no configurada. Añade tu clave de Groq en api/api_keys.php'];
    }
    
    $payload = [
        'model' => 'llama-3.3-70b-versatile',
        'messages' => [
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ],
        'temperature' => 0.7,
        'max_tokens' => 2048
    ];
    
    $ch = curl_init(GROQ_API_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 60
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    $errno = curl_errno($ch);
    curl_close($ch);
    
    if ($error) {
        if ($errno === CURLE_COULDNT_RESOLVE_HOST) {
            return ['error' => 'Error de conexión: No se pudo resolver api.groq.com. Verifica tu conexión a internet.'];
        }
        if ($errno === CURLE_COULDNT_CONNECT) {
            return ['error' => 'Error de conexión: No se pudo conectar con Groq. Verifica firewall o proxy.'];
        }
        if ($errno === CURLE_OPERATION_TIMEDOUT) {
            return ['error' => 'Error de conexión: Tiempo de espera agotado.'];
        }
        return ['error' => 'Error de conexión: ' . $error];
    }
    
    if ($httpCode !== 200) {
        $errorData = json_decode($response, true);
        $errorMsg = $errorData['error']['message'] ?? 'Error HTTP ' . $httpCode;
        return ['error' => $errorMsg];
    }
    
    $data = json_decode($response, true);
    
    if (isset($data['choices'][0]['message']['content'])) {
        return ['text' => $data['choices'][0]['message']['content']];
    }
    
    return ['error' => 'Respuesta inesperada de Groq'];
}

// Solo aceptar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, null, 'Método no permitido', 405);
}

// Leer input
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

if ($action === 'generate_summary') {
    // Datos del sistema
    $stats = $input['stats'] ?? [];
    $recursos = $input['recursos'] ?? [];
    $reservas = $input['reservas'] ?? [];
    $usuarios = $input['usuarios'] ?? [];
    
    // Construir prompt
    $prompt = "Eres un analista de IT experto. Genera un RESUMEN EJECUTIVO profesional y conciso sobre el estado del sistema de gestión de recursos IT basándote en estos datos:

## ESTADÍSTICAS GENERALES:
- Total de recursos IT: {$stats['totalRecursos']}
- Recursos disponibles: {$stats['disponibles']}
- Recursos en uso: {$stats['enUso']}
- Total de reservas: {$stats['totalReservas']}
- Reservas activas: {$stats['reservasActivas']}
- Reservas pendientes: {$stats['reservasPendientes']}
- Usuarios registrados: {$stats['totalUsuarios']}

## TIPOS DE RECURSOS:
";
    
    // Contar recursos por tipo
    $tiposCount = [];
    foreach ($recursos as $r) {
        $tipo = $r['tipo_nombre'] ?? 'Sin tipo';
        $tiposCount[$tipo] = ($tiposCount[$tipo] ?? 0) + 1;
    }
    foreach ($tiposCount as $tipo => $count) {
        $prompt .= "- {$tipo}: {$count}\n";
    }
    
    $prompt .= "
## RESERVAS RECIENTES (últimas 10):
";
    $recentReservas = array_slice($reservas, 0, 10);
    foreach ($recentReservas as $r) {
        $prompt .= "- {$r['recurso_nombre']} por {$r['usuario_nombre']} ({$r['estado_nombre']})\n";
    }
    
    $prompt .= "
## INSTRUCCIONES:
Genera un resumen ejecutivo en español con las siguientes secciones:
1. **Estado General**: Resumen del estado actual del sistema
2. **Utilización de Recursos**: Análisis del uso y disponibilidad
3. **Tendencias**: Observaciones sobre patrones de uso
4. **Recomendaciones**: 2-3 sugerencias para mejorar la gestión

Usa formato Markdown con emojis para hacerlo visualmente atractivo. Sé conciso pero informativo.";

    $result = callGroq($prompt);
    
    if (isset($result['error'])) {
        sendResponse(false, null, $result['error'], 500);
    }
    
    sendResponse(true, ['summary' => $result['text']], 'Resumen generado correctamente');
    
} else {
    sendResponse(false, null, 'Acción no válida', 400);
}
