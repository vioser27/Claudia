import { extractCvText, fetchJobText } from "@/lib/extract";
import { analyseJob, researchCompany, tailorCv, buildKit, PROVIDER } from "@/lib/claude";
import { newId, saveApp, baseUrl } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel: allow the full pipeline to finish

/**
 * One-shot pipeline. Streams newline-delimited JSON events:
 *   { type: "step",   id, status: "active" | "done", detail? }
 *   { type: "result", key, data }
 *   { type: "error",  message }
 *   { type: "done" }
 */
export async function POST(req) {
  const form = await req.formData();
  const cvFile = form.get("cv");
  const jobUrl = (form.get("jobUrl") || "").toString().trim();
  const jobPaste = (form.get("jobText") || "").toString().trim();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      const step = (id, status, detail) => send({ type: "step", id, status, detail });

      try {
        if (!cvFile || typeof cvFile === "string") throw new Error("Please upload your CV.");
        if (!jobUrl && !jobPaste) throw new Error("Please add a job link or paste the description.");

        // 1. Read the CV
        step("cv", "active");
        const cvText = await extractCvText(cvFile);
        if (cvText.length < 100) throw new Error("I couldn't read much text from that CV. Is it a scanned image?");
        step("cv", "done", `${cvText.split(/\s+/).length} words read`);

        // 2. Read the job posting
        step("job", "active");
        let jobText = jobPaste;
        if (!jobText && PROVIDER !== "demo") jobText = await fetchJobText(jobUrl);
        const job = await analyseJob(jobText);
        send({ type: "result", key: "job", data: job });
        step("job", "done", `${job.role} · ${job.company}`);

        // 3. Research the company (live web search)
        step("research", "active");
        const brief = await researchCompany(job, (q) => step("research", "active", `Searching “${q}”`));
        send({ type: "result", key: "brief", data: brief });
        step("research", "done", `${(brief.recent_news || []).length} news items, ${brief.values.length} values`);

        // 4 + 5 in parallel: tailored CV and the application kit
        step("cv_write", "active");
        step("kit", "active");
        const [cv, kit] = await Promise.all([
          tailorCv(cvText, job, brief).then((cv) => {
            send({ type: "result", key: "cv", data: cv });
            step("cv_write", "done", `${cv.changes.length} improvements`);
            return cv;
          }),
          buildKit(cvText, job, brief),
        ]);

        // Save the application so it shows up in the tracker, with a tracked CV link.
        const id = newId();
        const trackedUrl = `${baseUrl(req)}/r/${id}`;
        kit.email.body = kit.email.body.includes("{{CV_LINK}}")
          ? kit.email.body.replaceAll("{{CV_LINK}}", trackedUrl)
          : `${kit.email.body.trim()}\n\nMy CV, tailored for this role: ${trackedUrl}`;

        await saveApp(
          {
            id,
            company: job.company,
            role: job.role,
            status: "draft",
            fitScore: kit.fit_score,
            createdAt: new Date().toISOString(),
            email: kit.email,
            cv,
            events: [],
          },
          { isNew: true }
        );

        send({ type: "result", key: "kit", data: kit });
        send({ type: "result", key: "app", data: { id, trackedUrl, pixelUrl: `${baseUrl(req)}/p/${id}` } });
        step("kit", "done", `Fit score ${kit.fit_score}/100`);

        send({ type: "done" });
      } catch (err) {
        console.error(err);
        send({ type: "error", message: err?.message || "Something went wrong." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
