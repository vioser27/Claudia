"use client";

import { useEffect, useRef, useState } from "react";

const COLUMNS = [
  { id: "draft", label: "Draft", hint: "Ready to send" },
  { id: "sent", label: "Sent", hint: "Waiting for them" },
  { id: "viewed", label: "Viewed CV", hint: "They clicked your link" },
  { id: "replied", label: "Replied", hint: "You got an answer" },
  { id: "interview", label: "Interview", hint: "Go get it" },
];

const NUDGE_AFTER_DAYS = 3;
const POLL_MS = 4000;

export default function Tracker() {
  const [apps, setApps] = useState(null);
  const [selected, setSelected] = useState(null);
  const [pinged, setPinged] = useState({});
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const prev = useRef(null);
  const localMoves = useRef(new Set());

  /* ---------- live polling ---------- */
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/apps", { cache: "no-store" });
        const list = await res.json();
        if (!alive || !Array.isArray(list)) return;

        // Detect changes that happened elsewhere (a recruiter clicking the link) and celebrate them.
        if (prev.current) {
          const fresh = {};
          for (const a of list) {
            const old = prev.current[a.id];
            if (!old) continue;
            const newClick = a.clicks > old.clicks;
            const newOpen = a.opens > old.opens;
            const moved = a.status !== old.status && !localMoves.current.has(a.id);
            if (newClick || newOpen || moved) {
              fresh[a.id] = true;
              setToast(
                newClick
                  ? `👀 ${a.company} just opened your CV`
                  : newOpen
                    ? `✉️ ${a.company} may have opened your email`
                    : `${a.company} moved to ${a.status}`
              );
            }
          }
          if (Object.keys(fresh).length) {
            setPinged((p) => ({ ...p, ...fresh }));
            setTimeout(() => setPinged({}), 2600);
            setTimeout(() => setToast(null), 4000);
          }
        }
        localMoves.current.clear();
        prev.current = Object.fromEntries(list.map((a) => [a.id, a]));
        setApps(list);
        setSelected((s) => (s ? list.find((a) => a.id === s.id) || null : null));
      } catch (e) {
        console.error(e);
      }
    }

    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  /* ---------- moving cards ---------- */
  async function move(id, status) {
    localMoves.current.add(id);
    setApps((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
    const res = await fetch(`/api/apps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setApps((list) => list.map((a) => (a.id === id ? updated : a)));
      if (prev.current) prev.current[id] = updated;
    }
  }

  if (!apps) {
    return <div className="placeholder"><p>Loading your applications…</p></div>;
  }

  if (!apps.length) {
    return (
      <div className="placeholder">
        <p>No applications yet. Prepare one and it will appear here, ready to track.</p>
      </div>
    );
  }

  const sent = apps.filter((a) => a.status !== "draft").length;
  const viewed = apps.filter((a) => a.clicks > 0).length;
  const replied = apps.filter((a) => a.status === "replied" || a.status === "interview").length;

  return (
    <section className="tracker">
      <div className="tracker-head">
        <div>
          <h2>Your applications</h2>
          <p className="muted">
            <span className="live-dot" /> Live — updates as recruiters open your CV
          </p>
        </div>
        <div className="kpis">
          <Kpi n={apps.length} label="applications" />
          <Kpi n={sent} label="sent" />
          <Kpi n={sent ? `${Math.round((viewed / sent) * 100)}%` : "—"} label="CV view rate" />
          <Kpi n={replied} label="replies" />
        </div>
      </div>

      <div className="board">
        {COLUMNS.map((col) => {
          const cards = apps.filter((a) => a.status === col.id);
          return (
            <div
              key={col.id}
              className={`col ${dragOver === col.id ? "over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col.id);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) move(id, col.id);
              }}
            >
              <div className="col-head">
                <strong>{col.label}</strong>
                <span className="count">{cards.length}</span>
              </div>
              <small className="col-hint">{col.hint}</small>
              {cards.map((a) => (
                <Card
                  key={a.id}
                  app={a}
                  pinged={pinged[a.id]}
                  onOpen={() => setSelected(a)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {selected && <Detail app={selected} onClose={() => setSelected(null)} onMove={move} onUpdate={(u) => {
        setApps((list) => list.map((a) => (a.id === u.id ? u : a)));
        setSelected(u);
      }} />}

      {toast && <div className="toast">{toast}</div>}
    </section>
  );
}

function Kpi({ n, label }) {
  return (
    <div className="kpi">
      <strong>{n}</strong>
      <span>{label}</span>
    </div>
  );
}

function needsNudge(a) {
  if (a.status !== "sent" && a.status !== "viewed") return false;
  const since = a.lastEventAt || a.sentAt;
  if (!since) return false;
  return (Date.now() - new Date(since)) / 86400000 >= NUDGE_AFTER_DAYS;
}

function Card({ app, pinged, onOpen }) {
  return (
    <div
      className={`tcard ${pinged ? "ping" : ""}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", app.id)}
      onClick={onOpen}
    >
      <div className="tcard-top">
        <strong>{app.company}</strong>
        {app.fitScore != null && <span className="fit">{app.fitScore}</span>}
      </div>
      <span className="tcard-role">{app.role}</span>
      <div className="signals">
        {app.clicks > 0 && <span className="sig click">👀 {app.clicks} view{app.clicks > 1 ? "s" : ""}</span>}
        {app.opens > 0 && <span className="sig open">✉️ maybe opened</span>}
        {needsNudge(app) && <span className="sig nudge">Follow up?</span>}
      </div>
      {app.lastEventAt && <small className="ago">Last activity {ago(app.lastEventAt)}</small>}
    </div>
  );
}

function Detail({ app, onClose, onMove, onUpdate }) {
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const trackedUrl = `${origin}/r/${app.id}`;

  async function draft() {
    setDrafting(true);
    setError("");
    try {
      const res = await fetch(`/api/apps/${app.id}/follow-up`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't draft it");
      onUpdate(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setDrafting(false);
    }
  }

  function copy(text, which) {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(""), 1500);
  }

  const events = [...(app.events || [])].reverse();

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <p className="eyebrow">{app.role}</p>
        <h2>{app.company}</h2>

        <label className="field">
          <span>Status</span>
          <select value={app.status} onChange={(e) => onMove(app.id, e.target.value)}>
            {COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>

        <h4>Tracked CV link</h4>
        <div className="linkbox">
          <code>{trackedUrl.replace(/^https?:\/\//, "")}</code>
          <button className="ghost" onClick={() => copy(trackedUrl, "link")}>
            {copied === "link" ? "Copied ✓" : "Copy"}
          </button>
          <a className="ghost" href={`/cv/${app.id}`} target="_blank" rel="noreferrer">
            Preview
          </a>
        </div>
        <small className="fineprint">“Preview” doesn't count as a view. Clicking the tracked link does — try it in the demo.</small>

        <h4>Activity</h4>
        {events.length ? (
          <ol className="events">
            {events.map((e, i) => (
              <li key={i}>
                <span className={`edot ${e.type}`} />
                <div>
                  <strong>{e.type === "click" ? "Opened your CV" : "Maybe opened your email"}</strong>
                  <small>{new Date(e.at).toLocaleString()} · {ago(e.at)}</small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">No activity yet{app.sentAt ? ` — sent ${ago(app.sentAt)}` : ""}.</p>
        )}

        <h4>Follow-up</h4>
        {app.followUp ? (
          <div className="followup">
            <p className="fineprint">{app.followUp.timing_tip}</p>
            <div className="mail">
              <div className="mail-subject">{app.followUp.subject}</div>
              <div className="mail-body">{app.followUp.body}</div>
            </div>
            <div className="row">
              <button
                className="primary small"
                onClick={() => copy(`Subject: ${app.followUp.subject}\n\n${app.followUp.body}`, "fu")}
              >
                {copied === "fu" ? "Copied ✓" : "Copy follow-up"}
              </button>
              <button className="ghost" onClick={draft} disabled={drafting}>
                {drafting ? "Rewriting…" : "Redraft"}
              </button>
            </div>
          </div>
        ) : (
          <button className="primary small" onClick={draft} disabled={drafting}>
            {drafting ? "Claudia is writing…" : "Ask Claudia for a follow-up"}
          </button>
        )}
        {error && <div className="error">{error}</div>}
      </aside>
    </div>
  );
}

function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
