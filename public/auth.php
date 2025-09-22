<?php
session_start();

$ACCESSIBLE_RESOURCES_URL = 'https://api.atlassian.com/oauth/token/accessible-resources';

// Configuration: you can set these as environment variables in the web server
$CLIENT_ID = getenv('JIRA_CLIENT_ID') ?: '';
$CLIENT_SECRET = getenv('JIRA_CLIENT_SECRET') ?: '';
$REDIRECT_URI = getenv('JIRA_REDIRECT_URI') ?: '';
// Optional: restrict to a single cloud (site) by specifying base URL; otherwise, we discover with /oauth/token/accessible-resources
$CLOUD_BASE_URL = getenv('JIRA_CLOUD_BASE_URL') ?: '';

$AUTHZ_URL = 'https://auth.atlassian.com/authorize';
$TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
$ACCESSIBLE_RESOURCES_URL = 'https://api.atlassian.com/oauth/token/accessible-resources';
$SCOPE = implode(' ', [
    // minimal scopes for creating issues and attachments; adjust as needed
    'read:jira-user',
    'read:jira-work',
    'write:jira-work',
    'offline_access',
]);

function json_response($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    header('Pragma: no-cache');
    echo json_encode($data);
    exit;
}

function require_config($clientId, $clientSecret, $redirectUri) {
    if (!$clientId || !$clientSecret || !$redirectUri) {
        json_response([
            'error' => 'server_misconfigured',
            'message' => 'Missing JIRA_CLIENT_ID, JIRA_CLIENT_SECRET, or JIRA_REDIRECT_URI environment variables.'
        ], 500);
    }
}

$action = $_GET['action'] ?? '';

require_config($CLIENT_ID, $CLIENT_SECRET, $REDIRECT_URI);

if ($action === 'start') {
    // Begin OAuth flow
    $state = bin2hex(random_bytes(16));
    $_SESSION['oauth_state'] = $state;

    $params = http_build_query([
        'audience' => 'api.atlassian.com',
        'client_id' => $CLIENT_ID,
        'scope' => $SCOPE,
        'redirect_uri' => $REDIRECT_URI,
        'state' => $state,
        'response_type' => 'code',
        'prompt' => 'consent',
    ]);

    header('Location: ' . $AUTHZ_URL . '?' . $params);
    exit;
}

if (isset($_GET['code'])) {
    // Callback phase: exchange code for tokens
    $code = $_GET['code'];
    $state = $_GET['state'] ?? '';
    if (!isset($_SESSION['oauth_state']) || !$state || !hash_equals($_SESSION['oauth_state'], $state)) {
        json_response(['error' => 'invalid_state'], 400);
    }
    unset($_SESSION['oauth_state']);

    $payload = [
        'grant_type' => 'authorization_code',
        'client_id' => $CLIENT_ID,
        'client_secret' => $CLIENT_SECRET,
        'code' => $code,
        'redirect_uri' => $REDIRECT_URI,
    ];
    $ch = curl_init($TOKEN_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err || $httpCode >= 400) {
        json_response(['error' => 'token_exchange_failed', 'detail' => $err ?: $resp], 500);
    }

    $tokenData = json_decode($resp, true);
    if (!is_array($tokenData) || empty($tokenData['access_token'])) {
        json_response(['error' => 'invalid_token_response', 'raw' => $resp], 500);
    }

    $_SESSION['access_token'] = $tokenData['access_token'];
    $_SESSION['refresh_token'] = $tokenData['refresh_token'] ?? null;
    $_SESSION['expires_at'] = time() + (int)($tokenData['expires_in'] ?? 0) - 30; // small safety margin

    // Discover cloud resource if not configured
    if (!$CLOUD_BASE_URL) {
        $ch = curl_init($ACCESSIBLE_RESOURCES_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $_SESSION['access_token'],
                'Accept: application/json'
            ],
        ]);
        $resp2 = curl_exec($ch);
        $http2 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err2 = curl_error($ch);
        curl_close($ch);
        if ($err2 || $http2 >= 400) {
            json_response(['error' => 'resource_discovery_failed', 'detail' => $err2 ?: $resp2], 500);
        }
        $resources = json_decode($resp2, true);
        if (!is_array($resources) || empty($resources[0]['url'])) {
            json_response(['error' => 'no_accessible_resources'], 400);
        }
        $_SESSION['cloud_base_url'] = rtrim($resources[0]['url'], '/');
    } else {
        $_SESSION['cloud_base_url'] = rtrim($CLOUD_BASE_URL, '/');
    }

    $ch = curl_init($ACCESSIBLE_RESOURCES_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $_SESSION['access_token'],
            'Accept: application/json'
        ],
    ]);
    $resp2 = curl_exec($ch);
    $http2 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err2 = curl_error($ch);
    curl_close($ch);
    if ($err2 || $http2 >= 400) {
        json_response(['error' => 'resource_discovery_failed', 'detail' => $err2 ?: $resp2], 500);
    }
    $resources = json_decode($resp2, true);
    if (!is_array($resources) || empty($resources[0]['id']) || empty($resources[0]['url'])) {
        json_response(['error' => 'no_accessible_resources', 'raw' => $resp2], 400);
    }

    // Save both the site URL (pretty/useful to show) and the cloudId (required for API calls)
    $_SESSION['cloud_id'] = $resources[0]['id'];           // <- IMPORTANT
    $_SESSION['site_url'] = rtrim($resources[0]['url'], '/');

    // Optional display override if you want:
    if ($CLOUD_BASE_URL) {
        $_SESSION['site_url'] = rtrim($CLOUD_BASE_URL, '/');
    }

    // Redirect back to app (root) with success flag
    $target = isset($_GET['redirect']) ? $_GET['redirect'] : './';
    if (strpos($target, 'http') !== 0) $target = $target ?: './';
    header('Location: ' . $target . '#oauth=success');
    exit;
}

if ($action === 'status') {
    $ok = !empty($_SESSION['access_token']) && !empty($_SESSION['cloud_id']);
    $apiBase = $ok ? ('https://api.atlassian.com/ex/jira/' . $_SESSION['cloud_id']) : null;
    json_response([
        'authenticated' => $ok,
        'cloudId'       => $_SESSION['cloud_id'] ?? null,
        'siteUrl'       => $_SESSION['site_url'] ?? null,     // pretty URL
        'apiBase'       => $apiBase,                          // <- use this for REST
        'expiresAt'     => $_SESSION['expires_at'] ?? null,
    ]);
}

if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'], $params['secure'], $params['httponly']
        );
    }
    session_destroy();
    json_response(['ok' => true]);
}

// Default help output
header('Content-Type: text/plain');
echo "Atlassian OAuth helper. Use:\n";
echo "  auth.php?action=start  - start OAuth\n";
echo "  auth.php?action=status - auth status\n";
echo "  auth.php?action=logout - clear session\n";
