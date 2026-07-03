import { useEffect, useRef, lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { TopBar, BottomNav } from "@/components/AppShell";
import { Loader2 } from "lucide-react";
import Dashboard from "./pages/Dashboard";
const Onboarding = lazy(() => import("./pages/Onboarding"));
const LessonPlanForm = lazy(() => import("./pages/LessonPlanForm"));
const MyPlans = lazy(() => import("./pages/MyPlans"));
const SchemeOfWork = lazy(() => import("./pages/SchemeOfWork"));
const CopyNoteGenerator = lazy(() => import("./pages/CopyNoteGenerator"));
const Templates = lazy(() => import("./pages/Templates"));
const LessonPlanTemplates = lazy(() => import("./pages/LessonPlanTemplates"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const LessonReviewer = lazy(() => import("./pages/LessonReviewer"));
const ClassTracker = lazy(() => import("./pages/ClassTracker"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const MyResources = lazy(() => import("./pages/MyResources"));
const Auth = lazy(() => import("./pages/Auth"));
const Collaborate = lazy(() => import("./pages/Collaborate"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Contact = lazy(() => import("./pages/Contact"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const NotFound = lazy(() => import("./pages/NotFound"));
import InstallPrompt from "./components/InstallPrompt";
import { initNotifications } from "./lib/notifications";
import { getProfile } from "./lib/db";
import { initTheme } from "./lib/theme";
import { initSupportSync } from "./lib/support";

// Init notification scheduling on app start
initNotifications();

// Apply saved theme (light/dark) on app start
initTheme();

// Sync any queued offline support messages when online
initSupportSync();

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);
const ContentFallback = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);
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
        <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-background">
                <TopBar />
                <main>
                  <Suspense fallback={<ContentFallback />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/lesson-plan" element={<LessonPlanForm />} />
                    <Route path="/my-plans" element={<MyPlans />} />
                    <Route path="/scheme" element={<SchemeOfWork />} />
                    <Route path="/ai-notes" element={<CopyNoteGenerator />} />
                    <Route path="/templates" element={<Templates />} />
                    <Route path="/templates/lesson-plans" element={<LessonPlanTemplates />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/reviewer" element={<LessonReviewer />} />
                    <Route path="/class-tracker" element={<ClassTracker />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/my-resources" element={<MyResources />} />
                    <Route path="/collaborate" element={<Collaborate />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/help" element={<HelpCenter />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  </Suspense>
                </main>
                <BottomNav />
              </div>
            }
          />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
