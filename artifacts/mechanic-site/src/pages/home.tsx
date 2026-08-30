import { useEffect, useState } from "react";
import Navigation from "@/components/navigation";
import Hero from "@/components/hero";
import Services from "@/components/services";
import WhyChooseUs from "@/components/why-choose-us";
import CarPartsShop from "@/components/car-parts-shop";
import ContactForm from "@/components/contact-form";
import Footer from "@/components/footer";
import { ArrowUpRight, CheckCircle, Phone, Sparkles, X, XCircle } from "lucide-react";
import { ServiceAreaChecker } from "@/components/customer-help/service-area-checker";
import { WhatHappensNext } from "@/components/customer-help/what-happens-next";
import { TransparentPricing } from "@/components/customer-help/transparent-pricing";
import { CustomerStories } from "@/components/customer-help/customer-stories";
import { MaintenanceTips } from "@/components/customer-help/maintenance-tips";
import { QuickActionFab } from "@/components/customer-help/quick-action-fab";
import { Link } from "wouter";
import { ServiceGallery } from "@/components/customer-help/service-gallery";

export default function Home() {
  const [checkoutStatus, setCheckoutStatus] = useState<"success" | "cancel" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutParam = params.get("checkout");
    const depositParam = params.get("deposit");
    const status = checkoutParam ?? depositParam;
    if (status === "success" || status === "cancel") {
      setCheckoutStatus(status);
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    }
  }, []);

  return (
    <main className="min-h-screen bg-background w-full overflow-x-hidden flex flex-col">
      {checkoutStatus && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-sm shadow-2xl border text-sm font-semibold ${
          checkoutStatus === "success"
            ? "bg-green-950 border-green-700 text-green-300"
            : "bg-red-950 border-red-700 text-red-300"
        }`}>
          {checkoutStatus === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {checkoutStatus === "success"
            ? "Order placed! Check your email for confirmation."
            : "Checkout cancelled — your cart is still saved."}
          <button onClick={() => setCheckoutStatus(null)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <Navigation />
      <Hero />
       <ServiceGallery />
       <section
         className="relative overflow-hidden border-b border-border bg-[#0d0d0c] py-16 md:py-24"
         data-testid="section-field-service"
         aria-labelledby="field-service-title"
       >
         <div className="container relative mx-auto px-4 md:px-6">
           <div className="grid items-stretch gap-0 overflow-hidden border border-white/10 bg-card md:grid-cols-2">
             <div className="relative min-h-[340px] overflow-hidden md:min-h-[460px]">
               <img
                 src={`${import.meta.env.BASE_URL}generated/semi-service.jpg`}
                 alt="Illustrative scene of a heavy-duty mechanic working beside a semi truck near Houston"
                 className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                 loading="lazy"
                 decoding="async"
                 data-testid="image-field-service"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/10" />
               <div
                 className="absolute bottom-5 left-5 inline-flex items-center gap-2 border border-white/20 bg-black/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/85 backdrop-blur-sm md:bottom-7 md:left-7"
                 data-testid="disclosure-field-service"
               >
                 <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                 Illustrative scene · Not a verified job photo
               </div>
             </div>
             <div className="flex flex-col justify-center p-7 md:p-12 lg:p-16">
               <span className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">On-location service</span>
               <h2 id="field-service-title" className="max-w-xl font-serif text-4xl leading-[0.94] text-white md:text-6xl">
                 Built for the place you’re stuck.
               </h2>
               <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                 A dead battery in the driveway, a warning light on the shoulder, or a commercial vehicle at the yard — tell us where the vehicle is and what it is doing.
               </p>
               <div className="mt-7 grid gap-3 text-sm font-semibold uppercase tracking-[0.1em] text-white/80 sm:grid-cols-2">
                 <span className="border-l-2 border-primary pl-3">Roadside diagnostics</span>
                 <span className="border-l-2 border-primary pl-3">Battery &amp; electrical</span>
                 <span className="border-l-2 border-primary pl-3">Tire service</span>
                 <span className="border-l-2 border-primary pl-3">Semi &amp; fleet support</span>
               </div>
               <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                 <a
                   href="tel:8329301444"
                   className="inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                   data-testid="link-field-service-phone"
                 >
                   <Phone className="h-4 w-4" aria-hidden="true" />
                   Call for an estimate
                 </a>
                 <a
                   href="#services"
                   className="inline-flex items-center gap-2 border-b border-primary pb-1 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                   data-testid="link-field-service-services"
                 >
                   View services <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                 </a>
               </div>
             </div>
           </div>
         </div>
       </section>
       <section className="border-y border-border bg-card/40 py-10" data-testid="section-service-area-checker">
         <div className="container mx-auto px-4 md:px-6">
           <ServiceAreaChecker />
         </div>
       </section>
      <Services />
       <WhatHappensNext />
      <WhyChooseUs />
       <section className="bg-background py-16 md:py-24" data-testid="section-pricing-guidance">
         <div className="container mx-auto px-4 md:px-6">
           <TransparentPricing />
         </div>
       </section>
      <CarPartsShop />
       <section className="bg-card/40 py-16 md:py-24" data-testid="section-maintenance">
         <div className="container mx-auto px-4 md:px-6">
           <MaintenanceTips />
         </div>
       </section>
       <section className="bg-background py-16 md:py-24" data-testid="section-customer-stories">
         <div className="container mx-auto px-4 md:px-6">
           <CustomerStories />
         </div>
       </section>
       <section className="border-y border-primary/20 bg-primary/5 py-12" data-testid="section-tracking-shortcut">
         <div className="container mx-auto flex flex-col items-start justify-between gap-5 px-4 md:flex-row md:items-center md:px-6">
           <div>
             <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Already booked?</p>
             <h2 className="mt-2 font-serif text-3xl text-white">Open your private service tracking link.</h2>
             <p className="mt-2 text-sm text-muted-foreground">Paste the link we sent you—no customer account required.</p>
           </div>
           <Link
             href="/track"
             className="shrink-0 border border-primary bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-primary/90"
             data-testid="link-open-tracking-entry"
           >
             Open tracking
           </Link>
         </div>
       </section>
      <ContactForm />
       <QuickActionFab />
      <Footer />
    </main>
  );
}
