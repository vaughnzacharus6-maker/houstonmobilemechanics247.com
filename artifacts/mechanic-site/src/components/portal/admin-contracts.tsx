import React, { useState } from "react";
import { useListTechnicianContracts, useCreateTechnicianContract, useListTechnicians, getListTechnicianContractsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, FileSignature, X, Calendar, DollarSign } from "lucide-react";

export function AdminContracts() {
  const { data: contracts = [], isLoading: contractsLoading } = useListTechnicianContracts();
  const { data: techs = [], isLoading: techsLoading } = useListTechnicians();
  const [showAdd, setShowAdd] = useState(false);

  if (contractsLoading || techsLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-serif text-2xl text-foreground tracking-wider uppercase">Contracts</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-bold uppercase tracking-widest text-[10px] sm:text-xs hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? "CANCEL" : "NEW CONTRACT"}
        </button>
      </div>

      {showAdd && <AddContractForm techs={techs} onClose={() => setShowAdd(false)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contracts.map(contract => (
          <div key={contract.id} className="bg-card border border-border rounded-lg p-5 flex flex-col hover:border-primary/30 transition-colors">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="font-serif text-xl text-foreground uppercase tracking-wide">{contract.title}</h3>
                <span className="text-xs font-bold uppercase tracking-wider text-primary mt-1 block">{contract.technicianName || `Tech ID: ${contract.technicianId}`}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                contract.status === 'active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-muted text-muted-foreground border-transparent'
              }`}>
                {contract.status}
              </span>
            </div>

            <div className="space-y-3 text-sm text-foreground/80 bg-background/50 p-4 rounded border border-border/50 flex-1">
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-primary shrink-0" />
                <span className="font-mono font-medium">
                  ${(contract.perCallCents / 100).toFixed(2)} / Call
                  {contract.hourlyRateCents > 0 && <span className="text-muted-foreground mx-1">•</span>}
                  {contract.hourlyRateCents > 0 && `$${(contract.hourlyRateCents / 100).toFixed(2)} / Hr`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs">Starts: {new Date(contract.startDate).toLocaleDateString()}</span>
              </div>
              {contract.endDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-destructive/70 shrink-0" />
                  <span className="font-mono text-xs text-destructive/90">Ends: {new Date(contract.endDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {contract.notes && (
              <div className="mt-4 pt-4 border-t border-border/50 text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground uppercase tracking-widest block mb-1">Notes</span>
                {contract.notes}
              </div>
            )}
          </div>
        ))}
        {contracts.length === 0 && !showAdd && (
          <div className="col-span-full py-16 text-center text-muted-foreground bg-card border border-border border-dashed rounded-lg">
            <p className="font-medium text-foreground">No contracts established yet.</p>
            <p className="text-sm mt-1">Create one to define standard compensation rates.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AddContractForm({ techs, onClose }: { techs: any[], onClose: () => void }) {
  const queryClient = useQueryClient();
  const createContract = useCreateTechnicianContract();
  
  const [formData, setFormData] = useState({
    technicianId: "",
    title: "",
    perCallCents: "0",
    hourlyRateCents: "0",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.technicianId) return;

    const payload = {
      technicianId: parseInt(formData.technicianId),
      title: formData.title,
      perCallCents: Math.round(parseFloat(formData.perCallCents || "0") * 100),
      hourlyRateCents: Math.round(parseFloat(formData.hourlyRateCents || "0") * 100),
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      notes: formData.notes || undefined,
    };

    createContract.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTechnicianContractsQueryKey() });
        onClose();
      }
    });
  };

  return (
    <div className="bg-card border border-primary/40 rounded-lg p-6 mb-8 shadow-[0_8px_30px_-10px_rgba(255,106,0,0.15)] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      
      <div className="flex items-center gap-3 mb-6">
        <FileSignature className="w-6 h-6 text-primary" />
        <h3 className="font-serif text-2xl uppercase tracking-wider text-foreground">CREATE CONTRACT</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Technician</label>
            <select
              required
              value={formData.technicianId}
              onChange={e => setFormData({ ...formData, technicianId: e.target.value })}
              className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground font-bold focus:ring-1 focus:ring-primary outline-none transition-shadow uppercase tracking-wider text-sm"
            >
              <option value="" disabled>SELECT A TECHNICIAN...</option>
              {techs.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contract Title</label>
            <input 
              required
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow"
              placeholder="e.g. Standard Mobile Rate"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Per-Call Pay ($)</label>
              <input 
                required
                type="number"
                step="0.01"
                min="0"
                value={formData.perCallCents}
                onChange={e => setFormData({ ...formData, perCallCents: e.target.value })}
                className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground font-mono focus:ring-1 focus:ring-primary outline-none transition-shadow"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hourly Rate ($)</label>
              <input 
                required
                type="number"
                step="0.01"
                min="0"
                value={formData.hourlyRateCents}
                onChange={e => setFormData({ ...formData, hourlyRateCents: e.target.value })}
                className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground font-mono focus:ring-1 focus:ring-primary outline-none transition-shadow"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Start Date</label>
            <input 
              required
              type="date"
              value={formData.startDate}
              onChange={e => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground font-mono focus:ring-1 focus:ring-primary outline-none transition-shadow text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">End Date (Optional)</label>
            <input 
              type="date"
              value={formData.endDate}
              onChange={e => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground font-mono focus:ring-1 focus:ring-primary outline-none transition-shadow text-sm"
            />
          </div>
          
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Internal Notes (Optional)</label>
            <textarea 
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow resize-none"
              placeholder="Additional compensation rules or context..."
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-5 border-t border-border/50">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            CANCEL
          </button>
          <button 
            type="submit"
            disabled={createContract.isPending}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm shadow-primary/20"
          >
            {createContract.isPending ? "CREATING..." : "SAVE CONTRACT"}
          </button>
        </div>
      </form>
    </div>
  );
}
