/**
 * Demo mode (LLM_PROVIDER=demo): a realistic, pre-written run with no API calls.
 * Use it to build and rehearse without credits, or as an offline backup on stage.
 * Company and student are fictional.
 */

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function analyseJob() {
  await wait(1400);
  return {
    company: "Northwind Labs",
    role: "Software Engineering Intern (Summer 2027)",
    location: "London (hybrid)",
    interview_type: "mixed",
    must_haves: [
      "Studying Computer Science or a related degree",
      "Solid programming in Python or JavaScript",
      "Understanding of data structures and algorithms",
      "Clear written and verbal communication",
    ],
    nice_to_haves: ["Experience with React", "Cloud platforms (AWS/GCP)", "Contributions to team or open-source projects"],
    keywords: ["Python", "JavaScript", "React", "APIs", "data structures", "teamwork", "testing", "cloud"],
  };
}

export async function researchCompany(onSearch) {
  const queries = ["Northwind Labs company values", "Northwind Labs news 2026", "Northwind Labs internship interview process"];
  for (const q of queries) {
    onSearch?.(q);
    await wait(1200);
  }
  return {
    one_liner: "Northwind Labs builds logistics software that helps small retailers manage stock and deliveries in real time.",
    values: ["Ship small, ship often", "Customer obsession", "Learning in public", "Kind, direct feedback"],
    recent_news: [
      {
        headline: "Launched a same-day delivery planner for independent shops",
        why_it_matters: "Shows they're growing their product team — a great thing to ask about in the interview.",
      },
      {
        headline: "Opened a new engineering hub in Manchester",
        why_it_matters: "They're hiring heavily, so intern-to-graduate conversion is likely.",
      },
    ],
    interview_process:
      "A 30-minute recruiter call, then a 60-minute technical interview (one practical coding problem in your chosen language), then a final round mixing behavioural questions with a short system-design chat.",
    talking_points: [
      "Mention their delivery planner and ask how interns contribute to new launches.",
      "Connect your group project to their 'ship small, ship often' value.",
      "Ask what good feedback looks like on their team.",
    ],
  };
}

export async function tailorCv() {
  await wait(2600);
  return {
    name: "Sam Rivera",
    headline: "Computer Science student · Python & React developer",
    contact: ["sam.rivera@example.com", "London", "github.com/samrivera-demo"],
    summary:
      "Second-year Computer Science student who enjoys turning messy real-world problems into simple tools. Built and shipped a React + Python stock tracker used by a local shop, and led testing on a 5-person group project. Looking to bring that bias for shipping to Northwind Labs.",
    skills: ["Python", "JavaScript", "React", "REST APIs", "SQL", "Git", "Unit testing (pytest)", "Data structures & algorithms", "AWS (basics)"],
    experience: [
      {
        title: "Volunteer Developer",
        org: "Corner Shop Co-op",
        dates: "Jan 2026 – Present",
        bullets: [
          "Built a React + Flask stock tracker that replaced a paper ledger, cutting weekly stock-check time from 3 hours to 40 minutes.",
          "Designed a REST API and SQLite schema for 1,200+ products; wrote pytest tests covering the core endpoints.",
          "Shipped weekly small releases based on staff feedback.",
        ],
      },
      {
        title: "Student Ambassador",
        org: "University Open Days",
        dates: "Sep 2025 – Present",
        bullets: ["Explained the CS course to 300+ prospective students and parents, adapting technical detail to each audience."],
      },
    ],
    projects: [
      {
        name: "Route Planner (group project)",
        tech: "Python, React, Google Maps API",
        bullets: [
          "Led testing for a 5-person team building a delivery route optimiser; set up CI so every pull request ran the test suite.",
          "Implemented a Dijkstra-based shortest-path module and benchmarked it against a greedy baseline.",
        ],
      },
    ],
    education: [
      {
        degree: "BSc Computer Science",
        institution: "University of Example",
        dates: "2024 – 2027",
        details: "Predicted First. Modules: Algorithms, Software Engineering, Databases, Cloud Computing.",
      },
    ],
    changes: [
      "Moved the stock-tracker work to the top: it's the closest match to Northwind's logistics product.",
      "Rewrote bullets as action + result, using the numbers you already had.",
      "Mirrored their keywords (REST APIs, testing, React) where your experience genuinely matches.",
      "Reframed the route planner as delivery optimisation — directly relevant to what they build.",
    ],
  };
}

export async function buildKit() {
  await wait(3400);
  return {
    fit_score: 82,
    verdict: "You're a strong fit — your stock tracker is basically a mini Northwind product. Lead with it.",
    skill_match: [
      { axis: "Python", score: 8 },
      { axis: "React", score: 7 },
      { axis: "Algorithms", score: 7 },
      { axis: "Testing", score: 8 },
      { axis: "Cloud", score: 4 },
      { axis: "Communication", score: 9 },
    ],
    email: {
      subject: "CS student who built a stock tracker for a local shop — Summer Internship",
      body:
        "Hi [Name],\n\nI saw Northwind Labs just launched the same-day delivery planner for independent shops — that hit home, because I spent this year building a stock tracker for my local co-op that cut their weekly stock check from 3 hours to 40 minutes.\n\nI'm a second-year Computer Science student applying for the Software Engineering Internship, and I'd love to bring that same 'ship small, ship often' approach to your team.\n\nHere's my CV, tailored for the role:\n{{CV_LINK}}\n\nWould you be open to a 15-minute chat about what interns work on?\n\nThanks,\nSam Rivera",
      who_to_send_to:
        "An engineering manager on the retail or delivery team. Search LinkedIn for 'Northwind Labs engineering manager', or ask the campus recruiter for an introduction.",
    },
    gaps: [
      {
        gap: "Limited cloud experience",
        severity: "medium",
        fix: "Deploy your stock tracker to AWS free tier this weekend and add it to your CV — about 3 hours of work.",
      },
      {
        gap: "No formal internship yet",
        severity: "low",
        fix: "Your volunteer project shows the same skills. Describe it like a job: users, impact, how you shipped.",
      },
      {
        gap: "System design is likely in the final round",
        severity: "medium",
        fix: "Practise sketching your stock tracker's architecture out loud for 5 minutes, including how it would scale.",
      },
    ],
    interview: [
      {
        question: "Tell me about something you built that real people used.",
        type: "behavioural",
        why_they_ask: "They value shipping and customer obsession.",
        answer_outline:
          "S: Co-op used a paper ledger. T: Make stock checks faster. A: Built React + Flask tracker, shipped weekly with staff feedback. R: 3h → 40 min per week; still in use.",
      },
      {
        question: "Find the shortest delivery route between shops on a weighted graph.",
        type: "technical",
        why_they_ask: "Core to their product, and tests data structures.",
        answer_outline:
          "Clarify inputs → Dijkstra with a min-heap, O((V+E) log V) → mention your route-planner benchmark → talk through edge cases (unreachable nodes, ties).",
      },
      {
        question: "Why Northwind Labs?",
        type: "motivation",
        why_they_ask: "They want people who care about small retailers.",
        answer_outline: "Link your co-op project to their mission, mention the delivery planner launch, and say what you want to learn.",
      },
      {
        question: "Tell me about a time you disagreed with a teammate.",
        type: "behavioural",
        why_they_ask: "Tests their 'kind, direct feedback' value.",
        answer_outline:
          "S: Group project, a teammate wanted to skip tests to hit a deadline. A: Proposed CI on critical paths only. R: Shipped on time, caught two bugs before the demo.",
      },
      {
        question: "How would you design the backend for a stock tracker used by 1,000 shops?",
        type: "technical",
        why_they_ask: "Light system design in the final round.",
        answer_outline:
          "Start from your SQLite version → move to Postgres with a shop_id on each table → REST API behind a load balancer → caching for read-heavy stock views → discuss trade-offs.",
      },
      {
        question: "What would you want to work on as an intern here?",
        type: "motivation",
        why_they_ask: "Checks you've researched the role.",
        answer_outline: "Name the delivery planner and say you'd like to work on routing or the shop-facing UI, linking each to your projects.",
      },
    ],
  };
}

export async function draftFollowUp(app) {
  await wait(1500);
  const viewed = (app.events || []).some((e) => e.type === "click");
  return {
    subject: `Re: ${app.email?.subject || "Summer Internship"}`,
    body: viewed
      ? "Hi [Name],\n\nJust following up on my note last week. Since then I've deployed my stock tracker to AWS so the co-op can use it from any shop — it's been a great lesson in moving from a local app to the cloud.\n\nI'd still love 15 minutes to hear what interns work on at Northwind Labs.\n\nThanks,\nSam"
      : "Hi [Name],\n\nI wanted to bring my earlier email back to the top of your inbox. I'm really keen on the Software Engineering Internship, especially after reading about your new delivery planner.\n\nWould a short call next week work?\n\nThanks,\nSam",
    timing_tip: viewed
      ? "They've already looked at your CV, so send this tomorrow morning while you're fresh in their mind."
      : "Send it on Tuesday or Wednesday morning, about a week after your first email.",
  };
}
