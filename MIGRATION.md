# Guida alla migrazione — Next.js BFF → Node.js + React

## Contesto

L'applicazione attuale è un monorepo **Next.js** che funge da BFF (Backend for Frontend):
il server Next.js riceve le richieste del browser, chiama Jira con Basic Auth (email + API token)
e restituisce i dati già elaborati.

Il nuovo sistema separa le responsabilità in due repository distinti:

- **`backend`** — Express/Node.js: parla con Jira via OAuth 2.0, gestisce cache e sessioni
- **`frontend`** — React (Vite): consuma gli endpoint del backend, non parla mai direttamente con Jira

---

## Architettura di destinazione

```
Browser (React)
    │  fetch + credentials: 'include'
    ▼
Node.js backend  ──── OAuth 2.0 Bearer ────►  Atlassian / Jira Cloud
    │
    └── MemoryCache (o Redis)
```

---

## 1. Autenticazione — OAuth 2.0 (3-legged)

### 1.1 Creare l'app su Atlassian Developer Console

1. Vai su [developer.atlassian.com](https://developer.atlassian.com) → **My Apps** → **Create app**
2. Seleziona **OAuth 2.0 (3LO)**
3. Aggiungi i seguenti **Scopes**:

   | API | Scope |
   |-----|-------|
   | Jira platform REST API | `read:jira-work` |
   | Jira platform REST API | `read:jira-user` |
   | User identity API | `read:me` |

4. Imposta il **Callback URL**: `https://tuo-backend.com/auth/callback`
5. Copia **Client ID** e **Client Secret**

### 1.2 Flusso OAuth nel backend Node.js

```
1. Frontend apre  GET /auth/login
2. Backend fa redirect su accounts.atlassian.com con client_id, scope, redirect_uri
3. Utente si autentica su Atlassian
4. Atlassian fa redirect su GET /auth/callback?code=xxx
5. Backend scambia il code con access_token + refresh_token (chiamata server-to-server)
6. Backend salva i token in sessione (cookie HttpOnly firmato)
7. Backend reindirizza il browser sulla homepage del frontend
```

### 1.3 Endpoint di autenticazione da implementare

```
GET  /auth/login      → redirect verso Atlassian
GET  /auth/callback   → scambia code con token, imposta sessione
GET  /auth/me         → restituisce utente corrente { accountId, name, email, avatarUrl }
POST /auth/logout     → distrugge la sessione
```

Il refresh del token va gestito **automaticamente** nel middleware di sessione:
se `access_token` è scaduto e `refresh_token` è presente, rinnovarlo silenziosamente
prima di passare la richiesta al route handler.

---

## 2. Backend Node.js — struttura progetto

```
backend/
├── src/
│   ├── auth/
│   │   ├── atlassian.js      ← OAuth flow
│   │   └── middleware.js     ← verifica sessione + auto-refresh token
│   ├── jira/
│   │   ├── client.js         ← JiraClient (vedi sezione 3)
│   │   ├── config.js         ← lettura .env
│   │   └── cache.js          ← MemoryCache con globalThis
│   ├── routes/
│   │   ├── epics.js
│   │   ├── sprint.js
│   │   ├── releases.js
│   │   ├── psp.js
│   │   ├── timesheet.js
│   │   ├── group.js
│   │   ├── stories.js
│   │   ├── releaseIssues.js
│   │   ├── versionIssues.js
│   │   └── refresh.js
│   └── app.js
├── .env
└── package.json
```

---

## 3. JiraClient — adattamento per OAuth Bearer

Il client attuale usa Basic Auth. In Node.js va sostituito con Bearer token.
La logica di paginazione, i metodi e i tipi di risposta rimangono **identici**.

```js
// jira/client.js

class JiraClient {
  constructor(baseUrl, accessToken) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.accessToken = accessToken; // ← non più email:token in base64
  }

  async request(url, options = {}, extraHeaders = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`, // ← era Basic ${base64}
        ...extraHeaders,
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // metodi invariati rispetto al repo originale:
  // searchIssues(), getStoryStatsByEpic(), getAllProjects(),
  // getProjectVersions(), getIssueWorklogs(), getGroupMembers(),
  // getSprint(), getBoard(), getServiceDeskRequestTypeGroups(),
  // getServiceDeskRequestTypes(), parseSprint() (statico)
}
```

> **Come istanziare il client in ogni route:**
> Il `accessToken` viene letto dalla sessione dell'utente corrente,
> non da variabili d'ambiente.
>
> ```js
> const client = new JiraClient(process.env.JIRA_BASE_URL, req.session.accessToken);
> ```

---

## 4. Variabili d'ambiente backend

```env
# ─── OAuth Atlassian ──────────────────────────────────────────
ATLASSIAN_CLIENT_ID=...
ATLASSIAN_CLIENT_SECRET=...
ATLASSIAN_REDIRECT_URI=https://tuo-backend.com/auth/callback
ATLASSIAN_SCOPE=read:jira-work read:jira-user read:me

# ─── Sessione ─────────────────────────────────────────────────
SESSION_SECRET=stringa-random-lunga-almeno-32-char

# ─── CORS ─────────────────────────────────────────────────────
FRONTEND_URL=https://tuo-frontend.com

# ─── Jira (invariate) ─────────────────────────────────────────
JIRA_BASE_URL=https://tuo-dominio.atlassian.net
JIRA_CACHE_TTL=86400

# ─── Configurazione istanza Jira (da adattare all'ambiente) ───
JIRA_SERVICE_DESK_ID=30
JIRA_PSP_PROJECT=SA
JIRA_EPIC_LABEL=P0

# ─── Custom field ID (verificare con GET /rest/api/3/field) ───
# Gli ID dei campi custom differiscono tra istanze Jira.
# Per trovarli: GET https://<dominio>.atlassian.net/rest/api/3/field
# e cercare per nome (es. "Start date", "Story Points", "Sprint", "Time to first response")
JIRA_FIELD_START_DATE=customfield_10015
JIRA_FIELD_STORY_POINTS=customfield_10016
JIRA_FIELD_SPRINT=customfield_10020
JIRA_FIELD_SLA=customfield_10060
```

---

## 5. Endpoint da esporre — contratto API completo

Tutti gli endpoint sotto `/api/*` richiedono sessione attiva.
Il middleware deve restituire `401` se la sessione manca o il token non è rinnovabile.

### `GET /api/epics`
Epic con label configurata (`JIRA_EPIC_LABEL`), raggruppate per board.
Include statistiche storie e release collegate per ogni epic.

**Response:**
```json
{
  "boards": [
    {
      "key": "PROJ",
      "name": "PROJ",
      "epics": [
        {
          "key": "PROJ-1",
          "boardKey": "PROJ",
          "summary": "Titolo epic",
          "startDate": "2025-01-01",
          "dueDate": "2025-06-30",
          "status": "In Progress",
          "statusCategory": "in-progress",
          "assignee": { "displayName": "Mario Rossi", "avatarUrl": "https://..." },
          "storyPoints": 42,
          "url": "https://....atlassian.net/browse/PROJ-1",
          "storyStats": { "done": 5, "inProgress": 3, "todo": 2, "total": 10 },
          "releases": [
            { "id": "123", "name": "v1.2", "releaseDate": "2025-06-01", "released": false, "overdue": false }
          ]
        }
      ]
    }
  ],
  "fetchedAt": "2025-05-13T10:00:00.000Z",
  "cacheHit": false
}
```

---

### `GET /api/sprint`
Tutti gli sprint attivi con le issue associate, raggruppati per board.

**Response:**
```json
{
  "sprints": [
    {
      "id": 456,
      "name": "Sprint 12",
      "startDate": "2025-05-01",
      "endDate": "2025-05-14",
      "boardId": 7,
      "boardName": "Team Alpha",
      "goal": "...",
      "state": "active"
    }
  ],
  "issuesBySprint": {
    "456": [
      {
        "key": "PROJ-42",
        "summary": "Fix login bug",
        "status": "In Progress",
        "statusCategory": "in-progress",
        "issueType": "Bug",
        "fixVersions": [{ "id": "1", "name": "v1.2", "released": false, "releaseDate": "2025-06-01" }],
        "reporter": { "accountId": "abc123", "displayName": "Luigi Bianchi" },
        "sprintId": 456,
        "url": "https://....atlassian.net/browse/PROJ-42"
      }
    ]
  },
  "fetchedAt": "2025-05-13T10:00:00.000Z",
  "cacheHit": false
}
```

---

### `GET /api/releases`
Tutte le release dei progetti Jira (dal 2025-01-01 in poi, non archiviate).

**Response:**
```json
{
  "projects": [
    {
      "projectKey": "PROJ",
      "projectName": "Progetto Alpha",
      "releases": [
        {
          "id": "123",
          "name": "v1.2",
          "description": "",
          "startDate": "2025-05-01",
          "releaseDate": "2025-06-01",
          "released": false,
          "archived": false,
          "overdue": false,
          "projectKey": "PROJ",
          "projectName": "Progetto Alpha"
        }
      ]
    }
  ],
  "fetchedAt": "2025-05-13T10:00:00.000Z",
  "cacheHit": false
}
```

---

### `GET /api/psp`
Issue del progetto service desk (`JIRA_PSP_PROJECT`) con dati SLA e request type groups.

**Response:**
```json
{
  "issues": [
    {
      "key": "SA-123",
      "summary": "Problema con accesso",
      "status": "Aperto",
      "statusCategory": "todo",
      "issueType": "Service Request",
      "requestType": "Richiesta accesso",
      "priority": "High",
      "assignee": { "displayName": "Mario Rossi", "avatarUrl": "https://..." },
      "reporter": { "displayName": "Utente X", "avatarUrl": "https://..." },
      "created": "2025-05-01T09:00:00.000Z",
      "resolutionDate": null,
      "sla": {
        "breachTime": "2025-05-02T09:00:00.000Z",
        "breached": false,
        "paused": false,
        "remainingMs": 3600000,
        "remainingFriendly": "1h",
        "goalFriendly": "8h"
      },
      "url": "https://....atlassian.net/browse/SA-123"
    }
  ],
  "groups": [
    {
      "id": "10",
      "name": "Richieste accesso",
      "requestTypes": [{ "id": "1", "name": "Richiesta accesso", "groupId": "10" }]
    }
  ],
  "fetchedAt": "2025-05-13T10:00:00.000Z",
  "cacheHit": false
}
```

---

### `GET /api/timesheet?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
Worklog aggregati per utente e progetto nell'intervallo di date.

**Query params:**
- `startDate` — data inizio (formato `YYYY-MM-DD`) **obbligatorio**
- `endDate` — data fine (formato `YYYY-MM-DD`) **obbligatorio**

**Response:**
```json
{
  "users": [
    {
      "accountId": "abc123",
      "displayName": "Mario Rossi",
      "avatarUrl": "https://...",
      "totalSeconds": 28800,
      "byProject": {
        "PROJ": {
          "projectName": "Progetto Alpha",
          "seconds": 14400,
          "entries": [
            {
              "issueKey": "PROJ-42",
              "issueSummary": "Fix login bug",
              "projectKey": "PROJ",
              "timeSpentSeconds": 3600,
              "started": "2025-05-13T09:00:00.000Z"
            }
          ]
        }
      }
    }
  ],
  "totalSeconds": 28800,
  "fetchedAt": "2025-05-13T10:00:00.000Z"
}
```

---

### `GET /api/group?groupname=nome-gruppo`
Lista degli `accountId` degli utenti attivi in un gruppo Jira.

**Query params:**
- `groupname` — nome esatto del gruppo Jira **obbligatorio**

**Response:**
```json
["abc123", "def456", "ghi789"]
```

---

### `GET /api/stories?epicKey=PROJ-1`
Storie figlie di un epic.

**Query params:**
- `epicKey` — chiave dell'epic (es. `PROJ-1`) **obbligatorio**

**Response:**
```json
{
  "stories": [
    {
      "key": "PROJ-5",
      "epicKey": "PROJ-1",
      "summary": "Implementare login",
      "status": "Done",
      "statusCategory": "done",
      "assignee": { "displayName": "Luigi Bianchi", "avatarUrl": "https://..." },
      "fixVersions": [{ "id": "123", "name": "v1.2", "releaseDate": "2025-06-01", "released": false }]
    }
  ],
  "fetchedAt": "2025-05-13T10:00:00.000Z",
  "cacheHit": false
}
```

---

### `GET /api/release-issues?projectKey=PROJ`
Conteggio issue per fixVersion in un progetto, raggruppato per status category.

**Query params:**
- `projectKey` — chiave del progetto Jira **obbligatorio**

**Response:**
```json
{
  "stats": {
    "123": {
      "todo": 3,
      "inProgress": 2,
      "done": 10,
      "total": 15,
      "components": ["Frontend", "Backend"],
      "description": "Release di Maggio"
    }
  },
  "fetchedAt": "2025-05-13T10:00:00.000Z",
  "cacheHit": false
}
```

---

### `GET /api/version-issues?versionId=123`
Issue appartenenti a una specifica release/fixVersion.

**Query params:**
- `versionId` — ID numerico della versione Jira **obbligatorio**

**Response:** stessa struttura di `/api/stories` (array `stories` + `fetchedAt` + `cacheHit`)

---

### `POST /api/refresh`
Svuota la cache server-side per tutti gli endpoint. Da chiamare dopo modifiche manuali su Jira.

**Response:**
```json
{ "success": true, "message": "Cache cleared" }
```

---

## 6. Cache — comportamento atteso

| Endpoint | TTL | Note |
|----------|-----|------|
| `/api/epics` | `JIRA_CACHE_TTL` | chiave: `epics:global-{label}` |
| `/api/sprint` | `JIRA_CACHE_TTL` | chiave: `sprint-dashboard` |
| `/api/releases` | `JIRA_CACHE_TTL` | chiave: `releases:all-projects` |
| `/api/psp` | `JIRA_CACHE_TTL` | chiave: `psp:sa-all-v4` |
| `/api/timesheet` | `JIRA_CACHE_TTL` | chiave: `timesheet:{start}:{end}` |
| `/api/group` | `JIRA_CACHE_TTL` | chiave: `group:{groupname}` |
| `/api/release-issues` | `JIRA_CACHE_TTL` | chiave: `release-issues:{projectKey}` |
| `/api/stories` | 60s | chiave: `stories:{epicKey}` |
| `/api/version-issues` | 60s | chiave: `version-issues:{versionId}` |

`POST /api/refresh` deve svuotare **tutte** le cache sopra elencate.

La cache in-memory va ancorata a `globalThis` per sopravvivere ai riavvii a caldo in sviluppo.
In produzione con più istanze Node, sostituire con **Redis** (`ioredis` o `@upstash/redis`).

---

## 7. CORS e sessione

```js
// app.js (Express)
import cors from 'cors';
import session from 'express-session';

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,           // ← obbligatorio per i cookie di sessione
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,            // il token non è mai visibile al JS del browser
    secure: true,              // solo HTTPS in produzione
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000 // 8 ore
  },
}));
```

---

## 8. Frontend React — modifiche necessarie

### 8.1 Variabile d'ambiente

```env
# .env
VITE_API_URL=https://tuo-backend.com
```

### 8.2 Fetch helper

Creare un wrapper centralizzato per non ripetere `credentials: 'include'` ovunque:

```ts
// src/lib/api.ts
const BASE = import.meta.env.VITE_API_URL;

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',  // ← invia sempre il cookie di sessione
  });

  if (res.status === 401) {
    // sessione scaduta → redirect al login
    window.location.href = `${BASE}/auth/login`;
    return Promise.reject(new Error('Unauthorized'));
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? res.statusText);
  }

  return res.json();
}
```

### 8.3 Aggiornare i hook

Sostituire ogni occorrenza di `fetch('/api/jira/...')` con `apiFetch('/api/...')`:

```ts
// prima
const response = await fetch('/api/jira/epics');

// dopo
const data = await apiFetch<EpicsApiResponse>('/api/epics');
```

I tipi TypeScript (`EpicsApiResponse`, `SprintDashboardData`, ecc.) sono invariati —
copiali da `src/types/index.ts` del repo originale.

---

## 9. Checklist di migrazione

### Backend
- [ ] Creare app OAuth su developer.atlassian.com con gli scope corretti
- [ ] Implementare `/auth/login`, `/auth/callback`, `/auth/me`, `/auth/logout`
- [ ] Implementare middleware di sessione con auto-refresh del token
- [ ] Portare `JiraClient` da Basic Auth a Bearer token
- [ ] Portare `MemoryCache` e i singleton `globalThis`
- [ ] Implementare tutti i 10 route handler (`/api/*`)
- [ ] Verificare che `POST /api/refresh` svuoti tutte le 9 cache
- [ ] Configurare CORS con `credentials: true`
- [ ] Verificare i custom field ID (`JIRA_FIELD_*`) sulla nuova istanza Jira
- [ ] Verificare `JIRA_SERVICE_DESK_ID` sulla nuova istanza

### Frontend
- [ ] Aggiungere `VITE_API_URL` a `.env`
- [ ] Creare `apiFetch` wrapper con `credentials: 'include'`
- [ ] Aggiornare tutti i hook (sostituire path `/api/jira/*` → `/api/*`)
- [ ] Gestire redirect a `/auth/login` su risposta 401
- [ ] Copiare i tipi TypeScript da `src/types/index.ts`

### Verifica custom field ID sulla nuova istanza
Eseguire questa chiamata autenticata e cercare i campi per nome:
```
GET https://<dominio>.atlassian.net/rest/api/3/field
```
Cercare: `Start date`, `Story Points`, `Sprint`, `Time to first response`
e aggiornare le variabili `JIRA_FIELD_*` di conseguenza.

---

## 10. Note aggiuntive

**Service Desk ID** — l'ID `30` è specifico dell'istanza attuale. Sul nuovo ambiente:
1. Andare su Jira → Service Desk del progetto → Project Settings → Details
2. L'ID è visibile nell'URL: `.../servicedesk/{ID}/...`
3. Aggiornare `JIRA_SERVICE_DESK_ID` nell'`.env`

**Paginazione** — il client usa `nextPageToken` (cursor-based) per `/rest/api/3/search/jql`
e `startAt` (offset-based) per projects e group members. Entrambi già gestiti nei metodi
del `JiraClient` — non modificare la logica di paginazione.

**Sprint format** — il campo `customfield_10020` può essere restituito da Jira come array
di oggetti JSON oppure come array di stringhe nel formato legacy
`id=123,rapidViewId=456,...`. Il metodo `JiraClient.parseSprint()` gestisce entrambi
i formati: non toccarlo.
