import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, ChevronRight, BookOpen, Award, Briefcase, Target, Clock, ArrowRight, CheckCircle2, Star } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const DEGREES = [
  { id: "btech", label: "B.Tech / BE", emoji: "⚙️", desc: "Computer Science, ECE, Mechanical, Civil" },
  { id: "bca", label: "BCA", emoji: "💻", desc: "Bachelor of Computer Applications" },
  { id: "bba", label: "BBA", emoji: "📊", desc: "Bachelor of Business Administration" },
  { id: "mba", label: "MBA / PGDM", emoji: "🎯", desc: "Master of Business Administration" },
  { id: "bcom", label: "B.Com", emoji: "💰", desc: "Bachelor of Commerce / Accounting" },
  { id: "diploma", label: "Diploma / ITI", emoji: "🔧", desc: "Polytechnic / Industrial Training" },
  { id: "arts", label: "BA / Arts", emoji: "🎨", desc: "Humanities, Mass Comm, Psychology" },
  { id: "mca", label: "MCA", emoji: "🖥️", desc: "Master of Computer Applications" },
];

interface RoadmapData {
  title: string;
  timeline: string;
  skills: { name: string; priority: "high" | "medium" | "low"; category: string }[];
  certifications: { name: string; provider: string; free: boolean }[];
  careerPaths: { role: string; salary: string; companies: string[] }[];
  interviewFocus: string[];
  tips: string[];
}

const ROADMAPS: Record<string, RoadmapData> = {
  btech: {
    title: "B.Tech / BE Career Roadmap",
    timeline: "3-6 months to first job",
    skills: [
      { name: "Data Structures & Algorithms", priority: "high", category: "Core" },
      { name: "Python or Java", priority: "high", category: "Programming" },
      { name: "SQL & Databases", priority: "high", category: "Database" },
      { name: "HTML/CSS/React (for Web)", priority: "medium", category: "Web" },
      { name: "Git & GitHub", priority: "high", category: "Tools" },
      { name: "System Design Basics", priority: "medium", category: "Architecture" },
      { name: "REST APIs", priority: "medium", category: "Backend" },
      { name: "Cloud Basics (AWS/Azure)", priority: "low", category: "Cloud" },
    ],
    certifications: [
      { name: "Google IT Support", provider: "Coursera", free: true },
      { name: "AWS Cloud Practitioner", provider: "Amazon", free: false },
      { name: "Python for Everybody", provider: "Coursera", free: true },
      { name: "Full Stack Web Dev", provider: "freeCodeCamp", free: true },
    ],
    careerPaths: [
      { role: "Software Developer", salary: "₹4-12 LPA", companies: ["TCS", "Infosys", "Wipro", "HCL", "Tech Mahindra"] },
      { role: "Frontend Developer", salary: "₹5-15 LPA", companies: ["Startups", "MNCs", "Product Companies"] },
      { role: "Data Analyst", salary: "₹4-10 LPA", companies: ["Analytics firms", "Banks", "E-commerce"] },
      { role: "DevOps Engineer", salary: "₹8-20 LPA", companies: ["Amazon", "Microsoft", "Infosys"] },
    ],
    interviewFocus: ["DSA problems on LeetCode (Easy/Medium)", "OOPS concepts & system design", "Project-based questions", "HR + behavioral rounds", "Aptitude & reasoning tests"],
    tips: ["Build 2-3 personal projects on GitHub", "Solve 100+ LeetCode problems", "Contribute to open source", "Get internship via Internshala or LinkedIn"],
  },
  bca: {
    title: "BCA Career Roadmap",
    timeline: "2-4 months to first job",
    skills: [
      { name: "Python / Java", priority: "high", category: "Programming" },
      { name: "Web Development (HTML/CSS/JS)", priority: "high", category: "Web" },
      { name: "SQL & MySQL", priority: "high", category: "Database" },
      { name: "Data Structures Basics", priority: "medium", category: "Core" },
      { name: "React or Angular", priority: "medium", category: "Frontend" },
      { name: "Git & GitHub", priority: "high", category: "Tools" },
      { name: "Networking Basics", priority: "low", category: "Infrastructure" },
    ],
    certifications: [
      { name: "Web Developer Bootcamp", provider: "Udemy", free: false },
      { name: "Google Data Analytics", provider: "Coursera", free: false },
      { name: "Microsoft Office Specialist", provider: "Microsoft", free: false },
      { name: "JavaScript Algorithms", provider: "freeCodeCamp", free: true },
    ],
    careerPaths: [
      { role: "Junior Web Developer", salary: "₹2.5-6 LPA", companies: ["IT Service firms", "Agencies", "Startups"] },
      { role: "Technical Support Engineer", salary: "₹2-5 LPA", companies: ["Wipro BPS", "HCL", "Accenture"] },
      { role: "Software Tester (QA)", salary: "₹3-7 LPA", companies: ["Infosys BPM", "Cognizant", "Capgemini"] },
      { role: "Data Entry / Analyst", salary: "₹2-4 LPA", companies: ["Any industry"] },
    ],
    interviewFocus: ["Web tech fundamentals (HTML/CSS/JS)", "Basic programming questions", "Project walkthroughs", "Communication & soft skills", "Aptitude tests"],
    tips: ["Build a portfolio website showcasing projects", "Learn one frontend framework (React preferred)", "Complete at least 1 internship", "Apply to service-based companies initially"],
  },
  bba: {
    title: "BBA Career Roadmap",
    timeline: "1-3 months to first role",
    skills: [
      { name: "MS Excel & PowerPoint", priority: "high", category: "Tools" },
      { name: "Digital Marketing (SEO/SEM)", priority: "high", category: "Marketing" },
      { name: "Sales & Negotiation", priority: "high", category: "Soft Skills" },
      { name: "CRM Tools (Salesforce/HubSpot)", priority: "medium", category: "Tools" },
      { name: "Business Communication", priority: "high", category: "Soft Skills" },
      { name: "Financial Accounting Basics", priority: "medium", category: "Finance" },
      { name: "Social Media Marketing", priority: "medium", category: "Marketing" },
      { name: "Data Analysis with Excel", priority: "low", category: "Analytics" },
    ],
    certifications: [
      { name: "Google Digital Marketing", provider: "Google", free: true },
      { name: "HubSpot Sales Certification", provider: "HubSpot", free: true },
      { name: "Facebook Blueprint", provider: "Meta", free: true },
      { name: "Tally ERP 9", provider: "Tally Solutions", free: false },
    ],
    careerPaths: [
      { role: "Sales Executive", salary: "₹2.5-8 LPA + incentives", companies: ["HDFC Bank", "Axis Bank", "Insurance firms"] },
      { role: "Digital Marketing Executive", salary: "₹2.5-6 LPA", companies: ["Agencies", "E-commerce", "Startups"] },
      { role: "HR Executive", salary: "₹2.5-5 LPA", companies: ["Any industry"] },
      { role: "Business Development Associate", salary: "₹3-8 LPA", companies: ["Byju's", "Unacademy", "Ed-tech"] },
    ],
    interviewFocus: ["Case studies & GD rounds", "Sales role-play scenarios", "Current business affairs", "Leadership & teamwork examples", "MS Excel skills demonstration"],
    tips: ["Get Google and HubSpot certifications (free)", "Practice GD with friends", "Apply for sales internships first", "Build LinkedIn profile professionally"],
  },
  mba: {
    title: "MBA / PGDM Career Roadmap",
    timeline: "0-2 months to first role (campus or off-campus)",
    skills: [
      { name: "Advanced Excel & Power BI", priority: "high", category: "Analytics" },
      { name: "Strategic Thinking & Case Studies", priority: "high", category: "Business" },
      { name: "Financial Modeling", priority: "high", category: "Finance" },
      { name: "Project Management", priority: "medium", category: "Management" },
      { name: "Leadership & Team Management", priority: "high", category: "Soft Skills" },
      { name: "Supply Chain & Operations", priority: "medium", category: "Operations" },
      { name: "Market Research", priority: "medium", category: "Marketing" },
    ],
    certifications: [
      { name: "CFA Level 1 (if Finance)", provider: "CFA Institute", free: false },
      { name: "PMP Certification", provider: "PMI", free: false },
      { name: "Google Analytics", provider: "Google", free: true },
      { name: "Six Sigma Green Belt", provider: "Various", free: false },
    ],
    careerPaths: [
      { role: "Management Trainee", salary: "₹6-15 LPA", companies: ["ITC", "HUL", "Mahindra", "Tata"] },
      { role: "Business Analyst", salary: "₹8-18 LPA", companies: ["McKinsey", "Deloitte", "Accenture"] },
      { role: "Investment Banking Analyst", salary: "₹10-25 LPA", companies: ["Goldman Sachs", "JP Morgan", "Kotak"] },
      { role: "Product Manager", salary: "₹12-30 LPA", companies: ["Amazon", "Flipkart", "Ola", "Swiggy"] },
    ],
    interviewFocus: ["Case study interviews", "Group discussion performance", "Finance & market knowledge", "Leadership examples (STAR method)", "Why MBA / career goals"],
    tips: ["Crack case studies on CasePrepForum", "Network aggressively on LinkedIn", "Target alumni of your college", "Prepare for both on & off campus"],
  },
  bcom: {
    title: "B.Com Career Roadmap",
    timeline: "1-3 months to first role",
    skills: [
      { name: "Tally ERP 9 / Prime", priority: "high", category: "Accounting" },
      { name: "MS Excel (Advanced)", priority: "high", category: "Tools" },
      { name: "GST & Taxation", priority: "high", category: "Finance" },
      { name: "Financial Accounting", priority: "high", category: "Accounting" },
      { name: "Banking & Finance Basics", priority: "medium", category: "Finance" },
      { name: "Business Communication", priority: "high", category: "Soft Skills" },
      { name: "Data Analysis Basics", priority: "low", category: "Analytics" },
    ],
    certifications: [
      { name: "CA Foundation (if aspiring CA)", provider: "ICAI", free: false },
      { name: "CMA Foundation", provider: "ICMAI", free: false },
      { name: "Tally Certified Professional", provider: "Tally", free: false },
      { name: "NISM Certifications", provider: "NISM", free: false },
    ],
    careerPaths: [
      { role: "Accounts Executive", salary: "₹2-5 LPA", companies: ["CA firms", "Manufacturing", "Retail"] },
      { role: "Banking Associate", salary: "₹3-6 LPA", companies: ["SBI", "HDFC", "ICICI", "Axis Bank"] },
      { role: "Tax Consultant (after CA)", salary: "₹5-20 LPA", companies: ["Big4 firms", "Self-employed"] },
      { role: "Financial Analyst", salary: "₹4-10 LPA", companies: ["NBFCs", "Investment firms"] },
    ],
    interviewFocus: ["Accounting fundamentals", "GST & Income Tax basics", "Tally software demo", "Banking exam prep (IBPS/SBI)", "Communication skills"],
    tips: ["Get Tally certified — very valued in market", "Prepare for IBPS banking exams", "Learn Advanced Excel & pivot tables", "Apply to CA firms for articles"],
  },
  diploma: {
    title: "Diploma / ITI Career Roadmap",
    timeline: "1-3 months to first job",
    skills: [
      { name: "Core Technical Skills (your trade)", priority: "high", category: "Technical" },
      { name: "AutoCAD / SolidWorks", priority: "high", category: "Design" },
      { name: "Safety & Quality Standards", priority: "medium", category: "Compliance" },
      { name: "MS Office Basics", priority: "medium", category: "Tools" },
      { name: "Communication Skills", priority: "high", category: "Soft Skills" },
      { name: "Industrial Maintenance", priority: "medium", category: "Technical" },
    ],
    certifications: [
      { name: "AutoCAD Certification", provider: "Autodesk", free: false },
      { name: "Safety Officer (NEBOSH)", provider: "NEBOSH", free: false },
      { name: "ITI Apprenticeship", provider: "Govt of India", free: true },
      { name: "NSQF Level Certification", provider: "NSDC", free: true },
    ],
    careerPaths: [
      { role: "Junior Engineer / Technician", salary: "₹2-5 LPA", companies: ["Manufacturing plants", "Govt PSUs"] },
      { role: "Apprentice (Govt Scheme)", salary: "₹8K-15K/month stipend", companies: ["BHEL", "ONGC", "Railways"] },
      { role: "Maintenance Engineer", salary: "₹2.5-6 LPA", companies: ["Any manufacturing industry"] },
      { role: "AutoCAD Designer", salary: "₹2.5-7 LPA", companies: ["Architecture firms", "Manufacturers"] },
    ],
    interviewFocus: ["Trade-specific technical questions", "Safety procedures knowledge", "Hands-on skills demonstration", "Basic math & problem solving", "Physical fitness (for some roles)"],
    tips: ["Apply for Govt apprenticeship programmes", "Get ITI apprenticeship registration", "Learn AutoCAD for design jobs", "Target PSU companies via GATE Diploma"],
  },
  arts: {
    title: "BA / Arts Career Roadmap",
    timeline: "2-4 months to first role",
    skills: [
      { name: "Content Writing & Copywriting", priority: "high", category: "Communication" },
      { name: "Digital Marketing", priority: "high", category: "Marketing" },
      { name: "Social Media Management", priority: "high", category: "Marketing" },
      { name: "Research & Data Collection", priority: "medium", category: "Research" },
      { name: "Graphic Design (Canva/Figma)", priority: "medium", category: "Design" },
      { name: "Public Speaking & Communication", priority: "high", category: "Soft Skills" },
      { name: "MS Office", priority: "medium", category: "Tools" },
    ],
    certifications: [
      { name: "Google Digital Marketing", provider: "Google", free: true },
      { name: "Journalism & Mass Comm", provider: "Various institutes", free: false },
      { name: "Content Writing Course", provider: "Internshala", free: false },
      { name: "HR Management", provider: "Coursera", free: false },
    ],
    careerPaths: [
      { role: "Content Writer / Editor", salary: "₹2-7 LPA", companies: ["Media firms", "Startups", "Agencies"] },
      { role: "HR Executive / Recruiter", salary: "₹2.5-6 LPA", companies: ["Any industry"] },
      { role: "Social Media Manager", salary: "₹2.5-8 LPA", companies: ["Brands", "Agencies"] },
      { role: "Teacher / Educator", salary: "₹2-5 LPA", companies: ["Schools", "Ed-tech", "Coaching"] },
    ],
    interviewFocus: ["Communication & presentation skills", "Writing samples / portfolio", "Current affairs & GK", "Creativity & problem solving", "Industry-specific knowledge"],
    tips: ["Build a content portfolio on Medium or blog", "Intern at digital agencies", "Get Google certifications (free)", "Apply to ed-tech companies (Byju's, Vedantu)"],
  },
  mca: {
    title: "MCA Career Roadmap",
    timeline: "1-3 months to first role",
    skills: [
      { name: "Data Structures & Algorithms", priority: "high", category: "Core" },
      { name: "Java / Python / C++", priority: "high", category: "Programming" },
      { name: "Database Management (SQL)", priority: "high", category: "Database" },
      { name: "Web Technologies (Full Stack)", priority: "high", category: "Web" },
      { name: "Software Engineering", priority: "medium", category: "Process" },
      { name: "Cloud Computing", priority: "medium", category: "Cloud" },
      { name: "Machine Learning Basics", priority: "low", category: "AI/ML" },
    ],
    certifications: [
      { name: "Oracle Java Certification", provider: "Oracle", free: false },
      { name: "AWS Solutions Architect", provider: "Amazon", free: false },
      { name: "Full Stack Developer", provider: "Simplilearn", free: false },
      { name: "Python ML Certificate", provider: "Coursera", free: false },
    ],
    careerPaths: [
      { role: "Software Engineer", salary: "₹5-15 LPA", companies: ["TCS", "Infosys", "IBM", "Accenture"] },
      { role: "Full Stack Developer", salary: "₹6-18 LPA", companies: ["Product companies", "Startups"] },
      { role: "System Analyst", salary: "₹6-12 LPA", companies: ["Service companies", "Banks"] },
      { role: "Database Administrator", salary: "₹5-12 LPA", companies: ["Healthcare", "Banking", "IT firms"] },
    ],
    interviewFocus: ["Advanced DSA & coding", "DBMS concepts", "OOP & design patterns", "Full stack project demos", "Aptitude + verbal ability"],
    tips: ["MCA has great market value — target product companies", "Solve LeetCode Medium/Hard", "Build a full-stack capstone project", "Apply to campus drives aggressively"],
  },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-rose-100 text-rose-700 border-rose-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function CareerRoadmap() {
  const [selected, setSelected] = useState<string | null>(null);
  const roadmap = selected ? ROADMAPS[selected] : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-28 px-4 max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div key="select" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6] flex items-center justify-center mx-auto mb-4">
                  <Map className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Career Roadmap</h1>
                <p className="text-muted-foreground">Select your degree to get a personalized career action plan</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DEGREES.map((d, i) => (
                  <motion.button
                    key={d.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => setSelected(d.id)}
                    className="p-4 rounded-2xl border border-border bg-card hover:border-[#5B5CF6] hover:shadow-lg hover:shadow-violet-100 transition-all text-left group"
                  >
                    <div className="text-2xl mb-2">{d.emoji}</div>
                    <div className="font-bold text-sm group-hover:text-[#5B5CF6] transition-colors">{d.label}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-tight">{d.desc}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="roadmap" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                ← Back to degree selection
              </button>

              {roadmap && (
                <div className="space-y-5">
                  {/* Header */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white">
                    <div className="text-lg font-bold mb-1">{roadmap.title}</div>
                    <div className="flex items-center gap-2 text-violet-200 text-sm">
                      <Clock className="w-4 h-4" />
                      {roadmap.timeline}
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="p-5 rounded-2xl bg-card border border-border">
                    <div className="flex items-center gap-2 font-bold mb-4">
                      <BookOpen className="w-5 h-5 text-[#5B5CF6]" />
                      Skills to Learn
                    </div>
                    <div className="space-y-2">
                      {roadmap.skills.map((skill, i) => (
                        <motion.div
                          key={skill.name}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/40"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-[#5B5CF6] flex-shrink-0" />
                            <div>
                              <div className="font-medium text-sm">{skill.name}</div>
                              <div className="text-xs text-muted-foreground">{skill.category}</div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${PRIORITY_COLORS[skill.priority]}`}>
                            {skill.priority}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div className="p-5 rounded-2xl bg-card border border-border">
                    <div className="flex items-center gap-2 font-bold mb-4">
                      <Award className="w-5 h-5 text-amber-500" />
                      Recommended Certifications
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {roadmap.certifications.map((cert, i) => (
                        <motion.div
                          key={cert.name}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="p-3 rounded-xl border border-border bg-muted/30"
                        >
                          <div className="font-medium text-xs mb-1">{cert.name}</div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{cert.provider}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cert.free ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                              {cert.free ? "Free" : "Paid"}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Career Paths */}
                  <div className="p-5 rounded-2xl bg-card border border-border">
                    <div className="flex items-center gap-2 font-bold mb-4">
                      <Briefcase className="w-5 h-5 text-emerald-600" />
                      Career Paths & Salaries
                    </div>
                    <div className="space-y-3">
                      {roadmap.careerPaths.map((path, i) => (
                        <motion.div
                          key={path.role}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-semibold text-sm">{path.role}</div>
                            <div className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{path.salary}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{path.companies.join(" · ")}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Interview Focus */}
                  <div className="p-5 rounded-2xl bg-card border border-border">
                    <div className="flex items-center gap-2 font-bold mb-4">
                      <Target className="w-5 h-5 text-[#06B6D4]" />
                      Interview Preparation Focus
                    </div>
                    <ul className="space-y-2">
                      {roadmap.interviewFocus.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pro Tips */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200">
                    <div className="font-bold mb-3 text-violet-900">🚀 Top Tips for You</div>
                    <ul className="space-y-2">
                      {roadmap.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-violet-800">
                          <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/interview">
                      <Button className="w-full bg-gradient-to-r from-[#06B6D4] to-blue-600 text-white border-0 gap-1 text-sm">
                        Practice Interview <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href="/resume-builder">
                      <Button variant="outline" className="w-full gap-1 text-sm">
                        Build Resume <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
