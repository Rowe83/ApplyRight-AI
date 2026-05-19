# OSS Self-Hosted Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Supabase/billing, persist data under `data/`, support multi-provider BYOK AI, and ship as a local self-hosted open-source app.

**Architecture:** Server-only `lib/storage` writes JSON/PDF to `data/`; Next.js Route Handlers expose REST APIs; `lib/ai` registry calls OpenAI-compatible or Anthropic APIs from `.env` keys; React client uses `fetch` only.

**Tech Stack:** Next.js 16 App Router, TypeScript, pdfjs-dist (client extract), OpenAI SDK, native `fs/promises`, optional Anthropic via `fetch`

**Spec:** `docs/superpowers/specs/2026-05-19-oss-selfhosted-design.md`

---

## File map (create / modify / delete)

| Action | Path |
|--------|------|
| Create | `lib/storage/paths.ts`, `resumes.ts`, `job-descriptions.ts`, `history.ts`, `config.ts` |
| Create | `lib/ai/types.ts`, `registry.ts`, `optimize-prompt.ts`, `providers/*.ts` |
| Create | `lib/api-client.ts` (typed fetch helpers for browser) |
| Create | `app/api/resumes/route.ts`, `[id]/route.ts`, `[id]/file/route.ts` |
| Create | `app/api/job-descriptions/route.ts` |
| Create | `app/api/history/route.ts`, `[id]/route.ts` |
| Create | `app/api/settings/route.ts`, `health/route.ts` |
| Create | `app/(main)/dashboard/settings/page.tsx` |
| Create | `README.md`, `LICENSE`, update `.env.example` |
| Modify | `types/resume.ts`, `types/matching-history.ts` |
| Modify | `app/api/optimize/route.ts` |
| Modify | `components/upload-panel.tsx`, `dashboard-shell.tsx`, `dashboard-app-shell.tsx`, `dashboard-header.tsx`, `app-sidebar.tsx` |
| Modify | `app/(main)/dashboard/resumes/page.tsx`, `history/page.tsx`, `match-result/page.tsx` |
| Modify | `lib/fetch-matching-history.ts`, `lib/fetch-recent-job-descriptions.ts` |
| Modify | `components/match-result-actions.tsx`, `package.json`, `.gitignore` |
| Delete | `app/login/**`, `dashboard/billing/**`, `dashboard/templates/**`, `app/api/billing/**`, `app/api/resumes/clone-template/**` |
| Delete | `lib/supabase.ts`, `lib/supabase/client.ts`, billing/credits/stripe libs, billing UI components |
| Archive | `supabase/migrations/*` → `docs/archive/supabase/` |

---

### Task 1: Foundation — types, gitignore, data dir

**Files:**
- Modify: `types/resume.ts`, `types/matching-history.ts`
- Modify: `.gitignore`
- Create: `lib/storage/paths.ts`

- [ ] **Step 1: Update resume types**

In `types/resume.ts`, replace SaaS fields:

```typescript
export interface Resume {
  id: string
  original_filename: string
  raw_text: string | null
  parsed_name?: string | null
  target_job?: string | null
  last_match_score?: number | null
  last_match_at?: string | null
  created_at: string
  updated_at?: string | null
}
```

Remove `user_id`, `file_url`. Remove or slim `MatchWithJobDescription` / `ResumeWithDetails.matches` if only used for Supabase joins — `ResumeWithScore` can use `last_match_score` + `last_match_at` from meta.

- [ ] **Step 2: Update matching history type**

In `types/matching-history.ts`:

```typescript
export type MatchingHistoryRow = {
  id: string
  resume_id: string | null
  resume_title: string | null
  target_job: string | null
  jd_id?: string | null
  jd_text?: string | null
  score: number | null
  raw_text_snapshot: string | null
  optimized_text_snapshot: string | null
  analysis_json: MatchingHistoryAnalysisJson | null
  created_at: string
}
```

Remove `user_id`.

- [ ] **Step 3: Ignore data directory**

Add to `.gitignore`:

```
data/
```

- [ ] **Step 4: Create paths helper**

Create `lib/storage/paths.ts`:

```typescript
import "server-only"
import path from "path"
import { mkdir } from "fs/promises"

export const getDataDir = () => {
  const raw = process.env.DATA_DIR?.trim() || "./data"
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
}

export const ensureDataDirs = async () => {
  const root = getDataDir()
  await mkdir(path.join(root, "resumes"), { recursive: true })
  await mkdir(path.join(root, "job-descriptions"), { recursive: true })
  await mkdir(path.join(root, "history"), { recursive: true })
  return root
}

export const resumeDir = (id: string) => path.join(getDataDir(), "resumes", id)
export const resumeMetaPath = (id: string) => path.join(resumeDir(id), "meta.json")
export const resumePdfPath = (id: string) => path.join(resumeDir(id), "source.pdf")
export const jdPath = (id: string) => path.join(getDataDir(), "job-descriptions", `${id}.json`)
export const historyPath = (id: string) => path.join(getDataDir(), "history", `${id}.json`)
export const configPath = () => path.join(getDataDir(), "config.json")
```

- [ ] **Step 5: Verify**

Run: `pnpm exec tsc --noEmit`  
Expected: may fail on old `user_id` references — fixed in later tasks.

- [ ] **Step 6: Commit**

```bash
git add types/resume.ts types/matching-history.ts .gitignore lib/storage/paths.ts
git commit -m "refactor: add storage paths and update types for OSS model"
```

---

### Task 2: Storage — config and job descriptions

**Files:**
- Create: `lib/storage/config.ts`, `lib/storage/job-descriptions.ts`

- [ ] **Step 1: Config storage**

`lib/storage/config.ts` — types:

```typescript
export type AiProviderId = "openai" | "deepseek" | "anthropic" | "ollama"

export type AppConfig = {
  provider: AiProviderId
  model: string
}
```

Implement `readConfig(): Promise<AppConfig>`, `writeConfig(patch: Partial<AppConfig>): Promise<AppConfig>`.

Merge priority: file → `process.env.AI_PROVIDER` / `AI_MODEL` → defaults `{ provider: "deepseek", model: "deepseek-chat" }`.

Validate `provider` enum; reject unknown values.

- [ ] **Step 2: Job descriptions storage**

`lib/storage/job-descriptions.ts`:

- `listJobDescriptions(limit = 20)` — read all `*.json`, sort by `created_at` desc, slice
- `getJobDescription(id)` — read one or null
- `createJobDescription({ job_title, full_text })` — `crypto.randomUUID()`, write file

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -20`  
Expected: only unrelated errors until routes exist.

- [ ] **Step 4: Commit**

```bash
git add lib/storage/config.ts lib/storage/job-descriptions.ts
git commit -m "feat(storage): add config and job-description filesystem modules"
```

---

### Task 3: Storage — resumes and history

**Files:**
- Create: `lib/storage/resumes.ts`, `lib/storage/history.ts`

- [ ] **Step 1: Resumes storage**

`lib/storage/resumes.ts`:

- `listResumes()` — scan `data/resumes/*/meta.json`
- `getResume(id)` — read meta + check pdf exists flag `has_pdf: boolean`
- `createResume({ original_filename, raw_text, pdfBuffer?: Buffer })` — mkdir, write meta + optional `source.pdf`
- `updateResume(id, patch)` — merge meta, set `updated_at`
- `deleteResume(id)` — `rm` resume dir recursive
- `readResumePdf(id): Promise<Buffer | null>`

Use atomic write: write `meta.json.tmp` then `rename`.

- [ ] **Step 2: History storage**

`lib/storage/history.ts`:

- `listHistories(limit?)` — scan `history/*.json`, newest first
- `getHistory(id)`
- `appendHistory(row: MatchingHistoryRow)` — tmp + rename
- `deleteHistory(id)`

- [ ] **Step 3: Commit**

```bash
git add lib/storage/resumes.ts lib/storage/history.ts
git commit -m "feat(storage): add resume and history filesystem modules"
```

---

### Task 4: API — resumes

**Files:**
- Create: `app/api/resumes/route.ts`, `app/api/resumes/[id]/route.ts`, `app/api/resumes/[id]/file/route.ts`

- [ ] **Step 1: GET/POST `/api/resumes`**

`GET` → `listResumes()` JSON array.

`POST` `multipart/form-data`:
- Fields: `file` (PDF, max 10MB), `raw_text` (required string, client-extracted)
- Validate `file.type === "application/pdf"`
- `createResume({ original_filename: file.name, raw_text, pdfBuffer: Buffer.from(await file.arrayBuffer()) })`
- Return `{ id, ... }` 201

- [ ] **Step 2: `/api/resumes/[id]`**

`GET` → resume meta  
`PATCH` → `updateResume` (allow `target_job`, `parsed_name`, `raw_text`)  
`DELETE` → `deleteResume`

- [ ] **Step 3: `/api/resumes/[id]/file`**

`GET` → stream PDF with `Content-Type: application/pdf`, 404 if no file

- [ ] **Step 4: Manual verify**

Run dev server: `pnpm dev`  
```bash
curl -s http://localhost:3000/api/resumes | jq .
```
Expected: `[]`

- [ ] **Step 5: Commit**

```bash
git add app/api/resumes/
git commit -m "feat(api): add filesystem-backed resume routes"
```

---

### Task 5: API — job descriptions, history, settings

**Files:**
- Create: `app/api/job-descriptions/route.ts`
- Create: `app/api/history/route.ts`, `app/api/history/[id]/route.ts`
- Create: `app/api/settings/route.ts`, `app/api/settings/health/route.ts`

- [ ] **Step 1: Job descriptions route**

`GET ?limit=10` → list  
`POST { job_title?, full_text }` → create (derive title from first line of text if missing)

- [ ] **Step 2: History routes**

`GET /api/history?limit=50` → list  
`GET /api/history/[id]` → one  
`DELETE /api/history/[id]` → delete

- [ ] **Step 3: Settings routes**

`GET /api/settings` → `{ provider, model, providers: [{ id, label, configured: boolean }] }`  
`configured` = env key present for that provider (never return keys).

`PATCH { provider?, model? }` → `writeConfig`

`POST /api/settings/health` → run minimal AI ping (e.g. "reply OK") using current config; return `{ ok: true }` or 503 with message.

- [ ] **Step 4: Commit**

```bash
git add app/api/job-descriptions/ app/api/history/ app/api/settings/
git commit -m "feat(api): add JD, history, and settings routes"
```

---

### Task 6: AI registry and optimize route

**Files:**
- Create: `lib/ai/types.ts`, `lib/ai/optimize-prompt.ts`, `lib/ai/registry.ts`, `lib/ai/providers/openai-compat.ts`, `lib/ai/providers/anthropic.ts`
- Modify: `app/api/optimize/route.ts`
- Delete: `lib/openai.ts` (after migration)

- [ ] **Step 1: Extract prompt helpers**

Move from `app/api/optimize/route.ts` into `lib/ai/optimize-prompt.ts`:

- `OPTIMIZE_SYSTEM_PROMPT` (same string)
- `extractJson(text: string)`
- `normalizeResult(raw: unknown)` → `OptimizeAiResult` type in `lib/ai/types.ts`

- [ ] **Step 2: OpenAI-compatible provider**

`lib/ai/providers/openai-compat.ts` — factory `createOpenAiCompatClient({ apiKey, baseURL })` using `openai` package.

Used by `openai`, `deepseek`, `ollama` providers.

- [ ] **Step 3: Anthropic provider**

`lib/ai/providers/anthropic.ts` — `fetch("https://api.anthropic.com/v1/messages", ...)` with `ANTHROPIC_API_KEY`, map response text → same JSON parse path.

- [ ] **Step 4: Registry**

`lib/ai/registry.ts`:

```typescript
export const runOptimize = async (
  resumeText: string,
  jdText: string,
  focusSuggestions: string[],
): Promise<OptimizeAiResult> => {
  const config = await readConfig()
  // switch config.provider → call correct client
  // use config.model
}
```

`assertProviderConfigured(provider)` throws clear error if env missing.

- [ ] **Step 5: Rewrite optimize route**

`app/api/optimize/route.ts`:

Remove: all `@supabase/*`, `cookies`, `tryReserveOptimizeCredit`, `refundOptimizeCredit`, auth checks.

Flow:

1. Parse body `{ resumeId, jdId?, jdText?, focusSuggestions? }`
2. `getResume(resumeId)` — 404 if missing
3. Resolve JD via `getJobDescription(jdId)` or `createJobDescription` from `jdText`
4. `runOptimize(resumeText, jdText, focusSuggestions)`
5. `appendHistory({ ... })` with `buildAnalysisJson`
6. `updateResume(resumeId, { last_match_score, last_match_at })`
7. Return JSON (no `remaining_credits`)

- [ ] **Step 6: Verify build**

Run: `pnpm build`  
Expected: PASS (Supabase env not required).

- [ ] **Step 7: Commit**

```bash
git add lib/ai/ app/api/optimize/route.ts
git rm lib/openai.ts 2>/dev/null || true
git commit -m "feat(ai): multi-provider registry and creditless optimize API"
```

---

### Task 7: Client API helpers

**Files:**
- Create: `lib/api-client.ts`

- [ ] **Step 1: Implement typed fetch wrappers**

```typescript
export const api = {
  getResumes: () => fetch("/api/resumes").then(r => r.json()),
  uploadResume: (formData: FormData) => fetch("/api/resumes", { method: "POST", body: formData }),
  getResume: (id: string) => fetch(`/api/resumes/${id}`).then(r => r.json()),
  deleteResume: (id: string) => fetch(`/api/resumes/${id}`, { method: "DELETE" }),
  getRecentJds: (limit = 10) => fetch(`/api/job-descriptions?limit=${limit}`).then(r => r.json()),
  getHistories: (limit = 50) => fetch(`/api/history?limit=${limit}`).then(r => r.json()),
  getHistory: (id: string) => fetch(`/api/history/${id}`).then(r => r.json()),
  optimize: (body: object) => fetch("/api/optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  getSettings: () => fetch("/api/settings").then(r => r.json()),
  patchSettings: (body: object) => fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  healthCheck: () => fetch("/api/settings/health", { method: "POST" }).then(r => r.json()),
}
```

Add `assertOk(res: Response)` helper throwing on non-2xx with `error` from body.

- [ ] **Step 2: Commit**

```bash
git add lib/api-client.ts
git commit -m "feat: add browser API client helpers"
```

---

### Task 8: Frontend — shell, sidebar, remove auth

**Files:**
- Modify: `components/dashboard-app-shell.tsx`, `components/app-sidebar.tsx`, `components/dashboard-header.tsx`
- Delete: `components/credits-context.tsx` usage

- [ ] **Step 1: Remove auth gate**

`dashboard-app-shell.tsx`:

- Delete `supabase` import and `useEffect` session check
- Remove `authReady` state; render children immediately
- Remove `CreditsProvider` wrapper
- Update `resolvePageTitle`: remove templates/billing; add `/dashboard/settings` → `AI 设置`

- [ ] **Step 2: Update sidebar**

`app-sidebar.tsx`:

- Remove nav items: 简历库 (`/dashboard/templates`), 积分使用 (`/dashboard/billing`)
- Add: `{ title: "AI 设置", icon: Settings, href: "/dashboard/settings" }`
- Remove footer link to billing if any

- [ ] **Step 3: Simplify header**

`dashboard-header.tsx`:

- Remove credits badge, billing links, `useCredits`
- Keep page title + theme toggle only

- [ ] **Step 4: Commit**

```bash
git add components/dashboard-app-shell.tsx components/app-sidebar.tsx components/dashboard-header.tsx
git commit -m "refactor(ui): remove auth and credits from app shell"
```

---

### Task 9: Frontend — upload panel and workbench

**Files:**
- Modify: `components/upload-panel.tsx`, `components/dashboard-shell.tsx`
- Modify: `lib/fetch-recent-job-descriptions.ts`

- [ ] **Step 1: Upload via API**

`upload-panel.tsx`:

- Remove `supabase` import and credit checks (`credits`, `INSUFFICIENT_CREDITS`, `analyze-credits-hint` props if only for credits)
- On upload: `extractPdfTextFromFile` → `FormData` with `file` + `raw_text` → `api.uploadResume`
- On success: `onAnalyze({ resumeId, jdText })`

- [ ] **Step 2: Dashboard shell data loading**

`dashboard-shell.tsx`:

- Replace `supabase.from("resumes")` / `matching_histories` with `api.getResumes()` and optional preload resume via `api.getResume(id)`
- Remove session refresh logic
- Keep analyze flow calling `api.optimize`

- [ ] **Step 3: Recent JD fetcher**

`lib/fetch-recent-job-descriptions.ts` → call `GET /api/job-descriptions` instead of Supabase.

- [ ] **Step 4: Manual verify**

1. `pnpm dev`
2. Upload PDF on workbench → analyze runs
3. Check `data/resumes/` and `data/history/` populated

- [ ] **Step 5: Commit**

```bash
git add components/upload-panel.tsx components/dashboard-shell.tsx lib/fetch-recent-job-descriptions.ts
git commit -m "refactor(ui): workbench uses filesystem API for upload and data"
```

---

### Task 10: Frontend — resumes, history, match-result pages

**Files:**
- Modify: `app/(main)/dashboard/resumes/page.tsx`
- Modify: `app/(main)/dashboard/history/page.tsx`
- Modify: `app/(main)/dashboard/match-result/page.tsx`
- Modify: `lib/fetch-matching-history.ts`, `components/match-result-actions.tsx`

- [ ] **Step 1: Resumes page**

- List via `GET /api/resumes`
- Upload: same FormData pattern as upload-panel
- Delete: `DELETE /api/resumes/[id]`
- Remove `matches` join; show `last_match_score` from meta
- PDF preview link: `/api/resumes/${id}/file`

- [ ] **Step 2: History page**

- Use `api.getHistories()` / `getHistory(id)` for playback
- Remove tier badges or simplify to single badge (delete `history-tier-badge` usage if tier is always full)

- [ ] **Step 3: Match result page**

- Remove `supabase.auth.getUser`
- Load from sessionStorage as today; optional fetch history by `history_id` query param via API

- [ ] **Step 4: match-result-actions**

- Save-as-resume: `POST /api/resumes` with optimized text as new resume (or PATCH existing) — no Supabase insert

- [ ] **Step 5: fetch-matching-history**

Point to `/api/history` endpoints.

- [ ] **Step 6: Commit**

```bash
git add app/(main)/dashboard/resumes/ app/(main)/dashboard/history/ app/(main)/dashboard/match-result/ lib/fetch-matching-history.ts components/match-result-actions.tsx
git commit -m "refactor(ui): migrate resumes, history, and match-result to API"
```

---

### Task 11: Settings page

**Files:**
- Create: `app/(main)/dashboard/settings/page.tsx`

- [ ] **Step 1: Build settings UI**

Client page:

- On mount: `api.getSettings()`
- Show select for `provider` (4 options), input for `model`
- Info alert: API Key 请在 `.env` 配置，参见 README
- Save button → `api.patchSettings`
- Test connection → `api.healthCheck()` with toast

Use existing shadcn `Card`, `Select`, `Button`, `Alert`.

- [ ] **Step 2: Commit**

```bash
git add app/(main)/dashboard/settings/
git commit -m "feat(ui): add AI settings page for provider and model"
```

---

### Task 12: Delete dead code and dependencies

**Files:**
- Delete: login, billing, templates, supabase libs, billing components, scripts
- Modify: `package.json`

- [ ] **Step 1: Remove routes and components**

Delete directories/files per spec:

```
app/login/
app/(main)/dashboard/billing/
app/(main)/dashboard/templates/
app/api/billing/
app/api/resumes/clone-template/
lib/supabase.ts
lib/supabase/client.ts
lib/billing-*.ts
lib/stripe-server.ts
lib/optimize-credits.ts
lib/credits-events.ts
lib/site-url.ts (if unused)
components/billing-*.tsx
components/credits-*.tsx
components/analyze-credits-hint.tsx
components/history-tier-badge.tsx (optional)
components/history-legacy-banner.tsx (optional)
scripts/apply-credits-billing.mjs
scripts/apply-payment-orders.mjs
```

Move `supabase/migrations/` → `docs/archive/supabase/`

- [ ] **Step 2: Uninstall packages**

```bash
pnpm remove @supabase/supabase-js @supabase/auth-helpers-nextjs stripe pg
```

Remove npm scripts: `db:apply-credits-billing`, `db:apply-payment-orders` from `package.json`.

Set `"private": false`.

- [ ] **Step 3: Grep guard**

```bash
rg -l "@supabase|stripe|optimize-credits|billing-" --glob '*.{ts,tsx}' || echo "clean"
```

Expected: `clean` or only `docs/archive`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Supabase, billing, templates, and unused deps"
```

---

### Task 13: Open-source deliverables

**Files:**
- Create: `README.md`, `LICENSE`
- Modify: `.env.example`, `package.json` name optional

- [ ] **Step 1: LICENSE**

MIT License, copyright 2026 ApplyRight-AI contributors.

- [ ] **Step 2: .env.example**

Replace Supabase/Stripe block with spec env vars (see design spec § Environment).

- [ ] **Step 3: README.md**

Sections:

1. 简介（开源、自托管、BYOK）
2. 要求：Node 20+, pnpm
3. 快速开始：`cp .env.example .env.local` → fill keys → `pnpm install` → `pnpm dev`
4. AI 厂商配置表（4 providers + env vars）
5. `data/` 目录说明与备份
6. 安全提示（勿公网暴露）
7. 开发：`pnpm lint`, `pnpm build`
8. License MIT

- [ ] **Step 4: Commit**

```bash
git add README.md LICENSE .env.example
git commit -m "docs: add README, MIT license, and OSS env example"
```

---

### Task 14: Final verification

- [ ] **Step 1: Lint and build**

```bash
pnpm lint
pnpm build
```

Expected: exit 0

- [ ] **Step 2: Smoke test checklist**

- [ ] Upload PDF → optimize → match result visible
- [ ] History page lists new entry; open replay works
- [ ] Restart `pnpm dev` — resumes and history persist in `data/`
- [ ] Settings save provider/model; health check returns ok (with valid `.env`)
- [ ] `/dashboard/templates` and `/login` → 404
- [ ] No console errors about missing Supabase env

- [ ] **Step 3: Commit any fixes**

```bash
git commit -m "fix: address OSS migration smoke test findings"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Filesystem `data/` layout | 1, 2, 3 |
| Storage modules | 2, 3 |
| REST API routes | 4, 5 |
| Multi-provider AI | 6 |
| No credits on optimize | 6 |
| Frontend fetch migration | 7–11 |
| Remove billing/auth/templates | 8, 12 |
| Settings page | 11 |
| README/LICENSE/.env.example | 13 |
| Success criteria build/smoke | 14 |

## Self-review notes

- PDF text extraction stays **client-side** (`extractPdfTextFromFile`); POST sends `raw_text` + file — avoids server pdfjs worker setup.
- Anthropic uses `fetch` to avoid mandatory new dependency; OpenAI/DeepSeek/Ollama share compat client.
- No automated test suite in repo; Task 14 manual smoke replaces TDD.
- `lib/resume-templates.ts` / `lib/jd-templates.ts`: delete only if unused after template page removal; grep before delete.
