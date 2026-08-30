import { DollarSign, XCircle, CheckCircle } from "lucide-react";

export function TransparentPricing() {
  return (
    <div className="bg-card border border-border rounded-sm overflow-hidden" data-testid="panel-transparent-pricing">
      <div className="bg-primary/5 border-b border-border p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-3 text-primary">
            <DollarSign className="w-6 h-6" aria-hidden="true" />
            <h2 className="font-serif text-2xl md:text-3xl text-white">Transparent Pricing Policy</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            We do not guess prices over the phone, because a wrong guess helps no one. 
            Real mechanics diagnose the actual problem on-site before quoting a repair.
          </p>
        </div>
        <div className="shrink-0 bg-background border border-primary/20 p-4 rounded-sm text-center min-w-[200px]" data-testid="text-quote-process">
          <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Quote Process</span>
          <span className="font-serif text-2xl text-white">Inspect. Quote. Approve.</span>
          <span className="block text-xs text-muted-foreground mt-1">No work begins without your approval</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        <div className="p-6 md:p-8 bg-background/50">
          <h3 className="text-white font-medium flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
            What We Do Not Do
          </h3>
          <ul className="space-y-3">
            {[
              "Give blind estimates over the phone that later change",
              "Bait-and-switch pricing tactics",
              "Charge shop overhead fees for mobile services",
              "Perform unauthorized work without your explicit approval"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground" data-testid={`list-item-no-${i}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500/50 mt-1.5 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="p-6 md:p-8 bg-background/50">
          <h3 className="text-white font-medium flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-primary" aria-hidden="true" />
            What You Can Expect
          </h3>
          <ul className="space-y-3">
            {[
              "Clear explanation of the problem found during diagnosis",
              "Firm quote provided after on-site inspection",
              "You keep the old parts if you want them",
              "A straight answer on whether a repair is worth doing right now"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground" data-testid={`list-item-yes-${i}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
