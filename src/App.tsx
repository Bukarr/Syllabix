import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TopBar, BottomNav } from "@/components/AppShell";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import LessonPlanForm from "./pages/LessonPlanForm";
import MyPlans from "./pages/MyPlans";
import SchemeOfWork from "./pages/SchemeOfWork";
import CopyNoteGenerator from "./pages/CopyNoteGenerator";
import Templates from "./pages/Templates";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import InstallPrompt from "./components/InstallPrompt";
import { initNotifications } from "./lib/notifications";

// Init notification scheduling on app start
initNotifications();

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <InstallPrompt />
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
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
