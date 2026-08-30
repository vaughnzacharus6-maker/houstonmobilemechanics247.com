import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ClipboardPaste, LocateFixed, ShieldCheck } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const trackingTokenSchema = z.object({
  tracking: z.string().trim().min(1, "Enter your tracking code or paste the tracking link."),
});

type TrackingFormValues = z.infer<typeof trackingTokenSchema>;

function extractTrackingToken(value: string): string | null {
  const input = value.trim();
  if (!input) return null;

  if (/^[A-Za-z0-9_-]{20,128}$/.test(input)) return input;

  try {
    const parsed = new URL(input, window.location.origin);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const trackingSegment = segments.findIndex((segment) => segment === "track");
    const possibleToken = trackingSegment >= 0 ? segments[trackingSegment + 1] : undefined;
    if (possibleToken && /^[A-Za-z0-9_-]{20,128}$/.test(possibleToken)) {
      return possibleToken;
    }
  } catch {
    return null;
  }

  return null;
}

export default function TrackLookupPage() {
  const [, setLocation] = useLocation();
  const form = useForm<TrackingFormValues>({
    resolver: zodResolver(trackingTokenSchema),
    defaultValues: { tracking: "" },
  });

  const onSubmit = (values: TrackingFormValues) => {
    const token = extractTrackingToken(values.tracking);
    if (!token) {
      form.setError("tracking", {
        type: "validate",
        message: "That doesn’t look like a valid tracking code or link. Check the message you received and try again.",
      });
      return;
    }
    setLocation(`/track/${encodeURIComponent(token)}`);
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-xl border border-border bg-card p-6 shadow-2xl sm:p-9" data-testid="section-tracking-entry">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
          data-testid="link-tracking-back-home"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Houston Mobile Mechanic
        </Link>

        <div className="mt-8 flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground">
          <LocateFixed className="h-6 w-6" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-primary">Customer tracking</p>
        <h1 className="mt-2 font-serif text-4xl text-white">Open your service link</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Paste the private tracking link you received, or enter its tracking code. Tracking links are only for the customer they were sent to.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" data-testid="form-tracking-entry">
            <FormField
              control={form.control}
              name="tracking"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking link or code</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <ClipboardPaste className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-primary" />
                      <Input
                        {...field}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="Paste your link or code"
                        className="h-12 border-border bg-background pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
                        data-testid="input-tracking-link"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-primary/90"
              data-testid="button-open-tracking-link"
            >
              Open secure tracking
            </button>
          </form>
        </Form>

        <div className="mt-7 flex gap-3 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          <p>We don’t ask you to create an account to track an active service call. The private link controls access.</p>
        </div>
      </section>
    </main>
  );
}