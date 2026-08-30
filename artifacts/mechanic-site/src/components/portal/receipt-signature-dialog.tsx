import React, { useRef, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2, X, CheckCircle, AlertTriangle, Eraser, Printer, FileSignature, AlertCircle
} from "lucide-react";
import {
  useGetReceiptSignatureSession,
  getGetReceiptSignatureSessionQueryKey,
  useCreateReceiptSignature,
  useVoidReceiptSignature,
  getListReceiptSignaturesQueryKey,
  SignatureStroke,
} from "@workspace/api-client-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const VIEWBOX_W = 1000;
const VIEWBOX_H = 400;

function SignaturePad({
  strokes,
  onChange,
  readOnly
}: {
  strokes: SignatureStroke[];
  onChange?: (strokes: SignatureStroke[]) => void;
  readOnly?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentStroke, setCurrentStroke] = useState<SignatureStroke | null>(null);

  const getPoint = (e: React.PointerEvent) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    if (e.button !== 0) return;
    
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getPoint(e);
    if (pt) setCurrentStroke({ points: [pt] });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (readOnly || !currentStroke) return;
    const pt = getPoint(e);
    if (pt) {
      setCurrentStroke(prev => prev ? { points: [...prev.points, pt] } : null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (readOnly || !currentStroke) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (currentStroke.points.length >= 2 && onChange) {
      onChange([...strokes, currentStroke]);
    }
    setCurrentStroke(null);
  };

  const renderStroke = (stroke: SignatureStroke, i: number) => {
    const d = stroke.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x * VIEWBOX_W} ${p.y * VIEWBOX_H}`).join(' ');
    return <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />;
  };

  return (
    <div className="relative border-2 border-border rounded-xl bg-card overflow-hidden select-none focus-within:border-primary transition-colors touch-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className={`w-full aspect-[5/2] ${readOnly ? 'opacity-70' : 'cursor-crosshair'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {strokes.map(renderStroke)}
        {currentStroke && renderStroke(currentStroke, -1)}
      </svg>
      {!readOnly && strokes.length > 0 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute bottom-2 right-2 h-7 text-xs bg-background/80 backdrop-blur-sm"
          onClick={() => onChange?.([])}
        >
          <Eraser className="w-3 h-3 mr-1" /> Clear
        </Button>
      )}
      {!readOnly && strokes.length === 0 && !currentStroke && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <span className="text-muted-foreground font-serif tracking-widest uppercase opacity-20 text-2xl">Sign Here</span>
        </div>
      )}
    </div>
  );
}

export function ReceiptSignatureDialog({
  receiptId,
  onClose
}: {
  receiptId: number | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useGetReceiptSignatureSession(receiptId ?? 0, {
    query: {
      enabled: !!receiptId,
      queryKey: getGetReceiptSignatureSessionQueryKey(receiptId ?? 0)
    }
  });

  const createSignature = useCreateReceiptSignature();
  const voidSignature = useVoidReceiptSignature();

  const [signerName, setSignerName] = useState("");
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const [consent, setConsent] = useState(false);
  const [policyAck, setPolicyAck] = useState(false);
  const [voidMode, setVoidMode] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  useEffect(() => {
    if (session?.existingSignature && !session.existingSignature.voidedAt) {
      setStrokes(session.existingSignature.signatureStrokes);
      setSignerName(session.existingSignature.signerName);
      setConsent(session.existingSignature.electronicConsent);
      setPolicyAck(session.existingSignature.policyAcknowledged);
      setVoidMode(false);
      setVoidReason("");
    } else {
      setStrokes([]);
      setSignerName("");
      setConsent(false);
      setPolicyAck(false);
      setVoidMode(false);
      setVoidReason("");
    }
    
    if (session?.receipt && (!session.existingSignature || session.existingSignature.voidedAt)) {
      setSignerName(session.receipt.customerName);
    }
  }, [session]);

  if (!receiptId) return null;

  const isSigned = Boolean(session?.existingSignature && !session.existingSignature.voidedAt);
  
  const canSubmit = signerName.trim().length > 0 && strokes.length > 0 && consent && policyAck;
  
  const handleSign = () => {
    if (!canSubmit) return;
    createSignature.mutate({
      id: receiptId,
      data: {
        signerName: signerName.trim(),
        signatureStrokes: strokes,
        electronicConsent: consent,
        policyAcknowledged: policyAck
      }
    }, {
      onSuccess: () => {
        toast({ title: "Signature Captured", description: "The receipt has been successfully signed." });
        queryClient.invalidateQueries({ queryKey: getGetReceiptSignatureSessionQueryKey(receiptId) });
        queryClient.invalidateQueries({ queryKey: getListReceiptSignaturesQueryKey() });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Signature Failed", description: err.message || "Failed to capture signature." });
      }
    });
  };

  const handleVoid = () => {
    if (!voidReason.trim() || !session?.existingSignature || session.existingSignature.voidedAt) {
      toast({ variant: "destructive", title: "Reason Required", description: "You must provide a reason to void this signature." });
      return;
    }
    voidSignature.mutate({
      id: receiptId,
      data: {
        signatureId: session.existingSignature.id,
        reason: voidReason.trim()
      }
    }, {
      onSuccess: () => {
        toast({ title: "Signature Voided", description: "The signature has been voided and is ready for re-signing." });
        queryClient.invalidateQueries({ queryKey: getGetReceiptSignatureSessionQueryKey(receiptId) });
        queryClient.invalidateQueries({ queryKey: getListReceiptSignaturesQueryKey() });
        setVoidMode(false);
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Void Failed", description: err.message || "Failed to void signature." });
      }
    });
  };

  return (
    <Dialog open={!!receiptId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[95vh] md:h-[90vh] bg-background border-border p-0 gap-0 w-[95vw] overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">Receipt Signature Workspace</DialogTitle>
        <DialogDescription className="sr-only">Workspace to capture customer signatures for service receipts.</DialogDescription>

        {isLoading || !session ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <span className="font-serif uppercase tracking-widest text-muted-foreground">Loading workspace...</span>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            {/* Left sidebar: Receipt details */}
            <div className="bg-card w-full md:w-[360px] flex-shrink-0 border-b md:border-b-0 md:border-r border-border flex flex-col print:w-full print:border-none h-[40vh] md:h-full">
              <div className="p-6 border-b border-border bg-primary text-primary-foreground print:bg-transparent print:text-foreground">
                <FileSignature className="w-8 h-8 mb-4 opacity-80" />
                <h2 className="font-serif text-2xl uppercase tracking-wider leading-none">Authorization</h2>
                <p className="font-mono text-xs opacity-80 mt-2">RCPT #{session.receipt.receiptNumber}</p>
              </div>
              
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount Due</p>
                  <p className="text-4xl font-medium text-foreground mt-1 font-mono">${(session.receipt.amountPaidCents / 100).toFixed(2)}</p>
                  <div className="mt-3 inline-flex items-center px-2.5 py-1.5 rounded-sm text-[11px] font-bold uppercase tracking-wider bg-secondary text-secondary-foreground border border-secondary-border">
                    {session.paymentStatusLabel}
                  </div>
                </section>

                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer</p>
                  <p className="mt-2 font-medium text-foreground">{session.receipt.customerName}</p>
                  <p className="text-sm text-muted-foreground font-mono mt-1">{session.receipt.customerPhone}</p>
                  {session.receipt.vehicleMake && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {[session.receipt.vehicleYear, session.receipt.vehicleMake, session.receipt.vehicleModel].filter(Boolean).join(" ")}
                    </p>
                  )}
                </section>

                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Service Rendered</p>
                  <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{session.receipt.serviceDescription}</p>
                </section>

                {isSigned && (
                  <section className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-sm print:hidden">
                    <p className="font-medium text-primary flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" /> Signed & Secured
                    </p>
                    <p className="text-muted-foreground mt-3 text-[10px] font-mono leading-relaxed">
                      Document Hash:<br/>
                      <span className="opacity-80 inline-block mt-1 break-all">{session.existingSignature!.documentHash}</span>
                    </p>
                  </section>
                )}
              </div>
            </div>

            {/* Right side: Signing area */}
            <div className="flex-1 flex flex-col bg-background relative overflow-y-auto h-[60vh] md:h-full">
              <div className="p-6 md:p-10 max-w-2xl mx-auto w-full space-y-8 print:p-0">
                <header className="space-y-2">
                  <h3 className="font-serif text-2xl uppercase tracking-wide text-foreground">Customer Acknowledgment</h3>
                  <p className="text-sm text-muted-foreground">Please review the policies and sign below to authorize this transaction.</p>
                </header>

                <div className="space-y-4 bg-card border border-border p-5 md:p-6 rounded-xl">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground border-b border-border pb-3">
                    {session.policy.title}
                  </h4>
                  <ul className="space-y-4 text-sm pt-2">
                    {session.policy.acknowledgments.map((ack, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span className="leading-relaxed text-muted-foreground">{ack}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-8 pt-2">
                  <div className="space-y-3">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Printed Name</Label>
                    <Input 
                      value={signerName} 
                      onChange={(e) => setSignerName(e.target.value)}
                      readOnly={isSigned}
                      placeholder="Full Name"
                      className="bg-input text-lg py-6 font-medium border-border focus-visible:ring-primary"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Signature</Label>
                    <SignaturePad strokes={strokes} onChange={setStrokes} readOnly={isSigned} />
                    {isSigned && session.existingSignature && (
                      <p className="text-xs text-muted-foreground text-right font-mono mt-2">
                        Signed electronically on {format(new Date(session.existingSignature.signedAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-5 bg-card/50 p-5 md:p-6 rounded-xl border border-border">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="consent" 
                        checked={consent} 
                        onCheckedChange={(c) => setConsent(!!c)} 
                        disabled={isSigned}
                        className="mt-1 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <Label htmlFor="consent" className="text-sm leading-snug cursor-pointer peer-disabled:cursor-default text-foreground font-medium">
                        I consent to use electronic signatures to acknowledge these policies and authorize payment.
                      </Label>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="policyAck" 
                        checked={policyAck} 
                        onCheckedChange={(c) => setPolicyAck(!!c)} 
                        disabled={isSigned}
                        className="mt-1 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <Label htmlFor="policyAck" className="text-sm leading-snug cursor-pointer peer-disabled:cursor-default text-foreground font-medium">
                        I acknowledge the policies above, confirm the services were rendered satisfactorily, and authorize the charge of ${(session.receipt.amountPaidCents / 100).toFixed(2)}.
                      </Label>
                    </div>
                  </div>

                  {!isSigned && (
                    <Button 
                      className="w-full py-8 text-lg font-serif uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-xl"
                      disabled={!canSubmit || createSignature.isPending}
                      onClick={handleSign}
                    >
                      {createSignature.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                      Approve & Sign
                    </Button>
                  )}
                  
                  {isSigned && !voidMode && (
                    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border print:hidden">
                      <Button variant="secondary" className="flex-1 font-serif uppercase tracking-wider py-6" onClick={() => window.print()}>
                        <Printer className="w-4 h-4 mr-2" /> Print Record
                      </Button>
                      <Button variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30 font-serif uppercase tracking-wider py-6" onClick={() => setVoidMode(true)}>
                        <AlertTriangle className="w-4 h-4 mr-2" /> Void Signature
                      </Button>
                    </div>
                  )}

                  {voidMode && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2">
                      <div>
                        <h4 className="font-bold text-destructive flex items-center font-serif uppercase tracking-wider">
                          <AlertCircle className="w-5 h-5 mr-2" /> Void this signature?
                        </h4>
                        <p className="text-sm text-destructive/80 mt-2 font-medium">
                          This will invalidate the current signature and allow the customer to re-sign. You must provide a reason.
                        </p>
                      </div>
                      <Textarea 
                        placeholder="Reason for voiding (e.g. Typo in name, customer requested re-sign)..."
                        value={voidReason}
                        onChange={(e) => setVoidReason(e.target.value)}
                        className="bg-background border-destructive/20 focus-visible:ring-destructive resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" className="hover:bg-destructive/20 text-destructive" onClick={() => setVoidMode(false)} disabled={voidSignature.isPending}>
                          Cancel
                        </Button>
                        <Button variant="destructive" className="font-serif uppercase tracking-wider" onClick={handleVoid} disabled={voidSignature.isPending || !voidReason.trim()}>
                          {voidSignature.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Confirm Void
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 rounded-full h-10 w-10 bg-background/80 hover:bg-muted backdrop-blur-md print:hidden border border-border shadow-sm z-50"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
