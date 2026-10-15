import { extractText, getDocumentProxy } from "unpdf";

/** Pull plain text out of an uploaded CV (PDF or .txt/.md). */
export async function extractCvText(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const name = (file.name || "").toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    return clean(text);
  }
  return clean(new TextDecoder().decode(buf));
}

/** Fetch a job posting and reduce it to readable text. */
export async function fetchJobText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`The job page returned ${res.status}`);
  const html = await res.text();
  const text = clean(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<(br|p|div|li|h\d)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
  );
  if (text.length < 300) {
    throw new Error("That page didn't have readable job text (it may need a login). Paste the description instead.");
  }
  return text.slice(0, 20000);
}

function clean(s) {
  return s.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
}
