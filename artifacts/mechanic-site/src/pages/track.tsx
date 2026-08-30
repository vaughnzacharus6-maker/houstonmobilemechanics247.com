import React, { useEffect, useRef, useState } from "react";
import { 
  useGetPublicTracking, 
  getGetPublicTrackingQueryKey,
  useGetPublicTrackingConversation, 
  useSendPublicTrackingMessage, 
  getGetPublicTrackingConversationQueryKey
} from "@workspace/api-client-react";
import { Loader2, MapPin, Navigation, Clock, AlertTriangle, Truck, CheckCircle, Car, Send, MessageSquare, Check, CheckCheck, AlertCircle, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

export default function TrackPage({ params }: { params?: { token?: string } }) {
  const token = params?.token;

  if (!token) return <InvalidTracking message="Tracking token is missing." />;

  return <TrackingContent token={token} />;
}

function SchematicMap({
  isEnRoute,
  hasLocation,
  progress,
}: {
  isEnRoute: boolean;
  hasLocation: boolean;
  progress: number;
}) {
  return (
    <div
      className="relative w-full min-h-[285px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      aria-label={hasLocation ? "Live technician approach map" : "Simulated technician approach map"}
    >
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground">Approach map</span>
        </div>
        <div className="rounded-full border border-border bg-card/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest">
        {hasLocation ? (
            <span className="flex items-center gap-1.5 text-green-500">
              <Radio className="h-3 w-3 animate-pulse" />
              Live location shared
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              Simulated approach
            </span>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 top-[53px] overflow-hidden bg-[#182126]">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(32deg, transparent 46%, rgba(255,255,255,0.055) 47%, rgba(255,255,255,0.055) 52%, transparent 53%), linear-gradient(118deg, transparent 46%, rgba(255,255,255,0.045) 47%, rgba(255,255,255,0.045) 52%, transparent 53%), linear-gradient(90deg, transparent 49%, rgba(255,255,255,0.035) 50%, transparent 51%)",
            backgroundSize: "165px 115px, 190px 145px, 76px 76px",
          }}
        />
        <div className="absolute left-[-10%] top-[37%] h-16 w-[120%] rotate-[12deg] border-y border-white/10 bg-white/[0.025]" />
        <div className="absolute left-[-10%] top-[60%] h-10 w-[120%] rotate-[-18deg] border-y border-white/10 bg-white/[0.025]" />

        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 400" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 92 308 C 178 275, 195 207, 289 226 S 414 300, 504 220 S 622 117, 712 86" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="18" strokeLinecap="round" />
          <path d="M 92 308 C 178 275, 195 207, 289 226 S 414 300, 504 220 S 622 117, 712 86" fill="none" stroke="rgba(255,116,23,0.75)" strokeWidth="5" strokeLinecap="round" strokeDasharray="10 10" />
          <path d="M 92 308 C 178 275, 195 207, 289 226 S 414 300, 504 220 S 622 117, 712 86" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 11" />
        </svg>

        <motion.div
          className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          initial={{ left: "12%", top: "77%" }}
          animate={{ left: `${12 + progress * 76}%`, top: `${77 - progress * 55}%` }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          aria-label="Technician marker"
        >
          <span className="mb-1 rounded bg-background/90 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-primary shadow-lg">
            Technician
          </span>
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground shadow-[0_0_24px_rgba(255,116,23,0.45)]">
            {isEnRoute && <span className="absolute inset-[-8px] rounded-full border border-primary/40 animate-ping" />}
            <Truck className="relative h-5 w-5" />
          </span>
        </motion.div>

        <div className="absolute bottom-9 left-4 z-10 flex flex-col items-start">
          <span className="mb-1 rounded bg-background/90 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-foreground shadow-lg">
            Current route
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-lg">
            <Navigation className="h-4 w-4 rotate-[-35deg]" />
          </span>
        </div>

        <div className="absolute right-4 top-5 z-10 flex flex-col items-end">
          <span className="mb-1 rounded bg-background/90 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-foreground shadow-lg">
            Your destination
          </span>
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-background bg-green-500 text-white shadow-lg">
            <MapPin className="h-5 w-5" />
          </span>
        </div>

        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-white/55">
          <span>Route progress</span>
          <span>{Math.round(progress * 100)}% of approach</span>
        </div>
      </div>
    </div>
  );
}

function TrackConversation({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const { data: conversation, isLoading, isError, refetch } = useGetPublicTrackingConversation(token, {
    query: {
      queryKey: getGetPublicTrackingConversationQueryKey(token),
      refetchInterval: 10000,
      retry: false,
    }
  });

  const sendMessage = useSendPublicTrackingMessage();
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sendMessage.isPending) return;
    setSendError(null);
    sendMessage.mutate({
      token,
      data: { body: text.trim() }
    }, {
      onSuccess: () => {
        setText("");
        queryClient.invalidateQueries({ queryKey: getGetPublicTrackingConversationQueryKey(token) });
      },
      onError: () => {
        setSendError("Your message could not be sent. Please try again.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="h-full min-h-[400px] flex items-center justify-center border border-border rounded-xl bg-card shadow-2xl">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !conversation) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-border bg-card p-8 text-center shadow-2xl">
        <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
        <h3 className="font-serif text-xl uppercase tracking-wider text-foreground">Chat unavailable</h3>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          This private conversation could not be loaded. Your tracking link may have expired or been revoked.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-5 rounded bg-primary px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] bg-card border border-border rounded-xl overflow-hidden shadow-2xl relative">
      <div className="bg-background border-b border-border px-5 py-4 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <h3 className="font-bold text-sm uppercase tracking-widest text-foreground">Message your Mechanic</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {(!conversation?.messages || conversation.messages.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
            <MessageSquare className="w-10 h-10 mb-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-widest leading-relaxed">No messages yet.<br/>Send a message to your mechanic.</p>
          </div>
        )}
        {conversation?.messages.map((msg) => {
          const isCustomer = msg.senderRole === "customer";
          return (
            <div key={msg.id} className={`flex flex-col max-w-[85%] ${isCustomer ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{msg.senderLabel}</span>
                 <span className="text-[9px] text-muted-foreground/60">
                   {new Date(msg.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                 </span>
              </div>
              <div className={`px-4 py-2.5 rounded-lg text-[15px] leading-relaxed shadow-sm ${isCustomer ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-input text-foreground rounded-tl-none border border-border'}`}>
                {msg.body}
              </div>
               <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                 {msg.deliveryStatus === "read" ? <CheckCheck className="h-3 w-3 text-green-500" /> : <Check className="h-3 w-3" />}
                 {msg.deliveryStatus === "read" ? "Read" : msg.deliveryStatus === "delivered" ? "Delivered" : "Sent"}
               </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 bg-background border-t border-border flex gap-3">
        <input 
          type="text" 
          value={text}
          maxLength={2000}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          aria-label="Message your mechanic"
          className="flex-1 bg-input border border-border rounded-lg px-4 py-3 text-[15px] text-foreground outline-none focus:ring-1 focus:ring-primary shadow-inner"
        />
        <button 
          type="submit" 
          disabled={!text.trim() || sendMessage.isPending}
          className="bg-primary text-primary-foreground p-3 rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          {sendMessage.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
      {sendError && (
        <p className="px-5 pb-4 text-sm font-medium text-destructive">{sendError}</p>
      )}
    </div>
  );
}

function TrackingContent({ token }: { token: string }) {
  const { data, isLoading, error } = useGetPublicTracking(token, {
    query: {
      queryKey: getGetPublicTrackingQueryKey(token),
      refetchInterval: (query) => {
        // Poll every 10 seconds if active and sharing
        if (query.state.data?.status === 'completed' || query.state.data?.status === 'cancelled') return false;
        const isExpired = query.state.data?.expiresAt ? new Date(query.state.data.expiresAt) < new Date() : false;
        if (isExpired) return false;
        return query.state.data?.sharing ? 10000 : 30000;
      },
      retry: false,
    }
  });

  // Background style
  useEffect(() => {
    document.documentElement.style.setProperty('--background', '0 0% 5%');
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="font-serif text-2xl tracking-widest text-foreground">LOCATING MECHANIC</h2>
      </div>
    );
  }

  if (error || !data) {
    return <InvalidTracking message="Tracking link is invalid, expired, or unavailable." />;
  }

  const isExpired = new Date(data.expiresAt) < new Date();
  
  if (isExpired) {
    return <InvalidTracking message="This tracking link has expired." />;
  }

  const isComplete = data.status === "completed";
  const isCancelled = data.status === "cancelled";
  const estimatedMinutes = data.etaMinutes ?? (data.status === "on_the_way" ? 29 : 39);
  const etaRange = {
    minimum: Math.max(1, estimatedMinutes - 5),
    maximum: estimatedMinutes + 5,
  };
  const approachProgress = data.hasLiveLocation
    ? 0.72
    : data.status === "on_the_way"
      ? 0.58
      : 0.18;

  if (isComplete || isCancelled) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,116,23,0.1)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
        <div className="max-w-md w-full p-8 bg-card border border-border rounded-xl text-center shadow-2xl relative z-10">
          {isComplete ? (
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          ) : (
            <AlertTriangle className="w-20 h-20 text-destructive mx-auto mb-6" />
          )}
          <h2 className="text-3xl font-serif text-foreground uppercase tracking-wider mb-2">
            {isComplete ? "SERVICE COMPLETE" : "SERVICE CANCELLED"}
          </h2>
          <p className="text-muted-foreground">
            {isComplete ? "Your service call has been successfully completed. Thank you for choosing Houston Mobile Mechanic!" : "This service call has been cancelled."}
          </p>
          <div className="mt-8 border-t border-border pt-6">
            <a href="/" className="inline-flex text-[10px] font-bold text-primary uppercase tracking-widest hover:text-primary-foreground transition-colors bg-primary/10 hover:bg-primary px-4 py-2 rounded">
              Return Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center p-4 sm:p-6 overflow-hidden relative">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-primary) 0%, transparent 60%)', filter: 'blur(100px)' }} />

      <div className="w-full max-w-5xl mt-6 lg:mt-12 flex-1 flex flex-col lg:flex-row gap-6 lg:gap-10 relative z-10">
        
        {/* Left Column: Status and Map */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="mb-2">
            <Car className="w-12 h-12 text-primary mb-5" />
            <h1 className="font-serif text-3xl md:text-4xl tracking-widest uppercase">{data.statusLabel}</h1>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-widest font-bold">Houston Mobile Mechanic</p>
          </div>

          <AnimatePresence mode="popLayout">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border-l-4 border-primary rounded-r-xl p-6 md:p-8 shadow-2xl flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Estimated Arrival</p>
                <p className="text-2xl md:text-3xl font-serif text-foreground leading-tight">
                  Around {etaRange.minimum}–{etaRange.maximum} minutes away
                </p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {data.hasLiveLocation ? "Based on live location sharing" : "Approximate approach preview"}
                </p>
              </div>
              <Clock className="w-16 h-16 text-primary/10" />
            </motion.div>
          </AnimatePresence>

            <SchematicMap
            isEnRoute={data.status === 'on_the_way'} 
            hasLocation={data.hasLiveLocation} 
             progress={approachProgress}
          />
        </div>

        {/* Right Column: Chat */}
        <div className="flex-1 lg:max-w-md w-full">
          <TrackConversation token={token} />
        </div>

      </div>
    </div>
  );
}

function InvalidTracking({ message }: { message: string }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 relative">
      <div className="max-w-md w-full p-8 bg-card border border-border rounded-xl text-center shadow-2xl relative z-10">
        <Link2OffIcon className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-50" />
        <h2 className="text-2xl font-serif text-foreground uppercase tracking-wider mb-3">
          Tracking Unavailable
        </h2>
        <p className="text-muted-foreground mb-8">
          {message}
        </p>
        <a href="/" className="inline-block text-[10px] font-bold bg-primary text-primary-foreground uppercase tracking-widest hover:bg-primary/90 px-6 py-3 rounded transition-colors">
          Return Home
        </a>
      </div>
    </div>
  );
}

function Link2OffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <line x1="8" x2="16" y1="12" y2="12" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}
