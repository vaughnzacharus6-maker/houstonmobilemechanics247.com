import React, { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2, Plus, FileText, CheckCircle2, AlertCircle,
  Search, Send, XCircle, RotateCw, Eye, Printer, Pencil, PenTool
} from "lucide-react";

import {
  useListReceipts,
  getListReceiptsQueryKey,
  useCreateReceipt,
  useUpdateReceipt,
  useSendReceipt,
  useListServiceCalls,
  ServiceCall,
  useListReceiptSignatures,
  getListReceiptSignaturesQueryKey,
  ReceiptSignatureStatus
} from "@workspace/api-client-react";
import type { Receipt } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

import { ReceiptSignatureDialog } from "./receipt-signature-dialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const receiptSchema = z.object({
  serviceCallId: z.coerce.number().optional().or(z.literal(0)),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional().nullable(),
  vehicleYear: z.string().optional().nullable(),
  vehicleMake: z.string().optional().nullable(),
  vehicleModel: z.string().optional().nullable(),
  receiptDate: z.string().min(1, "Date is required"),
  serviceDescription: z.string().min(1, "Service description is required"),
  amountPaidDollars: z.coerce.number().min(0, "Amount cannot be negative"),
  paymentMethod: z.enum(["cash", "card", "zelle", "cash_app", "venmo", "apple_pay", "stripe", "other"]),
  notes: z.string().optional().nullable(),
}).superRefine((data, context) => {
  if (data.serviceCallId === 0 && (data.customerPhone?.trim().length ?? 0) < 7) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customerPhone"],
      message: "Valid phone is required for a manual receipt",
    });
  }
});

type ReceiptFormValues = z.infer<typeof receiptSchema>;

function calendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function AdminReceipts({ canManageSignatures }: { canManageSignatures: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewReceipt, setPreviewReceipt] = useState<Receipt | null>(null);
  const [signingReceiptId, setSigningReceiptId] = useState<number | null>(null);

  const { data: receipts = [], isLoading: isLoadingReceipts } = useListReceipts();
  const { data: signatures = [] } = useListReceiptSignatures({
    query: {
      enabled: canManageSignatures,
      queryKey: getListReceiptSignaturesQueryKey(),
    },
  });
  const { data: calls = [] } = useListServiceCalls();
  const sendReceipt = useSendReceipt();

  const signatureMap = useMemo(() => {
    const map = new Map<number, ReceiptSignatureStatus>();
    for (const sig of signatures) {
      map.set(sig.receiptId, sig);
    }
    return map;
  }, [signatures]);

  const filteredReceipts = useMemo(() => {
    if (!searchTerm) return receipts;
    const term = searchTerm.toLowerCase();
    return receipts.filter((r) => 
      r.customerName.toLowerCase().includes(term) ||
      r.receiptNumber.toLowerCase().includes(term) ||
      r.customerPhone.toLowerCase().includes(term) ||
      r.serviceDescription.toLowerCase().includes(term)
    );
  }, [receipts, searchTerm]);

  const handleSendSms = (id: number) => {
    sendReceipt.mutate(
      { id },
      {
        onSuccess: (result) => {
          const messages = {
            sent: ["SMS sent", "Receipt link was accepted by Twilio."],
            failed: ["SMS not sent", result.message ?? "Twilio rejected the SMS before accepting it. You can retry this receipt."],
            unknown: ["Verify delivery", result.message ?? "Twilio did not confirm delivery. Verify with the customer before sending another receipt."],
          } as const;
          toast({
            title: messages[result.deliveryStatus][0],
            description: messages[result.deliveryStatus][1],
            variant: result.deliveryStatus === "sent" ? "default" : "destructive",
          });
          queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey() });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to send SMS", description: "An error occurred while sending." });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-serif tracking-wide text-foreground uppercase">Customer Receipts</h2>
          <p className="text-sm text-muted-foreground mt-1">Create, preview, and text receipts for finalized service calls.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search receipts..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground font-bold tracking-wide uppercase shrink-0">
                <Plus className="w-4 h-4 mr-2" /> New Receipt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-serif uppercase tracking-widest text-lg">Create Receipt</DialogTitle>
              </DialogHeader>
              <CreateReceiptForm 
                calls={calls} 
                onSuccess={() => setIsCreateOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        {isLoadingReceipts ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <span className="font-serif uppercase tracking-wider text-sm">Loading receipts...</span>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h3 className="font-serif uppercase tracking-wide text-lg text-foreground mb-1">No receipts found</h3>
            <p className="text-sm">Create a receipt to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 border-b border-border text-muted-foreground font-serif uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  {canManageSignatures && <th className="px-4 py-3 font-medium text-center">Signature</th>}
                  <th className="px-4 py-3 font-medium">SMS Delivery</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-foreground font-medium">{receipt.receiptNumber}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{format(calendarDate(receipt.receiptDate), "MMM d, yyyy")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{receipt.customerName}</div>
                      <div className="text-muted-foreground text-xs font-mono">{receipt.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={receipt.serviceDescription}>
                      {receipt.serviceDescription}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      ${(receipt.amountPaidCents / 100).toFixed(2)}
                    </td>
                    {canManageSignatures && <td className="px-4 py-3 text-center">
                      {receipt.serviceCallId && ['card', 'stripe'].includes(receipt.paymentMethod) ? (
                        <SignatureStatusBadge
                          status={signatureMap.get(receipt.id)}
                          onLaunch={() => setSigningReceiptId(receipt.id)}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground italic opacity-50">N/A</span>
                      )}
                    </td>}
                    <td className="px-4 py-3">
                      <DeliveryStatusBadge 
                        status={receipt.deliveryStatus} 
                        reason={receipt.deliveryFailureReason} 
                        onRetry={() => handleSendSms(receipt.id)}
                        isRetrying={sendReceipt.isPending}
                      />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setEditingReceipt(receipt)}
                          aria-label={`Edit ${receipt.receiptNumber}`}
                          disabled={signatureMap.get(receipt.id)?.status === "signed"}
                          title={signatureMap.get(receipt.id)?.status === "signed" ? "Void the signed acknowledgment before editing" : undefined}
                        >
                          <Pencil className="w-4 h-4 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setPreviewReceipt(receipt)}
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          Preview
                        </Button>
                        {(receipt.deliveryStatus === "not_sent" || receipt.deliveryStatus === "failed") && (
                          <Button 
                          variant="secondary"
                          size="sm" 
                          className="h-8 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                          onClick={() => handleSendSms(receipt.id)}
                          disabled={sendReceipt.isPending && sendReceipt.variables?.id === receipt.id}
                        >
                          {sendReceipt.isPending && sendReceipt.variables?.id === receipt.id ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-1.5" />
                          )}
                          Send SMS
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Dialog open={Boolean(editingReceipt)} onOpenChange={(open) => !open && setEditingReceipt(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif uppercase tracking-widest text-lg">Edit Receipt</DialogTitle>
          </DialogHeader>
          {editingReceipt && (
            <CreateReceiptForm
              calls={calls}
              receipt={editingReceipt}
              onSuccess={() => setEditingReceipt(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <ReceiptPreviewDialog receipt={previewReceipt} onClose={() => setPreviewReceipt(null)} />
      <ReceiptSignatureDialog receiptId={signingReceiptId} onClose={() => setSigningReceiptId(null)} />
    </div>
  );
}

function SignatureStatusBadge({ status, onLaunch }: { status?: ReceiptSignatureStatus, onLaunch: () => void }) {
  if (!status || status.status === 'unsigned') {
    return (
      <Button variant="outline" size="sm" className="h-7 px-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" onClick={onLaunch}>
        <PenTool className="w-3 h-3 mr-1.5" /> Sign Now
      </Button>
    );
  }
  if (status.status === 'signed') {
    return (
      <Button variant="ghost" size="sm" className="h-7 px-2 text-green-500 hover:bg-green-500/10 hover:text-green-400" onClick={onLaunch}>
        <CheckCircle2 className="w-3 h-3 mr-1.5" /> Signed
      </Button>
    );
  }
  if (status.status === 'voided') {
    return (
      <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onLaunch}>
        <AlertCircle className="w-3 h-3 mr-1.5" /> Voided
      </Button>
    );
  }
  return null;
}

function DeliveryStatusBadge({ status, reason, onRetry, isRetrying }: { 
  status: string, 
  reason: string | null,
  onRetry: () => void,
  isRetrying: boolean
}) {
  if (status === 'sent') {
    return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 px-2 py-0.5"><CheckCircle2 className="w-3 h-3 mr-1" /> Sent</Badge>;
  }
  if (status === 'sending') {
    return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-2 py-0.5"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Sending</Badge>;
  }
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="px-2 py-0.5 cursor-help" title={reason || "Unknown error"}>
          <XCircle className="w-3 h-3 mr-1" /> Failed
        </Badge>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onRetry} disabled={isRetrying}>
          <RotateCw className={`w-3 h-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} /> Retry
        </Button>
      </div>
    );
  }
  if (status === 'unknown') {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-2 py-0.5" title="Verify with customer directly">
        <AlertCircle className="w-3 h-3 mr-1" /> Verify Delivery
      </Badge>
    );
  }
  return <Badge variant="secondary" className="px-2 py-0.5">Not Sent</Badge>;
}

function ReceiptPreviewDialog({ receipt, onClose }: { receipt: Receipt | null; onClose: () => void }) {
  const vehicle = receipt
    ? [receipt.vehicleYear, receipt.vehicleMake, receipt.vehicleModel].filter(Boolean).join(" ") || "Not specified"
    : "";

  return (
    <Dialog open={Boolean(receipt)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        {receipt && (
          <>
            <DialogHeader className="print:hidden">
              <DialogTitle className="font-serif uppercase tracking-widest text-lg">Receipt Preview</DialogTitle>
            </DialogHeader>
            <article className="border border-border rounded-lg overflow-hidden shadow-sm">
              <header className="bg-primary px-6 py-5 text-primary-foreground flex items-start justify-between gap-4">
                <div>
                  <p className="font-serif text-xl uppercase tracking-wide">Houston Mobile Mechanic</p>
                  <p className="mt-1 text-xs font-mono opacity-90">Receipt #{receipt.receiptNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">${(receipt.amountPaidCents / 100).toFixed(2)}</p>
                  <p className="text-xs uppercase tracking-wider">{receipt.paymentMethod.replaceAll("_", " ")}</p>
                </div>
              </header>
              <div className="p-6 space-y-6 bg-background">
                <div className="grid gap-5 sm:grid-cols-2">
                  <section>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bill to</p>
                    <p className="mt-2 font-medium text-foreground">{receipt.customerName}</p>
                    <p className="text-sm text-muted-foreground">{receipt.customerPhone}</p>
                    {receipt.customerAddress && <p className="mt-1 text-sm text-muted-foreground">{receipt.customerAddress}</p>}
                  </section>
                  <section className="sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Service date</p>
                    <p className="mt-2 font-medium text-foreground">{format(calendarDate(receipt.receiptDate), "MMMM d, yyyy")}</p>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vehicle</p>
                    <p className="mt-1 text-sm text-foreground">{vehicle}</p>
                  </section>
                </div>
                <section className="border-t border-border pt-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Work performed</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{receipt.serviceDescription}</p>
                </section>
                {receipt.notes && (
                  <section className="border-t border-border pt-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Additional notes</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{receipt.notes}</p>
                  </section>
                )}
              </div>
              <footer className="border-t border-border bg-muted/20 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">Thank you for choosing Houston Mobile Mechanic.</span>
                <Button type="button" size="sm" onClick={() => window.print()} className="print:hidden">
                  <Printer className="mr-2 h-4 w-4" />
                  Print / Save
                </Button>
              </footer>
            </article>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CreateReceiptForm({
  calls,
  receipt,
  onSuccess,
  allowManualEntry = true,
}: {
  calls: ServiceCall[];
  receipt?: Receipt;
  onSuccess: () => void;
  allowManualEntry?: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createReceipt = useCreateReceipt();
  const updateReceipt = useUpdateReceipt();

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: receipt
      ? {
          serviceCallId: receipt.serviceCallId ?? 0,
          customerName: receipt.customerName,
          customerPhone: receipt.serviceCallId ? "" : receipt.customerPhone,
          customerAddress: receipt.customerAddress,
          vehicleYear: receipt.vehicleYear,
          vehicleMake: receipt.vehicleMake,
          vehicleModel: receipt.vehicleModel,
          receiptDate: receipt.receiptDate,
          serviceDescription: receipt.serviceDescription,
          amountPaidDollars: receipt.amountPaidCents / 100,
          paymentMethod: receipt.paymentMethod,
          notes: receipt.notes,
        }
      : {
          serviceCallId: 0,
          customerName: "",
          customerPhone: "",
          customerAddress: "",
          vehicleYear: "",
          vehicleMake: "",
          vehicleModel: "",
          receiptDate: format(new Date(), "yyyy-MM-dd"),
          serviceDescription: "",
          amountPaidDollars: 0,
          paymentMethod: "card",
          notes: "",
        },
  });
  useEffect(() => {
    if (!receipt) return;
    form.reset({
      serviceCallId: receipt.serviceCallId ?? 0,
      customerName: receipt.customerName,
      customerPhone: receipt.serviceCallId ? "" : receipt.customerPhone,
      customerAddress: receipt.customerAddress,
      vehicleYear: receipt.vehicleYear,
      vehicleMake: receipt.vehicleMake,
      vehicleModel: receipt.vehicleModel,
      receiptDate: receipt.receiptDate,
      serviceDescription: receipt.serviceDescription,
      amountPaidDollars: receipt.amountPaidCents / 100,
      paymentMethod: receipt.paymentMethod,
      notes: receipt.notes,
    });
  }, [form, receipt]);

  const handleCallSelect = (callId: string) => {
    const id = parseInt(callId, 10);
    const call = calls.find((c) => c.id === id);
    if (!call) {
      if (id === 0) {
        form.reset({
          serviceCallId: 0,
          customerName: "",
          customerPhone: "",
          customerAddress: "",
          vehicleYear: "",
          vehicleMake: "",
          vehicleModel: "",
          receiptDate: format(new Date(), "yyyy-MM-dd"),
          serviceDescription: "",
          amountPaidDollars: 0,
          paymentMethod: "card",
          notes: "",
        });
      }
      return;
    }

    form.setValue("serviceCallId", call.id);
    form.setValue("customerName", call.name);
    form.setValue("customerPhone", "");
    form.setValue("customerAddress", call.location || "");
    form.setValue("serviceDescription", call.description);
    
    const vParts = call.vehicleType.split(' ');
    if (vParts.length >= 3 && !isNaN(parseInt(vParts[0], 10))) {
      form.setValue("vehicleYear", vParts[0]);
      form.setValue("vehicleMake", vParts[1]);
      form.setValue("vehicleModel", vParts.slice(2).join(' '));
    } else {
      form.setValue("vehicleModel", call.vehicleType);
    }
  };

  const onSubmit = (data: ReceiptFormValues) => {
    if (!allowManualEntry && (!data.serviceCallId || data.serviceCallId === 0)) {
      toast({
        variant: "destructive",
        title: "Select a service call",
        description: "Choose one of your assigned service calls before creating a receipt.",
      });
      return;
    }
    const amountCents = Math.round(data.amountPaidDollars * 100);
    const dataToSave = {
      serviceCallId: data.serviceCallId === 0 ? null : data.serviceCallId,
      customerName: data.customerName,
      customerPhone: data.customerPhone?.trim() || undefined,
      customerAddress: data.customerAddress,
      vehicleYear: data.vehicleYear,
      vehicleMake: data.vehicleMake,
      vehicleModel: data.vehicleModel,
      receiptDate: data.receiptDate,
      serviceDescription: data.serviceDescription,
      amountPaidCents: amountCents,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    };
    const mutationOptions = {
      onSuccess: () => {
        toast({
          title: receipt ? "Receipt Updated" : "Receipt Created",
          description: receipt ? "Receipt changes have been saved." : "Receipt has been successfully created.",
        });
        queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey() });
        onSuccess();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err.message || `Failed to ${receipt ? "update" : "create"} receipt.` });
      },
    };
    if (receipt) {
      updateReceipt.mutate({ id: receipt.id, data: dataToSave }, mutationOptions);
    } else {
      createReceipt.mutate({ data: dataToSave }, mutationOptions);
    }
  };

  const eligibleCalls = calls.filter(c => c.status !== 'cancelled');
  const usesSelectedCall = Number(form.watch("serviceCallId")) > 0;
  const isSaving = createReceipt.isPending || updateReceipt.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="serviceCallId"
          render={({ field }) => (
            <FormItem>
                <FormLabel>{allowManualEntry ? "Prefill from Service Call (Optional)" : "Assigned Service Call *"}</FormLabel>
              <Select onValueChange={(val) => { field.onChange(val); handleCallSelect(val); }} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder={allowManualEntry ? "Select a service call to prefill" : "Select an assigned service call"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allowManualEntry && <SelectItem value="0">None (Manual Entry)</SelectItem>}
                  {eligibleCalls.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      #{c.id} - {c.name} ({c.serviceType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" className="bg-input border-border" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="customerPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{usesSelectedCall ? "Customer Phone (secured from selected call)" : "Customer Phone *"}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={usesSelectedCall ? "Sourced securely when you create the receipt" : "555-0100"}
                    className="bg-input border-border"
                    disabled={usesSelectedCall}
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="customerAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St, Houston TX" className="bg-input border-border" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="vehicleYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Year</FormLabel>
                <FormControl>
                  <Input placeholder="2018" className="bg-input border-border" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vehicleMake"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Make</FormLabel>
                <FormControl>
                  <Input placeholder="Ford" className="bg-input border-border" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vehicleModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Model</FormLabel>
                <FormControl>
                  <Input placeholder="F-150" className="bg-input border-border" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="serviceDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Description *</FormLabel>
              <FormControl>
                <Textarea placeholder="Replaced alternator and serpentine belt..." className="bg-input border-border resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="amountPaidDollars"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Amount ($) *</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" className="bg-input border-border font-mono" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="cash_app">Cash App</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="apple_pay">Apple Pay</SelectItem>
                    <SelectItem value="stripe">Stripe Checkout</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="receiptDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receipt Date *</FormLabel>
                <FormControl>
                  <Input type="date" className="bg-input border-border" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
            <FormLabel>Additional Notes (shown on the receipt)</FormLabel>
              <FormControl>
                <Input placeholder="Invoice #1234 from parts store..." className="bg-input border-border" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button 
            type="submit" 
            className="w-full sm:w-auto bg-primary text-primary-foreground font-bold uppercase tracking-wider"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : receipt ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {receipt ? "Save Changes" : "Create Receipt"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
