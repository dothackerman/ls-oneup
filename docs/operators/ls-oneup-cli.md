# `ls-oneup` CLI wrapper (Cloudflare Access)

Issue reference: `#31`

This wrapper provides a local, read-only, agent-friendly CLI surface on top of the existing Cloudflare Access-protected admin API.

## Scope

Allowed commands only:

1. `probes list` -> `GET /api/admin/probes`
2. `probes image` -> `GET /api/admin/probes/:id/image`

Non-goals:

1. no arbitrary method or URL passthrough
2. no write endpoints
3. no backend auth-surface changes

## Install prerequisites

1. Install `cloudflared` and ensure it is available in `PATH`.
2. Ensure this repo has dependencies installed (`npm install`).

## Configure environment

The wrapper reads `ls-oneup-cli/.env`.

1. Copy `ls-oneup-cli/.env.example` to `ls-oneup-cli/.env`.
2. Set `LS_ONEUP_BASE_URL` to your deployed base URL.

## Authenticate with Cloudflare Access

Before using the CLI, login once:

```bash
cloudflared access login <LS_ONEUP_BASE_URL>
```

The CLI obtains a short-lived access JWT with:

```bash
cloudflared access token --app <LS_ONEUP_BASE_URL>
```

If login is missing or expired, the CLI returns JSON auth errors and exit code `1`.

## Usage

Run the wrapper from repo root:

```bash
node ls-oneup-cli/bin/ls-oneup.mjs probes list
```

### List probes

```bash
node ls-oneup-cli/bin/ls-oneup.mjs probes list \
  --customer-name ACME \
  --order-number ORD-42 \
  --status offen
```

Output contract (stdout JSON):

1. success: `{ "ok": true, "data": <admin-api-json> }`
2. error: `{ "ok": false, "error_code": "...", "message": "...", "details": ... }`

### Fetch probe image

```bash
node ls-oneup-cli/bin/ls-oneup.mjs probes image <probe-id> --out ./tmp/probe.jpg
```

If `--out` is omitted, file output defaults to:

1. macOS/Linux: `/tmp/ls-oneup/<probe-id>.<ext>`
2. Windows: `%TEMP%\\ls-oneup\\<probe-id>.<ext>`

Image command output (stdout JSON):

```json
{
  "ok": true,
  "data": {
    "probe_id": "uuid",
    "output_path": "/abs/path/to/file.jpg",
    "bytes": 12345,
    "content_type": "image/jpeg",
    "fetched_at": "2026-04-23T18:00:00.000Z"
  }
}
```

## Manual smoke flow

1. `cloudflared access login <LS_ONEUP_BASE_URL>`
2. `node ls-oneup-cli/bin/ls-oneup.mjs probes list`
3. Pick one `probe_id` from `items`.
4. `node ls-oneup-cli/bin/ls-oneup.mjs probes image <probe_id>`
5. Confirm JSON response reports `output_path` and file exists.

## Automated coverage in this slice

1. command parsing and allowlist behavior
2. list/image request routing to allowlisted endpoints
3. mocked `cloudflared` auth handling (missing tool, auth required, success)
