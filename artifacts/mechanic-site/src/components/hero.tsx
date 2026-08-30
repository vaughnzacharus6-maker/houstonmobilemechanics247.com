import { useEffect, useRef } from "react";
import { Phone, ChevronDown, Clock, MapPin, Shield, Sparkles } from "lucide-react";

const assetBase = import.meta.env.BASE_URL;

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const onScroll = () => {
      const y = window.scrollY;
      hero.style.setProperty("--parallax-y", `${y * 0.4}px`);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative min-h-screen overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(0 0% 4%) 0%, hsl(215 20% 9%) 50%, hsl(0 0% 5%) 100%)" }}
    >
      {/* Image-led service scene */}
      <div className="absolute inset-0 lg:inset-y-0 lg:left-[43%]">
        <img
          src={`${assetBase}generated/roadside-diagnostics.jpg`}
          alt="Illustrative scene of a mobile mechanic diagnosing a pickup truck beside a Houston roadway"
          className="h-full w-full object-cover object-center opacity-75 lg:opacity-100"
          loading="eager"
          decoding="async"
          data-testid="image-hero-service-scene"
        />
        <div className="absolute inset-0 bg-black/60 sm:bg-black/50 lg:bg-gradient-to-r lg:from-[#0a0a0b] lg:via-[#0a0a0b]/45 lg:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-[#0a0a0b]/35 lg:bg-gradient-to-t lg:from-[#0a0a0b]/65 lg:via-transparent lg:to-transparent" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          transform: "translateY(var(--parallax-y, 0))",
        }}
      />

      {/* Orange glow */}
      <div className="pointer-events-none absolute left-1/3 top-1/3 z-[1] h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, hsl(24 95% 53%) 0%, transparent 70%)" }} />

      {/* 24/7 Badge */}
      <div className="container relative z-10 mx-auto flex min-h-screen items-center px-4 pt-28 sm:px-6 lg:px-8">
        <div className="flex max-w-3xl flex-col items-start pb-24 pt-8 text-left lg:w-[56%] lg:py-24">
        <div className="mb-8 inline-flex items-center gap-2 border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-bold uppercase tracking-widest text-primary animate-pulse">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          Available 24 Hours — 7 Days a Week
        </div>

        <h1 className="mb-6 font-serif text-6xl leading-[0.9] tracking-tight text-white sm:text-7xl md:text-8xl lg:text-9xl">
          MOBILE<br />
          <span className="text-primary">MECHANIC</span><br />
          HOUSTON
        </h1>

        <p className="mb-10 max-w-xl text-base font-light leading-relaxed text-white/75 sm:text-lg md:text-xl">
          We come to you — day or night. Sedans, SUVs, pickups, and heavy-duty commercial vehicles including semi trucks and big rigs. No tow needed.
        </p>

        <div
          className="mb-5 inline-flex max-w-full items-start gap-2 border border-white/20 bg-black/55 px-3 py-2 text-left text-[9px] font-bold uppercase leading-relaxed tracking-[0.14em] text-white/85 backdrop-blur-sm sm:items-center sm:text-[10px] sm:tracking-[0.16em]"
          data-testid="disclosure-hero-service-scene"
        >
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary sm:mt-0" aria-hidden="true" />
          AI-generated illustrative scene · Not a verified job photo
        </div>

        {/* Phone CTA */}
        <a
          href="tel:8329301444"
          className="group relative mb-6 inline-flex w-full max-w-[340px] items-center justify-center gap-2 bg-primary px-3 py-5 text-white shadow-[0_0_40px_rgba(249,115,22,0.3)] transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_60px_rgba(249,115,22,0.5)] sm:w-auto sm:max-w-none sm:gap-4 sm:px-8"
          data-testid="link-hero-phone"
        >
          <Phone className="w-6 h-6 group-hover:animate-bounce" />
          <span className="whitespace-nowrap font-serif text-[1.625rem] tracking-[0.06em] min-[360px]:text-[2rem] min-[360px]:tracking-[0.08em] sm:text-3xl sm:tracking-widest md:text-4xl">(832) 930-1444</span>
        </a>

        <button
          onClick={scrollToContact}
          className="text-muted-foreground hover:text-primary border border-white/10 hover:border-primary/40 px-8 py-3 rounded-sm transition-all duration-300 text-sm font-bold uppercase tracking-widest"
        >
          Get a Free Quote
        </button>

        {/* Stats row */}
        <div className="mt-16 flex flex-wrap justify-start gap-x-8 gap-y-4 text-left">
          {[
            { icon: <Clock className="w-5 h-5" />, label: "24/7 Emergency Response" },
            { icon: <MapPin className="w-5 h-5" />, label: "All Houston Metro Area" },
            { icon: <Shield className="w-5 h-5" />, label: "Licensed & Insured" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-muted-foreground">
              <span className="text-primary">{item.icon}</span>
              <span className="text-xs font-semibold uppercase tracking-wider">{item.label}</span>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 text-muted-foreground transition-colors hover:text-primary animate-bounce sm:block"
        aria-label="Scroll to services"
      >
        <ChevronDown className="w-8 h-8" />
      </button>
    </section>
  );
}
