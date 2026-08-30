import React, { useState } from "react";
import { useListTechnicianApplications, useGetTechnicianApplication, useUpdateTechnicianApplication, getListTechnicianApplicationsQueryKey, getGetTechnicianApplicationQueryKey, TechnicianApplication } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Inbox, Search, Filter, RefreshCw, X, Save, Lock } from "lucide-react";
import { format } from "date-fns";

export function AdminApplications() {
  const queryClient = useQueryClient();
  const { data: applications = [], isLoading, isFetching, refetch } = useListTechnicianApplications();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

  const filteredApps = applications.filter(app => {
    if (filter !== "all" && app.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return app.fullName.toLowerCase().includes(q) || 
             app.email.toLowerCase().includes(q) || 
             app.phone.includes(q) ||
             app.serviceArea.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedApp = applications.find(a => a.id === selectedAppId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h2 className="font-serif text-2xl text-foreground tracking-wider uppercase flex items-center gap-3">
          Applications
          <span className="bg-primary/20 text-primary text-xs py-1 px-2 rounded font-mono">{applications.length} TOTAL</span>
        </h2>
        <button 
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 border border-border text-muted-foreground px-4 py-2 rounded font-bold uppercase tracking-widest text-[10px] sm:text-xs hover:bg-muted transition-colors disabled:opacity-50"
          data-testid="button-refresh-applications"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          REFRESH
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-card border border-border p-4 rounded-lg">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search applicants..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-input border border-border rounded pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-shadow"
            data-testid="input-search-applications"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full md:w-auto pb-2 md:pb-0">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0 mr-1" />
          {["all", "new", "reviewing", "approved", "declined"].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              aria-pressed={filter === status}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors border ${
                filter === status 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
              data-testid={`button-filter-applications-${status}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filteredApps.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground">
          <Inbox className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-serif text-xl uppercase tracking-wider text-foreground mb-2">No Applications Found</p>
          <p className="text-sm">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-1 space-y-3 ${selectedApp ? 'hidden lg:block' : 'block'}`}>
            {filteredApps.map(app => (
              <button
                type="button"
                key={app.id} 
                onClick={() => setSelectedAppId(app.id)}
                className={`bg-card border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedAppId === app.id 
                    ? "border-primary shadow-[0_0_15px_-3px_rgba(255,106,0,0.2)]" 
                    : "border-border hover:border-primary/50"
                }`}
                data-testid={`card-application-${app.id}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-serif text-lg text-foreground uppercase truncate pr-2">{app.fullName}</h3>
                  <StatusBadge status={app.status} />
                </div>
                <p className="text-xs text-muted-foreground mb-3 truncate">{app.serviceArea}</p>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  <span>{format(new Date(app.createdAt), 'MMM d, yyyy')}</span>
                  <span className="font-mono bg-background px-2 py-0.5 rounded border border-border">ID: {app.id}</span>
                </div>
              </button>
            ))}
          </div>

          <div className={`lg:col-span-2 ${!selectedApp ? 'hidden lg:flex items-center justify-center bg-card/50 border border-border/50 rounded-lg min-h-[400px]' : 'block'}`}>
            {selectedApp ? (
              <ApplicationDetail 
                key={selectedApp.id}
                application={selectedApp} 
                onClose={() => setSelectedAppId(null)}
                onUpdate={() => {
                  queryClient.invalidateQueries({ queryKey: getListTechnicianApplicationsQueryKey() });
                }}
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <Inbox className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-serif text-xl uppercase tracking-wider text-foreground">Select an Application</p>
                <p className="text-sm">Click on an application from the list to view details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'new': return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">New</span>;
    case 'reviewing': return <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">Reviewing</span>;
    case 'approved': return <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">Approved</span>;
    case 'declined': return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">Declined</span>;
    default: return null;
  }
}

function ApplicationDetail({ application, onClose, onUpdate }: { application: TechnicianApplication, onClose: () => void, onUpdate: () => void }) {
  const queryClient = useQueryClient();
  const { data: detailedApplication, isLoading: isDetailLoading } = useGetTechnicianApplication(application.id, {
    query: {
      queryKey: getGetTechnicianApplicationQueryKey(application.id),
      enabled: application.id > 0,
    },
  });
  const updateApp = useUpdateTechnicianApplication();
  const activeApplication = detailedApplication ?? application;
  const [notes, setNotes] = useState(activeApplication.ownerNotes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const handleStatusChange = (newStatus: "new" | "reviewing" | "approved" | "declined") => {
    updateApp.mutate({ id: application.id, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTechnicianApplicationQueryKey(application.id) });
        onUpdate();
      },
    });
  };

  const handleSaveNotes = () => {
    updateApp.mutate({ id: application.id, data: { ownerNotes: notes } }, {
      onSuccess: () => {
        setIsEditingNotes(false);
        queryClient.invalidateQueries({ queryKey: getGetTechnicianApplicationQueryKey(application.id) });
        onUpdate();
      }
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-border bg-background/50">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground" data-testid="button-close-application-detail">
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-serif text-xl text-foreground uppercase tracking-wide">Application Details</h3>
        </div>
        <div className="flex gap-2">
          {activeApplication.status !== 'approved' && (
             <button 
               onClick={() => handleStatusChange('approved')}
               disabled={updateApp.isPending}
               className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                data-testid={`button-approve-application-${application.id}`}
             >
               Approve
             </button>
          )}
           {activeApplication.status !== 'declined' && (
             <button 
               onClick={() => handleStatusChange('declined')}
               disabled={updateApp.isPending}
               className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                data-testid={`button-decline-application-${application.id}`}
             >
               Decline
             </button>
          )}
           {activeApplication.status !== 'reviewing' && activeApplication.status === 'new' && (
             <button 
               onClick={() => handleStatusChange('reviewing')}
               disabled={updateApp.isPending}
               className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/30 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                data-testid={`button-review-application-${application.id}`}
             >
               Mark Reviewing
             </button>
          )}
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-grow space-y-8">
        <div>
          <div className="flex justify-between items-start mb-4">
             <div>
             <h2 className="text-3xl font-serif uppercase tracking-wide text-foreground">{activeApplication.fullName}</h2>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                 <a href={`tel:${activeApplication.phone}`} className="hover:text-primary transition-colors font-mono">{activeApplication.phone}</a>
                <span>&bull;</span>
                 <a href={`mailto:${activeApplication.email}`} className="hover:text-primary transition-colors">{activeApplication.email}</a>
              </div>
            </div>
              <div className="flex items-center gap-2">
                {isDetailLoading && <Loader2 className="w-4 h-4 text-primary animate-spin" aria-label="Loading application" />}
                <StatusBadge status={activeApplication.status} />
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Service Area</h4>
               <p className="text-sm bg-background p-3 rounded border border-border">{activeApplication.serviceArea}</p>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Experience</h4>
               <p className="text-sm bg-background p-3 rounded border border-border">{activeApplication.experience}</p>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Availability</h4>
               <p className="text-sm bg-background p-3 rounded border border-border">{activeApplication.availability}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="h-full">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Specialties</h4>
              <div className="text-sm bg-background p-3 rounded border border-border h-[calc(100%-20px)] whitespace-pre-wrap">
                 {activeApplication.specialties}
              </div>
            </div>
          </div>
        </div>

         {activeApplication.introduction && (
          <div>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Introduction</h4>
            <div className="text-sm bg-background p-4 rounded border border-border whitespace-pre-wrap italic text-muted-foreground">
               "{activeApplication.introduction}"
            </div>
          </div>
        )}

        <div className="border-t border-border pt-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
              <Lock className="w-3 h-3" />
              Private Owner Notes
            </h4>
            {!isEditingNotes ? (
              <button 
                onClick={() => setIsEditingNotes(true)}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                data-testid={`button-edit-application-notes-${application.id}`}
              >
                Edit Notes
              </button>
            ) : (
              <button 
                onClick={handleSaveNotes}
                disabled={updateApp.isPending}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80"
                data-testid={`button-save-application-notes-${application.id}`}
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            )}
          </div>
          
          {isEditingNotes ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-input border border-primary/50 focus:border-primary rounded p-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-shadow min-h-[120px] resize-y"
              placeholder="Add private notes about this candidate..."
              data-testid={`input-application-notes-${application.id}`}
            />
          ) : (
            <div 
               className={`text-sm p-4 rounded border ${activeApplication.ownerNotes ? 'bg-primary/5 border-primary/20 text-foreground/90' : 'bg-background border-border text-muted-foreground italic'} whitespace-pre-wrap min-h-[80px]`}
               onClick={() => !activeApplication.ownerNotes && setIsEditingNotes(true)}
            >
               {activeApplication.ownerNotes || "No private notes added yet. Click 'Edit Notes' to add some."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}