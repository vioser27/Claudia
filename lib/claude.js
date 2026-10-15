import Anthropic from "@anthropic-ai/sdk";
import * as demo from "./demo";

/**
 * Which AI backs Claudia:
 *   anthropic (default) — Claude, with live web search for company research
 *   gemini              — Google Gemini free tier via its OpenAI-compatible API (no web search: research uses model knowledge)
 *   demo                — no API at all; plays back a realistic pre-written run
 */
export const PROVIDER = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();

let _client;
const client = () => (_client ??= new Anthropic()); // reads ANTHROPIC_API_KEY; created lazily so other modes need no key
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const WEB_SEARCH = process.env.WEB_SEARCH_TOOL || "web_search_20250305";

const PERSONA = `You are Claudia, a warm, sharp personal career assistant for university students applying to internships.
You are honest: never invent experience, grades, employers or skills the student doesn't have. You can reframe, reorder and sharpen what is really there.
Write in British English unless the job posting is clearly American.`;

/* ---------- JSON schemas (used as forced tools so output is always structured) ---------- */

const jobSchema = {
  name: "submit_job",
  description: "Structured summary of the job posting.",
  input_schema: {
    type: "object",
    properties: {
      company: { type: "string" },
      role: { type: "string" },
      location: { type: "string" },
      interview_type: {
        type: "string",
        enum: ["technical", "behavioural", "case", "mixed"],
        description: "Most likely interview style for this role.",
      },
      must_haves: { type: "array", items: { type: "string" } },
      nice_to_haves: { type: "array", items: { type: "string" } },
      keywords: { type: "array", items: { type: "string" }, description: "ATS keywords to mirror." },
    },
    required: ["company", "role", "interview_type", "must_haves", "keywords"],
  },
};

const briefSchema = {
  name: "submit_brief",
  description: "Submit the finished company research brief.",
  input_schema: {
    type: "object",
    properties: {
      one_liner: { type: "string", description: "What the company does, one sentence." },
      values: { type: "array", items: { type: "string" }, description: "3-5 things they visibly value." },
      recent_news: {
        type: "array",
        items: {
          type: "object",
          properties: { headline: { type: "string" }, why_it_matters: { type: "string" } },
          required: ["headline", "why_it_matters"],
        },
      },
      interview_process: { type: "string", description: "What their intern interview process is known to look like." },
      talking_points: { type: "array", items: { type: "string" }, description: "Smart things to mention in an interview." },
    },
    required: ["one_liner", "values", "interview_process", "talking_points"],
  },
};

const cvSchema = {
  name: "submit_cv",
  description: "The tailored CV.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      headline: { type: "string", description: "Short headline tailored to the role." },
      contact: { type: "array", items: { type: "string" }, description: "Email, phone, city, links." },
      summary: { type: "string", description: "2-3 sentence profile aimed at this role." },
      skills: { type: "array", items: { type: "string" }, description: "Ordered by relevance to the job." },
      experience: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            org: { type: "string" },
            dates: { type: "string" },
            bullets: { type: "array", items: { type: "string" } },
          },
          required: ["title", "org", "bullets"],
        },
      },
      projects: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            tech: { type: "string" },
            bullets: { type: "array", items: { type: "string" } },
          },
          required: ["name", "bullets"],
        },
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            degree: { type: "string" },
            institution: { type: "string" },
            dates: { type: "string" },
            details: { type: "string" },
          },
          required: ["degree", "institution"],
        },
      },
      changes: {
        type: "array",
        items: { type: "string" },
        description: "What you changed versus the original CV and why (for the student).",
      },
    },
    required: ["name", "headline", "summary", "skills", "experience", "education", "changes"],
  },
};

const kitSchema = {
  name: "submit_kit",
  description: "The application kit.",
  input_schema: {
    type: "object",
    properties: {
      fit_score: { type: "integer", minimum: 0, maximum: 100 },
      verdict: { type: "string", description: "Claudia's one-line, encouraging but honest verdict." },
      skill_match: {
        type: "array",
        description: "5-6 axes for a radar chart, each scored 0-10 for this candidate against this job.",
        items: {
          type: "object",
          properties: { axis: { type: "string" }, score: { type: "number" } },
          required: ["axis", "score"],
        },
      },
      email: {
        type: "object",
        properties: {
          subject: { type: "string" },
          body: { type: "string" },
          who_to_send_to: { type: "string", description: "Which role/person to target and how to find them." },
        },
        required: ["subject", "body", "who_to_send_to"],
      },
      gaps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            gap: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high"] },
            fix: { type: "string", description: "Concrete action, ideally doable before the interview." },
          },
          required: ["gap", "severity", "fix"],
        },
      },
      interview: {
        type: "array",
        description: "6-8 likely questions.",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            type: { type: "string", enum: ["behavioural", "technical", "motivation", "case"] },
            why_they_ask: { type: "string" },
            answer_outline: { type: "string", description: "STAR-style outline using the student's real experience." },
          },
          required: ["question", "type", "why_they_ask", "answer_outline"],
        },
      },
    },
    required: ["fit_score", "verdict", "skill_match", "email", "gaps", "interview"],
  },
};

/* ---------- helpers ---------- */

async function forced(tool, prompt, maxTokens = 4000) {
  if (PROVIDER === "gemini") return forcedOpenAICompatible(tool, prompt, maxTokens);

  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: PERSONA,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content.find((b) => b.type === "tool_use");
  if (!block) throw new Error(`Claude didn't return ${tool.name}`);
  return block.input;
}

/* ---------- Gemini (OpenAI-compatible chat completions + function calling) ---------- */

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

async function forcedOpenAICompatible(tool, prompt, maxTokens) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing from .env.local");

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      max_tokens: Math.max(maxTokens, 4000),
      messages: [
        { role: "system", content: PERSONA },
        { role: "user", content: `${prompt}\n\nRespond by calling the ${tool.name} function.` },
      ],
      tools: [
        {
          type: "function",
          function: { name: tool.name, description: tool.description, parameters: tool.input_schema },
        },
      ],
      tool_choice: "required",
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || JSON.stringify(json).slice(0, 300);
    throw new Error(`Gemini ${res.status}: ${msg}`);
  }

  const choice = json.choices?.[0]?.message;
  const call = choice?.tool_calls?.find((c) => c.function?.name === tool.name) || choice?.tool_calls?.[0];
  if (call) return JSON.parse(call.function.arguments);

  // Some models answer with plain JSON text instead of a function call.
  const text = (choice?.content || "").replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Gemini didn't return ${tool.name}`);
  }
}

/* ---------- pipeline steps ---------- */

export function analyseJob(jobText) {
  if (PROVIDER === "demo") return demo.analyseJob();
  return forced(
    jobSchema,
    `Analyse this job posting.\n\n<job>\n${jobText}\n</job>`,
    1500
  );
}

/** Research with web search, then hand back a structured brief. */
export async function researchCompany(job, onSearch) {
  if (PROVIDER === "demo") return demo.researchCompany(onSearch);
  if (PROVIDER !== "anthropic") {
    // No live web search on this provider: build the brief from the model's own knowledge.
    onSearch?.("Using what I already know (live search is off)");
    return forced(
      briefSchema,
      `Write a research brief on ${job.company} for a student applying to the "${job.role}" internship:
what they do, what they value, notable recent developments you are confident about (say if unsure),
and what their intern/graduate interview process typically looks like.`,
      3000
    );
  }

  const messages = [
    {
      role: "user",
      content: `Research ${job.company} for a student applying to the "${job.role}" internship.
Find: what they do, what they value, 2-3 recent news items, and what their intern/graduate interview process looks like.
Use a few focused searches, then call submit_brief.`,
    },
  ];

  for (let i = 0; i < 6; i++) {
    const msg = await client().messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: PERSONA,
      tools: [{ type: WEB_SEARCH, name: "web_search", max_uses: 4 }, briefSchema],
      messages,
    });

    for (const b of msg.content) {
      if (b.type === "server_tool_use" && b.input?.query) onSearch?.(b.input.query);
    }

    const brief = msg.content.find((b) => b.type === "tool_use" && b.name === "submit_brief");
    if (brief) return brief.input;

    if (msg.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }

    // Finished in prose: structure what it wrote.
    const prose = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    return forced(briefSchema, `Turn this research into the brief:\n\n${prose}`, 2000);
  }
  throw new Error("Research took too long");
}

export function tailorCv(cvText, job, brief) {
  if (PROVIDER === "demo") return demo.tailorCv();
  return forced(
    cvSchema,
    `Rewrite this student's CV for the role below.
- Mirror these keywords where truthful: ${job.keywords.join(", ")}
- Reorder sections and bullets by relevance; strongest evidence first.
- Rewrite bullets as action + result, quantified only where the original supports it.
- Keep it to one page worth of content. Do NOT invent anything.

<role>${job.role} at ${job.company}. Must-haves: ${job.must_haves.join("; ")}</role>
<company_values>${(brief.values || []).join("; ")}</company_values>
<original_cv>
${cvText}
</original_cv>`,
    5000
  );
}

const followUpSchema = {
  name: "submit_follow_up",
  description: "A follow-up email.",
  input_schema: {
    type: "object",
    properties: {
      subject: { type: "string" },
      body: { type: "string" },
      timing_tip: { type: "string", description: "When to send it, one short sentence." },
    },
    required: ["subject", "body", "timing_tip"],
  },
};

/** Draft a short follow-up based on what has happened since the first email. */
export function draftFollowUp(app) {
  if (PROVIDER === "demo") return demo.draftFollowUp(app);
  const clicks = (app.events || []).filter((e) => e.type === "click");
  const days = app.sentAt ? Math.round((Date.now() - new Date(app.sentAt)) / 86400000) : null;
  const situation = [
    `Status: ${app.status}.`,
    days !== null ? `First email sent ${days} day(s) ago.` : "Send date unknown.",
    clicks.length
      ? `They have opened the CV link ${clicks.length} time(s), most recently ${clicks.at(-1).at}.`
      : "They have not opened the CV link yet.",
  ].join(" ");

  return forced(
    followUpSchema,
    `Write a follow-up to this cold email for the ${app.role} role at ${app.company}.
${situation}

Rules: under 90 words, reply-in-thread style (subject starts with "Re: "), add one new piece of value
(a relevant project detail or a thought about the company), polite, never mention that you can see they opened anything.
If the status is "replied" or "interview", write a short thank-you instead.

<original_email>
Subject: ${app.email?.subject}
${app.email?.body}
</original_email>`,
    1200
  );
}

export function buildKit(cvText, job, brief) {
  if (PROVIDER === "demo") return demo.buildKit();
  return forced(
    kitSchema,
    `Build the application kit for this student.

Cold email: under 150 words, specific to ${job.company} (reference one real detail from the brief), one clear ask, no grovelling.
Where you point them to the CV, write the exact placeholder {{CV_LINK}} on its own line (it becomes a link to a hosted copy of the tailored CV). Use it once.
Gaps: compare the CV with the must-haves honestly.
Interview: questions for a ${job.interview_type} interview at this company, with answer outlines that use the student's REAL experience from the CV.

<job>${JSON.stringify(job)}</job>
<brief>${JSON.stringify(brief)}</brief>
<cv>
${cvText}
</cv>`,
    6000
  );
}
