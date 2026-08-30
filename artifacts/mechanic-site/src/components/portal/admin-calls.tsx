import React, { useState } from "react";
import { 
  useListServiceCalls, 
  useListTechnicians, 
  useAssignServiceCall, 
  useUpdateServiceCallStatus, 
  useUpdateServiceCallPay, 
  useUpdateServiceCallPhoneSharing,
  useRecordServiceCallDeposit, 
  useCreateServiceCallTrackingLink, 
  useRevokeServiceCallTrackingLink, 
  useGetTrackingSmsStatus, 
  useCreateServiceCall, 
  useUpdateServiceCall,
  useDeleteServiceCall,
  useExtractCallIntake, 
  getListServiceCallsQueryKey, 
  getGetTechnicianDashboardQueryKey, 
  getListPhoneIntakesQueryKey,
  getGetPhoneIntakeStatusQueryKey,
  useApprovePhoneIntake,
  useGetPhoneIntakeStatus,
  useListPhoneIntakes,
  useProcessPhoneIntakeRecording,
  useListCallNotificationDeliveries,
  useRetryCallNotification,
  getListCallNotificationDeliveriesQueryKey,
  ServiceCall, 
  Technician, 
  CallIntakeExtraction,
  PhoneIntake,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, DollarSign, Check, X, Receipt, ShieldCheck, ClipboardPenLine, Sparkles, AlertTriangle, Plus, Save, Link as LinkIcon, Link2Off, Copy, MapPin, PhoneIncoming, FileAudio, Clock3, ShieldAlert, Eye, EyeOff, BellRing, RotateCw } from "lucide-react";
import { ServiceCallChat } from "./service-call-chat";

type DepositMethod = "zelle" | "cash_app" | "venmo" | "apple_pay" | "cash" | "other";

function AdminTrackingControls({ call }: { call: ServiceCall }) {
  const queryClient = useQueryClient();
  const createLink = useCreateServiceCallTrackingLink();
  const revokeLink = useRevokeServiceCallTrackingLink();
  const { data: smsStatus } = useGetTrackingSmsStatus();

  const [sendSms, setSendSms] = useState(true);
  const [expiresHours, setExpiresHours] = useState(24);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canHaveTracking = (call.status === "assigned" || call.status === "in_progress") &&
                          call.assignedTechnicianId !== null &&
                          (call.depositStatus === "stripe_verified" || call.depositStatus === "manually_verified");

  if (!canHaveTracking) return null;

  const handleCreate = () => {
    createLink.mutate({
      id: call.id,
      data: {
        expiresInHours: expiresHours,
        sendSms: smsStatus?.configured ? sendSms : false
      }
    }, {
      onSuccess: (data) => {
        setGeneratedUrl(data.url);
        setFeedback(data.smsSent ? "Link created and sent by SMS." : "Link created. Copy it before leaving this call.");
        queryClient.invalidateQueries({ queryKey: getListServiceCallsQueryKey() });
      },
      onError: () => setFeedback("Could not create the tracking link. Please try again."),
    });
  };

  const copyGeneratedLink = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setFeedback("Tracking link copied.");
    } catch {
      setFeedback("Select and copy the link below.");
    }
  };

  const handleRevoke = () => {
    if (window.confirm("Revoke this tracking link? The customer will immediately lose access.")) {
      revokeLink.mutate({ id: call.id }, {
        onSuccess: () => {
          setGeneratedUrl(null);
          setFeedback("Tracking link revoked.");
          queryClient.invalidateQueries({ queryKey: getListServiceCallsQueryKey() });
        },
        onError: () => setFeedback("Could not revoke the tracking link."),
      });
    }
  };

  const tracking = call.tracking;
  const isExpired = tracking && new Date(tracking.expiresAt) < new Date();
  const hasActiveLink = Boolean(tracking?.active && !isExpired);

  return (
    <div className="bg-card border border-border rounded p-4 text-sm mt-4">
      <div className="flex items-center gap-3 mb-3">
        <MapPin className="w-5 h-5 text-primary" />
        <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Live Tracking</h4>
      </div>

      {tracking && hasActiveLink ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded px-3 py-2 text-primary">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${tracking.active ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
              <span className="font-bold text-[10px] uppercase tracking-widest">
                {tracking.active ? "Active" : "Inactive"}
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-widest opacity-80">
              Expires {new Date(tracking.expiresAt).toLocaleTimeString()}
            </span>
          </div>

          {generatedUrl ? (
            <div className="flex gap-2">
              <input
                readOnly
                value={generatedUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 bg-input border border-border rounded px-3 py-2 text-xs text-foreground outline-none"
                aria-label="Private customer tracking link"
              />
              <button
                onClick={copyGeneratedLink}
                className="flex items-center justify-center gap-2 bg-input hover:bg-input/80 border border-border text-foreground px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Link is active. For privacy, it can only be copied when it is created or delivered by SMS.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleRevoke}
              disabled={revokeLink.isPending}
              className="w-full flex items-center justify-center gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors"
            >
              {revokeLink.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2Off className="w-3 h-3" />} Revoke
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {call.tracking && (
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
              Previous link {isExpired ? "expired" : "was revoked"}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Duration (Hrs)</label>
              <input
                type="number"
                min="1"
                max="72"
                value={expiresHours}
                onChange={e => setExpiresHours(parseInt(e.target.value) || 24)}
                className="w-full bg-input border border-border rounded px-3 py-1.5 text-sm font-bold text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            {smsStatus?.configured && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer h-[32px]">
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={e => setSendSms(e.target.checked)}
                    className="accent-primary w-4 h-4"
                  />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Send SMS</span>
                </label>
              </div>
            )}
          </div>
          {!smsStatus?.configured && (
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              SMS delivery will appear after an SMS provider is connected.
            </p>
          )}
          <button
            onClick={handleCreate}
            disabled={createLink.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {createLink.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <LinkIcon className="w-3 h-3" />}
            Generate Tracking Link
          </button>
        </div>
      )}
      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
    </div>
  );
}
export function AdminCalls({ canManageCustomerPhones }: { canManageCustomerPhones: boolean }) {
  const { data: calls = [], isLoading: callsLoading } = useListServiceCalls();
  const { data: techs = [], isLoading: techsLoading } = useListTechnicians();
  const { data: smsStatus } = useGetTrackingSmsStatus();
  const [filter, setFilter] = useState("all");
  const [showIntake, setShowIntake] = useState(false);

  if (callsLoading || techsLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const filteredCalls = calls.filter(c => filter === "all" || c.status === filter).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex flex-wrap gap-2">
          {["all", "new", "assigned", "in_progress", "completed", "cancelled"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors ${
                filter === status
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowIntake((open) => !open)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded font-bold uppercase tracking-widest text-[10px] sm:text-xs hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          {showIntake ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showIntake ? "Close intake" : "New service call"}
        </button>
      </div>

      <section className={`rounded-lg border px-4 py-3 ${smsStatus?.configured ? "border-green-500/25 bg-green-500/[0.04]" : "border-yellow-500/30 bg-yellow-500/[0.05]"}`}>
        <div className="flex items-start gap-3">
          <BellRing className={`mt-0.5 h-5 w-5 shrink-0 ${smsStatus?.configured ? "text-green-500" : "text-yellow-500"}`} />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">
              {smsStatus?.configured ? "Twilio dispatch SMS ready" : "Twilio dispatch SMS paused"}
              {smsStatus?.senderNumber ? ` · ${smsStatus.senderNumber}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {smsStatus?.statusText ?? "Checking the managed Twilio connection and configured sender number…"}
            </p>
            {!smsStatus?.configured && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Trial accounts can text only verified recipient numbers. Repair the connection and add an SMS-capable Twilio sender before sending live alerts.
              </p>
            )}
          </div>
        </div>
      </section>
      {showIntake && <ServiceCallIntake onClose={() => setShowIntake(false)} />}
      <IncomingPhoneIntakeQueue />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredCalls.map(call => (
          <AdminCallCard key={call.id} call={call} techs={techs} canManageCustomerPhones={canManageCustomerPhones} />
        ))}
        {filteredCalls.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground bg-card border border-border border-dashed rounded-lg">
            No calls match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}

type Urgency = "routine" | "soon" | "urgent";
type DispatchLane = "general" | "roadside";

type IntakeDraft = {
  name: string;
  phone: string;
  email: string;
  serviceType: string;
  vehicleType: string;
  description: string;
  urgency: Urgency;
  notes: string;
  location: string;
  dispatchLane: DispatchLane;
  technicianPay: string;
};

const emptyDraft: IntakeDraft = {
  name: "",
  phone: "",
  email: "",
  serviceType: "",
  vehicleType: "",
  description: "",
  urgency: "routine",
  notes: "",
  location: "",
  dispatchLane: "general",
  technicianPay: "",
};

function optionalPayCents(value: string): number | undefined | null {
  if (!value.trim()) return undefined;
  const cents = Math.round(Number(value) * 100);
  return Number.isFinite(cents) && cents >= 0 ? cents : null;
}

function ServiceCallIntake({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const extractIntake = useExtractCallIntake();
  const createCall = useCreateServiceCall();
  const [summary, setSummary] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [draft, setDraft] = useState<IntakeDraft>(emptyDraft);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [uncertainFields, setUncertainFields] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const applyExtraction = (extraction: CallIntakeExtraction) => {
    setDraft({
      name: extraction.name ?? "",
      phone: extraction.phone ?? "",
      email: extraction.email ?? "",
      serviceType: extraction.serviceType ?? "",
      vehicleType: extraction.vehicleType ?? "",
      description: extraction.description ?? "",
      urgency: extraction.urgency ?? "routine",
      notes: extraction.notes ?? "",
      location: extraction.location ?? "",
      dispatchLane: "general",
      technicianPay: "",
    });
    setMissingFields(extraction.missingFields);
    setUncertainFields(extraction.uncertainFields);
    setMessage("");
    setReviewOpen(true);
  };

  const handleExtract = () => {
    const trimmedSummary = summary.trim();
    if (trimmedSummary.length < 10) {
      setMessage("Paste a longer Google Voice summary before extracting customer details.");
      return;
    }

    setMessage("");
    extractIntake.mutate(
      { data: { summary: trimmedSummary } },
      {
        onSuccess: applyExtraction,
        onError: () => {
          setMessage("We could not extract that summary. You can still enter the service call manually below.");
        },
      },
    );
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const requiredMissing = [
      ["name", draft.name],
      ["phone number", draft.phone],
      ["vehicle type", draft.vehicleType],
      ["service needed", draft.serviceType],
      ["issue description", draft.description],
    ]
      .filter(([, value]) => !value.trim())
      .map(([label]) => label);

    if (requiredMissing.length > 0) {
      setMissingFields(requiredMissing);
      setMessage("Complete the highlighted required details before creating this service call.");
      return;
    }
    const payCents = optionalPayCents(draft.technicianPay);
    if (payCents === null) {
      setMessage("Enter a valid technician pay amount or leave it blank to mark pay as not set.");
      return;
    }

    createCall.mutate(
      {
        data: {
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          email: draft.email.trim() || null,
          vehicleType: draft.vehicleType.trim(),
          serviceType: draft.serviceType.trim(),
          location: draft.location.trim() || null,
          description: draft.description.trim(),
          urgency: draft.urgency,
          notes: draft.notes.trim() || null,
          dispatchLane: draft.dispatchLane,
          ...(payCents === undefined ? {} : { payCents }),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServiceCallsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTechnicianDashboardQueryKey() });
          onClose();
        },
        onError: () => {
          setMessage("The service call could not be created. Please review the details and try again.");
        },
      },
    );
  };

  const updateField = <Key extends keyof IntakeDraft>(field: Key, value: IntakeDraft[Key]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setMissingFields((current) => current.filter((item) => item.toLowerCase() !== field.toLowerCase()));
  };

  return (
    <section className="bg-card border border-primary/35 rounded-lg p-5 sm:p-6 shadow-[0_0_26px_rgba(249,115,22,0.08)]">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded bg-primary/15 border border-primary/25 text-primary flex items-center justify-center shrink-0">
            <ClipboardPenLine className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.18em]">Google Voice AI intake</p>
            <h3 className="font-serif text-2xl text-foreground uppercase tracking-wide mt-1">Create a service call</h3>
            <p className="text-sm text-muted-foreground mt-1">Paste the AI summary, review every field, then create the real Dispatch record.</p>
          </div>
        </div>
        <button onClick={onClose} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground self-start">
          Close
        </button>
      </div>

      {!reviewOpen ? (
        <div className="space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Paste Google Voice AI summary</span>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={8}
              maxLength={20000}
              placeholder="Paste the Google Voice AI summary here. It will prepare a draft; nothing is saved until you review and create the service call."
              className="mt-2 w-full bg-background border border-border rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </label>
          {message && <IntakeMessage text={message} />}
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={handleExtract}
              disabled={extractIntake.isPending}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded font-bold uppercase tracking-widest text-[10px] hover:bg-primary/90 disabled:opacity-60"
            >
              {extractIntake.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {extractIntake.isPending ? "Extracting details..." : "Extract customer info"}
            </button>
            <button
              onClick={() => {
                setMessage("");
                setReviewOpen(true);
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              Enter details manually instead
            </button>
          </div>
          <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3 leading-relaxed">
            The summary is used only to prepare this draft. It is not saved with the service call unless you copy information into the editable fields below.
          </p>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="space-y-5">
          {(missingFields.length > 0 || uncertainFields.length > 0) && (
            <div className="grid md:grid-cols-2 gap-3">
              {missingFields.length > 0 && (
                <div className="border border-yellow-500/30 bg-yellow-500/5 rounded p-3">
                  <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-2">Review missing details</p>
                  <p className="text-xs text-foreground/80">{missingFields.join(" • ")}</p>
                </div>
              )}
              {uncertainFields.length > 0 && (
                <div className="border border-primary/30 bg-primary/5 rounded p-3">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Confirm uncertain details</p>
                  <p className="text-xs text-foreground/80">{uncertainFields.join(" • ")}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IntakeField label="Customer name *" value={draft.name} onChange={(value) => updateField("name", value)} />
            <IntakeField label="Phone number *" type="tel" value={draft.phone} onChange={(value) => updateField("phone", value)} />
            <IntakeField label="Email" type="email" value={draft.email} onChange={(value) => updateField("email", value)} />
            <IntakeField label="Address / location" value={draft.location} onChange={(value) => updateField("location", value)} />
            <IntakeField label="Vehicle type *" value={draft.vehicleType} onChange={(value) => updateField("vehicleType", value)} placeholder="e.g. SUV, Pickup Truck, Semi Truck" />
            <IntakeField label="Service needed *" value={draft.serviceType} onChange={(value) => updateField("serviceType", value)} placeholder="e.g. Battery / Electrical" />
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dispatch lane</span>
              <select value={draft.dispatchLane} onChange={(event) => updateField("dispatchLane", event.target.value as DispatchLane)} className="mt-1.5 w-full bg-input border border-border rounded px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary">
                <option value="general">General service</option>
                <option value="roadside">Roadside assistance only</option>
              </select>
            </label>
            <IntakeField label="Technician pay (optional)" type="number" value={draft.technicianPay} onChange={(value) => updateField("technicianPay", value)} placeholder="Leave blank if not set" />
          </div>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Issue description *</span>
            <textarea
              required
              rows={3}
              value={draft.description}
              onChange={(event) => updateField("description", event.target.value)}
              className="mt-1.5 w-full bg-input border border-border rounded px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Urgency</span>
              <select
                value={draft.urgency}
                onChange={(event) => updateField("urgency", event.target.value as Urgency)}
                className="mt-1.5 w-full bg-input border border-border rounded px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="routine">Routine</option>
                <option value="soon">Soon</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Special notes</span>
              <textarea
                rows={2}
                value={draft.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Gate code, parking details, customer request, etc."
                className="mt-1.5 w-full bg-input border border-border rounded px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </label>
          </div>

          {message && <IntakeMessage text={message} />}
          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={() => setReviewOpen(false)}
              className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Back to summary
            </button>
            <button
              type="submit"
              disabled={createCall.isPending}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded font-bold uppercase tracking-widest text-[10px] hover:bg-primary/90 disabled:opacity-60"
            >
              {createCall.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {createCall.isPending ? "Creating call..." : "Create service call"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function phoneDraftToIntakeDraft(intake: PhoneIntake): IntakeDraft {
  return {
    name: intake.draft?.name ?? "",
    phone: intake.draft?.phone ?? intake.callerNumber,
    email: intake.draft?.email ?? "",
    serviceType: intake.draft?.serviceType ?? "",
    vehicleType: intake.draft?.vehicleType ?? "",
    description: intake.draft?.description ?? "",
    urgency: intake.draft?.urgency ?? "routine",
    notes: intake.draft?.notes ?? "",
    location: intake.draft?.location ?? "",
    dispatchLane: "general",
    technicianPay: "",
  };
}

function IncomingPhoneIntakeQueue() {
  const queryClient = useQueryClient();
  const { data: configuration, isLoading: isLoadingConfiguration } = useGetPhoneIntakeStatus();
  const { data: intakes = [], isLoading: isLoadingIntakes } = useListPhoneIntakes();
  const processRecording = useProcessPhoneIntakeRecording();
  const [selectedIntakeId, setSelectedIntakeId] = useState<number | null>(null);
  const pendingIntakes = intakes.filter((intake) => intake.draftStatus !== "approved");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListPhoneIntakesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPhoneIntakeStatusQueryKey() });
  };

  const handleProcess = (id: number) => {
    setSelectedIntakeId(null);
    processRecording.mutate(
      { id },
      {
        onSuccess: refresh,
        onError: refresh,
      },
    );
  };

  if (isLoadingConfiguration || isLoadingIntakes) {
    return (
      <section className="border border-border bg-card rounded-lg px-5 py-6 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        Loading phone intake line…
      </section>
    );
  }

  return (
    <section className="border border-primary/30 bg-card rounded-lg overflow-hidden shadow-[0_0_24px_rgba(249,115,22,0.06)]">
      <div className="p-5 sm:p-6 border-b border-border/70">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded bg-primary/15 border border-primary/25 text-primary flex items-center justify-center">
              <PhoneIncoming className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.18em]">AI phone intake line</p>
              <h3 className="font-serif text-2xl text-foreground uppercase tracking-wide mt-1">Inbound calls awaiting review</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Calls receive a recording notice first. A dispatcher must review and approve the AI draft before a service call exists or any customer or technician message can be sent.
              </p>
            </div>
          </div>
          <div className={`rounded border px-3 py-2 text-xs font-semibold ${configuration?.configured ? "border-green-500/30 bg-green-500/10 text-green-500" : "border-yellow-500/30 bg-yellow-500/5 text-yellow-500"}`}>
            {configuration?.configured
              ? `Twilio line active · ${configuration.businessNumber}`
              : "Phone line is not configured"}
          </div>
        </div>
        {!configuration?.configured && (
          <div className="mt-4 flex items-start gap-2 rounded border border-yellow-500/25 bg-yellow-500/5 px-3 py-2.5 text-xs text-foreground/85">
            <ShieldAlert className="w-4 h-4 shrink-0 text-yellow-500 mt-0.5" />
            <span>Set the business number and Twilio webhook credentials before forwarding calls here. Unsigned calls are rejected; this app will not accept a recording without that provider verification.</span>
          </div>
        )}
        <p className="mt-4 text-[11px] text-muted-foreground">
          Recordings are never shown in the portal. Owner and admin accounts can request transcription only; the audio is deleted from Twilio after {configuration?.retentionDays ?? 30} days, while the private transcript and reviewed intake remain for dispatch records.
        </p>
      </div>

      {processRecording.isPending && (
        <div className="flex items-center gap-2 px-5 py-3 bg-primary/5 text-xs text-primary border-b border-primary/15">
          <Loader2 className="w-4 h-4 animate-spin" />
          Downloading the consented recording, creating a transcript, and preparing the draft…
        </div>
      )}

      <div className="p-5 sm:p-6 space-y-4">
        {pendingIntakes.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-border rounded text-sm text-muted-foreground">
            No unapproved inbound phone calls. New consented recordings will appear here for review.
          </div>
        ) : pendingIntakes.map((intake) => (
          <PhoneIntakeCard
            key={intake.id}
            intake={intake}
            selected={selectedIntakeId === intake.id}
            processing={processRecording.isPending}
            onProcess={() => handleProcess(intake.id)}
            onReview={() => setSelectedIntakeId((current) => current === intake.id ? null : intake.id)}
            onApproved={() => {
              setSelectedIntakeId(null);
              refresh();
            }}
          />
        ))}
      </div>
    </section>
  );
}

function PhoneIntakeCard({
  intake,
  selected,
  processing,
  onProcess,
  onReview,
  onApproved,
}: {
  intake: PhoneIntake;
  selected: boolean;
  processing: boolean;
  onProcess: () => void;
  onReview: () => void;
  onApproved: () => void;
}) {
  const canProcess = intake.draftStatus === "awaiting_transcription" || intake.draftStatus === "failed";
  const reviewReady = intake.draftStatus === "ready_for_review";
  const receivedAt = new Date(intake.receivedAt).toLocaleString();
  const retentionAt = intake.recordingRetentionExpiresAt
    ? new Date(intake.recordingRetentionExpiresAt).toLocaleString()
    : null;

  return (
    <article className="rounded border border-border bg-background/30 overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-foreground">{intake.callerNumber}</span>
            <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{intake.draftStatus.replaceAll("_", " ")}</span>
            <span className="text-[11px] text-muted-foreground">{intake.durationSeconds == null ? "Duration unavailable" : `${intake.durationSeconds}s recorded`}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> Received {receivedAt}</span>
            <span className="inline-flex items-center gap-1"><FileAudio className="w-3.5 h-3.5" /> Consent: {intake.consentState.replaceAll("_", " ")}</span>
            {retentionAt && <span>Retention metadata expires {retentionAt}</span>}
          </div>
          {intake.failureReason && (
            <p className="mt-3 text-xs text-destructive border-l-2 border-destructive/60 pl-2.5">{intake.failureReason}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {canProcess && (
            <button
              onClick={onProcess}
              disabled={processing || intake.recordingStatus === "expired"}
              className="inline-flex items-center gap-2 rounded bg-primary text-primary-foreground px-3.5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-60"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {intake.draftStatus === "failed" ? "Retry AI intake" : "Transcribe & draft"}
            </button>
          )}
          {reviewReady && (
            <button
              onClick={onReview}
              className="inline-flex items-center gap-2 rounded border border-primary/40 text-primary px-3.5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10"
            >
              <ClipboardPenLine className="w-4 h-4" />
              {selected ? "Close review" : "Review draft"}
            </button>
          )}
        </div>
      </div>
      {intake.transcript && (
        <details className="mx-4 sm:mx-5 mb-4 rounded border border-border/75 bg-card px-3 py-2.5">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Read private transcript</summary>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85 mt-3">{intake.transcript}</p>
        </details>
      )}
      {selected && reviewReady && (
        <PhoneIntakeReview key={`${intake.id}-${intake.updatedAt}`} intake={intake} onApproved={onApproved} />
      )}
    </article>
  );
}

function PhoneIntakeReview({ intake, onApproved }: { intake: PhoneIntake; onApproved: () => void }) {
  const queryClient = useQueryClient();
  const approveIntake = useApprovePhoneIntake();
  const [draft, setDraft] = useState<IntakeDraft>(() => phoneDraftToIntakeDraft(intake));
  const [message, setMessage] = useState("");
  const missingFields = intake.draft?.missingFields ?? [];
  const uncertainFields = intake.draft?.uncertainFields ?? [];

  const updateField = <Key extends keyof IntakeDraft>(field: Key, value: IntakeDraft[Key]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleApproval = (event: React.FormEvent) => {
    event.preventDefault();
    const missing = [
      ["customer name", draft.name],
      ["phone number", draft.phone],
      ["vehicle type", draft.vehicleType],
      ["service needed", draft.serviceType],
      ["issue description", draft.description],
    ].filter(([, value]) => !value.trim()).map(([label]) => label);
    if (missing.length > 0) {
      setMessage(`Complete ${missing.join(", ")} before approving this draft.`);
      return;
    }
    const payCents = optionalPayCents(draft.technicianPay);
    if (payCents === null) {
      setMessage("Enter a valid technician pay amount or leave it blank to mark pay as not set.");
      return;
    }
    approveIntake.mutate(
      {
        id: intake.id,
        data: {
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          email: draft.email.trim() || null,
          serviceType: draft.serviceType.trim(),
          vehicleType: draft.vehicleType.trim(),
          description: draft.description.trim(),
          urgency: draft.urgency,
          notes: draft.notes.trim() || null,
          location: draft.location.trim() || null,
          dispatchLane: draft.dispatchLane,
          ...(payCents === undefined ? {} : { payCents }),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServiceCallsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTechnicianDashboardQueryKey() });
          onApproved();
        },
        onError: () => setMessage("The draft could not be approved. Review the details and try again."),
      },
    );
  };

  return (
    <form onSubmit={handleApproval} className="border-t border-primary/20 bg-primary/[0.03] p-4 sm:p-5 space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Dispatcher review required</p>
        <p className="text-sm text-muted-foreground mt-1">Correct the AI draft before approval. Approval creates one new dispatch call; it does not send any message.</p>
      </div>
      {(missingFields.length > 0 || uncertainFields.length > 0) && (
        <div className="grid md:grid-cols-2 gap-3">
          {missingFields.length > 0 && <IntakeMessage text={`AI could not confirm: ${missingFields.join(" • ")}`} />}
          {uncertainFields.length > 0 && <IntakeMessage text={`AI needs confirmation: ${uncertainFields.join(" • ")}`} />}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IntakeField label="Customer name *" value={draft.name} onChange={(value) => updateField("name", value)} />
        <IntakeField label="Caller phone *" type="tel" value={draft.phone} onChange={(value) => updateField("phone", value)} />
        <IntakeField label="Email" type="email" value={draft.email} onChange={(value) => updateField("email", value)} />
        <IntakeField label="Address / location" value={draft.location} onChange={(value) => updateField("location", value)} />
        <IntakeField label="Vehicle type *" value={draft.vehicleType} onChange={(value) => updateField("vehicleType", value)} />
        <IntakeField label="Service needed *" value={draft.serviceType} onChange={(value) => updateField("serviceType", value)} />
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dispatch lane</span>
          <select value={draft.dispatchLane} onChange={(event) => updateField("dispatchLane", event.target.value as DispatchLane)} className="mt-1.5 w-full bg-input border border-border rounded px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary">
            <option value="general">General service</option>
            <option value="roadside">Roadside assistance only</option>
          </select>
        </label>
        <IntakeField label="Technician pay (optional)" type="number" value={draft.technicianPay} onChange={(value) => updateField("technicianPay", value)} placeholder="Leave blank if not set" />
      </div>
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Issue description *</span>
        <textarea required rows={3} value={draft.description} onChange={(event) => updateField("description", event.target.value)} className="mt-1.5 w-full bg-input border border-border rounded px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary resize-y" />
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Urgency</span>
          <select value={draft.urgency} onChange={(event) => updateField("urgency", event.target.value as Urgency)} className="mt-1.5 w-full bg-input border border-border rounded px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary">
            <option value="routine">Routine</option>
            <option value="soon">Soon</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Special notes</span>
          <textarea rows={2} value={draft.notes} onChange={(event) => updateField("notes", event.target.value)} className="mt-1.5 w-full bg-input border border-border rounded px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary resize-y" />
        </label>
      </div>
      {message && <IntakeMessage text={message} />}
      <div className="flex justify-end pt-3 border-t border-border/60">
        <button type="submit" disabled={approveIntake.isPending} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded font-bold uppercase tracking-widest text-[10px] hover:bg-primary/90 disabled:opacity-60">
          {approveIntake.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {approveIntake.isPending ? "Approving…" : "Approve into dispatch"}
        </button>
      </div>
    </form>
  );
}

function IntakeField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full bg-input border border-border rounded px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function IntakeMessage({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5 text-xs text-foreground/85">
      <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function DispatchNotificationDelivery({ callId }: { callId: number }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useListCallNotificationDeliveries(callId, {
    query: {
      queryKey: getListCallNotificationDeliveriesQueryKey(callId),
      refetchInterval: 15_000,
      retry: false,
    },
  });
  const retryNotification = useRetryCallNotification();
  const deliveries = data?.deliveries ?? [];
  const broadcastStatus = data?.broadcastStatus;
  const broadcastFailureReason = data?.broadcastFailureReason;
  const smsDeliveries = deliveries.filter((delivery) => delivery.channel === "sms");
  const sentSms = smsDeliveries.filter((delivery) => delivery.deliveryStatus === "sent").length;
  const failedSms = smsDeliveries.filter((delivery) => delivery.deliveryStatus === "failed");
  const unknownSms = smsDeliveries.filter((delivery) => delivery.deliveryStatus === "unknown");
  const broadcastStatusLabel = {
    queued: "Queued",
    processing: "Preparing",
    complete: "Complete",
    needs_attention: "Needs attention",
  } as const;
  const broadcastStatusStyles = {
    queued: "border-yellow-500/30 bg-yellow-500/10 text-yellow-500",
    processing: "border-primary/30 bg-primary/10 text-primary",
    complete: "border-green-500/30 bg-green-500/10 text-green-500",
    needs_attention: "border-destructive/30 bg-destructive/10 text-destructive",
  } as const;

  const retry = (notificationId: number) => {
    retryNotification.mutate(
      { id: callId, notificationId, data: { notificationId } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCallNotificationDeliveriesQueryKey(callId) }),
      },
    );
  };

  return (
    <div className="rounded border border-primary/25 bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <BellRing className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Technician broadcast</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isLoading
                ? "Loading notification delivery status…"
                : isError
                  ? "Delivery status is unavailable right now."
                  : broadcastStatus === "queued"
                    ? "Broadcast queued. Technician alerts are waiting to be prepared."
                    : broadcastStatus === "processing"
                      ? "Broadcast is being prepared. Recipient results will appear shortly."
                      : broadcastStatus === "needs_attention"
                        ? `Broadcast needs attention${broadcastFailureReason ? `: ${broadcastFailureReason}` : "."}`
                        : smsDeliveries.length === 0
                    ? "No active technicians with a mobile number were available when this call was posted."
                    : `${sentSms} of ${smsDeliveries.length} technician SMS alerts sent.`}
            </p>
          </div>
        </div>
        {!isLoading && !isError && broadcastStatus && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${broadcastStatusStyles[broadcastStatus]}`}>
              {broadcastStatusLabel[broadcastStatus]}
            </span>
            {broadcastStatus === "complete" && (
              <span className="rounded border border-primary/25 bg-background px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground">
                {deliveries.filter((delivery) => delivery.channel === "in_app").length} in-app
              </span>
            )}
          </div>
        )}
      </div>

      {(failedSms.length > 0 || unknownSms.length > 0) && (
        <div className="mt-3 space-y-2 border-t border-primary/15 pt-3">
          {[...failedSms, ...unknownSms].map((delivery) => (
            <div key={delivery.id} className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-foreground">{delivery.technicianName}</span>
                <span className="text-muted-foreground"> — {delivery.failureReason || "SMS delivery failed."}</span>
              </div>
              {delivery.deliveryStatus === "failed" ? (
                <button
                  type="button"
                  onClick={() => retry(delivery.id)}
                  disabled={retryNotification.isPending}
                  className="inline-flex items-center gap-1.5 rounded border border-primary/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  {retryNotification.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
                  Retry SMS
                </button>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500">
                  Verify before re-sending
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminCallCard({ call, techs, canManageCustomerPhones }: { call: ServiceCall, techs: Technician[], canManageCustomerPhones: boolean }) {
  const queryClient = useQueryClient();
  const assignCall = useAssignServiceCall();
  const updateStatus = useUpdateServiceCallStatus();
  const updatePay = useUpdateServiceCallPay();
  const updatePhoneSharing = useUpdateServiceCallPhoneSharing();
  const recordDeposit = useRecordServiceCallDeposit();
  const updateCall = useUpdateServiceCall();
  const deleteCall = useDeleteServiceCall();

  const [isEditingCall, setIsEditingCall] = useState(false);
  const [editDraft, setEditDraft] = useState<IntakeDraft>(() => ({
    name: call.name,
    phone: call.phone ?? "",
    email: call.email ?? "",
    serviceType: call.serviceType,
    vehicleType: call.vehicleType,
    description: call.description,
    urgency: call.urgency as Urgency,
    notes: call.notes ?? "",
    location: call.location ?? "",
    dispatchLane: call.dispatchLane as DispatchLane,
    technicianPay: call.technicianPaySetAt ? (call.payCents / 100).toFixed(2) : "",
  }));
  const [callFeedback, setCallFeedback] = useState<string | null>(null);
  const [isEditingPay, setIsEditingPay] = useState(false);
  const [payInput, setPayInput] = useState(call.technicianPaySetAt ? (call.payCents / 100).toFixed(2) : "");
  const [isEditingDeposit, setIsEditingDeposit] = useState(false);
  const [depositMethod, setDepositMethod] = useState<DepositMethod>((call.depositMethod as DepositMethod | null) || "zelle");
  const [depositAmount, setDepositAmount] = useState(((call.depositAmountCents || 5000) / 100).toFixed(2));
  const [depositReference, setDepositReference] = useState(call.depositReference || "");

  const handleAssign = (techId: number) => {
    if (isNaN(techId)) return;
    assignCall.mutate({ id: call.id, data: { technicianId: techId } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListServiceCallsQueryKey() })
    });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateStatus.mutate({ id: call.id, data: { status: e.target.value as any } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListServiceCallsQueryKey() })
    });
  };

  const handlePaySubmit = () => {
    const cents = Math.round(parseFloat(payInput) * 100);
    if (!isNaN(cents) && cents >= 0) {
      updatePay.mutate({ id: call.id, data: { payCents: cents } }, {
        onSuccess: () => {
          setIsEditingPay(false);
          queryClient.invalidateQueries({ queryKey: getListServiceCallsQueryKey() });
        }
      });
    }
  };

  const handlePhoneSharing = () => {
    if (!call.assignedTechnicianId) return;
    const shared = !call.phoneSharedWithTechnicianAt;
    const confirmation = shared
      ? "Reveal this customer's phone number to the assigned technician? This approval is recorded and can be revoked later."
      : "Hide this customer's phone number from the assigned technician?";
    if (!window.confirm(confirmation)) return;
    updatePhoneSharing.mutate(
      { id: call.id, data: { shared } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListServiceCallsQueryKey() }),
      },
    );
  };

  const handleDepositSubmit = () => {
    const cents = Math.round(parseFloat(depositAmount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return;
    recordDeposit.mutate(
      {
        id: call.id,
        data: {
          method: depositMethod,
          amountCents: cents,
          reference: depositReference.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setIsEditingDeposit(false);
          queryClient.invalidateQueries({ queryKey: getListServiceCallsQueryKey() });
        },
      },
    );
  };

  const openCallEditor = () => {
    setEditDraft({
      name: call.name,
      phone: call.phone ?? "",
      email: call.email ?? "",
      serviceType: call.serviceType,
      vehicleType: call.vehicleType,
      description: call.description,
      urgency: call.urgency as Urgency,
      notes: call.notes ?? "",
      location: call.location ?? "",
      dispatchLane: call.dispatchLane as DispatchLane,
      technicianPay: call.technicianPaySetAt ? (call.payCents / 100).toFixed(2) : "",
    });
    setCallFeedback(null);
    setIsEditingCall(true);
  };

  const updateEditField = <Key extends keyof IntakeDraft>(field: Key, value: IntakeDraft[Key]) => {
    setEditDraft((current) => ({ ...current, [field]: value }));
  };

  const handleCallEditSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const missing = [
      ["customer name", editDraft.name],
      ...(canManageCustomerPhones ? [["phone number", editDraft.phone]] : []),
      ["vehicle type", editDraft.vehicleType],
      ["service needed", editDraft.serviceType],
      ["issue description", editDraft.description],
    ].filter(([, value]) => !value.trim()).map(([label]) => label);
    if (missing.length > 0) {
      setCallFeedback(`Complete ${missing.join(", ")} before saving this call.`);
      return;
    }
    const payCents = optionalPayCents(editDraft.technicianPay);
    if (payCents === null) {
      setCallFeedback("Enter a valid technician pay amount or leave it blank to mark pay as not set.");
      return;
    }

    updateCall.mutate(
      {
        id: call.id,
        data: {
          name: editDraft.name.trim(),
          ...(canManageCustomerPhones ? { phone: editDraft.phone.trim() } : {}),
          email: editDraft.email.trim() || null,
          vehicleType: editDraft.vehicleType.trim(),
          serviceType: editDraft.serviceType.trim(),
          location: editDraft.location.trim() || null,
          description: editDraft.description.trim(),
          urgency: editDraft.urgency,
          notes: editDraft.notes.trim() || null,
          dispatchLane: editDraft.dispatchLane,
          payCents: payCents ?? null,
        },
      },
      {
        onSuccess: () => {
          setIsEditingCall(false);
          setCallFeedback("Service call details saved.");
          queryClient.invalidateQueries({ queryKey: getListServiceCallsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTechnicianDashboardQueryKey() });
        },
        onError: () => setCallFeedback("The service call could not be saved. Please review the details and try again."),
      },
    );
  };

  const handleDeleteCall = () => {
    if (!window.confirm(`Delete the service call for ${call.name}? This permanently removes the call, its tracking link, chat messages, notification records, and notification queue entry. This cannot be undone.`)) {
      return;
    }
    setCallFeedback(null);
    deleteCall.mutate(
      { id: call.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServiceCallsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTechnicianDashboardQueryKey() });
        },
        onError: () => setCallFeedback("This call could not be deleted. Active or completed calls and calls with an in-flight technician alert must remain in dispatch history."),
      },
    );
  };

  const statusColors: Record<string, string> = {
    new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    assigned: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    in_progress: "bg-primary/10 text-primary border-primary/20",
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };
  const eligibleTechnicians = techs.filter(
    (technician) =>
      technician.role === "technician" &&
      technician.active &&
      technician.dispatchLane === call.dispatchLane,
  );

  return (
    <div className={`bg-card border ${call.status === 'new' ? 'border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-border'} rounded-lg p-5 flex flex-col gap-5 transition-all`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${statusColors[call.status] || "bg-muted text-muted-foreground border-transparent"}`}>
              {call.status.replace("_", " ")}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${call.dispatchLane === "roadside" ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}>
              {call.dispatchLane === "roadside" ? "Roadside" : "General"}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{new Date(call.createdAt).toLocaleString()}</span>
          </div>
          <h4 className="font-serif text-2xl text-foreground uppercase tracking-wide">{call.vehicleType}</h4>
          <p className="text-sm font-bold text-primary uppercase tracking-wider">{call.serviceType}</p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCallEditor}
              disabled={deleteCall.isPending}
              className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:border-primary/50 hover:text-primary disabled:opacity-50"
            >
              <ClipboardPenLine className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={handleDeleteCall}
              disabled={deleteCall.isPending || updateCall.isPending}
              className="inline-flex items-center gap-1.5 rounded border border-destructive/35 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              {deleteCall.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              Delete
            </button>
          </div>
          <div className="text-right">
            {isEditingPay ? (
              <div className="flex items-center gap-1 bg-background p-1 rounded border border-border">
                <span className="text-muted-foreground text-sm pl-2">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payInput}
                  onChange={e => setPayInput(e.target.value)}
                  className="w-16 bg-transparent text-foreground focus:outline-none text-sm font-mono"
                />
                <button onClick={handlePaySubmit} className="text-green-500 p-1 hover:bg-green-500/20 rounded transition-colors" title="Save">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => { setIsEditingPay(false); setPayInput((call.payCents / 100).toFixed(2)); }} className="text-destructive p-1 hover:bg-destructive/20 rounded transition-colors" title="Cancel">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 group cursor-pointer" onClick={() => setIsEditingPay(true)} title="Edit Pay">
                <span className={`font-serif tracking-wide ${call.technicianPaySetAt ? "text-2xl text-foreground" : "text-sm text-yellow-500 font-bold uppercase"}`}>
                  {call.technicianPaySetAt ? `$${(call.payCents / 100).toFixed(2)}` : "Pay not set"}
                </span>
                <DollarSign className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditingCall && (
        <form onSubmit={handleCallEditSubmit} className="rounded border border-primary/35 bg-primary/5 p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Edit dispatch call</p>
              <p className="text-xs text-muted-foreground mt-1">Assignment, phone-sharing access, deposits, tracking, and notification history stay unchanged.</p>
            </div>
            <button type="button" onClick={() => setIsEditingCall(false)} className="text-muted-foreground hover:text-foreground" aria-label="Cancel service call edit">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IntakeField label="Customer name *" value={editDraft.name} onChange={(value) => updateEditField("name", value)} />
            {canManageCustomerPhones ? (
              <IntakeField label="Phone number *" type="tel" value={editDraft.phone} onChange={(value) => updateEditField("phone", value)} />
            ) : (
              <div className="rounded border border-border bg-background px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone number</p>
                <p className="mt-1 text-xs text-muted-foreground">Owner-only phone access. Saving other details keeps this number unchanged.</p>
              </div>
            )}
            <IntakeField label="Email" type="email" value={editDraft.email} onChange={(value) => updateEditField("email", value)} />
            <IntakeField label="Address / location" value={editDraft.location} onChange={(value) => updateEditField("location", value)} />
            <IntakeField label="Vehicle type *" value={editDraft.vehicleType} onChange={(value) => updateEditField("vehicleType", value)} />
            <IntakeField label="Service needed *" value={editDraft.serviceType} onChange={(value) => updateEditField("serviceType", value)} />
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dispatch lane</span>
              <select value={editDraft.dispatchLane} disabled={Boolean(call.assignedTechnicianId)} onChange={(event) => updateEditField("dispatchLane", event.target.value as DispatchLane)} className="mt-1.5 w-full bg-input border border-border rounded px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60">
                <option value="general">General service</option>
                <option value="roadside">Roadside assistance only</option>
              </select>
              {call.assignedTechnicianId && <span className="mt-1 block text-[10px] text-muted-foreground">Reassign this call before changing its dispatch lane.</span>}
            </label>
            <IntakeField label="Technician pay (optional)" type="number" value={editDraft.technicianPay} onChange={(value) => updateEditField("technicianPay", value)} placeholder="Leave blank if not set" />
          </div>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Issue description *</span>
            <textarea required rows={3} value={editDraft.description} onChange={(event) => updateEditField("description", event.target.value)} className="mt-1.5 w-full bg-input border border-border rounded px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary resize-y" />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Urgency</span>
              <select value={editDraft.urgency} onChange={(event) => updateEditField("urgency", event.target.value as Urgency)} className="mt-1.5 w-full bg-input border border-border rounded px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary">
                <option value="routine">Routine</option>
                <option value="soon">Soon</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Special notes</span>
              <textarea rows={2} value={editDraft.notes} onChange={(event) => updateEditField("notes", event.target.value)} className="mt-1.5 w-full bg-input border border-border rounded px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary resize-y" />
            </label>
          </div>
          {callFeedback && <IntakeMessage text={callFeedback} />}
          <div className="flex justify-end">
            <button type="submit" disabled={updateCall.isPending} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-60">
              {updateCall.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {updateCall.isPending ? "Saving…" : "Save call"}
            </button>
          </div>
        </form>
      )}
      {!isEditingCall && callFeedback && <IntakeMessage text={callFeedback} />}

      <div className="bg-background rounded p-4 text-sm text-foreground/80 border border-border/50 space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <span className="font-bold text-foreground">{call.name}</span>
          <span className="font-mono text-muted-foreground">
            {canManageCustomerPhones ? call.phone ?? "Unavailable" : "Owner-only phone access"}
          </span>
        </div>
        <p className="pt-1"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Issue Description</span> {call.description}</p>
        {call.location && <p className="pt-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Location</span> {call.location}</p>}
      </div>

      <div className="rounded border border-border/70 bg-background p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {call.phoneSharedWithTechnicianAt ? <Eye className="w-5 h-5 text-primary mt-0.5" /> : <EyeOff className="w-5 h-5 text-muted-foreground mt-0.5" />}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">Customer phone privacy</p>
              <p className="text-xs text-muted-foreground mt-1">
                {!call.assignedTechnicianId
                  ? "Assign a technician before sharing this number."
                  : call.phoneSharedWithTechnicianAt
                    ? `Visible to the assigned technician since ${new Date(call.phoneSharedWithTechnicianAt).toLocaleString()}.`
                    : "Hidden from the assigned technician. They can use Service Chat instead."}
              </p>
            </div>
          </div>
          {canManageCustomerPhones ? (
            <button
              type="button"
              onClick={handlePhoneSharing}
              disabled={!call.assignedTechnicianId || updatePhoneSharing.isPending}
              className="shrink-0 inline-flex items-center gap-2 border border-border rounded px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground hover:border-primary/50 hover:text-primary disabled:opacity-50"
            >
              {updatePhoneSharing.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : call.phoneSharedWithTechnicianAt ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {call.phoneSharedWithTechnicianAt ? "Hide number" : "Reveal number"}
            </button>
          ) : (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Owner controls access</span>
          )}
        </div>
      </div>

      <DispatchNotificationDelivery callId={call.id} />

      <div className={`rounded border p-4 ${call.depositStatus === "manually_verified" ? "border-green-500/30 bg-green-500/5" : "border-primary/30 bg-primary/5"}`}>
        {(call.depositStatus === "manually_verified" || call.depositStatus === "stripe_verified") && !isEditingDeposit ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-500">Deposit verified</p>
                <p className="text-sm text-foreground">
                  ${(call.depositAmountCents / 100).toFixed(2)} via {(call.depositMethod || "stripe").replace("_", " ")}
                </p>
              </div>
            </div>
            {call.depositStatus === "manually_verified" && (
              <button
                onClick={() => setIsEditingDeposit(true)}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Edit record
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-3">
              <Receipt className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Record outside deposit</p>
                <p className="text-xs text-muted-foreground mt-1">For payments received by Zelle, Cash App, Venmo, Apple Pay, or cash.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.2fr_auto] gap-2">
              <select
                value={depositMethod}
                onChange={(e) => setDepositMethod(e.target.value as DepositMethod)}
                className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
                aria-label="Outside deposit payment method"
              >
                <option value="zelle">ZELLE</option>
                <option value="cash_app">CASH APP</option>
                <option value="venmo">VENMO</option>
                <option value="apple_pay">APPLE PAY</option>
                <option value="cash">CASH</option>
                <option value="other">OTHER</option>
              </select>
              <div className="flex items-center bg-input border border-border rounded px-3">
                <span className="text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none"
                  aria-label="Outside deposit amount"
                />
              </div>
              <input
                value={depositReference}
                onChange={(e) => setDepositReference(e.target.value)}
                placeholder="Reference or note (optional)"
                maxLength={200}
                className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                aria-label="Outside deposit reference"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDepositSubmit}
                  disabled={recordDeposit.isPending}
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded px-3 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
                >
                  {recordDeposit.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Confirm
                </button>
                {isEditingDeposit && (
                  <button
                    onClick={() => setIsEditingDeposit(false)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded"
                    aria-label="Cancel deposit edit"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <AdminTrackingControls call={call} />
      <ServiceCallChat callId={call.id} currentUserRole="admin" isClosed={["completed", "cancelled"].includes(call.status)} />

      <div className="grid grid-cols-2 gap-4 mt-auto pt-4">
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Assign Tech</label>
          <select
            className="w-full bg-input border border-border rounded px-3 py-2.5 text-sm font-bold text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow"
            value={call.assignedTechnicianId || ""}
            onChange={(e) => handleAssign(parseInt(e.target.value))}
            disabled={assignCall.isPending}
          >
            <option value="" disabled>UNASSIGNED</option>
            {eligibleTechnicians.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.availability === "available" ? "(AVAIL)" : t.availability === "busy" ? "(BUSY)" : "(OFF)"}
              </option>
            ))}
            {eligibleTechnicians.length === 0 && (
              <option value="" disabled>NO ELIGIBLE {call.dispatchLane === "roadside" ? "ROADSIDE" : "GENERAL"} TECHNICIANS</option>
            )}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Status</label>
          <select
            className="w-full bg-input border border-border rounded px-3 py-2.5 text-sm font-bold text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow uppercase tracking-wider"
            value={call.status}
            onChange={handleStatusChange}
            disabled={updateStatus.isPending}
          >
            <option value="new">NEW</option>
            <option value="assigned">ASSIGNED</option>
            <option value="in_progress">IN PROGRESS</option>
            <option value="completed">COMPLETED</option>
            <option value="cancelled">CANCELLED</option>
          </select>
        </div>
      </div>
    </div>
  );
}
