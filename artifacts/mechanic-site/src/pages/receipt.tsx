import React, { useEffect } from "react";
import { useParams } from "wouter";
import { format } from "date-fns";
import { Loader2, Printer, MapPin, Car, Calendar, ShieldCheck, CheckCircle2, ChevronRight } from "lucide-react";
import { useGetPublicReceipt, getGetPublicReceiptQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

function calendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default function ReceiptPage() {
  const params = useParams<{ token?: string }>();
  const token = params.token || "";

  const { data: receipt, isLoading, isError } = useGetPublicReceipt(token, {
    query: {
      enabled: !!token,
      queryKey: getGetPublicReceiptQueryKey(token),
      retry: false,
    }
  });

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="font-serif uppercase tracking-widest text-primary text-sm">Loading Receipt...</p>
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldCheck className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h1 className="text-2xl font-serif text-foreground uppercase tracking-wider mb-2">Receipt Unavailable</h1>
        <p className="text-muted-foreground max-w-md">
          This receipt link may be invalid or has expired. Please contact support if you need a new copy of your receipt.
        </p>
      </div>
    );
  }

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  const getVehicleDisplay = () => {
    const parts = [receipt.vehicleYear, receipt.vehicleMake, receipt.vehicleModel].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Not specified";
  };

  const formattedPaymentMethod = receipt.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="min-h-[100dvh] bg-background selection:bg-primary/30 text-foreground pb-20">
      {/* Header that hides when printing */}
      <div className="print:hidden sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border p-4 flex justify-between items-center max-w-3xl mx-auto shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-serif uppercase tracking-wider text-sm">Houston Mobile Mechanic</span>
        </div>
        <Button 
          onClick={() => window.print()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider h-9"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print / Save PDF
        </Button>
      </div>

      {/* Printable Area */}
      <main className="max-w-3xl mx-auto pt-8 px-4 sm:px-6">
        
        {/* Receipt Header Card */}
        <div className="bg-card border border-border rounded-t-xl p-8 relative overflow-hidden">
          {/* Subtle accent line top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary"></div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
            <div>
              <h1 className="text-3xl font-serif text-foreground uppercase tracking-wide mb-1">Official Receipt</h1>
              <p className="text-muted-foreground font-mono text-sm">Receipt #{receipt.receiptNumber}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xl font-medium text-foreground">{formatCurrency(receipt.amountPaidCents)}</p>
              <div className="inline-flex items-center text-xs font-bold px-2 py-1 bg-green-500/10 text-green-500 rounded border border-green-500/20 mt-1 uppercase tracking-widest">
                PAID IN FULL via {formattedPaymentMethod}
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="bg-background border-x border-border grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          
          <div className="p-6 sm:p-8 space-y-6">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b border-border pb-2">
              <Calendar className="w-4 h-4" /> Service Details
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Date of Service</p>
                <p className="text-foreground font-medium">{format(calendarDate(receipt.receiptDate), "MMMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Customer</p>
                <p className="text-foreground font-medium">{receipt.customerName}</p>
              </div>
              {receipt.customerAddress && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Location</p>
                  <p className="text-foreground font-medium flex items-start gap-1">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{receipt.customerAddress}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 bg-muted/5">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b border-border pb-2">
              <Car className="w-4 h-4" /> Vehicle Information
            </h2>
            <div className="space-y-4">
              <div className="bg-card border border-border p-4 rounded-lg">
                <p className="text-sm font-medium text-foreground mb-1">{getVehicleDisplay()}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Vehicle Serviced</p>
              </div>
            </div>
          </div>
        </div>

        {/* Service Description Area */}
        <div className="bg-card border border-border rounded-b-xl p-6 sm:p-8 border-t-0 shadow-sm shadow-black/20">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Work Performed</h2>
          
          <div className="bg-background border border-border rounded-lg p-5">
            <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">
              {receipt.serviceDescription}
            </p>
          </div>
          {receipt.notes && (
            <div className="mt-6">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Additional Notes</h2>
              <div className="bg-background border border-border rounded-lg p-5">
                <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">
                  {receipt.notes}
                </p>
              </div>
            </div>
          )}

          {/* Footer Branding for Print */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <div>
              <p className="font-serif uppercase tracking-widest text-primary text-sm">Houston Mobile Mechanic</p>
              <p className="text-xs text-muted-foreground mt-1">Thank you for your business.</p>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Generated {format(new Date(), "MMM d, yyyy")}
            </div>
          </div>
        </div>

      </main>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .bg-background, .bg-card, .bg-muted\\/5 { background: white !important; }
          * { border-color: #e5e7eb !important; }
          .text-foreground { color: black !important; }
          .text-muted-foreground { color: #4b5563 !important; }
          .bg-green-500\\/10 { background: transparent !important; color: black !important; border-color: black !important; }
          .text-primary { color: black !important; }
          .shadow-sm, .shadow-black\\/20 { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
