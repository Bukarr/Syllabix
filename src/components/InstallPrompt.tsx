import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;

const isInStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);

  useEffect(() => {
    // Already installed or dismissed permanently
    if (isInStandaloneMode()) return;
    if (localStorage.getItem("pwa-install-dismissed")) return;

    // Listen for the native install prompt (Chrome/Edge/Samsung)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS fallback: show manual instructions after a short delay
    const timeout = setTimeout(() => {
      if (isIos()) {
        setIsIosDevice(true);
        setShowBanner(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timeout);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", "1");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-xl border border-border bg-card p-4 shadow-lg flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
          {isIosDevice ? (
            <Share className="h-5 w-5 text-primary" />
          ) : (
            <Download className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Install Syllabix NG
          </p>
          {isIosDevice ? (
            <p className="text-xs text-muted-foreground mt-1">
              Tap the <strong>Share</strong> button in Safari, then select{" "}
              <strong>"Add to Home Screen"</strong> for quick offline access.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mt-1">
                Add to your home screen for offline access &amp; a native app experience
              </p>
              <Button
                size="sm"
                onClick={handleInstall}
                className="mt-2"
              >
                Install App
              </Button>
            </>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
