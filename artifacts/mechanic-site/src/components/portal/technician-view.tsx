import React, { useState, useEffect, useRef, useCallback } from "react";
import { AvailableServiceCall, Technician, ServiceCall, TechnicianNotification } from "@workspace/api-client-react";
import { useClaimServiceCall, useGetAvailableServiceCallPreview, useGetTechnicianDashboard, useGetTechnicianNotifications, useListAvailableServiceCalls, useMarkTechnicianNotificationRead, useUpdateTechnicianAvailability, useUpdateServiceCallStatus, useUpdateServiceCallTrackingSharing, useUpdateServiceCallTrackingLocation, getGetTechnicianProfileQueryKey, getGetTechnicianDashboardQueryKey, getGetTechnicianNotificationsQueryKey, getListAvailableServiceCallsQueryKey, getGetAvailableServiceCallPreviewQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, BellRing, CheckCircle, Clock, FileText, Info, Loader2, MapPin, Navigation, NavigationOff, Phone, RotateCw, Truck, Activity, User, Wrench } from "lucide-react";
import { ServiceCallChat } from "./service-call-chat";
import { TechnicianProfileEdit } from "./technician-profile-edit";
import { TechnicianReceipts } from "./technician-receipts";

function TechnicianTrackingControls({ call }: { call: ServiceCall }) {
  const queryClient = useQueryClient();
  const updateSharing = useUpdateServiceCallTrackingSharing();
  const updateLocation = useUpdateServiceCallTrackingLocation();

  const [etaInput, setEtaInput] = useState<string>(call.tracking?.etaMinutes?.toString() || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const sharingRef = useRef(call.tracking?.sharing || false);
  const updateSharingMutate = useRef(updateSharing.mutate);
  const updateLocationMutate = useRef(updateLocation.mutate);
  updateSharingMutate.current = updateSharing.mutate;
  updateLocationMutate.current = updateLocation.mutate;

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTracking();
      if (sharingRef.current) {
        updateSharingMutate.current({ id: call.id, data: { sharing: false } });
      }
    };
  }, [call.id, stopTracking]);

  const parsedEta = () => {
    if (etaInput.trim() === "") return null;
    const eta = Number(etaInput);
    return Number.isInteger(eta) && eta >= 0 && eta <= 1440 ? eta : null;
  };

  const handleStartSharing = () => {
    setErrorMsg(null);
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    const etaMinutes = parsedEta();
    if (etaInput.trim() !== "" && etaMinutes === null) {
      setErrorMsg("Enter an ETA from 0 to 1440 minutes.");
      return;
    }

    updateSharing.mutate({
      id: call.id,
      data: {
        sharing: true,
        etaMinutes,
      }
    }, {
      onSuccess: () => {
        sharingRef.current = true;
        queryClient.invalidateQueries({ queryKey: getGetTechnicianDashboardQueryKey() });

        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            updateLocationMutate.current({
              id: call.id,
              data: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracyMeters: position.coords.accuracy,
              }
            });
          },
          (error) => {
            setErrorMsg(error.message || "Failed to get location.");
            handleStopSharing();
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
      },
      onError: () => {
        setErrorMsg("Failed to start sharing.");
      }
    });
  };

  const handleStopSharing = () => {
    stopTracking();
    updateSharing.mutate({ id: call.id, data: { sharing: false } }, {
      onSuccess: () => {
        sharingRef.current = false;
        queryClient.invalidateQueries({ queryKey: getGetTechnicianDashboardQueryKey() });
      }
    });
  };

  const handleUpdateEta = () => {
    const etaMinutes = parsedEta();
    if (etaInput.trim() !== "" && etaMinutes === null) {
      setErrorMsg("Enter an ETA from 0 to 1440 minutes.");
      return;
    }
    updateSharing.mutate({
      id: call.id,
      data: {
        sharing: call.tracking?.sharing || false,
        etaMinutes,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTechnicianDashboardQueryKey() });
      }
    });
  };

  if (!call.tracking || !call.tracking.active) {
    return null; // Tracking not configured for this call by admin
  }

  const isExpired = new Date(call.tracking.expiresAt) < new Date();
  if (isExpired) {
    return (
      <div className="bg-card border border-destructive/20 rounded p-4 text-sm mt-4">
        <p className="text-destructive font-bold uppercase tracking-widest text-[10px]">Tracking Link Expired</p>
      </div>
    );
  }

  const isSharing = call.tracking.sharing;

  return (
    <div className={`bg-card border rounded p-4 text-sm mt-4 transition-colors ${isSharing ? 'border-primary shadow-[0_0_15px_rgba(255,106,0,0.1)]' : 'border-border'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Navigation className={`w-4 h-4 ${isSharing ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
        <h4 className={`font-bold text-xs uppercase tracking-wider ${isSharing ? 'text-primary' : 'text-foreground'}`}>
          {isSharing ? 'Live Tracking Active' : 'Location Tracking Off'}
        </h4>
      </div>

      {errorMsg && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded p-2 mb-3 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mb-3">
        <div className="flex items-center bg-input border border-border rounded px-3 py-1">
          <Clock className="w-4 h-4 text-muted-foreground mr-2" />
          <input
            type="number"
            min="0"
            max="1440"
            placeholder="ETA in mins"
            value={etaInput}
            onChange={(e) => setEtaInput(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground outline-none font-bold"
          />
        </div>
        {isSharing && (
          <button
            onClick={handleUpdateEta}
            disabled={updateSharing.isPending}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/80 transition-colors"
          >
            Update ETA
          </button>
        )}
      </div>

      {isSharing ? (
        <button
          onClick={handleStopSharing}
          disabled={updateSharing.isPending}
          className="w-full flex items-center justify-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-destructive/90 transition-colors disabled:opacity-50"
        >
          {updateSharing.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <NavigationOff className="w-3 h-3" />}
          Stop Sharing Location
        </button>
      ) : (
        <button
          onClick={handleStartSharing}
          disabled={updateSharing.isPending}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {updateSharing.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
          Start Sharing Location
        </button>
      )}
    </div>
  );
}

function DispatchAlerts({
  notifications,
  unreadCount,
  onMarkRead,
  isMarkingRead,
}: {
  notifications: TechnicianNotification[];
  unreadCount: number;
  onMarkRead: (id: number) => void;
  isMarkingRead: boolean;
}) {
  return (
    <section className="rounded-lg border border-primary/30 bg-card p-5 sm:p-6 shadow-[0_4px_20px_-10px_rgba(255,106,0,0.16)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/30 bg-primary/10 text-primary">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Dispatch alerts</p>
            <h2 className="mt-1 font-serif text-xl tracking-wide text-foreground">NEW CALL NOTIFICATIONS</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Alerts are sent by SMS when a dispatch is posted. Customer contact details stay private until Dispatch assigns the call.
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            {unreadCount} new
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="mt-5 rounded border border-dashed border-border bg-background/60 px-4 py-4 text-sm text-muted-foreground">
          No dispatch alerts yet. Keep your mobile number current so you can receive SMS alerts when you are away from the portal.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`rounded border p-4 ${notification.readAt ? "border-border bg-background/60" : "border-primary/40 bg-primary/5"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground">{notification.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/80">{notification.body}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Dispatch #{notification.callId} · {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                {!notification.readAt && (
                  <button
                    type="button"
                    onClick={() => onMarkRead(notification.id)}
                    disabled={isMarkingRead}
                    className="shrink-0 rounded border border-primary/40 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                  >
                    {isMarkingRead ? "Saving…" : "Mark reviewed"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function AvailableJobs() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const availableJobs = useListAvailableServiceCalls({
    query: {
      queryKey: getListAvailableServiceCallsQueryKey(),
      refetchInterval: 15_000,
      retry: false,
    },
  });
  const jobPreview = useGetAvailableServiceCallPreview(selectedJobId ?? 0, {
    query: {
      queryKey: getGetAvailableServiceCallPreviewQueryKey(selectedJobId ?? 0),
      enabled: selectedJobId !== null,
      retry: false,
    },
  });
  const claimJob = useClaimServiceCall();
  const jobs = availableJobs.data ?? [];

  const claim = (job: ServiceCall) => {
    if (!window.confirm(`Accept this ${job.serviceType} job? Customer details will be added to your active assignments.`)) return;
    setFeedback(null);
    setClaimingId(job.id);
    claimJob.mutate({ id: job.id }, {
      onSuccess: async () => {
        setFeedback("Job accepted. Customer details are now available in Active Assignments.");
        setSelectedJobId(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListAvailableServiceCallsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetTechnicianDashboardQueryKey() }),
        ]);
      },
      onError: (error) => {
        setFeedback(
          (error as { status?: number }).status === 409
            ? "That job was just accepted by another technician and is no longer available."
            : "This job could not be accepted. Refresh the list and try again.",
        );
        void queryClient.invalidateQueries({ queryKey: getListAvailableServiceCallsQueryKey() });
      },
      onSettled: () => setClaimingId(null),
    });
  };

  return (
    <section aria-labelledby="available-jobs-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="available-jobs-heading" className="font-serif text-2xl text-foreground flex items-center gap-3 tracking-wider">
            <Wrench className="w-6 h-6 text-primary" />
            AVAILABLE JOBS
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Open a job to review the service details and location, then decide whether to accept it. The customer phone number stays private until then.</p>
        </div>
        <span className="rounded border border-primary/25 bg-primary/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">Refreshes every 15 seconds</span>
      </div>

      {feedback && <div className="mb-4 rounded border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground" role="status">{feedback}</div>}

      {availableJobs.isLoading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading available jobs…</div>
      ) : availableJobs.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-foreground">Available jobs could not be loaded.</p>
          <button type="button" onClick={() => availableJobs.refetch()} className="mt-3 text-xs font-bold uppercase tracking-widest text-primary">Try again</button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-lg border border-border border-dashed bg-card p-8 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-muted/50" />
          <p className="mt-3 font-medium text-foreground">No open jobs right now.</p>
          <p className="mt-1 text-sm text-muted-foreground">New unassigned Dispatch jobs will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {jobs.map((job) => (
            <article key={job.id} className="rounded-lg border border-primary/30 bg-card p-5 shadow-[0_4px_20px_-12px_rgba(255,106,0,0.22)]" data-testid={`card-available-job-${job.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Job type</p>
                  <h3 className="mt-1 font-serif text-xl uppercase tracking-wide text-foreground">{job.serviceCategory.replaceAll("_", " ")} service</h3>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vehicle</p>
                  <p className="mt-1 text-sm font-bold uppercase tracking-wide text-foreground">
                    {[job.vehicleYear, job.vehicleMake, job.vehicleModel].filter(Boolean).join(" ") || job.vehicleCategory.replaceAll("_", " ")}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <span className="rounded border border-border bg-background px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{job.dispatchLane}</span>
                  <span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${job.urgency === "urgent" ? "border-destructive/35 bg-destructive/10 text-destructive" : job.urgency === "soon" ? "border-yellow-500/35 bg-yellow-500/10 text-yellow-500" : "border-green-500/30 bg-green-500/10 text-green-500"}`}>{job.urgency}</span>
                </div>
              </div>
              <p className="mt-4 rounded border border-border/60 bg-background p-3 text-sm leading-relaxed text-foreground/80">Service notes, customer identity, contact details, and exact location are shared only after acceptance.</p>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /><span>{job.locationArea ?? "Houston area"}{job.locationZip ? ` · ZIP ${job.locationZip}` : ""}</span></div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0" /><span>{job.scheduledAt ? new Date(job.scheduledAt).toLocaleString() : "Schedule with Dispatch"}</span></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <span className={`font-bold ${job.technicianPaySetAt ? "text-lg text-foreground" : "text-xs uppercase tracking-widest text-yellow-500"}`}>
                  {job.technicianPaySetAt ? `PAY: $${(job.payCents / 100).toFixed(2)}` : "Pay pending"}
                </span>
                <button type="button" onClick={() => { setFeedback(null); setSelectedJobId(job.id); }} className="rounded border border-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground" data-testid={`button-view-job-${job.id}`}>
                  View Job
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedJobId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="job-preview-heading">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-primary/30 bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Dispatch job preview</p>
                <h2 id="job-preview-heading" className="mt-1 font-serif text-2xl uppercase tracking-wide text-foreground">Review before accepting</h2>
              </div>
              <button type="button" onClick={() => setSelectedJobId(null)} className="rounded border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary" aria-label="Close job preview">
                Close
              </button>
            </div>

            {jobPreview.isLoading ? (
              <div className="flex items-center justify-center py-12 text-primary"><Loader2 className="h-7 w-7 animate-spin" /></div>
            ) : jobPreview.isError || !jobPreview.data ? (
              <div className="py-10 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
                <p className="mt-3 text-sm text-foreground">This job is no longer available to review.</p>
                <button type="button" onClick={() => { setSelectedJobId(null); void availableJobs.refetch(); }} className="mt-4 text-xs font-bold uppercase tracking-widest text-primary">Back to available jobs</button>
              </div>
            ) : (
              <div className="space-y-5 pt-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Job type</p><p className="mt-1 text-lg font-bold uppercase text-foreground">{jobPreview.data.serviceType}</p></div>
                  <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vehicle</p><p className="mt-1 text-lg font-bold uppercase text-foreground">{jobPreview.data.vehicleType}</p></div>
                  <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer</p><p className="mt-1 text-sm font-bold text-foreground">{jobPreview.data.name}</p></div>
                  <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone</p><p className="mt-1 text-sm font-bold text-muted-foreground">Shared after acceptance</p></div>
                </div>
                <div className="rounded border border-border bg-background p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Service location</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{jobPreview.data.location ?? "Location to be confirmed with Dispatch"}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Service requested</p><p className="mt-1 text-sm leading-relaxed text-foreground">{jobPreview.data.description || jobPreview.data.serviceType}</p></div>
                  <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dispatch notes</p><p className="mt-1 text-sm leading-relaxed text-foreground">{jobPreview.data.notes || "No additional notes."}</p></div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border pt-4 text-[10px] font-bold uppercase tracking-widest">
                  <span className="rounded border border-border bg-background px-2 py-1 text-muted-foreground">{jobPreview.data.dispatchLane}</span>
                  <span className={`rounded border px-2 py-1 ${jobPreview.data.urgency === "urgent" ? "border-destructive/35 bg-destructive/10 text-destructive" : jobPreview.data.urgency === "soon" ? "border-yellow-500/35 bg-yellow-500/10 text-yellow-500" : "border-green-500/30 bg-green-500/10 text-green-500"}`}>{jobPreview.data.urgency}</span>
                  <span className="rounded border border-border bg-background px-2 py-1 text-muted-foreground">{jobPreview.data.scheduledAt ? new Date(jobPreview.data.scheduledAt).toLocaleString() : "Schedule with Dispatch"}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                  <span className={`font-bold ${jobPreview.data.technicianPaySetAt ? "text-lg text-foreground" : "text-xs uppercase tracking-widest text-yellow-500"}`}>{jobPreview.data.technicianPaySetAt ? `PAY: $${(jobPreview.data.payCents / 100).toFixed(2)}` : "Pay pending"}</span>
                  <button type="button" onClick={() => claim(jobPreview.data!)} disabled={claimingId === selectedJobId} className="rounded bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50" data-testid={`button-claim-job-${selectedJobId}`}>
                    {claimingId === selectedJobId ? "Accepting…" : "Accept Job"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function TechnicianView({ profile }: { profile: Technician }) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "profile" | "receipts">("dashboard");

  return (
    <div className="space-y-8">
      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-border hide-scrollbar">
        {[
          { id: "dashboard", label: "Dashboard", icon: Activity },
          { id: "receipts", label: "Receipts", icon: FileText },
          { id: "profile", label: "My Profile", icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-serif uppercase tracking-wider whitespace-nowrap transition-colors relative ${
                isActive 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              data-testid={`tab-technician-${tab.id}`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        {activeTab === "dashboard" && <TechnicianDashboardContent profile={profile} />}
        {activeTab === "receipts" && <TechnicianReceipts />}
        {activeTab === "profile" && <TechnicianProfileEdit />}
      </div>
    </div>
  );
}

function TechnicianDashboardContent({ profile }: { profile: Technician }) {
  const queryClient = useQueryClient();
  const {
    data: dashboard,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useGetTechnicianDashboard({
    query: {
      queryKey: getGetTechnicianDashboardQueryKey(),
      retry: false,
    },
  });
  const updateAvailability = useUpdateTechnicianAvailability();
  const {
    data: notificationFeed,
  } = useGetTechnicianNotifications({
    query: {
      queryKey: getGetTechnicianNotificationsQueryKey(),
      refetchInterval: 15_000,
      retry: false,
    },
  });
  const markNotificationRead = useMarkTechnicianNotificationRead();

  const handleAvailabilityChange = (availability: "available" | "busy" | "offline") => {
    updateAvailability.mutate({ data: { availability } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTechnicianProfileQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTechnicianDashboardQueryKey() });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="max-w-xl mx-auto border border-destructive/30 bg-card rounded-lg p-8 text-center">
        <AlertCircle className="w-9 h-9 mx-auto mb-4 text-destructive" />
        <h2 className="font-serif text-2xl text-foreground tracking-wide">DASHBOARD UNAVAILABLE</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Your assignments could not be loaded. Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-60"
        >
          <RotateCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "RETRYING..." : "RETRY DASHBOARD"}
        </button>
      </div>
    );
  }

  const activeCalls = dashboard.calls.filter(c => c.status === "assigned" || c.status === "in_progress");
  const callsWithPayPending = activeCalls.filter((call) => !call.technicianPaySetAt).length;
  const notifications = notificationFeed?.notifications ?? [];
  const unreadNotifications = notificationFeed?.unreadCount ?? 0;

  const handleMarkNotificationRead = (id: number) => {
    markNotificationRead.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTechnicianNotificationsQueryKey() }),
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Section: Availability & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-between shadow-sm">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Current Status</h3>
          <div className="flex gap-2">
            {(["available", "busy", "offline"] as const).map((status) => (
              <button
                key={status}
                onClick={() => handleAvailabilityChange(status)}
                disabled={updateAvailability.isPending}
                className={`flex-1 py-2 px-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                  profile.availability === status
                    ? status === 'available' ? 'bg-green-500/10 text-green-500 border border-green-500/50'
                      : status === 'busy' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/50'
                      : 'bg-muted text-muted-foreground border border-border'
                    : 'bg-background border border-border hover:border-primary/50 text-muted-foreground'
                }`}
                data-testid={`button-status-${status}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Expected Earnings</h3>
          <p className="text-4xl font-serif text-primary tracking-wide" data-testid="stat-earnings">${(dashboard.earningsCents / 100).toFixed(2)}</p>
          {callsWithPayPending > 0 && (
            <p className="mt-2 text-xs text-yellow-500">{callsWithPayPending} active {callsWithPayPending === 1 ? "call has" : "calls have"} pay pending.</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Completed Calls</h3>
          <p className="text-4xl font-serif text-foreground tracking-wide" data-testid="stat-completed-calls">{dashboard.completedCalls}</p>
        </div>
      </div>

      <AvailableJobs />

      <DispatchAlerts
        notifications={notifications}
        unreadCount={unreadNotifications}
        onMarkRead={handleMarkNotificationRead}
        isMarkingRead={markNotificationRead.isPending}
      />

      {/* Active Calls */}
      <div>
        <h2 className="font-serif text-2xl mb-6 text-foreground flex items-center gap-3 tracking-wider">
          <Truck className="w-6 h-6 text-primary" />
          ACTIVE ASSIGNMENTS
        </h2>
        {activeCalls.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-lg p-12 text-center text-muted-foreground flex flex-col items-center">
            <CheckCircle className="w-12 h-12 mb-4 text-muted/50" />
            <p className="font-medium text-foreground">No active service calls at the moment.</p>
            <p className="text-sm mt-2">Make sure your status is set to AVAILABLE.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeCalls.map(call => (
              <div key={call.id} className="bg-card border border-primary/30 rounded-lg p-6 shadow-[0_4px_20px_-10px_rgba(255,106,0,0.15)] flex flex-col" data-testid={`card-assignment-${call.id}`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-serif text-2xl text-foreground uppercase tracking-wide">{call.vehicleType}</h3>
                    <p className="text-primary font-bold uppercase tracking-wider text-sm mt-1">{call.serviceType}</p>
                  </div>
                  <div className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded border border-primary/20">
                    {call.status.replace('_', ' ')}
                  </div>
                </div>
                
                <div className="space-y-4 text-sm text-foreground/80 mb-8 flex-1">
                  <div className="flex items-start gap-3 bg-background p-3 rounded border border-border/50">
                    <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span>{call.description}</span>
                  </div>
                  {call.location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="font-medium">{call.location}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                    {call.phone ? (
                      <span className="font-medium">{call.name} <span className="text-muted-foreground mx-1">•</span> {call.phone}</span>
                    ) : (
                      <span>
                        <span className="font-medium">{call.name}</span>
                        <span className="text-muted-foreground"> — contact number is private. Use Service Chat; Dispatch can reveal it if needed.</span>
                      </span>
                    )}
                  </div>
                </div>

                <TechnicianTrackingControls call={call} />
                <ServiceCallChat callId={call.id} currentUserRole="technician" isClosed={["completed", "cancelled"].includes(call.status)} />

                <div className="border-t border-border pt-5 flex justify-between items-center mt-6">
                  <span className={`font-serif tracking-wide ${call.technicianPaySetAt ? "text-xl text-foreground" : "text-sm font-bold text-yellow-500 uppercase"}`}>
                    {call.technicianPaySetAt ? `PAY: $${(call.payCents / 100).toFixed(2)}` : "Pay to be set by dispatch"}
                  </span>
                  <CallStatusUpdater callId={call.id} currentStatus={call.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CallStatusUpdater({ callId, currentStatus }: { callId: number, currentStatus: string }) {
  const queryClient = useQueryClient();
  const updateStatus = useUpdateServiceCallStatus();

  const handleUpdate = (status: "assigned" | "in_progress" | "completed") => {
    updateStatus.mutate({ id: callId, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTechnicianDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: ['/api/service-calls'] });
      }
    });
  };

  if (currentStatus === "assigned") {
    return (
      <button 
        onClick={() => handleUpdate("in_progress")}
        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded text-sm font-bold uppercase tracking-wider transition-colors shadow-lg shadow-primary/20"
        disabled={updateStatus.isPending}
        data-testid={`button-start-call-${callId}`}
      >
        {updateStatus.isPending ? "UPDATING..." : "START WORK"}
      </button>
    );
  }

  if (currentStatus === "in_progress") {
    return (
      <button 
        onClick={() => handleUpdate("completed")}
        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded text-sm font-bold uppercase tracking-wider transition-colors shadow-lg shadow-green-600/20"
        disabled={updateStatus.isPending}
        data-testid={`button-complete-call-${callId}`}
      >
        {updateStatus.isPending ? "UPDATING..." : "MARK COMPLETE"}
      </button>
    );
  }

  return null;
}
