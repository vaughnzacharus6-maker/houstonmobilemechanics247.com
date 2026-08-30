import { useEffect, useRef, useState } from "react";
import { Clock, MapPin, Star, DollarSign, Truck, Phone } from "lucide-react";

const reasons = [
  {
    icon: <Clock className="w-8 h-8" />,
    title: "Truly 24/7",
    desc: "No answering machines, no callbacks at sunrise. We answer and we show up — midnight, holidays, weekends. Your emergency doesn't wait, and neither do we.",
    stat: "24/7",
    statLabel: "Always Available",
  },
  {
    icon: <MapPin className="w-8 h-8" />,
    title: "We Come to You",
    desc: "Stuck on I-10, I-45, or in your driveway? We come to your exact location. No tow, no shop, no hassle. Just a mechanic at your door.",
    stat: "0 mi",
    statLabel: "You Drive to Us",
  },
  {
    icon: <Truck className="w-8 h-8" />,
    title: "All Vehicle Types",
    desc: "From compact sedans to 80,000 lb semi trucks. We carry the tools and parts to handle passenger cars and heavy commercial vehicles on the same call.",
    stat: "All",
    statLabel: "Vehicle Classes",
  },
  {
    icon: <DollarSign className="w-8 h-8" />,
    title: "Transparent Pricing",
    desc: "No shop overhead means lower prices for you. We quote before we wrench — no surprise charges, no hidden fees. What we say is what you pay.",
    stat: "$0",
    statLabel: "Hidden Fees",
  },
  {
    icon: <Star className="w-8 h-8" />,
    title: "Houston Local",
    desc: "We know Houston's roads, heat, and humidity — and what they do to vehicles. Local mechanic, local knowledge, fast response times across the metro area.",
    stat: "HTX",
    statLabel: "Hometown Team",
  },
  {
    icon: <Phone className="w-8 h-8" />,
    title: "Direct Line, Always",
    desc: "Call (832) 930-1444 and talk to a real mechanic. No dispatch center, no third-party app. Direct, honest communication from first call to final fix.",
    stat: "1 Call",
    statLabel: "Direct to Mechanic",
  },
];

function useIntersection(ref: React.RefObject<Element | null>, threshold = 0.1) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

export default function WhyChooseUs() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useIntersection(ref);

  return (
    <section id="why-us" className="py-24 md:py-32 relative" style={{ background: "linear-gradient(180deg, hsl(0 0% 5%) 0%, hsl(215 20% 9%) 100%)" }}>
      {/* Diagonal stripe pattern */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, hsl(0 0% 100%) 0, hsl(0 0% 100%) 1px, transparent 0, transparent 50%)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-bold uppercase tracking-widest">Why Thousands Choose Us</span>
          <h2 className="font-serif text-4xl md:text-6xl text-white mt-2">Built Different</h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Other shops make you wait. We make you wonder why you ever waited at all.
          </p>
        </div>

        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border"
        >
          {reasons.map((r, i) => (
            <div
              key={r.title}
              className={`bg-background p-8 group hover:bg-card transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="text-primary group-hover:scale-110 transition-transform duration-300 mt-1 shrink-0">
                  {r.icon}
                </div>
                <div className="border-l border-border pl-4">
                  <div className="font-serif text-3xl text-primary">{r.stat}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{r.statLabel}</div>
                </div>
              </div>
              <h3 className="font-serif text-xl text-white mb-3">{r.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA strip */}
        <div className="mt-16 border border-primary/20 bg-primary/5 rounded-sm p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-serif text-2xl text-white">Broken down right now?</h3>
            <p className="text-muted-foreground text-sm mt-1">Call immediately — we dispatch fast across all of Greater Houston.</p>
          </div>
          <a
            href="tel:8329301444"
            className="shrink-0 inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-sm transition-all duration-300 shadow-[0_0_30px_rgba(249,115,22,0.25)] hover:shadow-[0_0_50px_rgba(249,115,22,0.4)] font-serif text-2xl tracking-widest"
          >
            <Phone className="w-5 h-5" />
            (832) 930-1444
          </a>
        </div>
      </div>
    </section>
  );
}
