import React from "react";
import { useClerk } from "@clerk/react";
import { LogOut, Wrench } from "lucide-react";
import { Technician } from "@workspace/api-client-react";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

export function PortalLayout({ profile, children }: { profile: Technician; children: React.ReactNode }) {
  const { signOut } = useClerk();
  const handleSignOut = () => {
    void signOut({ redirectUrl: import.meta.env.BASE_URL });
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans">
      <header className="pwa-safe-top sticky top-0 z-10 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="font-serif text-xl tracking-wider hidden sm:block">HOUSTON OPS</span>
            <span className="font-serif text-xl tracking-wider sm:hidden">OPS</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold leading-none uppercase tracking-wide">{profile.name}</span>
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">{profile.role}</span>
            </div>
            <div className="h-8 w-px bg-border mx-1"></div>
            <button
              onClick={handleSignOut}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PwaInstallPrompt />
        {children}
      </main>
    </div>
  );
}
