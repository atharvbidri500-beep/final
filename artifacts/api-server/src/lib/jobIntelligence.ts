import { eq, desc } from "drizzle-orm";
import {
  pool, db, careerProfilesTable, skillsTable, resumesTable, resumeAnalysesTable,
  certificationsTable, portfoliosTable, interviewSessionsTable, interviewAnalyticsTable,
  careerRoadmapsTable, gamificationTable, jobIntelProfilesTable,
  jobIntelRecommendationsTable, jobApplicationsTable, userActivityLogsTable,
} from "@workspace/db";
import { askAI, safeParseJSON } from "./ai.js";
import { computeCareerScore } from "./careerScore.js";
import { fetchJobsFromSources } from "./jobSources.js";
import { seedJobsIfEmpty } from "./seedJobs.js";

export interface DerivedSkill {
  name: string;
  confidence: number;
  sources: string[];
}

export interface IntelProfile {
  userId: number;
  careerScore: number;
  interviewReadiness: number;
  consistencyScore: number;
  learningVelocity: number;
  derivedSkills: DerivedSkill[];
  strengths: string[];
  weaknesses: string[];
  careerDirection: {
    dreamRole: string | null;
    targetSalary: number | null;
    targetCompany: string | null;
    currentRole: string | null;
    yearsOfExperience: number;
    preferredCompanies: string[];
    preferredLocations: string[];
    industries: string[];
  };
  evidenceStats: Record<string, unknown>;
  insight: string;
}

interface JobRow {
  id: number;
  title: string;
  company: string;
  location: string | null;
  is_remote: boolean;
  job_type: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  skills: string[];
  experience_required: number;
  is_internship: boolean;
  source: string;
  source_url: string | null;
}

export interface ScoredJob {
  job: JobRow;
  score: number;
  breakdown: { factor: string; points: number; max: number; note: string }[];
  matchedSkills: string[];
  missingSkills: string[];
  recId?: number | null;
}

const ROLE_KEYWORDS: Record<string, string[]> = {
  frontend: ["frontend", "front-end", "ui developer", "react", "angular", "vue", "web developer"],
  backend: ["backend", "back-end", "api", "node.js", "spring", "django", "server"],
  fullstack: ["full stack", "full-stack", "mern", "mean"],
  data: ["data analyst", "data scientist", "data engineer", "machine learning", "ml engineer", "analytics", "bi developer"],
  mobile: ["android", "ios", "flutter", "react native", "mobile"],
  devops: ["devops", "sre", "site reliability", "cloud engineer", "infrastructure"],
  security: ["security", "cyber", "penetration"],
  qa: ["qa", "testing", "test engineer", "quality assurance"],
  design: ["ui/ux", "designer", "design intern", "product designer", "graphic"],
  marketing: ["marketing", "seo", "social media", "growth", "advertising"],
  sales: ["sales", "account executive", "business development", "inside sales"],
  hr: ["hr", "recruiter", "talent acquisition", "human resources"],
  finance: ["accountant", "finance", "accounting", "payroll", "analyst"],
  content: ["content writer", "copywriter", "technical writer", "blog"],
  product: ["product manager", "product designer", "program manager"],
  support: ["support", "customer service", "customer success"],
};

function roleIndustryOf(job: JobRow): string[] {
  const text = `${job.title} ${job.description ?? ""}`.toLowerCase();
  const matches: string[] = [];
  for (const [industry, keywords] of Object.entries(ROLE_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) matches.push(industry);
  }
  return matches;
}

function splitList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(/[,;•\n]/).map(s => s.trim()).filter(Boolean);
}

function normalizeSkill(s: string): string {
  return s.trim().toLowerCase();
}

export async function buildProfile(userId: number): Promise<IntelProfile> {
  const [profile] = await db.select().from(careerProfilesTable).where(eq(careerProfilesTable.userId, userId));
  const [g] = await db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId));

  const { rows: skillRows } = await pool.query(
    "SELECT name, proficiency FROM skills WHERE user_id = $1 ORDER BY proficiency DESC",
    [userId],
  ) as any;

  const resumes = await db.select().from(resumesTable).where(eq(resumesTable.userId, userId)).orderBy(desc(resumesTable.updatedAt));
  const latestResume = resumes[0] ?? null;

  const analyses = await db.select().from(resumeAnalysesTable)
    .where(eq(resumeAnalysesTable.userId, userId))
    .orderBy(desc(resumeAnalysesTable.createdAt)).limit(3);
  const latestAnalysis = analyses[0] ?? null;

  const certifications = await db.select().from(certificationsTable).where(eq(certificationsTable.userId, userId));
  const [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.userId, userId));

  const sessions = await db.select().from(interviewSessionsTable)
    .where(eq(interviewSessionsTable.userId, userId))
    .orderBy(desc(interviewSessionsTable.createdAt)).limit(20);

  const analytics = await db.select().from(interviewAnalyticsTable)
    .where(eq(interviewAnalyticsTable.userId, userId))
    .orderBy(desc(interviewAnalyticsTable.createdAt)).limit(10);

  const [roadmap] = await db.select().from(careerRoadmapsTable)
    .where(eq(careerRoadmapsTable.userId, userId))
    .orderBy(desc(careerRoadmapsTable.createdAt));

  const score = await computeCareerScore(userId);

  const skillSources: Record<string, { confidence: number; sources: string[] }> = {};

  const addSkill = (name: string, confidence: number, source: string) => {
    const key = normalizeSkill(name);
    if (!key || key.length < 2) return;
    const existing = skillSources[key];
    if (existing) {
      existing.confidence = Math.min(100, Math.max(existing.confidence, confidence));
      if (!existing.sources.includes(source)) existing.sources.push(source);
    } else {
      skillSources[key] = { confidence, sources: [source] };
    }
  };

  for (const s of (skillRows ?? [])) {
    addSkill(s.name, Math.min(100, 50 + (s.proficiency ?? 50)), "skills");
  }
  for (const resume of resumes.slice(0, 2)) {
    for (const s of splitList(resume.skills)) addSkill(s, 55, "resume");
  }
  const projectNames = portfolio?.projects ?? [];
  for (const p of projectNames) {
    for (const t of (p.tags ?? [])) addSkill(t, 60, "portfolio");
    const nameWords = (p.name ?? "").split(/[\s\-,:]+/).filter(w => w.length > 2);
    for (const w of nameWords) addSkill(w, 50, "portfolio");
  }
  for (const c of certifications) {
    for (const w of c.name.split(/[\s\-]+/).filter(w => w.length > 2)) addSkill(w, 70, "certification");
  }

  const derivedSkills: DerivedSkill[] = Object.entries(skillSources)
    .map(([name, v]) => ({ name, confidence: Math.round(v.confidence), sources: v.sources }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 25);

  const strengths = new Set<string>();
  for (const s of (profile?.strengths ?? [])) strengths.add(s);
  for (const s of (latestAnalysis?.strengths ?? [])) strengths.add(s);
  for (const s of (latestAnalysis?.suggestions ?? []).filter(x => /^(strong|excellent|great|good)/i.test(x)).slice(0, 3)) strengths.add(s);

  const weaknesses = new Set<string>();
  for (const w of (profile?.weaknesses ?? [])) weaknesses.add(w);
  for (const w of (latestAnalysis?.skillGaps ?? []).slice(0, 6)) weaknesses.add(w);
  for (const w of (latestAnalysis?.missingKeywords ?? []).slice(0, 4)) weaknesses.add(w);
  for (const a of analytics) for (const w of (a.weaknesses ?? [])) weaknesses.add(w);

  const scoredSessions = sessions.filter(s => s.avgCommunicationScore != null || s.avgConfidenceScore != null);
  const sessionAvg = scoredSessions.length > 0
    ? Math.round(scoredSessions.reduce((sum, s) => sum + ((s.avgCommunicationScore ?? 0) + (s.avgConfidenceScore ?? 0)) / 2, 0) / scoredSessions.length)
    : 0;
  const sessionCoverage = Math.min(100, scoredSessions.length * 15);
  const interviewReadiness = scoredSessions.length > 0
    ? Math.min(100, Math.round(sessionAvg * 0.7 + sessionCoverage * 0.3))
    : Math.min(100, Math.round(sessionCoverage * 0.5));

  const { rows: eventRows } = await pool.query(
    `SELECT type, count(*)::int AS c FROM career_events WHERE user_id = $1 AND created_at > now() - interval '14 days' GROUP BY type`,
    [userId],
  ) as any;
  const { rows: activityRows } = await pool.query(
    `SELECT event_type, count(*)::int AS c FROM user_activity_logs WHERE user_id = $1 AND created_at > now() - interval '30 days' GROUP BY event_type`,
    [userId],
  ) as any;

  const eventsByType: Record<string, number> = {};
  for (const r of (eventRows ?? [])) eventsByType[r.type] = r.c;
  const activityByType: Record<string, number> = {};
  for (const r of (activityRows ?? [])) activityByType[r.event_type] = r.c;

  const streak = g?.dailyStreak ?? 0;
  const activeDays14 = Math.min(14, (eventRows ?? []).reduce((sum: number, r: any) => sum + r.c, 0));
  const consistencyScore = Math.min(100, Math.round(streak * 2 + activeDays14 * 5 + (eventsByType.practice ?? 0) * 3));

  const roadmapMilestones = Array.isArray((roadmap?.content as any)?.phases)
    ? ((roadmap.content as any).phases as any[]).flatMap((p: any) => p.milestones ?? [])
    : [];
  const milestonesDone = roadmapMilestones.filter((m: any) => m.done).length;
  const events14 = (eventRows ?? []).reduce((sum: number, r: any) => sum + r.c, 0);
  const practiceMinutes30 = (activityByType.practice ?? 0) * 15;
  const learningVelocity = Math.min(100, Math.round(events14 * 4 + milestonesDone * 8 + (activityByType.practice ?? 0) * 2 + Math.min(30, g?.xp ?? 0) / 10));

  const apps = await db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.userId, userId));
  const savedJobs = apps.filter(a => a.status === "saved").length;
  const appliedJobs = apps.filter(a => a.status !== "saved").length;

  const careerDirection = {
    dreamRole: profile?.dreamRole ?? null,
    targetSalary: profile?.targetSalary ?? null,
    targetCompany: profile?.targetCompany ?? null,
    currentRole: profile?.currentRole ?? null,
    yearsOfExperience: profile?.yearsOfExperience ?? 0,
    preferredCompanies: profile?.preferredCompanies ?? [],
    preferredLocations: profile?.preferredLocations ?? [],
    industries: profile?.preferredCompanies?.length ? ["preferred"] : [],
  };

  const evidenceStats: Record<string, unknown> = {
    resumes: resumes.length,
    avgAts: resumes.length > 0 ? Math.round(resumes.reduce((sum, r) => sum + (r.atsScore ?? 0), 0) / resumes.length) : 0,
    projects: projectNames.length,
    certifications: certifications.length,
    interviews: sessions.length,
    avgInterviewScore: sessionAvg,
    roadmapMilestonesDone: milestonesDone,
    roadmapMilestonesTotal: roadmapMilestones.length,
    xp: g?.xp ?? 0,
    level: g?.level ?? 1,
    dailyStreak: streak,
    eventsLast14Days: events14,
    practiceMinutesLast30Days: practiceMinutes30,
    savedJobs,
    appliedJobs,
    lastAnalysisAts: latestAnalysis?.atsScore ?? null,
  };

  const insight = await buildInsight({ strengths, weaknesses, derivedSkills, careerDirection, interviewReadiness, consistencyScore, learningVelocity });

  return {
    userId,
    careerScore: score.careerScore,
    interviewReadiness,
    consistencyScore,
    learningVelocity,
    derivedSkills,
    strengths: [...strengths].slice(0, 10),
    weaknesses: [...weaknesses].slice(0, 10),
    careerDirection,
    evidenceStats,
    insight,
  };
}

async function buildInsight(ctx: {
  strengths: Set<string>;
  weaknesses: Set<string>;
  derivedSkills: DerivedSkill[];
  careerDirection: IntelProfile["careerDirection"];
  interviewReadiness: number;
  consistencyScore: number;
  learningVelocity: number;
}): Promise<string> {
  const topSkills = ctx.derivedSkills.slice(0, 6).map(s => s.name).join(", ");
  try {
    const prompt = `You are a career intelligence engine. Summarize this user in 2-3 crisp sentences (max 220 chars): top skills: ${topSkills || "none yet"}, strengths: ${[...ctx.strengths].slice(0, 4).join(", ") || "none recorded"}, weaknesses to fix: ${[...ctx.weaknesses].slice(0, 4).join(", ") || "none recorded"}, dream role: ${ctx.careerDirection.dreamRole ?? "not set"}, interview readiness ${ctx.interviewReadiness}/100, consistency ${ctx.consistencyScore}/100, learning velocity ${ctx.learningVelocity}/100.`;
    const raw = await askAI([
      { role: "system", content: "You summarize user career profiles. Plain text only, no JSON." },
      { role: "user", content: prompt },
    ], false, 10000, 0);
    const cleaned = raw.replace(/^["']|["']$/g, "").trim();
    if (cleaned.length > 20) return cleaned.slice(0, 300);
  } catch { /* fallback */ }
  const readiness = ctx.interviewReadiness >= 60 ? "interview-ready" : ctx.interviewReadiness >= 30 ? "building interview skills" : "starting interview practice";
  const consistency = ctx.consistencyScore >= 60 ? "very consistent" : ctx.consistencyScore >= 30 ? "moderately consistent" : "getting started";
  return `Based on your activity, you're ${readiness} and ${consistency}. ${topSkills ? `Strongest evidence is in: ${topSkills}.` : "Add your first skills to begin building your intelligence profile."}${ctx.careerDirection.dreamRole ? ` Career direction: ${ctx.careerDirection.dreamRole}.` : ""}`;
}

export function scoreJob(job: JobRow, profile: IntelProfile): ScoredJob {
  const rawSkills = Array.isArray(job.skills) ? job.skills : [];
  const jobSkills = rawSkills.map(normalizeSkill);
  const profileSkillMap = new Map(profile.derivedSkills.map(s => [normalizeSkill(s.name), s]));
  const jobSkillsLower = jobSkills.map(normalizeSkill);

  const matchedSkills: string[] = [];
  let weightedMatch = 0;
  for (const s of jobSkillsLower) {
    const p = profileSkillMap.get(s);
    if (p) {
      matchedSkills.push(s);
      weightedMatch += p.confidence / 100;
    }
  }
  const missingSkills = jobSkillsLower.filter(s => !profileSkillMap.has(s)).slice(0, 8);
  const skillRatio = jobSkillsLower.length > 0 ? weightedMatch / jobSkillsLower.length : 0;
  const skillsPoints = jobSkillsLower.length > 0 ? Math.round(30 * skillRatio) : 15;

  const readinessPoints = Math.round((profile.interviewReadiness / 100) * 10);

  const years = profile.careerDirection.yearsOfExperience ?? 0;
  const required = job.experience_required ?? 0;
  const expPoints = years >= required ? 10 : Math.round(10 * ((years + 1) / (required + 1)));

  const projects = Number(profile.evidenceStats.projects ?? 0);
  const certs = Number(profile.evidenceStats.certifications ?? 0);
  const resumes = Number(profile.evidenceStats.resumes ?? 0);
  const evidencePoints = Math.min(8, projects * 2 + certs * 2 + Math.min(2, resumes));

  const certNames = profile.evidenceStats.certifications ?? 0;
  const certPoints = Number(certs) > 0 && certs >= 1 ? (jobSkillsLower.some(s => s.includes("cert")) ? 5 : 3) : 0;

  const target = profile.careerDirection.targetSalary;
  const jobMin = job.salary_min ?? null;
  const jobMax = job.salary_max ?? null;
  let salaryPoints = 5;
  if (target && jobMin && jobMax) {
    if (jobMax >= target * 0.7 && jobMin <= target * 1.5) salaryPoints = 10;
    else if (jobMax >= target * 0.5) salaryPoints = 7;
    else salaryPoints = 3;
  } else if (target && !jobMin && !jobMax) {
    salaryPoints = 5;
  }

  const prefs = profile.careerDirection.preferredLocations ?? [];
  const jobLoc = `${job.location ?? ""} ${job.title ?? ""}`.toLowerCase();
  const remoteOk = job.is_remote;
  let locationPoints = 4;
  if (remoteOk) locationPoints = 8;
  else if (prefs.length > 0) {
    if (prefs.some(p => jobLoc.includes(p.toLowerCase()))) locationPoints = 8;
    else locationPoints = 2;
  }

  const targetCompany = profile.careerDirection.targetCompany?.toLowerCase();
  const preferredCompanies = (profile.careerDirection.preferredCompanies ?? []).map(c => c.toLowerCase());
  const companyPoints = (targetCompany && job.company.toLowerCase().includes(targetCompany)) || preferredCompanies.some(c => job.company.toLowerCase().includes(c))
    ? 5 : 2.5;

  const dreamRole = profile.careerDirection.dreamRole?.toLowerCase() ?? "";
  const titleLower = job.title.toLowerCase();
  const dreamTokens = dreamRole.split(/[\s,/]+/).filter(t => t.length > 2);
  const goalPoints = dreamTokens.some(t => titleLower.includes(t))
    ? 8
    : roleIndustryOf(job).length > 0 && (profile.careerDirection.currentRole?.toLowerCase() ? titleLower.includes(profile.careerDirection.currentRole.toLowerCase().split(" ")[0]) : false)
      ? 5 : 2;

  const missingCount = missingSkills.length;
  const progressPoints = missingCount > 0 && profile.learningVelocity >= 50 ? 6 : missingCount > 0 ? 3 : 5;

  const score = Math.min(99, Math.max(5, Math.round(
    skillsPoints + readinessPoints + expPoints + evidencePoints + certPoints + salaryPoints + locationPoints + companyPoints + goalPoints + progressPoints)));

  const breakdown = [
    { factor: "Skills", points: skillsPoints, max: 30, note: jobSkillsLower.length > 0 ? `${matchedSkills.length}/${jobSkillsLower.length} required skills matched` : "No skill requirements listed" },
    { factor: "Interview readiness", points: readinessPoints, max: 10, note: `Readiness ${profile.interviewReadiness}/100` },
    { factor: "Experience", points: expPoints, max: 10, note: `${years} yrs vs ${required} yrs required` },
    { factor: "Evidence (projects/certs/resume)", points: evidencePoints, max: 8, note: `${projects} projects, ${certs} certifications, ${resumes} resume(s)` },
    { factor: "Certifications", points: certPoints, max: 5, note: certs > 0 ? "Certifications on file" : "No certifications yet" },
    { factor: "Salary fit", points: salaryPoints, max: 10, note: jobMin && jobMax ? `₹${jobMin}-${jobMax}` : target ? "Salary not listed" : "No target salary set" },
    { factor: "Location / remote", points: locationPoints, max: 8, note: job.is_remote ? "Remote friendly" : (job.location ?? "Location not specified") },
    { factor: "Company fit", points: companyPoints, max: 5, note: "Target company preference" },
    { factor: "Career goal alignment", points: goalPoints, max: 8, note: dreamRole ? `Dream role: ${profile.careerDirection.dreamRole}` : "No dream role set" },
    { factor: "Learning progress", points: progressPoints, max: 6, note: profile.learningVelocity >= 50 ? "Actively closing skill gaps" : "Steady progress" },
  ];

  return { job, score, breakdown, matchedSkills: matchedSkills.slice(0, 6), missingSkills };
}

export function explain(job: JobRow, profile: IntelProfile, scored: ScoredJob): {
  reasons: string[];
  improvements: string[];
  competitiveness: string;
} {
  const reasons: string[] = [];
  if (scored.matchedSkills.length > 0) {
    reasons.push(`Your profile has solid evidence for ${scored.matchedSkills.slice(0, 4).join(", ")} — these are exactly the skills this role needs.`);
  } else {
    reasons.push("This role's core skills are within reach of your current direction — a strong growth opportunity.");
  }
  if (scored.matchedSkills.length >= 3) {
    reasons.push(`You already cover ${scored.matchedSkills.length} of the key requirements, making you a realistic candidate today.`);
  }
  const years = profile.careerDirection.yearsOfExperience ?? 0;
  const required = job.experience_required ?? 0;
  if (years >= required) {
    reasons.push(`Your ${years} years of experience clears the ${required}+ year bar this job asks for.`);
  } else if (required === 0) {
    reasons.push("This is a fresher-friendly role — no experience barrier for you.");
  } else {
    reasons.push(`This role asks for ${required}+ years — you have ${years}, so highlight your projects and growth to bridge the gap.`);
  }
  const dreamRole = profile.careerDirection.dreamRole;
  if (dreamRole && job.title.toLowerCase().includes(dreamRole.toLowerCase().split(" ")[0])) {
    reasons.push(`This job aligns with your dream role of ${dreamRole}.`);
  }
  if (job.is_remote) reasons.push("Remote work — matches flexible work preferences.");
  const prefs = profile.careerDirection.preferredLocations ?? [];
  if (prefs.length > 0 && job.location && prefs.some(p => job.location!.toLowerCase().includes(p.toLowerCase()))) {
    reasons.push(`Located in ${job.location}, one of your preferred locations.`);
  }
  const target = profile.careerDirection.targetSalary;
  if (target && job.salary_max && job.salary_max >= target * 0.7) {
    reasons.push(`Salary range is in line with your target of ₹${target.toLocaleString("en-IN")}.`);
  }
  if (scored.missingSkills.length === 0) {
    reasons.push("You meet essentially every listed requirement — you are ready to apply.");
  }

  const improvements: string[] = [];
  for (const s of scored.missingSkills.slice(0, 5)) {
    improvements.push(`Add ${s} to your resume and portfolio — run a resume analysis after updating to track your ATS score.`);
  }
  if (scored.missingSkills.length > 0) {
    improvements.push(`Practice a mock interview in this domain (${job.title}) to raise your readiness before applying.`);
  }
  if (profile.interviewReadiness < 60) {
    improvements.push("Do 2-3 mock interviews first — your interview readiness is below the competitive bar.");
  }
  if (profile.evidenceStats.resumes === 0) {
    improvements.push("Build a resume for this role before applying — employers filter on it first.");
  } else {
    improvements.push("Tailor your resume to this specific job description before applying.");
  }
  if (!job.is_remote && (profile.careerDirection.preferredLocations ?? []).length > 0 &&
      !(profile.careerDirection.preferredLocations ?? []).some(p => (job.location ?? "").toLowerCase().includes(p.toLowerCase()))) {
    improvements.push("Consider whether relocating to this location fits your plan — otherwise filter for remote roles.");
  }

  const competitiveness = scored.score >= 70 ? "High" : scored.score >= 55 ? "Medium" : "Low";

  return { reasons, improvements: improvements.slice(0, 6), competitiveness };
}

let lastSourceFetch = 0;

export async function refreshRecommendations(userId: number): Promise<{
  profile: IntelProfile;
  profileId: number;
  recommendations: (ScoredJob & { reasons: string[]; improvements: string[]; competitiveness: string })[];
  sources: { source: string; fetched: number; saved: number }[];
}> {
  await seedJobsIfEmpty();

  const profile = await buildProfile(userId);
  const [profileRow] = await db.insert(jobIntelProfilesTable).values({
    userId,
    careerScore: profile.careerScore,
    interviewReadiness: profile.interviewReadiness,
    consistencyScore: profile.consistencyScore,
    learningVelocity: profile.learningVelocity,
    derivedSkills: profile.derivedSkills,
    strengths: profile.strengths,
    weaknesses: profile.weaknesses,
    careerDirection: profile.careerDirection,
    evidenceStats: profile.evidenceStats,
    insight: profile.insight,
  }).returning();

  let sources: { source: string; fetched: number; saved: number }[] = [];
  const now = Date.now();
  if (now - lastSourceFetch > 6 * 60 * 60 * 1000) {
    lastSourceFetch = now;
    fetchJobsFromSources().then(results => {
      sources = results.filter(r => !r.error);
    }).catch(() => {});
  }

  const { rows: jobs } = await pool.query(
    `SELECT id, title, company, location, is_remote, job_type, salary_min, salary_max, description, skills, experience_required, is_internship, source, source_url
     FROM jobs WHERE is_active = true ORDER BY created_at DESC LIMIT 400`,
  ) as any;

  const scoredAll = (jobs as any[]).map((j: any) => scoreJob(j, profile));
  const good = scoredAll.filter(s => s.score >= 45).sort((a, b) => b.score - a.score).slice(0, 25);

  await pool.query(`DELETE FROM job_intel_recommendations WHERE user_id = $1 AND profile_id <> $2`, [userId, profileRow.id]);

  for (const s of good) {
    const ex = explain(s.job, profile, s);
    const [inserted] = await db.insert(jobIntelRecommendationsTable).values({
      userId,
      profileId: profileRow.id,
      jobId: s.job.id,
      score: s.score,
      breakdown: s.breakdown,
      matchedSkills: s.matchedSkills,
      missingSkills: s.missingSkills,
      improvements: ex.improvements,
      competitiveness: ex.competitiveness,
      reasons: ex.reasons,
    }).returning({ id: jobIntelRecommendationsTable.id });
    s.recId = inserted.id;
  }

  return {
    profile,
    profileId: profileRow.id,
    recommendations: good.map(s => ({
      id: s.recId ?? null,
      ...s,
      ...explain(s.job, profile, s),
    })),
    sources,
  };
}

export async function getLatestIntel(userId: number): Promise<{
  profile: IntelProfile | null;
  profileId: number | null;
  recommendations: (ScoredJob & { reasons: string[]; improvements: string[]; competitiveness: string })[] | null;
  computedAt: string | null;
  stale: boolean;
} | null> {
  const [latestProfile] = await db.select().from(jobIntelProfilesTable)
    .where(eq(jobIntelProfilesTable.userId, userId))
    .orderBy(desc(jobIntelProfilesTable.createdAt)).limit(1);
  if (!latestProfile) return null;

  const profile: IntelProfile = {
    userId,
    careerScore: latestProfile.careerScore ?? 0,
    interviewReadiness: latestProfile.interviewReadiness,
    consistencyScore: latestProfile.consistencyScore,
    learningVelocity: latestProfile.learningVelocity,
    derivedSkills: latestProfile.derivedSkills ?? [],
    strengths: latestProfile.strengths ?? [],
    weaknesses: latestProfile.weaknesses ?? [],
    careerDirection: latestProfile.careerDirection ?? {
      dreamRole: null, targetSalary: null, targetCompany: null, currentRole: null,
      yearsOfExperience: 0, preferredCompanies: [], preferredLocations: [], industries: [],
    },
    evidenceStats: latestProfile.evidenceStats ?? {},
    insight: latestProfile.insight ?? "",
  };

  const recs = await db.select().from(jobIntelRecommendationsTable)
    .where(eq(jobIntelRecommendationsTable.profileId, latestProfile.id))
    .orderBy(desc(jobIntelRecommendationsTable.score));

  const { rows: jobs } = await pool.query(
    `SELECT id, title, company, location, is_remote, job_type, salary_min, salary_max, description, skills, experience_required, is_internship, source, source_url
     FROM jobs WHERE id = ANY($1)`,
    [recs.map(r => r.jobId)],
  ) as any;
  const jobMap = new Map((jobs as any[]).map((j: any) => [j.id, j]));

  const stale = Date.now() - latestProfile.createdAt.getTime() > 24 * 60 * 60 * 1000;

  return {
    profile,
    profileId: latestProfile.id,
    recommendations: recs.map(r => {
      const job = jobMap.get(r.jobId);
      if (!job) return null;
      return {
        id: r.id,
        job,
        score: r.score,
        breakdown: r.breakdown ?? [],
        matchedSkills: r.matchedSkills ?? [],
        missingSkills: r.missingSkills ?? [],
        reasons: r.reasons ?? [],
        improvements: r.improvements ?? [],
        competitiveness: r.competitiveness,
      };
    }).filter((x: any): x is NonNullable<typeof x> => x !== null),
    computedAt: latestProfile.createdAt.toISOString(),
    stale,
  };
}

export async function logActivity(
  userId: number,
  eventType: string,
  jobId: number | null,
  data: Record<string, unknown> = {},
): Promise<boolean> {
  const { rows } = await pool.query("SELECT ai_job_intel_consent FROM users WHERE id = $1", [userId]) as any;
  if (!rows?.[0]?.ai_job_intel_consent) return false;
  await db.insert(userActivityLogsTable).values({ userId, eventType, jobId, data });
  return true;
}
