import { writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), "..");
const defaultDocxPath = path.resolve(projectRoot, "../Ai source(1).docx");
const outputPath = path.resolve(projectRoot, "data/source-docx-extracted.json");
const inputPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : defaultDocxPath;

const categoryPatterns = [
  [/income tax/i, "tax"],
  [/sst|customs/i, "tax"],
  [/incentives?/i, "government"],
  [/secretarial/i, "regulatory"],
  [/accounting/i, "regulatory"],
  [/audit/i, "regulatory"],
  [/software/i, "other"],
  [/competitors?/i, "other"],
];

const urlHeuristics = [
  [/taxathand\.com/i, "Deloitte Tax@Hand"],
  [/kpmg\.com\/my\/en\/home\.html/i, "KPMG MY"],
  [/landco\.my/i, "L & Co"],
  [/ccs-co\.com/i, "CCS Advisory Updates"],
  [/yycadvisors\.com/i, "YYC Advisors"],
  [/docs\.sql\.com\.my\/sqlacc\/changelog/i, "SQL Accounting (Official)"],
  [/60ba509f0000000001008605/i, "SQL Accounting (XHS)"],
  [/65475d65000000000301f1b4/i, "SQL Payroll (XHS)"],
  [/facebook\.com\/share\/1CT52asRHC/i, "ANC Group Facebook Updates"],
  [/youtube\.com\/@anc-group-tv/i, "ANC Group YouTube Updates"],
  [/mysst\.customs\.gov\.my/i, "MySST Portal Updates"],
];

function normalizeText(value) {
  return String(value || "")
    .replace(/&quot;?/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\u2060/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripArtifacts(value) {
  return normalizeText(value)
    .replace(/^HYPERLINK\s+/i, "")
    .replace(/^["']+|["']+$/g, "")
    .replace(/[.,;:]+$/g, "")
    .replace(/[-–—]+$/g, "")
    .trim();
}

function slugify(value) {
  return stripArtifacts(value)
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function splitKeywords(value) {
  return normalizeText(value)
    .replace(/^keywords\s*:?/i, "")
    .split(",")
    .flatMap((item) => {
      const normalized = stripArtifacts(item);
      const matched = normalized.match(/^(.+?)\/(.+?)\s+(.+)$/);
      if (matched) {
        return [
          `${stripArtifacts(matched[1])} ${stripArtifacts(matched[3])}`.trim(),
          `${stripArtifacts(matched[2])} ${stripArtifacts(matched[3])}`.trim(),
        ];
      }
      return [normalized];
    })
    .map((item) => item.replace(/\s*\(\s*/g, " (").replace(/\s*\)\s*/g, ")"))
    .map((item) => item.replace(/[.。…]+$/g, "").trim())
    .filter(Boolean);
}

function getCategory(label) {
  const normalized = normalizeText(label);
  for (const [pattern, category] of categoryPatterns) {
    if (pattern.test(normalized)) {
      return category;
    }
  }
  return "other";
}

function extractVisibleText(xml) {
  return normalizeText(
    [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
      .map((match) => match[1])
      .join(" "),
  );
}

function extractParagraphs(cellXml) {
  const paragraphs = [];
  const paragraphRegex = /<w:p\b[\s\S]*?<\/w:p>/g;
  for (const match of cellXml.matchAll(paragraphRegex)) {
    const paragraphXml = match[0];
    const urlMatch = paragraphXml.match(/<w:instrText[^>]*>[\s\S]*?HYPERLINK\s+&quot;([^&"]+)/i);
    const displayText = extractVisibleText(paragraphXml);
    const urlTextMatch = displayText.match(/https?:\/\/[^\s<>"']+/i);
    const url = stripArtifacts(
      urlMatch?.[1] || urlTextMatch?.[0] || "",
    );

    if (!displayText && !url) {
      continue;
    }

    paragraphs.push({
      text: displayText,
      url,
    });
  }
  return paragraphs;
}

function extractCellText(cellXml) {
  return extractVisibleText(cellXml);
}

function cleanUrl(value) {
  return stripArtifacts(value)
    .replace(/&quot;?/g, "")
    .replace(/\s+/g, "")
    .replace(/[?#].*$/, "")
    .replace(/[)\]}>]+$/g, "")
    .trim();
}

function inferOrganization(rowOrganization, paragraphText, url) {
  const paragraphLabel = stripArtifacts(paragraphText || "")
    .replace(normalizeText(url), "")
    .replace(/^[\-–—]+\s*/g, "")
    .trim();
  const normalizedUrl = normalizeText(url);

  for (const [pattern, organization] of urlHeuristics) {
    if (pattern.test(normalizedUrl)) {
      return organization;
    }
  }

  if (paragraphLabel && !/^https?:\/\/\S+$/i.test(paragraphLabel)) {
    return paragraphLabel;
  }

  return stripArtifacts(rowOrganization || "");
}

function extractItemsFromRow(rowXml) {
  const cellRegex = /<w:tc\b[\s\S]*?<\/w:tc>/g;
  const cells = [...rowXml.matchAll(cellRegex)].map((match) => match[0]);
  if (cells.length < 3) {
    return [];
  }

  const categoryLabel = extractCellText(cells[0]);
  const rowOrganization = extractCellText(cells[1]);
  const urlCell = cells[2];
  const keywordCell = cells[3] || "";

  const category = getCategory(categoryLabel);
  const suggestedKeywords = splitKeywords(extractCellText(keywordCell));
  const rows = [];
  const seenUrls = new Set();

  for (const paragraph of extractParagraphs(urlCell)) {
    const url = cleanUrl(paragraph.url || paragraph.text);
    if (!url || !/^https?:\/\//i.test(url)) {
      continue;
    }
    if (seenUrls.has(url)) {
      continue;
    }
    seenUrls.add(url);

    const organization = inferOrganization(rowOrganization, paragraph.text, url);
    rows.push({
      slug: slugify(url),
      category,
      organization,
      officialWebsite: url,
      suggestedKeywords,
    });
  }

  return rows;
}

function extractRows(documentXml) {
  const tableRegex = /<w:tbl\b[\s\S]*?<\/w:tbl>/g;
  const rows = [];
  for (const tableMatch of documentXml.matchAll(tableRegex)) {
    const tableXml = tableMatch[0];
    const rowRegex = /<w:tr\b[\s\S]*?<\/w:tr>/g;
    for (const rowMatch of tableXml.matchAll(rowRegex)) {
      rows.push(rowMatch[0]);
    }
  }
  return rows;
}

function parseDocx(xmlText) {
  const rows = extractRows(xmlText);
  const items = [];
  const seenUrls = new Set();

  for (const rowXml of rows.slice(1)) {
    for (const item of extractItemsFromRow(rowXml)) {
      const normalizedUrl = item.officialWebsite.replace(/\/+$/g, "/");
      if (seenUrls.has(normalizedUrl)) {
        continue;
      }
      seenUrls.add(normalizedUrl);
      items.push({
        ...item,
        officialWebsite: normalizedUrl,
      });
    }
  }

  return items;
}

function main() {
  const xmlText = execFileSync("unzip", ["-p", inputPath, "word/document.xml"], {
    encoding: "utf8",
  });
  const parsed = parseDocx(xmlText);

  return writeFile(
    outputPath,
    JSON.stringify(
      {
        sourceDocument: inputPath,
        extractedAt: new Date().toISOString(),
        count: parsed.length,
        items: parsed,
      },
      null,
      2,
    ),
    "utf8",
  ).then(() => {
    console.log(`Extracted ${parsed.length} source rows to ${outputPath}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
