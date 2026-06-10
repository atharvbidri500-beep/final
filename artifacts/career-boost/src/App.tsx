import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { setupAuth } from "@/lib/auth";
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
import Admin from "@/pages/admin";
import CareerRoadmap from "@/pages/career-roadmap";

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
      <Route path="/admin" component={Admin} />
      <Route path="/career-roadmap" component={CareerRoadmap} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    setupAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
