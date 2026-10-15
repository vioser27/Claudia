# Claudia ✦ your one-shot internship assistant

Upload your CV, paste a job link, and Claudia (powered by Claude) does the rest in one go:

1. **Reads your CV** (PDF or text)
2. **Reads the job posting** and pulls out must-haves, keywords and interview type
3. **Researches the company live** with Claude's web search tool
4. **Tailors your CV** to the role, without inventing anything, and explains what she changed
5. **Builds your application kit**: fit score, skill radar, cold email, gap report and interview prep with answers built from *your* experience

Steps 4 and 5 run in parallel, and progress streams to the UI in real time.

## Application tracker

Every application Claudia prepares is saved to a live **tracker board** (Draft → Sent → Viewed CV → Replied → Interview).

- **Tracked CV link:** the cold email includes `/r/<id>`. A click is logged and redirects to a clean hosted CV at `/cv/<id>`, and the card moves to *Viewed CV* automatically. Link-preview bots (LinkedIn, Slack…) are ignored.
- **Open pixel (optional):** "Copy with open tracking" copies rich text with a 1×1 image from `/p/<id>`. Paste it into Gmail or Outlook. It's labelled *maybe opened* because mail apps preload or block images.
- **Live updates:** the board polls every few seconds; when a recruiter clicks, the card pulses and a toast pops up.
- **Follow-ups:** open any card and ask Claudia to draft a follow-up based on what's happened. Cards with no activity for 3 days get a *Follow up?* nudge.

Be upfront with users that their links are tracked, and keep it to their own outreach.

## Run it

```bash
npm install
cp .env.example .env.local
npm run dev                  # http://localhost:3000
```

## Choosing the AI (`LLM_PROVIDER` in `.env.local`)

| Mode | Needs | Notes |
| --- | --- | --- |
| `demo` | nothing | Plays back a pre-written run (fictional student + company). Upload any CV, any link. Great for rehearsing and as an offline backup. |
| `gemini` | free key from [Google AI Studio](https://aistudio.google.com/apikey) | Real AI on your CV. No live web search, so the company brief uses the model's own knowledge. Free-tier data may be used by Google, so test with a sample CV. |
| `anthropic` | `ANTHROPIC_API_KEY` | Claude with live web search. Use this for the hackathon itself. |

## Deploy

Push to GitHub, import into Vercel, and add `ANTHROPIC_API_KEY` as an environment variable. For the tracker, add an Upstash Redis / Vercel KV database (free tier) and set `KV_REST_API_URL` and `KV_REST_API_TOKEN`; Vercel's file system isn't persistent, so the local `.data/db.json` fallback only works on your machine. The API route sets `maxDuration = 300`; on Vercel's Hobby plan the limit may be lower, so check your plan if long runs get cut off.

## How it works

| File | What it does |
| --- | --- |
| `app/api/claudia/route.js` | The one-shot pipeline. Streams NDJSON events (`step`, `result`, `error`, `done`). |
| `lib/claude.js` | All Claude calls. Each output is a **forced tool call with a JSON schema**, so the UI always gets valid structured data. Research uses the server-side **web search tool** plus a `submit_brief` tool, handling `pause_turn`. |
| `lib/store.js` | Key-value storage: Upstash/Vercel KV over REST, or a local JSON file. Logs clicks and opens. |
| `app/r/[id]`, `app/p/[id]`, `app/cv/[id]` | Tracked link redirect, open pixel, and the hosted CV page recruiters see. |
| `app/api/apps/…` | List applications, change status, draft follow-ups. |
| `components/Tracker.jsx` | The live kanban board, drag-and-drop, and the detail drawer. |
| `lib/demo.js` | Pre-written run for demo mode. |
| `lib/extract.js` | PDF text extraction (`unpdf`) and job page fetching. |
| `app/page.jsx` | The UI: intake, live timeline, results tabs, score ring and radar chart (hand-built SVG). |
| `app/globals.css` | Styles, including a print stylesheet so "Download PDF" prints only the CV. |

## Demo tips

- **The tracker moment:** prepare an application, open the tracker, then open the tracked link on your phone. The card pulses into *Viewed CV* on the projector within a few seconds.

- LinkedIn and some job boards block scraping, so use the "paste the description" option for those.
- Do a dry run with your demo CV and job before you present. A full run takes about 1–2 minutes.
- Model and web search version can be changed in `.env.local` (`CLAUDE_MODEL`, `WEB_SEARCH_TOOL`).
