import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { setupAuth, getToken, clearToken } from "@/lib/auth";
import { apiUrl } from "@/lib/api";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import ResumeBuilder from "@/pages/resume-builder";
import Interview from "@/pages/interview";
import ResumeScore from "@/pages/resume-score";
import JobMatch from "@/pages/job-match";
import CoverLetter from "@/pages/cover-letter";
import EnglishTool from "@/pages/english-tool";
import Premium from "@/pages/premium";
import Support from "@/pages/support";
import Legal from "@/pages/legal";
import Admin from "@/pages/admin";
import CareerRoadmap from "@/pages/career-roadmap";
import Copilot from "@/pages/copilot";
import CareerAnalytics from "@/pages/career-analytics";
import RoadmapPlanner from "@/pages/roadmap-planner";
import ResumeIntelligence from "@/pages/resume-intelligence";
import ResumeTailoring from "@/pages/resume-tailoring";
import InterviewCoach from "@/pages/interview-coach";
import PortfolioBuilder from "@/pages/portfolio-builder";
import PublicPortfolio from "@/pages/public-portfolio";
import LinkedinOptimizer from "@/pages/linkedin-optimizer";
import SalaryNegotiation from "@/pages/salary-negotiation";
import WeeklyReport from "@/pages/weekly-report";
import Assistant from "@/pages/assistant";
import PremiumHub from "@/pages/premium-hub";
import JobIntelligence from "@/pages/job-intelligence";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/resume-builder" component={ResumeBuilder} />
      <Route path="/interview" component={Interview} />
      <Route path="/resume-score" component={ResumeScore} />
      <Route path="/job-match" component={JobMatch} />
      <Route path="/cover-letter" component={CoverLetter} />
      <Route path="/english-tool" component={EnglishTool} />
      <Route path="/premium" component={Premium} />
      <Route path="/support" component={Support} />
      <Route path="/terms"><Legal type="terms" /></Route>
      <Route path="/privacy"><Legal type="privacy" /></Route>
      <Route path="/admin" component={Admin} />
      <Route path="/career-roadmap" component={CareerRoadmap} />
      <Route path="/copilot" component={Copilot} />
      <Route path="/career-analytics" component={CareerAnalytics} />
      <Route path="/roadmap-planner" component={RoadmapPlanner} />
      <Route path="/resume-intelligence" component={ResumeIntelligence} />
      <Route path="/resume-tailoring" component={ResumeTailoring} />
      <Route path="/interview-coach" component={InterviewCoach} />
      <Route path="/portfolio-builder" component={PortfolioBuilder} />
      <Route path="/linkedin-optimizer" component={LinkedinOptimizer} />
      <Route path="/salary-negotiation" component={SalaryNegotiation} />
      <Route path="/weekly-report" component={WeeklyReport} />
      <Route path="/assistant" component={Assistant} />
      <Route path="/premium-hub" component={PremiumHub} />
      <Route path="/job-intelligence" component={JobIntelligence} />
      <Route path="/p/:slug">
        {(params) => <PublicPortfolio slug={params.slug} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function TokenValidator() {
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let cancelled = false;
    fetch(apiUrl("/api/users/me"), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.status === 401 && !cancelled) {
          clearToken();
          window.location.reload();
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

function App() {
  useEffect(() => {
    setupAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <TokenValidator />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
