import { ArrowLeft, Wrench } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import Footer from "@/components/footer";

type LegalLayoutProps = {
  title: string;
  description: string;
  lastUpdated: string;
  children: ReactNode;
};

function upsertMeta(attribute: "name" | "property", value: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${value}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function LegalLayout({ title, description, lastUpdated, children }: LegalLayoutProps) {
  useEffect(() => {
    document.title = `${title} | Houston Mobile Mechanic`;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", `${title} | Houston Mobile Mechanic`);
    upsertMeta("property", "og:description", description);
  }, [description, title]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-5 md:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Houston Mobile Mechanic home">
            <span className="flex h-9 w-9 skew-x-[-10deg] items-center justify-center rounded-sm bg-primary">
              <Wrench className="h-5 w-5 skew-x-[10deg] text-white" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-serif text-xl uppercase tracking-wider text-white">Houston</span>
              <span className="font-serif text-xs uppercase tracking-widest text-primary">Mobile Mechanic</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
        <div className="mb-8 border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm leading-relaxed text-amber-200">
          <strong className="font-bold text-amber-100">Important:</strong> This document is an informational template
          and is not legal advice. Have a qualified attorney review it for your business, operations, and applicable
          laws before relying on it.
        </div>

        <article className="prose prose-invert max-w-none prose-headings:font-serif prose-headings:font-normal prose-headings:tracking-wide prose-headings:text-white prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary hover:prose-a:text-primary/80">
          <p className="not-prose mb-8 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Last updated: {lastUpdated}
          </p>
          {children}
        </article>

        <div className="mt-12 flex flex-wrap gap-3 border-t border-border pt-6 text-xs font-bold uppercase tracking-[0.12em]">
          <Link href="/privacy-policy" className="text-muted-foreground transition-colors hover:text-primary">
            Privacy Policy
          </Link>
          <Link href="/terms-of-service" className="text-muted-foreground transition-colors hover:text-primary">
            Terms of Service
          </Link>
          <Link href="/refund-policy" className="text-muted-foreground transition-colors hover:text-primary">
            No Refund Policy
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}