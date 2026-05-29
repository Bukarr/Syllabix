import { useEffect, useRef } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { TopBar, BottomNav } from "@/components/AppShell";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import LessonPlanForm from "./pages/LessonPlanForm";
import MyPlans from "./pages/MyPlans";
import SchemeOfWork from "./pages/SchemeOfWork";
import CopyNoteGenerator from "./pages/CopyNoteGenerator";
import Templates from "./pages/Templates";
import SettingsPage from "./pages/Settings";
import LessonReviewer from "./pages/LessonReviewer";
import ClassTracker from "./pages/ClassTracker";
import Portfolio from "./pages/Portfolio";
import MyResources from "./pages/MyResources";
import Auth from "./pages/Auth";
import Collaborate from "./pages/Collaborate";
import NotFound from "./pages/NotFound";
import InstallPrompt from "./components/InstallPrompt";
import { initNotifications } from "./lib/notifications";
import { getProfile } from "./lib/db";
import { initTheme } from "./lib/theme";

// Init notification scheduling on app start
initNotifications();

// Apply saved theme (light/dark) on app start
initTheme();

const queryClient = new QueryClient();
const FLOW_READY_KEY = "syllabix:flow-ready";
const LAST_ROUTE_KEY = "syllabix:last-route";

function FlowPersistence() {
  const location = useLocation();
  const navigate = useNavigate();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const hasVisited = sessionStorage.getItem(FLOW_READY_KEY) === "true";
    sessionStorage.setItem(FLOW_READY_KEY, "true");

    const canRestoreFrom = location.pathname === "/" || location.pathname === "/onboarding";
    if (!hasVisited || !canRestoreFrom) return;

    let cancelled = false;

    void (async () => {
      const profile = await getProfile();
      const lastRoute = sessionStorage.getItem(LAST_ROUTE_KEY);

      if (cancelled || !profile?.onboardingComplete) return;

      if (lastRoute && lastRoute !== location.pathname && lastRoute !== "/onboarding") {
        navigate(lastRoute, { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname === "/onboarding" || location.pathname === "/auth") return;

    sessionStorage.setItem(
      LAST_ROUTE_KEY,
      `${location.pathname}${location.search}${location.hash}`,
    );
  }, [location.hash, location.pathname, location.search]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <InstallPrompt />
      <BrowserRouter>
        <FlowPersistence />
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-background">
                <TopBar />
                <main>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/lesson-plan" element={<LessonPlanForm />} />
                    <Route path="/my-plans" element={<MyPlans />} />
                    <Route path="/scheme" element={<SchemeOfWork />} />
                    <Route path="/ai-notes" element={<CopyNoteGenerator />} />
                    <Route path="/templates" element={<Templates />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/reviewer" element={<LessonReviewer />} />
                    <Route path="/class-tracker" element={<ClassTracker />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/my-resources" element={<MyResources />} />
                    <Route path="/collaborate" element={<Collaborate />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <BottomNav />
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
