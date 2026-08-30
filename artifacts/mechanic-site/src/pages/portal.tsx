import React from "react";
import {
  getGetTechnicianProfileQueryKey,
  useGetTechnicianProfile,
} from "@workspace/api-client-react";
import { PortalLayout } from "@/components/portal/portal-layout";
import { TechnicianView } from "@/components/portal/technician-view";
import { AdminView } from "@/components/portal/admin-view";
import { AlertCircle, Loader2, RotateCw } from "lucide-react";

export default function PortalPage() {
  const {
    data: profile,
    isLoading,
    error,
    isFetching,
    refetch,
  } = useGetTechnicianProfile({
    query: {
      queryKey: getGetTechnicianProfileQueryKey(),
      retry: false,
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 text-primary">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="font-serif uppercase tracking-[0.2em] text-sm">AUTHENTICATING OPS...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    const status = (error as { status?: number } | null)?.status;
    const isAccessError = status === 401 || status === 403;

    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground p-4">
        <div className="max-w-md w-full p-8 bg-card border border-destructive/30 rounded-lg text-center shadow-[0_8px_30px_-10px_rgba(239,68,68,0.15)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-destructive" />
          <AlertCircle className="w-9 h-9 mx-auto mb-4 text-destructive" />
          <h2 className="text-destructive font-serif text-3xl mb-3 tracking-wide">
            {isAccessError ? "ACCESS DENIED" : "PORTAL UNAVAILABLE"}
          </h2>
          <p className="text-foreground/80 mb-6 leading-relaxed">
            {isAccessError
              ? "You must be signed in as an active technician or administrator to view the operations portal."
              : "The operations portal could not load. The service may be restarting or temporarily unavailable."}
          </p>
          {isAccessError ? (
            <p className="text-[11px] font-bold text-primary uppercase tracking-widest bg-primary/10 py-3 rounded border border-primary/20">
              Check with your administrator if you need access.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded text-[11px] font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-60"
            >
              <RotateCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? "RETRYING..." : "TRY AGAIN"}
            </button>
          )}
        </div>
      </div>
    );
  }

  const isAdmin = profile.role === "owner" || profile.role === "admin";

  return (
    <PortalLayout profile={profile}>
      {isAdmin ? <AdminView profile={profile} /> : <TechnicianView profile={profile} />}
    </PortalLayout>
  );
}
