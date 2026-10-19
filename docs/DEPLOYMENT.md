# Deployment

The app is one container: a small Node server that serves the editor and builds ePUBs with Storyteller. Users need only
a browser; Node, Storyteller and Pug live inside the image.

## Run it

```bash
docker compose up --build        # then open http://localhost:8080
```

Without Docker (Node 18+): `npm install && npm run build && npm start`.

## Configuration (environment variables)

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` / `HOST` | `8080` / `0.0.0.0` | Listen address inside the container. |
| `MAX_PAGES` | `2000` | Refuse games with more reachable states (pages) than this (HTTP 422). |
| `BUILD_TIMEOUT_MS` | `120000` | Kill a build that runs longer (HTTP 504). |
| `MAX_CONCURRENT_BUILDS` / `MAX_QUEUED_BUILDS` | `2` / `8` | Parallel builds, and how many may wait before HTTP 429. |
| `WORKER_MEMORY_MB` | `768` | Heap cap of each Storyteller worker process. |
| `MAX_BODY_MB` | `20` | Largest project accepted (images are embedded as data URIs). |
| `MAX_LEVELS` / `MAX_SPRITES` | `100` / `300` | Project size limits. |
| `ALLOW_CUSTOM_TEMPLATES` | `0` | `1` lets projects supply their own Pug template. See Security. |

## HTTP API

| Route | Description |
| --- | --- |
| `GET /` | The editor (single HTML page, served with a Content-Security-Policy). |
| `GET /healthz` | `{ ok, app, version, limits, customTemplates }`. Also used by the container healthcheck and by the editor to detect the server. |
| `POST /api/build` | Body: project JSON (`application/json`). Returns the `.epub` (`application/epub+zip`) with `X-Pages` and `X-Warnings` headers. Errors are `{ "error": "..." }`: 400 invalid project/JSON, 413 too large, 415 wrong content type, 422 over limits, 429 busy, 504 timeout. |
| `GET /vendor/jszip.min.js` | Local copy of JSZip so the editor works offline. |

`curl -s -X POST localhost:8080/api/build -H 'Content-Type: application/json' --data @game.json -o game.epub`
(`game.json` from the editor's *Save project JSON*).

## How a build runs

1. The project is validated and repaired by `normalizeProject()` (same code as import).
2. `estimatePages()` counts reachable states; over `MAX_PAGES` is rejected before any work starts.
3. The project is written to a fresh temp directory as a Storyteller project (`engine.js`, `game.json`, `templates/`).
4. `server/worker.js` runs Storyteller in a **separate process** with a heap cap and a timeout.
5. The `.epub` is returned and the temp directory is deleted.

## Security model

The server is meant for one user or a small trusted team. It has **no authentication**; compose binds it to
`127.0.0.1`. To share it, put a reverse proxy with authentication and TLS in front.

- **Pug templates run code.** A project's `template` is ignored by default and the built-in template is used. Enable
  `ALLOW_CUSTOM_TEMPLATES=1` only if everyone who can reach the server is trusted.
- **Level names** are escaped before they are placed in Pug text, so they cannot inject code even when custom templates are on.
  Tests cover both cases.
- Rules are interpreted by a small parser, never `eval`ed.
- XML-illegal control characters are stripped and the title/author are escaped for the ePUB metadata.
- The container runs as the unprivileged `node` user, with a read-only root filesystem, no Linux capabilities,
  `no-new-privileges`, memory and process limits, and a `tmpfs` for scratch space.
- Each build is a separate process with its own memory cap and timeout; a state explosion cannot take the server down.

## Limitations

- Builds are CPU-bound and take roughly a second per hundred pages, so keep `MAX_PAGES` and concurrency in line with the host.
- The Docker image has not been built in the environment used to develop this repository (no Docker daemon was available).
  The server and worker are tested directly with Node; run `docker compose up --build` once to confirm on your machine.
- The copy of the editor hosted on claude.ai has no build server; it detects that and offers the Storyteller project export only.
