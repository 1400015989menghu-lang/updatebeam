#!/usr/bin/env node

const { chromium } = require("playwright");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[index + 1];
    if (value && !value.startsWith("--")) {
      args[key] = value;
      index += 1;
    } else {
      args[key] = "true";
    }
  }
  return args;
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const MONTHS = {
  jan: 1,
  january: 1,
  januari: 1,
  feb: 2,
  february: 2,
  februari: 2,
  mar: 3,
  march: 3,
  mac: 3,
  apr: 4,
  april: 4,
  may: 5,
  mei: 5,
  jun: 6,
  june: 6,
  juni: 6,
  jul: 7,
  july: 7,
  julai: 7,
  aug: 8,
  august: 8,
  ogos: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  okt: 10,
  oktober: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
  dis: 12,
  disember: 12,
};

function toIsoDate(year, month, day) {
  const safeMonth = String(month).padStart(2, "0");
  const safeDay = String(day).padStart(2, "0");
  return `${year}-${safeMonth}-${safeDay}`;
}

function parseDateString(rawValue) {
  const raw = normalizeWhitespace(rawValue);
  if (!raw) return null;

  let match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  match = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (match) return toIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));

  match = raw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (match) {
    const month = MONTHS[match[2].toLowerCase()];
    if (month) return toIsoDate(Number(match[3]), month, Number(match[1]));
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function parseHeaderDate(value) {
  return parseDateString(value || "");
}

function summarizeText(text) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return null;
  return normalized.length > 240 ? `${normalized.slice(0, 239).trim()}…` : normalized;
}

function makeReviewItem(sourceSlug, queueReason, summary, details = {}, priority = "high", seedUrl = null) {
  return {
    source_slug: sourceSlug,
    queue_reason: queueReason,
    priority,
    summary,
    seed_url: seedUrl,
    details,
  };
}

async function collectKwspCandidates(page) {
  return page.evaluate(() => {
    const toLabel = (href, text) => {
      if (href.includes("/w/news/")) return "News";
      if (href.includes("/w/announcement/")) return "Announcement";
      if (href.includes("/w/scam-alert/")) return "Scam Alert";
      if (href.includes("/w/article/")) return "Article";
      return "Update";
    };

    const seen = new Set();
    const candidates = [];
    for (const anchor of document.querySelectorAll('a[href*="/en/w/"]')) {
      const href = anchor.href;
      if (!href || seen.has(href)) continue;
      const text = (anchor.textContent || "").replace(/\s+/g, " ").trim();
      if (!text && !href.includes("/w/news/") && !href.includes("/w/announcement/")) {
        continue;
      }
      seen.add(href);
      candidates.push({
        href,
        label: toLabel(href, text),
      });
    }
    return candidates.slice(0, 16);
  });
}

async function probeKwsp(targetDate) {
  const browser = await chromium.launch({
    headless: process.env.UPDATEBEAM_BROWSER_HEADLESS === "1",
    channel: "chrome",
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://www.kwsp.gov.my/en/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(5000);

  const candidates = await collectKwspCandidates(page);
  if (!candidates.length) {
    await browser.close();
    return {
      status: "review_required",
      automationLevel: "review_required",
      items: [],
      reviewItems: [
        makeReviewItem(
          "kwsp-gov-my",
          "browser-required",
          "Browser reached KWSP, but no stable /en/w/ candidate links were visible on the page.",
          { entry_point: "https://www.kwsp.gov.my/en/" },
          "critical",
          "https://www.kwsp.gov.my/en/",
        ),
      ],
      notes: ["KWSP browser session opened, but candidate extraction returned no /en/w/ links."],
      metadata: { candidateCount: 0 },
    };
  }

  const items = [];
  for (const candidate of candidates) {
    const detailPage = await context.newPage();
    const response = await detailPage.goto(candidate.href, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await detailPage.waitForTimeout(2500);
    const payload = await detailPage.evaluate(() => {
      const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const text = document.body ? document.body.innerText : "";
      return {
        title:
          normalize(
            document.querySelector("h1")?.textContent ||
              document.title.replace(/\s*-\s*KWSP Malaysia\s*$/i, ""),
          ) || document.title,
        text: normalize(text),
      };
    });
    const visibleDate =
      parseDateString((payload.text.match(/Date:\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i) || [])[1]) ||
      parseDateString((payload.text.match(/\b([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})\b/) || [])[1]);
    const lastModified = parseHeaderDate(response?.headers()["last-modified"]);
    const matchedDate = visibleDate || lastModified;
    if (matchedDate === targetDate) {
      items.push({
        title: payload.title,
        url: candidate.href,
        label: candidate.label,
        publishedDate: visibleDate,
        updatedDate: lastModified && lastModified !== visibleDate ? lastModified : null,
        summary: summarizeText(payload.text),
        metadata: {
          browserProbe: true,
          discoveredFrom: "https://www.kwsp.gov.my/en/",
        },
      });
    }
    await detailPage.close();
  }

  await browser.close();
  return {
    status: "ok",
    automationLevel: "hybrid",
    items,
    reviewItems: [],
    notes: items.length
      ? ["KWSP candidates were discovered in a browser session and filtered by the article date or last-modified header."]
      : ["KWSP browser session succeeded, but no candidate matched the requested target date."],
    metadata: {
      candidateCount: candidates.length,
      entryPoint: "https://www.kwsp.gov.my/en/",
    },
  };
}

function parsePerkesoLines(text) {
  const lines = text
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
  const entries = [];
  for (const line of lines) {
    const match = line.match(/^(.+?)\s+\((\d{1,2}\s+[A-Za-z]+\s+\d{4})\)$/);
    if (!match) continue;
    entries.push({
      title: normalizeWhitespace(match[1]),
      publishedDate: parseDateString(match[2]),
    });
  }
  return entries;
}

async function probePerkeso(targetDate) {
  const browser = await chromium.launch({
    headless: process.env.UPDATEBEAM_BROWSER_HEADLESS === "1",
    channel: "chrome",
  });
  const page = await browser.newPage();
  const sourceUrl = "https://www.perkeso.gov.my/en/about-us/source/media-statement.html";
  await page.goto(sourceUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(4000);
  const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
  const entries = parsePerkesoLines(text);
  await browser.close();

  if (!entries.length) {
    return {
      status: "review_required",
      automationLevel: "review_required",
      items: [],
      reviewItems: [
        makeReviewItem(
          "perkeso-gov-my",
          "browser-required",
          "PERKESO browser page loaded, but no dated media-release lines were detected on the public source page.",
          { source_url: sourceUrl },
          "critical",
          sourceUrl,
        ),
      ],
      notes: ["Media Release page was reachable but yielded no dated statement lines."],
      metadata: { candidateCount: 0, entryPoint: sourceUrl },
    };
  }

  const items = entries
    .filter((entry) => entry.publishedDate === targetDate)
    .map((entry) => ({
      title: entry.title,
      url: `${sourceUrl}#${slugify(entry.title)}`,
      label: "Media Release",
      publishedDate: entry.publishedDate,
      updatedDate: null,
      summary: summarizeText(entry.title),
      metadata: {
        browserProbe: true,
        discoveredFrom: sourceUrl,
      },
    }));

  return {
    status: "ok",
    automationLevel: "hybrid",
    items,
    reviewItems: [],
    notes: items.length
      ? ["PERKESO updates were extracted from the dated Media Release listing page."]
      : ["PERKESO Media Release page was reachable, but no line matched the requested target date."],
    metadata: {
      candidateCount: entries.length,
      entryPoint: sourceUrl,
    },
  };
}

async function collectDeloitteCandidates(page) {
  return page.evaluate(() => {
    const seen = new Set();
    const candidates = [];
    for (const anchor of document.querySelectorAll('a[href*="/article/"]')) {
      const href = anchor.href;
      if (!href || seen.has(href)) continue;
      seen.add(href);
      const contextText = [
        anchor.textContent || "",
        anchor.parentElement?.textContent || "",
        anchor.parentElement?.parentElement?.textContent || "",
      ]
        .map((value) => String(value || "").replace(/\s+/g, " ").trim())
        .join(" ");
      candidates.push({ href });
      candidates[candidates.length - 1].contextText = contextText;
    }
    if (!candidates.length) {
      const html = document.documentElement ? document.documentElement.innerHTML : "";
      const matches = html.match(/https:\/\/www\.taxathand\.com\/article\/[A-Za-z0-9/_-]+/g) || [];
      for (const href of matches) {
        if (!seen.has(href)) {
          seen.add(href);
          candidates.push({ href, contextText: "" });
        }
      }
    }
    return candidates.slice(0, 8);
  });
}

async function probeDeloitte(targetDate) {
  const browser = await chromium.launch({
    headless: process.env.UPDATEBEAM_BROWSER_HEADLESS === "1",
    channel: "chrome",
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const sourceUrl = "https://www.taxathand.com/";
  await page.goto(sourceUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(7000);
  const candidates = await collectDeloitteCandidates(page);
  if (!candidates.length) {
    await browser.close();
    return {
      status: "review_required",
      automationLevel: "review_required",
      items: [],
      reviewItems: [
        makeReviewItem(
          "deloitte-taxathand",
          "browser-required",
          "Deloitte Tax@Hand opened in a browser session, but no article links were detected on the landing page.",
          { entry_point: sourceUrl },
          "high",
          sourceUrl,
        ),
      ],
      notes: ["Tax@Hand browser session reached the home page but article discovery returned zero candidates."],
      metadata: { candidateCount: 0, entryPoint: sourceUrl },
    };
  }

  const matchingCandidates = candidates.filter((candidate) => parseDateString(candidate.contextText) === targetDate);
  if (!matchingCandidates.length) {
    await browser.close();
    return {
      status: "ok",
      automationLevel: "hybrid",
      items: [],
      reviewItems: [],
      notes: ["Deloitte Tax@Hand browser session succeeded, but the landing page did not expose any article card for the requested target date."],
      metadata: {
        candidateCount: candidates.length,
        matchedCandidateCount: 0,
        entryPoint: sourceUrl,
      },
    };
  }

  const items = [];
  for (const candidate of matchingCandidates) {
    const detailPage = await context.newPage();
    await detailPage.goto(candidate.href, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await detailPage.waitForTimeout(2500);
    const payload = await detailPage.evaluate(() => {
      const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const text = document.body ? document.body.innerText : "";
      return {
        title: normalize(
          document.title.replace(/^Deloitte\s*\|\s*tax@hand\s*$/i, "").trim() ||
            document.querySelector("h1")?.textContent ||
            document.title,
        ),
        text: normalize(text),
      };
    });
    const publishedDate = parseDateString((payload.text.match(/\b([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})\b/) || [])[1]);
    if (publishedDate === targetDate) {
      items.push({
        title: payload.title || candidate.href,
        url: candidate.href,
        label: "Tax Alert",
        publishedDate,
        updatedDate: null,
        summary: summarizeText(payload.text),
        metadata: {
          browserProbe: true,
          discoveredFrom: sourceUrl,
        },
      });
    }
    await detailPage.close();
  }

  await browser.close();
  return {
    status: "ok",
    automationLevel: "hybrid",
    items,
    reviewItems: [],
      notes: items.length
      ? ["Deloitte Tax@Hand article pages were browser-fetched and filtered by their visible publication date."]
      : ["Deloitte Tax@Hand browser session succeeded, but no article matched the requested target date."],
    metadata: {
      candidateCount: candidates.length,
      matchedCandidateCount: matchingCandidates.length,
      entryPoint: sourceUrl,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = args.slug;
  const targetDate = args["target-date"];
  if (!slug || !targetDate) {
    throw new Error("usage: browser_probe.cjs --slug <slug> --target-date YYYY-MM-DD");
  }

  let result;
  if (slug === "kwsp-gov-my") {
    result = await probeKwsp(targetDate);
  } else if (slug === "perkeso-gov-my") {
    result = await probePerkeso(targetDate);
  } else if (slug === "deloitte-taxathand") {
    result = await probeDeloitte(targetDate);
  } else {
    throw new Error(`unsupported slug: ${slug}`);
  }

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
