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
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
}

$token = $_SESSION['access_token'] ?? null;
$cloudId = $_SESSION['cloud_id'] ?? null;
$apiBase = $cloudId ? "https://api.atlassian.com/ex/jira/{$cloudId}/rest/api/3" : null;

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

function send_json($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($action === 'create-issue') {
    if (empty($token) || empty($cloudId) || empty($apiBase)) {
        send_json(['error' => 'not_authenticated', 'message' => 'Authenticate with Jira to create issues.'], 401);
    }
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
} else if ($action === 'check-connection') {
  $CLIENT_ID = getenv('JIRA_CLIENT_ID') ?: '';
  $CLIENT_SECRET = getenv('JIRA_CLIENT_SECRET') ?: '';
  $REDIRECT_URI = getenv('JIRA_REDIRECT_URI') ?: '';
  if (!$CLIENT_ID || !$CLIENT_SECRET || !$REDIRECT_URI) {
    send_json([
      'error' => 'server_misconfigured',
      'message' => 'Missing JIRA_CLIENT_ID, JIRA_CLIENT_SECRET, or JIRA_REDIRECT_URI environment variables.'
    ], 500);
  }

  if (empty($token) || empty($cloudId)) {
    send_json([
      'error' => 'not_authenticated',
      'message' => 'Not authenticated with Jira.'
    ], 401);
  }

  // Optionally ping Jira to validate the token/cloud id
  if ($apiBase) {
    [$code, $err, $resp] = http_json("{$apiBase}/myself", 'GET', $token);
    if ($err) {
      send_json(['error' => 'network_error', 'message' => $err], 502);
    }
    if ($code >= 400) {
      // Bubble up Jira error, but don’t expose all internals
      send_json([
        'error' => 'jira_error',
        'status' => $code,
        'message' => 'Jira responded with an error.'
      ], $code);
    }
  }

  send_json([
    'error' => null,
    'message' => 'Connection stable.'
  ], 200);
}

http_response_code(404);
echo json_encode(['error' => 'unknown_action']);
