# Lead Collector

[![build](https://github.com/Reterics/lead_collector/actions/workflows/npm-build-test.yml/badge.svg)](https://github.com/Reterics/lead_collector/actions/workflows/npm-build-test.yml) [![codecov](https://codecov.io/github/Reterics/lead_collector/graph/badge.svg?token=VA00FOSC8W)](https://codecov.io/github/Reterics/lead_collector) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight React + TypeScript (Vite) single‑page app that captures leads through a questionnaire and, when configured, creates Jira issues via Atlassian OAuth 2.0 (3LO). Includes minimal PHP endpoints to handle OAuth and server‑side Jira REST calls.

## Table of contents
- Overview
- Features
- Architecture
- Prerequisites
- Quick start (development)
- Configuration
  - Environment variables
  - Jira OAuth app setup
- Running
  - Development
  - Production build and serve
- Deployment notes
- Troubleshooting
- Scripts
- License

## Overview
Lead Collector provides a simple UI for collecting user input and creating a Jira issue in a configured project. If Jira is not configured, the app will store the submission locally so you can still validate the UX.

## Features
- React 19 + TypeScript + Vite for fast DX
- Minimal backend glue in PHP to:
  - Perform Atlassian OAuth 2.0 (3LO)
  - Call Jira Cloud REST API with a Bearer token
- Graceful fallback to localStorage when Jira is not configured
- Attachment upload best‑effort support (client to server to Jira)

## Architecture
- Frontend (Vite SPA)
  - Key files:
    - src/components/Questionnaire.tsx – capture user input
    - src/services/jira.ts – client service to call the backend and handle OAuth redirects
- Backend (PHP, stateless per request, session‑based auth state)
  - public/auth.php – Atlassian OAuth 2.0 helper (authorize, token exchange, status, logout)
  - public/api.php – small proxy that creates Jira issues using the session’s access token and cloudId

The OAuth flow is initiated by the client when a 401 response is received from api.php. After the user consents, auth.php exchanges the code, stores access_token, cloud_id, etc. in PHP session, and redirects back to the SPA.

## Prerequisites
- Node.js 18+ (recommended 20+)
- PHP 8.1+ with cURL extension enabled
- A Jira Cloud site and an Atlassian OAuth 2.0 (3LO) app

## Quick start (development)
1) Install dependencies
   npm install

2) Configure environment (optional for local‑only mode)
   Copy .env.example to .env and fill the Jira values (see Configuration below). If you skip Jira configuration, the app will store submissions locally.

3) Start Vite dev server
   npm run dev
   The app will be available at http://localhost:5173

4) Serve PHP files
   Ensure a PHP server serves the public directory at the same origin as the SPA during development. Example using PHP’s built‑in server:
   php -S localhost:5173 -t public
   If you serve PHP on a different port/origin, you will need to handle CORS and adjust paths. The simplest setup is to serve both SPA and PHP under the same origin.

Tip: In many setups you’ll place public/ under your web root (e.g., Apache/Nginx) and point the SPA’s base to "./" (already set in vite.config.ts).

## Configuration
### Environment variables
Use .env (Vite) and web server environment for PHP.

Frontend (Vite):
- VITE_JIRA_PROJECT_KEY – Jira project key (e.g., ABC)
- VITE_JIRA_ISSUE_TYPE – Optional issue type name (default: Task)

Backend (PHP) – set as web server environment variables used by public/auth.php:
- JIRA_CLIENT_ID – Atlassian OAuth 2.0 client id
- JIRA_CLIENT_SECRET – Atlassian OAuth 2.0 client secret
- JIRA_REDIRECT_URI – Redirect URL registered in your Atlassian app (must point to public/auth.php)
- JIRA_CLOUD_BASE_URL – Optional. If set, restricts to a single site (e.g., https://your-site.atlassian.net)

See .env.example for a starting point for the frontend variables.

### Jira OAuth app setup
1) Create a 3LO app in https://developer.atlassian.com/ (select Jira scope).
2) Add the following OAuth scopes at minimum (auth.php sets these):
   - read:jira-user
   - read:jira-work
   - write:jira-work
   - offline_access (optional if you plan token refresh)
3) Set the Redirect URL to your deployed auth endpoint, e.g.:
   https://your-domain/auth.php
   or during development:
   http://localhost:5173/auth.php
4) Put the Client ID/Secret into your server environment as listed above.

## Running
### Development
- Start Vite and your PHP web server as described in Quick start.
- When creating an issue, if not authenticated, the app will redirect to Atlassian to consent, then back to the SPA.

### Production build and serve
- Build static assets:
  npm run build
  This outputs to dist/
- Deploy strategy options:
  - Serve dist/ as static files via your web server and place auth.php and api.php under the same origin. You may copy public/*.php alongside your static root or configure routing so they are reachable at /auth.php and /api.php.
  - Ensure PHP has sessions and cURL enabled.

## Deployment notes
- Same‑origin is recommended so fetch('./api.php') works without CORS. If you must use a different origin, update api.php CORS and adjust frontend paths.
- Ensure session storage is persistent and secure in production (configure session.save_path, cookies with Secure/HttpOnly, etc.).
- Consider adding HTTPS everywhere and secure cookie flags in production.

## Troubleshooting
- 401 not_authenticated from api.php
  - You are not logged in with Atlassian yet; the client should redirect via auth.php?action=start.
- token_exchange_failed or resource_discovery_failed in auth.php
  - Verify JIRA_CLIENT_ID/SECRET/REDIRECT_URI and that the redirect URI exactly matches what’s registered.
- no_accessible_resources
  - The Atlassian account lacks access to any Jira Cloud sites, or scopes are insufficient.
- Jira returns 400/403/404 when creating issue
  - Check project key, issue type name, and permissions for the OAuth app user.

## Scripts
Defined in package.json:
- npm run dev – Start Vite dev server
- npm run build – Type‑check and build production assets
- npm run preview – Preview production build locally
- npm run lint – Run ESLint

## License
This project is provided without an explicit license. Add your preferred license here if needed.
