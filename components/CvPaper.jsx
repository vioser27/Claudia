/** The CV document. No hooks, so it renders on the server (hosted page) and the client (results tab). */
export default function CvPaper({ cv }) {
  return (
    <article className="cv-paper">
      <header>
        <h2>{cv.name}</h2>
        <p className="cv-headline">{cv.headline}</p>
        {cv.contact?.length > 0 && <p className="cv-contact">{cv.contact.join("  ·  ")}</p>}
      </header>
      <section>
        <h3>Profile</h3>
        <p>{cv.summary}</p>
      </section>
      {cv.experience?.length > 0 && (
        <section>
          <h3>Experience</h3>
          {cv.experience.map((x, i) => (
            <div key={i} className="cv-item">
              <div className="cv-row">
                <strong>{x.title}</strong> — {x.org}
                <span>{x.dates}</span>
              </div>
              <ul>{x.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
            </div>
          ))}
        </section>
      )}
      {cv.projects?.length > 0 && (
        <section>
          <h3>Projects</h3>
          {cv.projects.map((p, i) => (
            <div key={i} className="cv-item">
              <div className="cv-row">
                <strong>{p.name}</strong>
                <span>{p.tech}</span>
              </div>
              <ul>{p.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
            </div>
          ))}
        </section>
      )}
      {cv.education?.length > 0 && (
        <section>
          <h3>Education</h3>
          {cv.education.map((e, i) => (
            <div key={i} className="cv-item">
              <div className="cv-row">
                <strong>{e.degree}</strong> — {e.institution}
                <span>{e.dates}</span>
              </div>
              {e.details && <p>{e.details}</p>}
            </div>
          ))}
        </section>
      )}
      {cv.skills?.length > 0 && (
        <section>
          <h3>Skills</h3>
          <p>{cv.skills.join(" · ")}</p>
        </section>
      )}
    </article>
  );
}
