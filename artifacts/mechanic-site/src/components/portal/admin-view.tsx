import React, { useState } from "react";
import { Technician } from "@workspace/api-client-react";
import { AdminCalls } from "./admin-calls";
import { AdminTechnicians } from "./admin-technicians";
import { AdminContracts } from "./admin-contracts";
import { AdminApplications } from "./admin-applications";
import { AdminReceipts } from "./admin-receipts";
import { Activity, AlertCircle, Users, FileText, PhoneCall, Inbox, Loader2, RotateCw, Receipt } from "lucide-react";
import {
  getGetTechnicianDashboardQueryKey,
  useGetTechnicianDashboard,
  useListTechnicianApplications,
} from "@workspace/api-client-react";

export function AdminView({ profile }: { profile: Technician }) {
  const [activeTab, setActiveTab] = useState<"overview" | "calls" | "technicians" | "contracts" | "applications" | "receipts">("overview");
  const { data: applications = [] } = useListTechnicianApplications();
  const newAppCount = applications.filter(a => a.status === 'new').length;

  const isOwnerOrAdmin = profile.role === "owner" || profile.role === "admin";

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "calls", label: "Dispatch", icon: PhoneCall },
    { id: "technicians", label: "Roster", icon: Users },
    { id: "contracts", label: "Contracts", icon: FileText },
    { id: "applications", label: "Applications", icon: Inbox, badge: newAppCount > 0 ? newAppCount : undefined },
  ];

  if (isOwnerOrAdmin) {
    tabs.push({ id: "receipts", label: "Receipts", icon: Receipt });
  }

  return (
    <div className="space-y-8">
      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-border hide-scrollbar">
        {tabs.map((tab) => {
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
            >
              <Icon className="w-5 h-5" />
              {tab.label}
              {tab.badge && (
                <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-mono">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        {activeTab === "overview" && <AdminOverview />}
        {activeTab === "calls" && <AdminCalls canManageCustomerPhones={profile.role === "owner"} />}
        {activeTab === "technicians" && <AdminTechnicians />}
        {activeTab === "contracts" && <AdminContracts />}
        {activeTab === "applications" && <AdminApplications />}
        {activeTab === "receipts" && isOwnerOrAdmin && <AdminReceipts canManageSignatures={profile.role === "owner"} />}
      </div>
    </div>
  );
}

function AdminOverview() {
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

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-card rounded-lg border border-border" />;
  }

  if (isError || !dashboard) {
    return (
      <div className="border border-destructive/30 bg-card rounded-lg p-8 text-center">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-destructive" />
        <h2 className="font-serif text-xl text-foreground tracking-wide">ADMIN DASHBOARD UNAVAILABLE</h2>
        <p className="mt-2 text-sm text-muted-foreground">Dispatch data could not be loaded. Please try again.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-60"
        >
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
          {isFetching ? "RETRYING..." : "RETRY DASHBOARD"}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Total Service Calls</h3>
        <p className="text-4xl font-serif text-foreground tracking-wide">{dashboard.calls.length}</p>
      </div>
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm shadow-primary/5 border-primary/20">
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Available Techs</h3>
        <p className="text-4xl font-serif text-primary tracking-wide">{dashboard.availableTechnicians}</p>
      </div>
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Total Completed</h3>
        <p className="text-4xl font-serif text-foreground tracking-wide">{dashboard.completedCalls}</p>
      </div>
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Total Payouts</h3>
        <p className="text-4xl font-serif text-foreground tracking-wide">${(dashboard.earningsCents / 100).toFixed(2)}</p>
      </div>
    </div>
  );
}
