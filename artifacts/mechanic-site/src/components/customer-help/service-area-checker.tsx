import { useState } from "react";
import { MapPin, Search, Phone, AlertCircle, CheckCircle2 } from "lucide-react";

export function ServiceAreaChecker() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "covered" | "uncertain">("idle");

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim().toLowerCase();
    
    if (!cleanQuery) {
      setStatus("idle");
      return;
    }

    // Basic client-side check for Houston ZIPs (77xxx) or common Houston terms
    const isZip = /^\d{5}$/.test(cleanQuery);
    const isHoustonZip = isZip && cleanQuery.startsWith("77");
    const houstonTerms = [
      "houston", "katy", "sugar land", "spring", "woodlands", 
      "pearland", "cypress", "bellaire", "pasadena", "baytown", 
      "tomball", "kingwood", "humble", "richmond", "rosenberg"
    ];
    const isHoustonTerm = houstonTerms.some(term => cleanQuery.includes(term));

    if (isHoustonZip || isHoustonTerm) {
      setStatus("covered");
    } else {
      setStatus("uncertain");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-card border border-border p-6 rounded-sm shadow-lg" data-testid="container-service-area">
      <div className="flex items-center gap-3 mb-4">
        <MapPin className="w-6 h-6 text-primary" aria-hidden="true" />
        <h3 className="font-serif text-2xl text-white">Check Service Coverage</h3>
      </div>
      
      <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
        We serve the greater Houston metropolitan area. Enter your ZIP code or neighborhood to check if we can reach you.
      </p>

      <form onSubmit={handleCheck} className="flex gap-2 mb-6" data-testid="form-service-area">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setStatus("idle");
            }}
            placeholder="e.g. 77002 or Katy"
            className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-sm py-3 pl-4 pr-10 text-white placeholder:text-muted-foreground transition-colors outline-none"
            data-testid="input-service-area"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-sm font-semibold transition-colors flex items-center justify-center min-w-[120px]"
          data-testid="button-check-area"
        >
          Check
        </button>
      </form>

      {status === "covered" && (
        <div className="bg-primary/10 border border-primary/30 p-4 rounded-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2" data-testid="status-area-covered">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div>
              <h4 className="text-white font-medium mb-1">Your location may be in our service area.</h4>
            <p className="text-sm text-muted-foreground">
              Your entry looks like it may be in the broader Houston area. We’ll confirm service coverage and dispatch after reviewing your exact location and current conditions.
            </p>
          </div>
        </div>
      )}

      {status === "uncertain" && (
        <div className="bg-muted/50 border border-border p-4 rounded-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2" data-testid="status-area-uncertain">
          <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h4 className="text-white font-medium mb-1">Coverage uncertain</h4>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              We might still cover your location depending on technician availability and current traffic conditions. 
              The best way to know is to call us directly.
            </p>
            <a 
              href="tel:8329301444" 
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors text-sm uppercase tracking-wider"
              data-testid="link-call-uncertain-area"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              (832) 930-1444
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
