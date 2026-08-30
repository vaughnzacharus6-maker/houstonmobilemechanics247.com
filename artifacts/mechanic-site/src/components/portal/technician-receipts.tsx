import { useQueryClient } from "@tanstack/react-query";
import {
  getGetTechnicianDashboardQueryKey,
  getListServiceCallsQueryKey,
  useListServiceCalls,
} from "@workspace/api-client-react";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { CreateReceiptForm } from "./admin-receipts";

export function TechnicianReceipts() {
  const queryClient = useQueryClient();
  const {
    data: calls = [],
    isLoading,
    isError,
  } = useListServiceCalls(undefined, {
    query: {
      queryKey: getListServiceCallsQueryKey(),
      retry: false,
    },
  });

  const assignedCalls = calls.filter((call) => call.status !== "cancelled");

  return (
    <section aria-labelledby="technician-receipts-heading" className="max-w-3xl">
      <div className="mb-6">
        <h2 id="technician-receipts-heading" className="flex items-center gap-3 font-serif text-2xl tracking-wider text-foreground">
          <FileText className="h-6 w-6 text-primary" />
          CREATE RECEIPT
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a receipt for one of your assigned service calls. The customer phone number is sourced securely from the call.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-7">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-primary">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : isError ? (
          <div className="py-10 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-3 text-sm text-foreground">Your assigned service calls could not be loaded.</p>
          </div>
        ) : assignedCalls.length === 0 ? (
          <div className="py-10 text-center">
            <FileText className="mx-auto h-9 w-9 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-foreground">No assigned service calls yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Accept or receive a dispatch assignment before creating a receipt.</p>
          </div>
        ) : (
          <CreateReceiptForm
            calls={assignedCalls}
            allowManualEntry={false}
            onSuccess={() => {
              void queryClient.invalidateQueries({ queryKey: getGetTechnicianDashboardQueryKey() });
            }}
          />
        )}
      </div>
    </section>
  );
}