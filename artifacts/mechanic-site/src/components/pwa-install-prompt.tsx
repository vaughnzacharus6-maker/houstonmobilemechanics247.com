import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "houston-ops-pwa-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || window.localStorage.getItem(DISMISS_KEY) === "true") return;

    const ios =
      /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
      !("MSStream" in window);
    setIsIos(ios);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    if (ios) setVisible(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "true");
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setInstallEvent(null);
  };

  if (!visible) return null;

  return (
    <aside className="mb-6 flex items-start gap-4 rounded-lg border border-primary/30 bg-primary/10 p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        {isIos ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-base uppercase tracking-wide text-foreground">Install Houston Ops</p>
        {isIos ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Tap <strong className="text-foreground">Share</strong>, then choose{" "}
            <strong className="text-foreground">Add to Home Screen</strong> for one-tap access.
          </p>
        ) : (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Add the technician portal to your phone for fast access to dispatch jobs, alerts, chat, and tracking.
          </p>
        )}
        {!isIos && installEvent && (
          <Button className="mt-3 h-9 px-4 text-xs font-bold uppercase tracking-wider" onClick={() => void install()}>
            <Download className="mr-2 h-4 w-4" /> Add to Home Screen
          </Button>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
        aria-label="Dismiss install instructions"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}