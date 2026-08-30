import React, { useEffect, useRef, useState } from "react";
import { useGetServiceCallConversation, useSendServiceCallMessage, getGetServiceCallConversationQueryKey } from "@workspace/api-client-react";
import { Loader2, Send, MessageSquare, Check, CheckCheck, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function ServiceCallChat({
  callId,
  currentUserRole,
  isClosed = false,
}: {
  callId: number;
  currentUserRole: "admin" | "technician";
  isClosed?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: conversation, isLoading, isError } = useGetServiceCallConversation(callId, {
    query: {
      queryKey: getGetServiceCallConversationQueryKey(callId),
      refetchInterval: 10000,
      retry: false,
    }
  });
  
  const sendMessage = useSendServiceCallMessage();
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation?.messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sendMessage.isPending) return;
    setSendError(null);
    sendMessage.mutate({
      id: callId,
      data: { body: text.trim() }
    }, {
      onSuccess: () => {
        setText("");
        queryClient.invalidateQueries({ queryKey: getGetServiceCallConversationQueryKey(callId) });
      },
      onError: () => {
        setSendError("Message could not be sent. Please try again.");
      }
    });
  };

  const unreadCount = conversation?.unreadCount || 0;

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full mt-4 flex items-center justify-between bg-card border border-border hover:border-primary/50 transition-colors p-3 rounded"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <MessageSquare className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">Service Chat</span>
        </div>
        {unreadCount > 0 && (
          <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-[10px] font-bold">
            {unreadCount} New
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col h-[350px] bg-background border border-border rounded mt-4 overflow-hidden shadow-inner flex-shrink-0">
      <div 
        className="bg-card border-b border-border px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors" 
        onClick={() => setIsOpen(false)}
      >
        <h4 className="font-bold text-[10px] uppercase tracking-widest text-foreground flex items-center gap-2">
          <MessageSquare className="w-3 h-3 text-primary" /> Service Chat
        </h4>
        <span className="text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest">Close</span>
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
          <AlertCircle className="w-6 h-6 text-destructive" />
          <p className="text-[10px] uppercase tracking-widest">Conversation unavailable</p>
          <p className="text-xs">This call may no longer be accessible.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {(!conversation?.messages || conversation.messages.length === 0) && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <MessageSquare className="w-6 h-6 mb-2" />
              <p className="text-[10px] uppercase tracking-widest">No messages</p>
            </div>
          )}
          {conversation?.messages.map((msg) => {
            const isMe = msg.senderRole === currentUserRole;
            return (
              <div key={msg.id} className={`flex flex-col max-w-[90%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{msg.senderLabel}</span>
                  <span className="text-[8px] text-muted-foreground/50">
                    {new Date(msg.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <div className={`px-2.5 py-1.5 rounded text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-input text-foreground rounded-tl-none border border-border'}`}>
                  {msg.body}
                </div>
                {isMe && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                    {msg.deliveryStatus === "read" ? <CheckCheck className="w-3 h-3 text-green-500" /> : <Check className="w-3 h-3" />}
                    {msg.deliveryStatus === "read" ? "Read" : msg.deliveryStatus === "delivered" ? "Delivered" : "Sent"}
                  </span>
                )}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}

      {isClosed ? (
        <div className="border-t border-border bg-card px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          This call is closed. Chat is read-only.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-2 bg-card border-t border-border flex gap-2 shrink-0">
          <input
            type="text"
            value={text}
            maxLength={2000}
            onChange={e => setText(e.target.value)}
            placeholder="Type message..."
            aria-label="Message service call"
            className="flex-1 bg-input border border-border rounded px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!text.trim() || sendMessage.isPending}
            aria-label="Send message"
            className="bg-primary text-primary-foreground p-1.5 rounded disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      )}
      {sendError && (
        <p className="px-3 pb-2 text-[10px] font-medium text-destructive">{sendError}</p>
      )}
    </div>
  );
}
