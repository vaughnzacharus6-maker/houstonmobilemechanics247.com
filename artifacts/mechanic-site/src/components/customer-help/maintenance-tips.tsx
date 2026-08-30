import { ThermometerSun, CloudLightning, Droplets, BatteryWarning } from "lucide-react";
import { Link } from "wouter";

export function MaintenanceTips() {
  const tips = [
    {
      icon: <ThermometerSun className="w-5 h-5" />,
      title: "Houston Heat & Batteries",
      desc: "Extreme summer heat accelerates chemical degradation in car batteries. If your battery is over 3 years old and struggling to start, replace it before it leaves you stranded in a parking lot.",
      category: "Electrical",
      serviceSlug: "battery-electrical",
    },
    {
      icon: <Droplets className="w-5 h-5" />,
      title: "Coolant System Stress",
      desc: "Stop-and-go traffic on I-45 at 100 degrees will expose any weakness in your cooling system. Check your coolant reservoir monthly and watch for temperature gauge spikes.",
      category: "Cooling",
      serviceSlug: "ac-cooling",
    },
    {
      icon: <CloudLightning className="w-5 h-5" />,
      title: "Hurricane Season Prep",
      desc: "Before severe weather hits, ensure your wiper blades are fresh, tires have adequate tread for heavy rain, and your emergency brake works correctly.",
      category: "Safety",
      serviceSlug: "tires",
    },
    {
      icon: <BatteryWarning className="w-5 h-5" />,
      title: "Belt & Hose Inspections",
      desc: "High humidity and heat cause rubber belts and hoses to dry rot faster. Listen for squealing on startup and look for visible cracks.",
      category: "Engine",
      serviceSlug: "engine-diagnostics",
    }
  ];

  return (
    <div className="bg-background py-8" data-testid="panel-maintenance-tips">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 border-b border-border pb-4 gap-2">
        <h2 className="font-serif text-2xl md:text-3xl text-white">Houston Environmental Maintenance</h2>
        <span className="text-xs font-bold uppercase tracking-widest text-primary shrink-0">Local Knowledge</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tips.map((tip, idx) => (
          <div key={idx} className="group p-5 bg-card border border-border hover:border-primary/50 transition-colors rounded-sm flex items-start gap-4" data-testid={`tip-card-${idx}`}>
            <div className="shrink-0 bg-background border border-border group-hover:border-primary/50 group-hover:text-primary p-3 rounded-sm text-muted-foreground transition-colors">
              {tip.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background px-2 py-0.5 rounded-sm border border-border">
                  {tip.category}
                </span>
              </div>
              <h3 className="text-white font-medium text-lg mb-2">{tip.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tip.desc}
              </p>
              <Link
                href={`/services/${tip.serviceSlug}`}
                className="mt-3 inline-flex text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80"
                data-testid={`link-maintenance-service-${tip.serviceSlug}`}
              >
                Learn about this service
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
