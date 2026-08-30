import React, { useState } from "react";
import { useListTechnicians, useCreateTechnician, getListTechniciansQueryKey, type Technician } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, UserPlus, Phone, Mail, Award, X, Copy, Check, Link2, TrafficCone, ChevronDown, ChevronUp, MapPin, Wrench, AlertTriangle, FileText } from "lucide-react";

export function AdminTechnicians() {
  const { data: techs = [], isLoading } = useListTechnicians();
  const [showAdd, setShowAdd] = useState(false);
  const [copied, setCopied] = useState(false);

  const signInLink = `${window.location.origin}${import.meta.env.BASE_URL}sign-in`;
  const copySignInLink = async () => {
    try {
      await navigator.clipboard.writeText(signInLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this Team Sign-In link:", signInLink);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  const roadsideTechnicians = techs.filter((tech) => tech.role === "technician" && tech.dispatchLane === "roadside");
  const generalRoster = techs.filter((tech) => tech.role !== "technician" || tech.dispatchLane !== "roadside");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h2 className="font-serif text-2xl text-foreground tracking-wider uppercase">Roster</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={copySignInLink}
            className="flex items-center gap-2 border border-primary/40 text-primary px-4 py-2 rounded font-bold uppercase tracking-widest text-[10px] sm:text-xs hover:bg-primary/10 transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "COPIED" : "COPY SIGN-IN LINK"}
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-bold uppercase tracking-widest text-[10px] sm:text-xs hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
          >
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAdd ? "CANCEL" : "ADD TECH"}
          </button>
        </div>
      </div>

      <div className="flex gap-3 items-start bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
        <Link2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-muted-foreground leading-relaxed">
          Send the same sign-in link to every technician. They should sign in with the email address saved on their roster profile so Clerk can match them to the correct account.
        </p>
      </div>

      {showAdd && <AddTechnicianForm onClose={() => setShowAdd(false)} />}

      <RosterGroup
        title="General service roster"
        description="General service technicians and Dispatch leaders receive general service jobs."
        technicians={generalRoster}
      />
      <RosterGroup
        title="Roadside assistance only"
        description="Roadside-only technicians are alerted and assignable only for jobs marked roadside assistance."
        technicians={roadsideTechnicians}
        roadside
      />
    </div>
  );
}

function TechnicianCard({ tech }: { tech: Technician }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30" data-testid={`card-roster-tech-${tech.id}`}>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h4 className="font-serif text-xl uppercase tracking-wide text-foreground">{tech.name}</h4>
          <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-primary">
            {tech.role === "technician" && tech.dispatchLane === "roadside" ? "Roadside technician" : tech.role}
          </span>
        </div>
        <div className={`mt-1 h-3 w-3 rounded-full ${
          tech.availability === "available" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
            : tech.availability === "busy" ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"
              : "bg-muted"
        }`} title={`Status: ${tech.availability}`} />
      </div>
      
      <div className="space-y-3 rounded border border-border/50 bg-background/50 p-4 text-sm text-foreground/80">
        <div className="flex items-center gap-3">
          <Phone className="h-4 w-4 shrink-0 text-primary" />
          <a href={`tel:${tech.phone || ""}`} className={`font-mono transition-colors hover:text-primary ${!tech.phone ? "italic text-muted-foreground" : ""}`}>
            {tech.phone || "No phone on file"}
          </a>
        </div>
        {tech.email && (
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-xs text-muted-foreground" title="Used privately for Clerk sign-in matching">Login email on file</span>
          </div>
        )}
        {tech.specialty && (
          <div className="flex items-center gap-3">
            <Award className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{tech.specialty}</span>
          </div>
        )}

        <button 
          onClick={() => setExpanded(!expanded)} 
          className="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary mt-2 pt-3 border-t border-border/50 transition-colors"
          data-testid={`button-expand-profile-${tech.id}`}
        >
          {expanded ? "Hide Details" : "View Full Profile"}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {expanded && (
          <div className="space-y-4 pt-3 mt-3 border-t border-border/50 animate-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <Award className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Specialties & Services</span>
                <span className={`text-xs whitespace-pre-wrap ${!tech.specialty ? "italic text-muted-foreground" : ""}`}>{tech.specialty || "Not provided yet"}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Base Location</span>
                <span className={`text-xs whitespace-pre-wrap ${!tech.baseAddress ? "italic text-muted-foreground" : ""}`}>{tech.baseAddress || "Not provided yet"}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Service Area</span>
                <span className={`text-xs whitespace-pre-wrap ${!tech.serviceArea ? "italic text-muted-foreground" : ""}`}>{tech.serviceArea || "Not provided yet"}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Wrench className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tools & Equipment</span>
                <span className={`text-xs whitespace-pre-wrap ${!tech.tools ? "italic text-muted-foreground" : ""}`}>{tech.tools || "Not provided yet"}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500 mt-0.5" />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Limitations</span>
                <span className={`text-xs whitespace-pre-wrap ${!tech.limitations ? "italic text-muted-foreground" : ""}`}>{tech.limitations || "Not provided yet"}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bio / Experience</span>
                <span className={`text-xs whitespace-pre-wrap ${!tech.bio ? "italic text-muted-foreground" : ""}`}>{tech.bio || "Not provided yet"}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${tech.active ? "text-green-500" : "text-destructive"}`}>
          {tech.active ? "Active account" : "Inactive"}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">ID: {tech.id}</span>
      </div>
    </div>
  );
}

function RosterGroup({
  title,
  description,
  technicians,
  roadside = false,
}: {
  title: string;
  description: string;
  technicians: Technician[];
  roadside?: boolean;
}) {
  return (
    <section className={`rounded-lg border p-5 ${roadside ? "border-primary/35 bg-primary/[0.03]" : "border-border bg-card"}`}>
      <div className="mb-4 flex items-start gap-3">
        {roadside && <TrafficCone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
        <div>
          <h3 className="font-serif text-lg uppercase tracking-wide text-foreground">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {technicians && technicians.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {technicians.map((tech) => (
            <TechnicianCard key={tech.id} tech={tech} />
          ))}
        </div>
      ) : (
        <p className="rounded border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {roadside ? "No roadside-only technicians have been added yet." : "No general service technicians are on the roster yet."}
        </p>
      )}
    </section>
  );
}

function AddTechnicianForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const createTech = useCreateTechnician();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    dispatchLane: "general" as "general" | "roadside",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTech.mutate({ data: formData }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTechniciansQueryKey() });
        onClose();
      }
    });
  };

  return (
    <div className="bg-card border border-primary/40 rounded-lg p-6 mb-8 shadow-[0_8px_30px_-10px_rgba(255,106,0,0.15)] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="w-6 h-6 text-primary" />
        <h3 className="font-serif text-2xl uppercase tracking-wider text-foreground">ONBOARD TECHNICIAN</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Full Name</label>
            <input 
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow"
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phone Number</label>
            <input 
              required
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground font-mono focus:ring-1 focus:ring-primary outline-none transition-shadow"
              placeholder="(832) 555-0199"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Clerk Login Email (Private)</label>
            <input 
              required
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow"
              placeholder="john@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Specialty (Optional)</label>
            <input 
              type="text"
              value={formData.specialty}
              onChange={e => setFormData({ ...formData, specialty: e.target.value })}
              className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow"
              placeholder="e.g. Diesel, Diagnostics"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dispatch group</label>
            <select
              value={formData.dispatchLane}
              onChange={(event) => setFormData({ ...formData, dispatchLane: event.target.value as "general" | "roadside" })}
              className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow"
            >
              <option value="general">General service</option>
              <option value="roadside">Roadside assistance only</option>
            </select>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground border-l-2 border-primary/50 pl-3">
          The phone number is the primary roster contact. The private login email is only used to match their Clerk account when they first sign in.
        </p>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            CANCEL
          </button>
          <button 
            type="submit"
            disabled={createTech.isPending}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm shadow-primary/20"
          >
            {createTech.isPending ? "SAVING..." : "CREATE TECHNICIAN"}
          </button>
        </div>
      </form>
    </div>
  );
}
