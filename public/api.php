<?php
// api.php - minimal Jira call via OAuth 2.0 (3LO) Bearer
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-store');
header('Pragma: no-cache');

// CORS (only if your SPA is on a different origin/port during dev)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    header("Access-Control-Allow-Origin: $origin");
    header("Vary: Origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
}

if (empty($_SESSION['access_token']) || empty($_SESSION['cloud_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'not_authenticated']); exit;
}

$token = $_SESSION['access_token'];
$cloudId = $_SESSION['cloud_id'];
$apiBase = "https://api.atlassian.com/ex/jira/{$cloudId}/rest/api/3";

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $_GET['action'] ?? 'create-issue';

function http_json($url, $method, $token, $body = null) {
    $ch = curl_init($url);
    $headers = [
        "Authorization: Bearer {$token}",
        "Accept: application/json",
        "Content-Type: application/json"
    ];
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => $body ? json_encode($body) : null,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    return [$code, $err, $resp];
}

if ($action === 'create-issue') {
    // expects: { projectKey, issueType, summary, description }
    $projectKey  = $input['projectKey']  ?? null;
    $issueType   = $input['issueType']   ?? 'Task';
    $summary     = $input['summary']     ?? null;
    $description = $input['description'] ?? '';

    if (!$projectKey || !$summary) {
        http_response_code(400);
        echo json_encode(['error' => 'missing_params', 'need' => ['projectKey','summary']]);
        exit;
    }

    $payload = [
        'fields' => [
            'project' => ['key' => $projectKey],
            'issuetype' => ['name' => $issueType],
            'summary' => $summary,
            'description' => [
                'type' => 'doc',
                'version' => 1,
                'content' => [[
                    'type' => 'paragraph',
                    'content' => [[ 'type' => 'text', 'text' => $description ]]
                ]]
            ],
        ],
    ];

    [$code, $err, $resp] = http_json("{$apiBase}/issue", 'POST', $token, $payload);
    if ($err || $code >= 400) {
        // surface Jira response for debugging
        http_response_code(502);
        echo json_encode(['error' => 'jira_error', 'status' => $code, 'detail' => $err ?: $resp]); exit;
    }
    http_response_code(201);
    echo $resp; exit;
}

http_response_code(404);
echo json_encode(['error' => 'unknown_action']);
