import { Camera } from "lucide-react";

export function CustomerStories() {
  return (
    <div className="w-full bg-card border border-border p-8 md:p-12 text-center rounded-sm" data-testid="empty-state-customer-stories">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-background border border-border mb-6 shadow-inner">
        <Camera className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
      </div>
      
      <h2 className="font-serif text-3xl text-white mb-4">Real Jobs. Real Results.</h2>
      
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          We are currently compiling our gallery of on-site repairs, commercial fleet interventions, and verified customer experiences from across the Houston metro area.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          We believe in authenticity. We refuse to fabricate testimonials, use stock photography for repair work, or invent success stories. 
        </p>
        <p className="text-muted-foreground leading-relaxed">
          When verified customer feedback and completed-job photos are ready to share, you’ll find them here.
        </p>
      </div>
    </div>
  );
}
