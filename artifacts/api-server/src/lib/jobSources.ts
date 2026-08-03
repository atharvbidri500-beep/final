import { pool } from "@workspace/db";

export interface SourceJob {
  title: string;
  company: string;
  location: string | null;
  isRemote: boolean;
  jobType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  skills: string[];
  experienceRequired: number;
  isInternship: boolean;
  source: string;
  externalId: string | null;
  sourceUrl: string | null;
}

export interface SourceResult {
  source: string;
  fetched: number;
  saved: number;
  skipped: number;
  error?: string;
}

const SEARCH_TERMS = [
  "software developer", "frontend developer", "backend developer", "full stack developer",
  "data analyst", "data scientist", "machine learning engineer", "devops engineer",
  "java developer", "python developer", "react developer", "mobile app developer",
  "quality assurance engineer", "product manager", "ui ux designer", "graphic designer",
  "digital marketing", "content writer", "human resources", "sales executive",
  "accountant", "business analyst", "cloud engineer", "cyber security analyst",
  "project manager", "customer support", "operations manager", "software intern",
];

const SKILL_DICTIONARY: Record<string, string[]> = {
  javascript: ["javascript", "js", "es6"], typescript: ["typescript"], react: ["react", "reactjs", "react.js"],
  "node.js": ["node", "nodejs", "node.js"], angular: ["angular"], vue: ["vue", "vue.js"],
  python: ["python"], java: ["java"], "c++": ["c++", "cpp"], "c#": ["c#", "csharp", ".net", "dotnet"],
  go: ["golang", "go "], rust: ["rust"], php: ["php"], laravel: ["laravel"], django: ["django"], flask: ["flask"],
  spring: ["spring", "spring boot"], sql: ["sql", "postgresql", "postgres", "mysql", "database"],
  "mongo.db": ["mongodb", "mongo", "nosql"], redis: ["redis"], aws: ["aws", "amazon web services"],
  azure: ["azure"], "google cloud": ["gcp", "google cloud"], docker: ["docker"], kubernetes: ["kubernetes", "k8s"],
  git: ["git", "github", "gitlab"], "machine learning": ["machine learning", "ml", "tensorflow", "pytorch", "ai ", "artificial intelligence"],
  "data science": ["data science", "pandas", "numpy", "scikit", "data analysis"], excel: ["excel", "spreadsheet"],
  tableau: ["tableau"], powerbi: ["power bi", "powerbi"], bigdata: ["hadoop", "spark", "big data", "hive"],
  testing: ["testing", "qa ", "selenium", "junit", "cypress"], devops: ["devops", "ci/cd", "jenkins", "terraform"],
  security: ["security", "cyber", "penetration"], linux: ["linux", "unix", "bash"], html: ["html"],
  css: ["css", "sass", "tailwind"], "ui/ux": ["ui/ux", "ui ux", "figma", "sketch", "wireframe", "prototype"],
  design: ["design", "adobe", "photoshop", "illustrator", "canva"], marketing: ["marketing", "seo", "sem", "google ads", "facebook ads", "social media"],
  content: ["content", "copywriting", "seo writer", "blog"], seo: ["seo"],
  hr: ["hr ", "recruitment", "talent acquisition", "human resources"], sales: ["sales", "b2b", "account executive", "business development"],
  finance: ["finance", "accounting", "tally", "gst", "payroll", "ca "], "project management": ["project management", "pmp", "scrum", "agile", "jira"],
  communication: ["communication", "presentation"], leadership: ["leadership", "team management", "team lead"],
  cloud: ["cloud"], mobile: ["android", "ios", "kotlin", "swift", "flutter", "react native"],
  wordpress: ["wordpress", "woocommerce"], shopify: ["shopify"], email: ["email marketing", "mailchimp"],
  "data entry": ["data entry", "typing"], customer: ["customer service", "customer support", "crm"],
  erp: ["sap", "oracle erp", "erp"], salesforce: ["salesforce"],
};

export function extractSkills(text: string): string[] {
  const lower = ` ${text.toLowerCase()} `;
  const found: string[] = [];
  for (const [skill, needles] of Object.entries(SKILL_DICTIONARY)) {
    if (needles.some(n => lower.includes(n))) found.push(skill);
  }
  return found.slice(0, 12);
}

export function parseSalaryString(salary: string | null): { min: number | null; max: number | null } {
  if (!salary) return { min: null, max: null };
  const cleaned = salary.replace(/,/g, "");
  const annualMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*LPA|₹\s*(\d+(?:\.\d+)?)\s*lakh|\$\s*(\d+)\s*-\s*\$?\s*(\d+)/i);
  if (annualMatch && (annualMatch[1] || annualMatch[2])) {
    const lpa = parseFloat(annualMatch[1] ?? annualMatch[2]);
    if (lpa > 0) return { min: Math.round(lpa * 100000), max: Math.round(lpa * 100000) };
  }
  const range = cleaned.match(/(\d+(?:\.\d+)?)\s*[kK]\s*-\s*(\d+(?:\.\d+)?)\s*[kK]/);
  if (range) {
    return { min: Math.round(parseFloat(range[1]) * 1000 * 12), max: Math.round(parseFloat(range[2]) * 1000 * 12) };
  }
  const single = cleaned.match(/(\d+(?:\.\d+)?)\s*[kK]/);
  if (single && !/\$|USD|EUR|GBP|₹/.test(cleaned.replace(`₹${single[1]}`, ""))) {
    const monthly = parseFloat(single[1]);
    if (monthly > 2000) return { min: Math.round(monthly * 1000 * 12), max: Math.round(monthly * 1000 * 12) };
  }
  return { min: null, max: null };
}

function estimateExperience(title: string, description: string): number {
  const text = `${title} ${description}`;
  const senior = /\b(senior|lead|principal|staff|architect|manager)\b/i;
  const junior = /\b(junior|fresher|entry|trainee|intern)\b/i;
  const years = text.match(/(\d+)\s*\+?\s*(?:years|yrs)/i);
  if (years) return Math.min(15, parseInt(years[1], 10));
  if (senior.test(text)) return 5;
  if (junior.test(text)) return 1;
  return 2;
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAdzuna(): Promise<SourceJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];
  const results = await Promise.allSettled(
    SEARCH_TERMS.slice(0, 6).map(async (term) => {
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=10&what=${encodeURIComponent(term)}&where=India&content-type=application/json`;
      return { term, data: await fetchJson(url) };
    }),
  );
  const out: SourceJob[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    const { term, data } = r.value;
    for (const j of (data?.results ?? [])) {
      const skills = extractSkills(`${j.title} ${j.description ?? ""}`);
      const isInternship = /internship|intern/i.test(`${j.title} ${j.category?.label ?? ""}`);
      out.push({
        title: j.title ?? "Untitled",
        company: j.company?.display_name ?? "Unknown",
        location: j.location?.display_name ?? null,
        isRemote: /remote/i.test(`${j.title} ${j.location?.display_name ?? ""}`),
        jobType: j.contract_time === "part_time" ? "parttime" : "fulltime",
        salaryMin: j.salary_min && j.salary_min > 0 ? j.salary_min : null,
        salaryMax: j.salary_max && j.salary_max > 0 ? j.salary_max : null,
        description: `${j.description ?? ""}\n\nApply: ${j.redirect_url ?? ""}`,
        skills,
        experienceRequired: estimateExperience(j.title ?? "", j.description ?? ""),
        isInternship,
        source: "adzuna",
        externalId: String(j.id ?? `${term}-${j.title}`),
        sourceUrl: j.redirect_url ?? null,
      });
    }
  }
  return out;
}

async function fetchJooble(): Promise<SourceJob[]> {
  const key = process.env.JOOBLE_API_KEY;
  if (!key) return [];
  const results = await Promise.allSettled(
    SEARCH_TERMS.slice(0, 5).map(async (term) => {
      return {
        term,
        data: await fetchJson(`https://jooble.org/api/${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: term, location: "India", page: 1 }),
        }),
      };
    }),
  );
  const out: SourceJob[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    const { term, data } = r.value;
    for (const j of (data?.jobs ?? [])) {
      const skills = extractSkills(`${j.title} ${j.snippet ?? ""}`);
      const salary = parseSalaryString(j.salary ?? null);
      const type = String(j.type ?? "fulltime").toLowerCase();
      out.push({
        title: j.title ?? "Untitled",
        company: j.company ?? "Unknown",
        location: j.location ?? null,
        isRemote: /remote|work from home|wfh/i.test(`${j.title} ${j.location ?? ""}`),
        jobType: type.includes("part") ? "parttime" : type.includes("intern") ? "internship" : type.includes("contract") ? "contract" : "fulltime",
        salaryMin: salary.min,
        salaryMax: salary.max,
        description: `${j.snippet ?? ""}\n\nApply: ${j.link ?? ""}`,
        skills,
        experienceRequired: estimateExperience(j.title ?? "", j.snippet ?? ""),
        isInternship: /intern/i.test(`${j.title} ${j.type ?? ""}`),
        source: "jooble",
        externalId: String(j.id ?? `${term}-${j.title}-${j.company}`),
        sourceUrl: j.link ?? null,
      });
    }
  }
  return out;
}

async function fetchJobicy(): Promise<SourceJob[]> {
  try {
    const data = await fetchJson("https://jobicy.com/api/v2/remote-jobs?count=60");
    const out: SourceJob[] = [];
    for (const j of (data?.jobs ?? [])) {
      const text = `${j.jobTitle ?? j.title ?? ""} ${j.description ?? ""}`;
      const salary = parseSalaryString(j.salary ?? null);
      out.push({
        title: j.jobTitle ?? j.title ?? "Untitled",
        company: j.companyName ?? "Unknown",
        location: j.geo ?? j.jobGeo ?? null,
        isRemote: true,
        jobType: /part/i.test(j.jobType ?? "") ? "parttime" : "fulltime",
        salaryMin: salary.min,
        salaryMax: salary.max,
        description: `${j.description ?? ""}\n\nApply: ${j.url ?? ""}`,
        skills: extractSkills(text),
        experienceRequired: estimateExperience(j.jobTitle ?? "", j.description ?? ""),
        isInternship: /intern/i.test(text),
        source: "jobicy",
        externalId: String(j.id ?? j.url ?? `${j.jobTitle}-${j.companyName}`),
        sourceUrl: j.url ?? null,
      });
    }
    return out;
  } catch { return []; }
}

async function fetchRemotive(): Promise<SourceJob[]> {
  try {
    const data = await fetchJson("https://remotive.com/api/remote-jobs?limit=100");
    const out: SourceJob[] = [];
    for (const j of (data?.jobs ?? [])) {
      const text = `${j.title ?? ""} ${j.description ?? ""}`;
      const salary = parseSalaryString(j.salary ?? null);
      const type = String(j.job_type ?? "").toLowerCase();
      out.push({
        title: j.title ?? "Untitled",
        company: j.company_name ?? "Unknown",
        location: j.candidate_required_location ?? null,
        isRemote: true,
        jobType: type.includes("part") ? "parttime" : type.includes("contract") ? "contract" : "fulltime",
        salaryMin: salary.min,
        salaryMax: salary.max,
        description: `${j.description ?? ""}\n\nApply: ${j.url ?? ""}`,
        skills: extractSkills(text),
        experienceRequired: estimateExperience(j.title ?? "", j.description ?? ""),
        isInternship: /intern/i.test(text),
        source: "remotive",
        externalId: String(j.id ?? `${j.title}-${j.company_name}`),
        sourceUrl: j.url ?? null,
      });
    }
    return out;
  } catch { return []; }
}

async function saveJobs(jobs: SourceJob[]): Promise<{ saved: number; skipped: number }> {
  if (jobs.length === 0) return { saved: 0, skipped: 0 };
  const externalIds = jobs.filter(j => j.externalId).map(j => j.externalId as string);
  const { rows: existing } = externalIds.length > 0
    ? await pool.query(
        `SELECT external_id FROM jobs WHERE external_id = ANY($1)`,
        [externalIds],
      )
    : { rows: [] };
  const seenExternal = new Set(existing.map((r: any) => r.external_id));
  const seenKey = new Set<string>();
  const { rows: existingKeys } = await pool.query(
    `SELECT title, company, location FROM jobs WHERE is_active = true`,
  );
  for (const r of existingKeys) seenKey.add(`${(r.title ?? "").toLowerCase()}|${(r.company ?? "").toLowerCase()}|${(r.location ?? "").toLowerCase()}`);

  let saved = 0;
  let skipped = 0;
  for (const j of jobs) {
    if (j.externalId && seenExternal.has(j.externalId)) { skipped++; continue; }
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}|${(j.location ?? "").toLowerCase()}`;
    if (seenKey.has(key)) { skipped++; continue; }
    seenKey.add(key);
    try {
      await pool.query(
        `INSERT INTO jobs (title, company, location, is_remote, job_type, salary_min, salary_max, description, skills, experience_required, is_internship, source, external_id, source_url, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)`,
        [j.title, j.company, j.location, j.isRemote, j.jobType, j.salaryMin, j.salaryMax, j.description, JSON.stringify(j.skills), j.experienceRequired, j.isInternship, j.source, j.externalId, j.sourceUrl],
      );
      saved++;
    } catch { skipped++; }
  }
  return { saved, skipped };
}

export async function fetchJobsFromSources(): Promise<SourceResult[]> {
  const results = await Promise.allSettled([
    (async () => ({ source: "adzuna", jobs: await fetchAdzuna() }))(),
    (async () => ({ source: "jooble", jobs: await fetchJooble() }))(),
    (async () => ({ source: "jobicy", jobs: await fetchJobicy() }))(),
    (async () => ({ source: "remotive", jobs: await fetchRemotive() }))(),
  ]);

  const report: SourceResult[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      const { saved, skipped } = await saveJobs(r.value.jobs);
      report.push({ source: r.value.source, fetched: r.value.jobs.length, saved, skipped });
    } else {
      report.push({ source: "unknown", fetched: 0, saved: 0, skipped: 0, error: String(r.reason) });
    }
  }
  return report;
}

export async function getJobSourceStatus(): Promise<{ configured: string[] }> {
  const configured: string[] = [];
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) configured.push("adzuna");
  if (process.env.JOOBLE_API_KEY) configured.push("jooble");
  configured.push("jobicy", "remotive");
  return { configured };
}
