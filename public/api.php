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
    header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
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
} else if ($action === 'upload-attachment') {
    // Supports multipart/form-data uploads from the SPA using FormData
    if (empty($token) || empty($cloudId) || empty($apiBase)) {
        send_json(['error' => 'not_authenticated', 'message' => 'Authenticate with Jira to upload attachments.'], 401);
    }

    // issue key or id can come from POST (FormData) or query param
    $issueKey = $_POST['issueKey'] ?? ($_GET['issueKey'] ?? null);
    if (!$issueKey) {
        send_json(['error' => 'missing_params', 'need' => ['issueKey']], 400);
    }

    if (empty($_FILES) || empty($_FILES['file'])) {
        send_json(['error' => 'missing_file', 'message' => 'No file provided under field name "file".'], 400);
    }

    // Normalize to array of files, but support single
    $filesInput = $_FILES['file'];
    $fileCount = is_array($filesInput['name']) ? count($filesInput['name']) : 1;

    $responses = [];
    for ($i = 0; $i < $fileCount; $i++) {
        $name = is_array($filesInput['name']) ? $filesInput['name'][$i] : $filesInput['name'];
        $type = is_array($filesInput['type']) ? $filesInput['type'][$i] : $filesInput['type'];
        $tmp  = is_array($filesInput['tmp_name']) ? $filesInput['tmp_name'][$i] : $filesInput['tmp_name'];
        $errNo= is_array($filesInput['error']) ? $filesInput['error'][$i] : $filesInput['error'];
        $size = is_array($filesInput['size']) ? $filesInput['size'][$i] : $filesInput['size'];

        if ($errNo !== UPLOAD_ERR_OK) {
            $responses[] = ['name' => $name, 'error' => 'upload_failed', 'php_error' => $errNo];
            continue;
        }
        if (!is_uploaded_file($tmp)) {
            $responses[] = ['name' => $name, 'error' => 'not_uploaded_file'];
            continue;
        }

        $url = "{$apiBase}/issue/" . rawurlencode($issueKey) . "/attachments";
        $ch = curl_init($url);
        $headers = [
            "Authorization: Bearer {$token}",
            "Accept: application/json",
            "X-Atlassian-Token: no-check"
        ];
        $cfile = curl_file_create($tmp, $type ?: 'application/octet-stream', $name);
        $postFields = ['file' => $cfile];

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $postFields,
        ]);

        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cerr = curl_error($ch);
        curl_close($ch);

        if ($cerr || $code >= 400) {
            $responses[] = ['name' => $name, 'status' => $code, 'error' => $cerr ?: $resp];
        } else {
            // Jira returns an array of attachment objects
            $decoded = json_decode($resp, true);
            $responses[] = ['name' => $name, 'status' => $code, 'result' => $decoded];
        }
    }

    // Determine overall status
    $anyFail = array_filter($responses, function($r){ return isset($r['error']); });
    if ($anyFail) {
        send_json(['partial' => true, 'results' => $responses], 207); // 207 Multi-Status
    }
    send_json(['partial' => false, 'results' => $responses], 200);
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
  ], 202);
}

http_response_code(404);
echo json_encode(['error' => 'unknown_action']);
