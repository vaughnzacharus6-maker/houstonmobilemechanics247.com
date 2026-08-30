import { useState, useEffect } from "react";
import { Show } from "@clerk/react";
import { useLocation } from "wouter";
import { Phone, Menu, X } from "lucide-react";

const assetBase = import.meta.env.BASE_URL;

export default function Navigation() {
  const [, navigate] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b border-white/5 ${
        isScrolled ? "bg-background/95 backdrop-blur-md py-3 shadow-md" : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
         <button
           type="button"
           className="flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
           onClick={() => scrollTo('hero')}
           aria-label="Back to Houston Mobile Mechanic home"
         >
           <img
             src={`${assetBase}logo.svg`}
             alt="Houston Mobile Mechanic"
             className="h-10 w-auto sm:h-11"
           />
         </button>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          <button onClick={() => scrollTo('services')} className="text-sm font-semibold uppercase tracking-wider hover:text-primary transition-colors">Services</button>
          <button onClick={() => scrollTo('why-us')} className="text-sm font-semibold uppercase tracking-wider hover:text-primary transition-colors">Why Us</button>
          <button onClick={() => scrollTo('parts')} className="text-sm font-semibold uppercase tracking-wider hover:text-primary transition-colors">Parts Shop</button>
          <button onClick={() => scrollTo('contact')} className="text-sm font-semibold uppercase tracking-wider hover:text-primary transition-colors">Contact</button>
          <button onClick={() => navigate("/technician-apply")} className="text-sm font-semibold uppercase tracking-wider hover:text-primary transition-colors" data-testid="link-technician-apply">Join Our Team</button>
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Show when="signed-out">
            <button onClick={() => navigate("/sign-in")} className="text-sm font-semibold uppercase tracking-wider hover:text-primary transition-colors">Team Login</button>
          </Show>
          <Show when="signed-in">
            <button onClick={() => navigate("/portal")} className="text-sm font-semibold uppercase tracking-wider text-primary hover:text-white transition-colors">Team Portal</button>
          </Show>
          <a href="tel:8329301444" className="group flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-sm transition-all">
            <div className="bg-primary rounded-full p-2 group-hover:animate-pulse">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <span className="font-serif text-xl tracking-wide">(832) 930-1444</span>
          </a>
        </div>

        {/* Mobile Toggle */}
        <button className="lg:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-background border-b border-white/10 flex flex-col p-6 shadow-2xl animate-in slide-in-from-top-2">
          <button onClick={() => scrollTo('services')} className="py-4 text-left font-serif text-xl border-b border-white/5 uppercase">Services</button>
          <button onClick={() => scrollTo('why-us')} className="py-4 text-left font-serif text-xl border-b border-white/5 uppercase">Why Us</button>
          <button onClick={() => scrollTo('parts')} className="py-4 text-left font-serif text-xl border-b border-white/5 uppercase">Parts Shop</button>
          <button onClick={() => scrollTo('contact')} className="py-4 text-left font-serif text-xl border-b border-white/5 uppercase">Contact</button>
          <button onClick={() => { setMobileMenuOpen(false); navigate("/technician-apply"); }} className="py-4 text-left font-serif text-xl border-b border-white/5 uppercase" data-testid="link-technician-apply-mobile">Join Our Team</button>
          <Show when="signed-out">
            <button onClick={() => { setMobileMenuOpen(false); navigate("/sign-in"); }} className="py-4 text-left font-serif text-xl border-b border-white/5 uppercase">Team Login</button>
          </Show>
          <Show when="signed-in">
            <button onClick={() => { setMobileMenuOpen(false); navigate("/portal"); }} className="py-4 text-left font-serif text-xl border-b border-white/5 uppercase text-primary">Team Portal</button>
          </Show>
          <a href="tel:8329301444" className="mt-6 flex items-center justify-center gap-3 bg-primary text-white py-4 rounded-sm font-serif text-2xl tracking-wide">
            <Phone className="w-6 h-6" />
            (832) 930-1444
          </a>
        </div>
      )}
    </header>
  );
}
