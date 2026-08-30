import { useState, useEffect, useRef } from "react";
import { Phone, MessageSquare, X, Wrench } from "lucide-react";

export function QuickActionFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [show, setShow] = useState(false);
  const firstActionRef = useRef<HTMLAnchorElement>(null);

  // Show FAB after scrolling down a bit
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShow(true);
      } else {
        setShow(false);
        setIsOpen(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleOpen = () => {
    setIsOpen((wasOpen) => {
      const willOpen = !wasOpen;
      if (willOpen) {
        requestAnimationFrame(() => firstActionRef.current?.focus());
      }
      return willOpen;
    });
  };

  const scrollToContact = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(false);
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" data-testid="quick-action-fab-container">
      {isOpen && (
        <div
          id="quick-action-menu"
          className="mb-4 flex origin-bottom-right flex-col gap-3 transition-all duration-300"
          data-testid="quick-action-menu"
        >
          <a
            ref={firstActionRef}
            href="tel:8329301444"
            className="group flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-white shadow-lg transition-colors hover:border-primary"
            data-testid="fab-call-link"
          >
            <span className="text-sm font-medium">Call Now</span>
            <div className="rounded-full bg-primary/20 p-2 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <Phone className="w-4 h-4" aria-hidden="true" />
            </div>
          </a>

          <a
            href="#contact"
            onClick={scrollToContact}
            className="group flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-white shadow-lg transition-colors hover:border-primary"
            data-testid="fab-request-help-link"
          >
            <span className="text-sm font-medium">Request Help Online</span>
            <div className="rounded-full bg-muted p-2 text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-white">
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
            </div>
          </a>
        </div>
      )}

      {/* Main Toggle Button */}
      <button
        onClick={toggleOpen}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-300 ${
          isOpen ? "bg-card border border-border text-white" : "bg-primary text-white hover:bg-primary/90 hover:scale-105"
        }`}
        data-testid="fab-toggle-button"
        aria-label={isOpen ? "Close actions menu" : "Open actions menu"}
        aria-expanded={isOpen}
        aria-controls="quick-action-menu"
      >
        {isOpen ? (
          <X className="w-6 h-6" aria-hidden="true" />
        ) : (
          <Wrench className="w-6 h-6" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
