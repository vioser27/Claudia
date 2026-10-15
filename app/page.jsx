"use client";

import { useRef, useState } from "react";
import CvPaper from "@/components/CvPaper";
import Tracker from "@/components/Tracker";

const STEPS = [
  { id: "cv", label: "Reading your CV" },
  { id: "job", label: "Reading the job posting" },
  { id: "research", label: "Researching the company" },
  { id: "cv_write", label: "Tailoring your CV" },
  { id: "kit", label: "Writing your email & interview prep" },
];

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "cv", label: "Tailored CV" },
  { id: "email", label: "Cold email" },
  { id: "brief", label: "Company brief" },
  { id: "interview", label: "Interview prep" },
  { id: "gaps", label: "Gaps" },
];

export default function Home() {
  const [phase, setPhase] = useState("intake"); // intake | working | done | tracker
  const [lastPhase, setLastPhase] = useState("intake");

  function openTracker() {
    if (phase !== "tracker") setLastPhase(phase);
    setPhase("tracker");
  }
  const [steps, setSteps] = useState({});
  const [results, setResults] = useState({});
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  async function run(formData) {
    setPhase("working");
    setSteps({});
    setResults({});
    setError("");
    setTab("overview");

    try {
      const res = await fetch("/api/claudia", { method: "POST", body: formData });
      if (!res.body) throw new Error("No response from server");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === "step") {
            setSteps((s) => ({ ...s, [ev.id]: { status: ev.status, detail: ev.detail ?? s[ev.id]?.detail } }));
          } else if (ev.type === "result") {
            setResults((r) => ({ ...r, [ev.key]: ev.data }));
          } else if (ev.type === "error") {
            setError(ev.message);
          } else if (ev.type === "done") {
            setPhase("done");
          }
        }
      }
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main className="shell">
      <header className="top">
        <div className="brand">
          <Orb small busy={phase === "working"} />
          <span>Claudia</span>
        </div>
        <div className="row">
          {phase === "tracker" ? (
            lastPhase !== "intake" && (
              <button className="ghost" onClick={() => setPhase(lastPhase)}>
                ← Back to results
              </button>
            )
          ) : (
            <button className="ghost" onClick={openTracker}>
              Tracker
            </button>
          )}
          {phase !== "intake" && (
            <button className="ghost" onClick={() => setPhase("intake")}>
              New application
            </button>
          )}
        </div>
      </header>

      {phase === "intake" && <Intake onSubmit={run} />}

      {phase === "tracker" && <Tracker />}

      {(phase === "working" || phase === "done") && (
        <div className="workspace">
          <Timeline steps={steps} job={results.job} error={error} done={phase === "done"} />
          {results.kit || results.cv ? (
            <Results results={results} tab={tab} setTab={setTab} onOpenTracker={openTracker} />
          ) : (
            <div className="placeholder">
              <Orb busy={!error} />
              <p>{error ? "I hit a snag — see the left panel." : "Give me a minute, I'm on it."}</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Intake({ onSubmit }) {
  const [file, setFile] = useState(null);
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef(null);

  const ready = file && (jobUrl.trim() || jobText.trim());

  function submit(e) {
    e.preventDefault();
    if (!ready) return;
    const fd = new FormData();
    fd.append("cv", file);
    fd.append("jobUrl", jobUrl);
    fd.append("jobText", jobText);
    onSubmit(fd);
  }

  return (
    <section className="intake">
      <Orb />
      <h1>
        Hi, I'm Claudia.
        <br />
        <em>Let's land that internship.</em>
      </h1>
      <p className="lead">
        Give me your CV and the job you want. I'll research the company, rewrite your CV for it, draft your cold
        email and prep you for the interview — in one go.
      </p>

      <form onSubmit={submit} className="card">
        <div
          className={`drop ${drag ? "drag" : ""} ${file ? "has" : ""}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            ref={input}
            type="file"
            accept=".pdf,.txt,.md"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <span className="drop-icon">{file ? "✓" : "↑"}</span>
          <div>
            <strong>{file ? file.name : "Drop your CV here"}</strong>
            <small>{file ? "Click to change" : "PDF or text file"}</small>
          </div>
        </div>

        <label className="field">
          <span>Job posting link</span>
          <input
            type="url"
            placeholder="https://company.com/careers/software-intern"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
          />
        </label>

        {showPaste ? (
          <label className="field">
            <span>…or paste the job description</span>
            <textarea
              rows={6}
              placeholder="Paste the full posting here (best for LinkedIn and sites that need a login)"
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
            />
          </label>
        ) : (
          <button type="button" className="link" onClick={() => setShowPaste(true)}>
            Link needs a login? Paste the description instead
          </button>
        )}

        <button className="primary" disabled={!ready}>
          Prepare my application <span aria-hidden>→</span>
        </button>
      </form>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Timeline({ steps, job, error, done }) {
  return (
    <aside className="timeline">
      <p className="eyebrow">{done ? "All done" : error ? "Stopped" : "Working on it"}</p>
      {job && (
        <div className="job-chip">
          <strong>{job.role}</strong>
          <span>{job.company}{job.location ? ` · ${job.location}` : ""}</span>
        </div>
      )}
      <ol>
        {STEPS.map((s) => {
          const st = steps[s.id]?.status || "pending";
          return (
            <li key={s.id} className={st}>
              <span className="dot">{st === "done" ? "✓" : ""}</span>
              <div>
                <strong>{s.label}</strong>
                {steps[s.id]?.detail && <small key={steps[s.id].detail}>{steps[s.id].detail}</small>}
              </div>
            </li>
          );
        })}
      </ol>
      {error && <div className="error">{error}</div>}
    </aside>
  );
}

/* ------------------------------------------------------------------ */

function Results({ results, tab, setTab, onOpenTracker }) {
  const { cv, kit, brief, job, app } = results;
  const available = {
    overview: !!kit,
    cv: !!cv,
    email: !!kit,
    brief: !!brief,
    interview: !!kit,
    gaps: !!kit,
  };

  return (
    <section className="results">
      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "on" : ""}
            disabled={!available[t.id]}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="panel" key={tab}>
        {tab === "overview" && (kit ? <Overview kit={kit} job={job} /> : <Waiting />)}
        {tab === "cv" && (cv ? <CvView cv={cv} /> : <Waiting />)}
        {tab === "email" && kit && <EmailView email={kit.email} app={app} onOpenTracker={onOpenTracker} />}
        {tab === "brief" && brief && <BriefView brief={brief} />}
        {tab === "interview" && kit && <InterviewView items={kit.interview} type={job?.interview_type} />}
        {tab === "gaps" && kit && <GapsView gaps={kit.gaps} />}
      </div>
    </section>
  );
}

function Waiting() {
  return <p className="muted">Still writing this one…</p>;
}

function Overview({ kit, job }) {
  return (
    <div className="overview">
      <div className="verdict">
        <Orb small />
        <p>“{kit.verdict}”</p>
      </div>
      <div className="viz">
        <ScoreRing score={kit.fit_score} />
        <Radar data={kit.skill_match} />
      </div>
      <div className="stats">
        <Stat n={kit.interview.length} label="likely questions prepared" />
        <Stat n={kit.gaps.filter((g) => g.severity !== "low").length} label="gaps worth fixing" />
        <Stat n={job?.keywords?.length || 0} label="keywords targeted" />
      </div>
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div className="stat">
      <strong>{n}</strong>
      <span>{label}</span>
    </div>
  );
}

function ScoreRing({ score }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} className="ring-bg" />
        <circle
          cx="90"
          cy="90"
          r={r}
          className="ring-fg"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="ring-label">
        <strong>{score}</strong>
        <span>fit score</span>
      </div>
    </div>
  );
}

function Radar({ data }) {
  const pts = data.slice(0, 6);
  const n = pts.length;
  const cx = 150, cy = 140, R = 95;
  const at = (i, v) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v];
  };
  const poly = pts.map((p, i) => at(i, Math.max(0, Math.min(10, p.score)) / 10).join(",")).join(" ");

  return (
    <svg viewBox="0 0 300 280" className="radar">
      {[0.25, 0.5, 0.75, 1].map((lvl) => (
        <polygon key={lvl} className="grid" points={pts.map((_, i) => at(i, lvl).join(",")).join(" ")} />
      ))}
      {pts.map((_, i) => {
        const [x, y] = at(i, 1);
        return <line key={i} className="grid" x1={cx} y1={cy} x2={x} y2={y} />;
      })}
      <polygon className="shape" points={poly} />
      {pts.map((p, i) => {
        const [x, y] = at(i, 1.22);
        return (
          <text key={p.axis} x={x} y={y} textAnchor="middle" dominantBaseline="middle">
            {p.axis}
          </text>
        );
      })}
    </svg>
  );
}

function CvView({ cv }) {
  return (
    <div className="cv-wrap">
      <div className="toolbar">
        <p className="muted">Rewritten for this role — review it before sending.</p>
        <button className="primary small" onClick={() => window.print()}>
          Download PDF
        </button>
      </div>

      <CvPaper cv={cv} />

      <div className="changes">
        <h4>What I changed</h4>
        <ul>{cv.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </div>
    </div>
  );
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function EmailView({ email, app, onOpenTracker }) {
  const [copied, setCopied] = useState("");
  const [sent, setSent] = useState(false);
  const full = `Subject: ${email.subject}\n\n${email.body}`;

  function flash(which) {
    setCopied(which);
    setTimeout(() => setCopied(""), 1600);
  }

  async function copyPlain() {
    await navigator.clipboard.writeText(full);
    flash("plain");
  }

  /** Rich copy: clickable link + invisible open pixel. Paste into Gmail/Outlook compose. */
  async function copyRich() {
    let html = escapeHtml(email.body).replace(/\n/g, "<br>");
    if (app) {
      html = html.replaceAll(escapeHtml(app.trackedUrl), `<a href="${app.trackedUrl}">${app.trackedUrl}</a>`);
      html += `<img src="${app.pixelUrl}" width="1" height="1" alt="" style="display:block;border:0">`;
    }
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([email.body], { type: "text/plain" }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(email.body);
    }
    flash("rich");
  }

  async function markSent() {
    if (!app) return;
    await fetch(`/api/apps/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    setSent(true);
  }

  return (
    <div className="email">
      <div className="tip">
        <strong>Who to send it to</strong>
        <p>{email.who_to_send_to}</p>
      </div>
      <div className="mail">
        <div className="mail-subject">{email.subject}</div>
        <div className="mail-body">{email.body}</div>
      </div>

      {app && (
        <div className="tracked">
          <span className="live-dot" />
          <div>
            <strong>Your CV link is tracked</strong>
            <p>
              When they open <code>{app.trackedUrl.replace(/^https?:\/\//, "")}</code>, I'll move this application to
              “Viewed” on your tracker.
            </p>
          </div>
        </div>
      )}

      <div className="row wrap">
        <button className="primary small" onClick={copyPlain}>
          {copied === "plain" ? "Copied ✓" : "Copy email"}
        </button>
        {app && (
          <button className="ghost" onClick={copyRich} title="Rich text with a clickable link and an open-tracking pixel">
            {copied === "rich" ? "Copied ✓" : "Copy with open tracking"}
          </button>
        )}
        <a
          className="ghost"
          href={`mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`}
        >
          Open in mail app
        </a>
        {app && (
          <button className="ghost accent" onClick={sent ? onOpenTracker : markSent}>
            {sent ? "Sent ✓ — open tracker →" : "I've sent it"}
          </button>
        )}
      </div>
      <p className="fineprint">
        Opens are a rough signal: some mail apps load images automatically and others block them. Link clicks are the
        reliable one.
      </p>
    </div>
  );
}

function BriefView({ brief }) {
  return (
    <div className="brief">
      <p className="big">{brief.one_liner}</p>
      <div className="cols">
        <div>
          <h4>What they value</h4>
          <ul className="pills">{brief.values.map((v) => <li key={v}>{v}</li>)}</ul>
          <h4>Their interview process</h4>
          <p>{brief.interview_process}</p>
        </div>
        <div>
          {brief.recent_news?.length > 0 && (
            <>
              <h4>Recent news</h4>
              {brief.recent_news.map((n, i) => (
                <div key={i} className="news">
                  <strong>{n.headline}</strong>
                  <p>{n.why_it_matters}</p>
                </div>
              ))}
            </>
          )}
          <h4>Drop these into your interview</h4>
          <ul>{brief.talking_points.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

function InterviewView({ items, type }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="interview">
      {type && <p className="muted">Expect a mostly <strong>{type}</strong> interview.</p>}
      {items.map((q, i) => (
        <div key={i} className={`q ${open === i ? "open" : ""}`}>
          <button onClick={() => setOpen(open === i ? -1 : i)}>
            <span className={`tag ${q.type}`}>{q.type}</span>
            <span>{q.question}</span>
            <span className="chev">{open === i ? "−" : "+"}</span>
          </button>
          {open === i && (
            <div className="q-body">
              <p className="why">
                <strong>Why they ask:</strong> {q.why_they_ask}
              </p>
              <p className="outline">{q.answer_outline}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function GapsView({ gaps }) {
  const order = { high: 0, medium: 1, low: 2 };
  return (
    <div className="gaps">
      {[...gaps]
        .sort((a, b) => order[a.severity] - order[b.severity])
        .map((g, i) => (
          <div key={i} className={`gap ${g.severity}`}>
            <span className="sev">{g.severity}</span>
            <div>
              <strong>{g.gap}</strong>
              <p>{g.fix}</p>
            </div>
          </div>
        ))}
    </div>
  );
}

function Orb({ small, busy }) {
  return <span className={`orb ${small ? "small" : ""} ${busy ? "busy" : ""}`} aria-hidden />;
}
