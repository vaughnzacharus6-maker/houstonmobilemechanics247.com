import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Phone, CheckCircle, ChevronRight, Wrench, Truck } from "lucide-react";
import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { servicesBySlug, passengerServices, heavyServices } from "@/data/services";

export default function ServicePage() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const service = servicesBySlug[params.slug ?? ""];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [params.slug]);

  if (!service) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-4xl text-white mb-4">Service Not Found</h1>
          <button onClick={() => navigate("/")} className="text-primary hover:underline">
            ← Back to Home
          </button>
        </div>
      </main>
    );
  }

  const relatedServices = (service.category === "passenger" ? passengerServices : heavyServices)
    .filter((s) => s.slug !== service.slug)
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-background w-full overflow-x-hidden flex flex-col">
      <Navigation />

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Background accent */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-primary to-transparent opacity-40" />
          <div className="absolute right-0 top-0 w-px h-full bg-gradient-to-b from-primary/20 via-transparent to-transparent" />
          <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 md:px-6">
          {/* Breadcrumb */}
          <button
            onClick={() => navigate("/#services")}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-semibold uppercase tracking-wider mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            All Services
          </button>

          <div className="max-w-3xl">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">
              {service.category === "passenger" ? "Passenger & SUV" : "Heavy Duty & Commercial"}
            </span>
            <h1 className="font-serif text-5xl md:text-7xl text-white mt-3 mb-5 leading-none">
              {service.title}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed mb-8">
              {service.tagline}
            </p>

            <a
              href="tel:8329301444"
              className="inline-flex items-center gap-3 bg-primary text-white px-8 py-4 font-serif text-xl tracking-wide hover:bg-primary/90 transition-colors rounded-sm"
            >
              <Phone className="w-5 h-5" />
              (832) 930-1444
            </a>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            {/* Left: main content */}
            <div className="lg:col-span-2 space-y-16">
              {/* What is it */}
              <div>
                <span className="text-primary text-xs font-bold uppercase tracking-widest">Overview</span>
                <h2 className="font-serif text-3xl md:text-4xl text-white mt-2 mb-6">About This Service</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">{service.whatIsIt}</p>
              </div>

              {/* What's included */}
              <div>
                <span className="text-primary text-xs font-bold uppercase tracking-widest">What's Included</span>
                <h2 className="font-serif text-3xl md:text-4xl text-white mt-2 mb-8">Every Visit Includes</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {service.includes.map((item) => (
                    <div key={item} className="flex items-start gap-3 bg-card border border-border p-4 rounded-sm group hover:border-primary/40 transition-colors">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Process */}
              <div>
                <span className="text-primary text-xs font-bold uppercase tracking-widest">How It Works</span>
                <h2 className="font-serif text-3xl md:text-4xl text-white mt-2 mb-8">The Process</h2>
                <div className="space-y-px bg-border">
                  {service.process.map((step, i) => (
                    <div key={step.step} className="bg-background p-6 flex gap-6 group hover:bg-card transition-colors">
                      <div className="shrink-0 w-10 h-10 bg-primary/10 border border-primary/30 flex items-center justify-center rounded-sm group-hover:bg-primary group-hover:border-primary transition-colors">
                        <span className="font-serif text-primary text-lg group-hover:text-white transition-colors">{i + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-serif text-lg text-white mb-1">{step.step}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Good to know */}
              <div>
                <span className="text-primary text-xs font-bold uppercase tracking-widest">Good to Know</span>
                <h2 className="font-serif text-3xl md:text-4xl text-white mt-2 mb-8">Expert Tips</h2>
                <ul className="space-y-4">
                  {service.goodToKnow.map((tip) => (
                    <li key={tip} className="flex items-start gap-4">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2.5 shrink-0" />
                      <p className="text-muted-foreground leading-relaxed">{tip}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: sidebar CTA */}
            <div className="space-y-6">
              {/* CTA card */}
              <div className="sticky top-28 space-y-6">
                <div className="bg-card border border-border p-8 rounded-sm">
                  <div className="w-12 h-12 bg-primary/10 border border-primary/30 flex items-center justify-center rounded-sm mb-6">
                    {service.category === "passenger"
                      ? <Wrench className="w-6 h-6 text-primary" />
                      : <Truck className="w-6 h-6 text-primary" />
                    }
                  </div>
                  <h3 className="font-serif text-2xl text-white mb-3">Ready to Book?</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    We come to your home, office, or wherever you're parked. No tow truck, no waiting room.
                  </p>
                  <a
                    href="tel:8329301444"
                    className="flex items-center justify-center gap-3 bg-primary text-white w-full py-4 font-serif text-xl tracking-wide hover:bg-primary/90 transition-colors rounded-sm mb-4"
                  >
                    <Phone className="w-5 h-5" />
                    (832) 930-1444
                  </a>
                  <button
                    onClick={() => navigate("/#contact")}
                    className="flex items-center justify-center gap-2 w-full py-3 border border-border text-muted-foreground hover:text-white hover:border-white/40 transition-colors text-sm font-semibold uppercase tracking-wider rounded-sm"
                  >
                    Send a Message
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick facts */}
                <div className="bg-card border border-border p-6 rounded-sm space-y-4">
                  <h4 className="font-serif text-sm uppercase tracking-widest text-white">Why Mobile?</h4>
                  {[
                    "No tow truck needed",
                    "We come to you — home, office, roadside",
                    "Available 24/7 across Houston",
                    "Honest pricing, no shop markup",
                  ].map((fact) => (
                    <div key={fact} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-muted-foreground text-sm">{fact}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related services */}
      {relatedServices.length > 0 && (
        <section className="py-16 border-t border-border">
          <div className="container mx-auto px-4 md:px-6">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">More Services</span>
            <h2 className="font-serif text-3xl md:text-4xl text-white mt-2 mb-10">Related Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
              {relatedServices.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => navigate(`/services/${s.slug}`)}
                  className="bg-card p-6 text-left group hover:bg-primary/10 transition-colors"
                >
                  <h3 className="font-serif text-lg text-white mb-2 group-hover:text-primary transition-colors">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">{s.shortDesc}</p>
                  <span className="text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    Learn More <ChevronRight className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
