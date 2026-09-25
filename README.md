# BrandMind — AI Brand Intelligence That Can Think

> **Hackathon Entry** — Theme: _Build a brand that can think._

BrandMind is a multi-stage autonomous AI brand strategy engine. Give it one rough sentence (e.g. _"An app that helps students find teammates"_) and it returns a complete, launch-ready brand kit — after interrogating assumptions, battling positioning directions, rejecting startup clichés, checking consistency, and generating visual identity including a clean SVG logo.

---

## Live Architecture Overview

```
User Input (one rough idea)
      │
      ▼
Stage 1: Understand & Interview     ← 3-5 adaptive founder questions specific to THIS idea
      │
      ▼
Stage 2: Positioning (Brand Battle) ← 3 radical directions × 3 specialized agent critiques
      │
      ▼
Stage 3: Personality & Principles   ← Traits justified against audience tension
      │
      ▼
Stage 4: Anti-Generic Engine        ← Rejects startup tropes, scores originality (0-100)
      │
      ▼
Stage 5: Naming & Messaging         ← Etymology, domains, voice rules (DO / DON'T examples)
      │
      ▼
Stage 6: Visual Direction & Logo    ← Hex palette tokens + sanitized SVG vector mark
      │
      ▼
Stage 7: Consistency Critic         ← Multi-dim audit, auto-applies before/after revisions
      │
      ▼
Stage 8: Launch Kit                 ← Hero copy, 5 social posts, checklist, 30-day roadmap
```

Every stage reads ALL earlier decisions. No stage starts from zero. Context is carried forward via a growing server-side brand profile JSON object stored in SQLite.

---

## What Makes It Different From a Single-Prompt Wrapper

| Feature | Single-Prompt Apps | BrandMind |
|---|---|---|
| Multi-stage memory | ✗ | ✓ Context passed forward |
| Critic role | ✗ | ✓ 3 agents (Strategist, Skeptic, Advocate) |
| Self-correction | ✗ | ✓ Anti-generic engine + consistency audit |
| Structured JSON outputs | ✗ | ✓ Schema-validated at every stage |
| Visual identity | ✗ | ✓ Hex palette + sanitized SVG logo |
| Human controls | ✗ | ✓ Edit, Regenerate, Lock, Audience Shift |
| Shareable kits | ✗ | ✓ `/kit/<id>` public read-only page |

---

## Project Structure

```
c:\aforapple\
├── server.py           # FastAPI backend: all 8 stage endpoints + kit sharing
├── llm_client.py       # Reliability chain: primary → retry → fallback → last-resort
├── prompts.py          # Strict schema prompts for all 8 stages
├── database.py         # SQLite session & kit persistence + seeded demo
├── models.config       # Pinned model configuration per stage (easy to edit)
├── src/
│   ├── main.jsx        # React SPA: landing page + 8-stage workspace
│   ├── config.js       # Frontend config (app name, stages, examples)
│   └── styles.css      # iOS-style design system (zero purple/orange)
├── dist/               # Built frontend (served by FastAPI)
├── .env                # API keys (NEVER committed)
├── .env.example        # Template with empty values
├── .gitignore          # Excludes .env, node_modules, __pycache__, .db
├── models.config       # Model pins per stage (edit here to change models)
├── test_integration.py # Full 8-stage E2E integration test
└── README.md           # This file
```

---

## Quick Start (Local)

### Prerequisites

- **Python 3.10+** with pip
- **Node.js 18+** with npm
- Groq API key: https://console.groq.com (free, no credit card)
- OpenRouter API key: https://openrouter.ai (free tier)

### 1. Clone & Setup

```bash
git clone <your-repo>
cd aforapple

# Copy env template and add your keys
cp .env.example .env
# Edit .env and add:
# GROQ_API_KEY=your_groq_key_here
# OPEN_ROUTER_API_KEY=your_openrouter_key_here
```

### 2. Install Dependencies

```bash
# Python dependencies (FastAPI, uvicorn, requests, python-dotenv, pydantic)
pip install fastapi uvicorn requests python-dotenv pydantic

# Frontend dependencies
npm install
```

### 3. Build Frontend

```bash
npm run build
```

### 4. Run (One Command)

```bash
python server.py
```

Open **http://localhost:8000** — the FastAPI backend serves both the API and the built React SPA.

---

## Environment Variables

| Variable | Required | Where to get |
|---|---|---|
| `GROQ_API_KEY` | Yes | https://console.groq.com — Free, no credit card |
| `OPEN_ROUTER_API_KEY` | Yes | https://openrouter.ai — Free tier, 50 req/day |

**Keys never leave the server.** They are loaded via `python-dotenv`, never logged, never sent to the browser.

---

## Model Configuration (`models.config`)

Each stage pins a primary and fallback model:

| Stage | Primary | Fallback |
|---|---|---|
| 1 Interview | Groq: `qwen/qwen3.8-27b` | OpenRouter: `openrouter/free` |
| 2 Brand Battle | Groq: `openai/gpt-oss-120b` | OpenRouter: `openrouter/free` |
| 3 Personality | Groq: `qwen/qwen3.8-27b` | OpenRouter: `openrouter/free` |
| 4 Anti-Generic | Groq: `qwen/qwen3.8-27b` | OpenRouter: `openrouter/free` |
| 5 Naming | Groq: `openai/gpt-oss-120b` | OpenRouter: `openrouter/free` |
| 6 Visuals | Groq: `qwen/qwen3.8-27b` | OpenRouter: `openrouter/free` |
| 7 Consistency | Groq: `openai/gpt-oss-120b` | OpenRouter: `openrouter/free` |
| 8 Launch Kit | Groq: `qwen/qwen3.8-27b` | OpenRouter: `openrouter/free` |

To change any model, edit `models.config` and restart the server. No code changes required.

**Reliability Chain per call:**
1. Primary model (attempt 1)
2. Primary model retry (attempt 2)
3. Fallback model on alternate provider (up to 2 attempts)
4. Last-resort `openrouter/free` router
5. Clear user-facing error with Retry button — session state preserved

---

## Free Deployment (Render.com)

### Option A: Render Web Service

1. Push to GitHub (`.env` is gitignored — add env vars in Render dashboard)
2. Create a new **Web Service** on https://render.com
3. Settings:
   - **Build Command:** `pip install fastapi uvicorn requests python-dotenv pydantic && npm install && npm run build`
   - **Start Command:** `python server.py`
   - **Environment Variables:** Add `GROQ_API_KEY` and `OPEN_ROUTER_API_KEY`
4. Deploy — free tier supports the traffic needed for demo purposes

### Option B: Railway

1. Connect GitHub repo to Railway
2. Set the same env vars via Railway's dashboard
3. Add `PORT` env var if needed (server auto-reads `$PORT`)

---

## Standout Features for Judges

### 1. "Under the Hood" Inspector Panel
Every API call is logged with provider, model ID, latency (ms), and the JSON payload passed forward — visible in the right sidebar during any sprint. Judges can click any stage and see exactly what data was handed from one stage to the next.

### 2. Brand Battle (Stage 2)
Three radically different positioning archetypes presented side-by-side. Three specialized AI agent roles (Strategist, Skeptic, Audience Advocate) critique all three with contrasting viewpoints. The user picks the winner.

### 3. Anti-Generic Engine (Stage 4)
Explicit before/after rejections showing what clichés were identified and why they fail. Calculates an originality score 0-100. Surfaces stronger concept pivots.

### 4. Consistency Critic (Stage 7)
Multi-dimensional scoring across Name Fit, Voice Harmony, Visual Alignment, Clarity. Automatically generates surgical before/after polishes of any misaligned copy and shows the reasoning.

### 5. Human Controls on Every Section
- **Lock** — prevents a section from being overwritten in downstream stages
- **Edit** — inline text editing, saved immediately to session
- **Regenerate** — re-runs that single stage, carries all prior context forward
- **Tone Adjustment** — open modal, provide tone direction, regenerate that stage

### 6. Audience Shifter
One button, one input: shift the entire value proposition for a different buyer archetype while protecting core product truth. Shows adapted pitch, adapted positioning, and preservation notes.

### 7. Shareable Brand Kit (`/kit/<id>`)
Any completed sprint can be published to a unique URL. The shared kit shows the full brand profile in read-only mode. Plus JSON and PDF export.

---

## Rate Limiting

To respect free tier quotas fairly:
- **12 full sprint starts per hour per IP** (configurable in `models.config`)
- **Friendly messages** if quota exceeded — never a blank screen
- Session state is preserved in SQLite so a rate-limit never loses work

---

## Security

- API keys: server-only, never sent to browser
- All user input sanitized and length-limited before reaching model
- All model SVG output sanitized: strips `<script>`, event handlers, `javascript:` URIs, `<foreignObject>`
- CORS configured restrictively for production deployment
- `.env` excluded from git via `.gitignore`

---

## Design System

iOS-inspired, premium dark-first:
- **Colors:** Deep navy (`#090D16`), Cyan (`#0EA5E9`), Teal (`#14B8A6`) — **strictly zero purple, zero orange**
- **Typography:** `-apple-system, SF Pro, Inter` system font stack
- **Navbar:** Frosted glass (`backdrop-filter: blur(24px)`) that intensifies on scroll — content visibly blurs behind it exactly like iOS
- **Cards:** Glassmorphic containers with soft micro-borders
- **Motion:** Subtle ambient orb animations (CSS only, no video), CSS spin/fade transitions

---

## Test Report

See `test_integration.py` for the full automated test suite covering:
- All 8 stages end-to-end for 2 different ideas
- Kit publishing and shared kit retrieval
- Audience Shifter
- Tone regeneration
- Provider fallback chain behavior

```bash
python test_integration.py
```

Expected output: `ALL INTEGRATION TESTS PASSED`
