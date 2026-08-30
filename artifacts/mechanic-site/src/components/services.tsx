import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Wrench, Zap, Thermometer, Settings, Fuel, Truck, Package, RotateCcw, ChevronRight } from "lucide-react";
import { passengerServices, heavyServices } from "@/data/services";

const iconMap: Record<string, React.ReactNode> = {
  "oil-change": <Wrench className="w-7 h-7" />,
  "brake-repair": <RotateCcw className="w-7 h-7" />,
  "battery-electrical": <Zap className="w-7 h-7" />,
  "tires": <Package className="w-7 h-7" />,
  "engine-diagnostics": <Settings className="w-7 h-7" />,
  "ac-cooling": <Thermometer className="w-7 h-7" />,
  "fuel-system": <Fuel className="w-7 h-7" />,
  "transmission": <Settings className="w-7 h-7" />,
};

function useIntersection(ref: React.RefObject<Element | null>, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

export default function Services() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const heavyRef = useRef<HTMLDivElement>(null);
  const sectionVisible = useIntersection(sectionRef);
  const heavyVisible = useIntersection(heavyRef);

  return (
    <section id="services" className="py-24 md:py-32 bg-background relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-primary to-transparent opacity-40" />

      <div className="container mx-auto px-4 md:px-6">
        <div ref={sectionRef} className={`transition-all duration-700 ${sectionVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="mb-12">
            <span className="text-primary text-sm font-bold uppercase tracking-widest">On-Site Service</span>
            <h2 className="font-serif text-4xl md:text-6xl text-white mt-2">Sedans & SUVs</h2>
            <p className="text-muted-foreground mt-4 max-w-xl">We come to your home, office, or wherever you're stuck. No tow truck. No waiting room.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {passengerServices.map((s, i) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="bg-card p-6 group hover:bg-primary/10 transition-all duration-300 text-left"
                style={{ transitionDelay: `${i * 40}ms` }}
              >
                <div className="text-primary mb-4 group-hover:scale-110 transition-transform duration-300 w-fit">
                  {iconMap[s.slug] ?? <Wrench className="w-7 h-7" />}
                </div>
                <h3 className="font-serif text-lg text-white mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{s.shortDesc}</p>
                <span className="text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn More <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div
          ref={heavyRef}
          className={`mt-24 transition-all duration-700 delay-100 ${heavyVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <span className="text-primary text-sm font-bold uppercase tracking-widest">Heavy Duty</span>
              <h2 className="font-serif text-4xl md:text-6xl text-white mt-2">Semi Trucks & Commercial</h2>
              <p className="text-muted-foreground mt-4 max-w-xl">Big rigs, 18-wheelers, fleet vehicles. We handle commercial jobs other mobile mechanics turn away.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Truck className="w-8 h-8 text-primary" />
              <span className="font-serif text-primary text-xl uppercase tracking-wider">Class 7 &amp; 8 Capable</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {heavyServices.map((s, i) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="bg-card/60 border-l-2 border-l-primary/0 p-6 group hover:border-l-primary hover:bg-card transition-all duration-300 text-left"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="w-3 h-3 rounded-full bg-primary mb-4 group-hover:scale-150 transition-transform" />
                <h3 className="font-serif text-lg text-white mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{s.shortDesc}</p>
                <span className="text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn More <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
