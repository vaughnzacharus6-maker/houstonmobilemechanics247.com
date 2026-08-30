import { PhoneCall, Truck, Wrench, ShieldCheck } from "lucide-react";

export function WhatHappensNext() {
  const steps = [
    {
      icon: <PhoneCall className="w-6 h-6" />,
      title: "1. Assessment Call",
      desc: "Call us directly. We will gather details about your vehicle and location to ensure we bring the right tools."
    },
    {
      icon: <Truck className="w-6 h-6" />,
      title: "2. Honest Dispatch",
      desc: "We dispatch a mechanic to your location. We do not make false ETA promises—we provide realistic arrival estimates based on current Houston traffic and job loads."
    },
    {
      icon: <Wrench className="w-6 h-6" />,
      title: "3. On-Site Diagnosis",
      desc: "Our mechanic arrives, secures the work area, and diagnoses the actual problem in person before touching any parts."
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "4. Transparent Fix",
      desc: "We quote the repair. If you approve, we complete the work right there. You are back on the road safely."
    }
  ];

  return (
    <section className="py-12 bg-background" data-testid="section-what-happens">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-10 text-center md:text-left">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">What Happens Next</h2>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            When you are stranded, uncertainty is the enemy. Here is exactly what you can expect when you contact Houston Mobile Mechanic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="hidden lg:block absolute top-8 left-12 right-12 h-px bg-border z-0" aria-hidden="true" />
          
          {steps.map((step, index) => (
            <div key={index} className="relative z-10 bg-card border border-border p-6 rounded-sm flex flex-col items-start shadow-sm" data-testid={`card-step-${index}`}>
              <div className="bg-background border border-primary/30 p-3 rounded-full text-primary mb-5 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                {step.icon}
              </div>
              <h3 className="text-white font-serif text-xl mb-3">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
