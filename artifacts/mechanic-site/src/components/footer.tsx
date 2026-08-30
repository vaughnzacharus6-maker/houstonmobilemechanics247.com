import { Phone, MapPin, Clock, Wrench, Facebook, Instagram, Twitter } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Footer() {
  const [, navigate] = useLocation();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/#${id}`);
    }
  };

  const serviceLinks = [
    { label: "Oil Change & Fluids", slug: "oil-change" },
    { label: "Brake Repair", slug: "brake-repair" },
    { label: "Battery & Electrical", slug: "battery-electrical" },
    { label: "Engine Diagnostics", slug: "engine-diagnostics" },
    { label: "A/C & Cooling", slug: "ac-cooling" },
    { label: "Tires", slug: "tires" },
    { label: "Semi Truck Service", slug: "semi-truck-engine" },
    { label: "Fleet Maintenance", slug: "fleet-maintenance" },
  ];

  return (
    <footer className="bg-card border-t border-border pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-primary flex items-center justify-center rounded-sm skew-x-[-10deg]">
                <Wrench className="text-white w-5 h-5 skew-x-[10deg]" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-serif text-xl uppercase tracking-wider text-white">Houston</span>
                <span className="font-serif text-xs uppercase tracking-widest text-primary">Mobile Mechanic</span>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Trusted mobile mechanic service for all vehicles across the Houston metro area — available around the clock.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-serif text-sm uppercase tracking-widest text-white mb-4">Services</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              {serviceLinks.map((s) => (
                <li key={s.slug}>
                  <button
                    onClick={() => navigate(`/services/${s.slug}`)}
                    className="hover:text-primary transition-colors text-left"
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-serif text-sm uppercase tracking-widest text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              {[
                { label: "Home", id: "hero" },
                { label: "Services", id: "services" },
                { label: "Why Choose Us", id: "why-us" },
                { label: "Parts Shop", id: "parts" },
                { label: "Get a Quote", id: "contact" },
              ].map((link) => (
                <li key={link.label}>
                  <button onClick={() => scrollTo(link.id)} className="hover:text-primary transition-colors text-left">{link.label}</button>
                </li>
              ))}
              <li>
                <Link href="/technician-apply" className="hover:text-primary transition-colors" data-testid="link-footer-technician-apply">
                  Join Our Team
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-serif text-sm uppercase tracking-widest text-white mb-4">Contact</h4>
            <div className="space-y-4">
              <a href="tel:8329301444" className="group flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span className="font-serif text-lg tracking-wider">(832) 930-1444</span>
              </a>
              <div className="flex items-start gap-3 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Houston, TX and Greater Metro Area</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>Available 24 hours, 7 days a week</span>
              </div>
            </div>

            {/* Social */}
            <div className="flex items-center gap-3 mt-6">
              {[
                { icon: <Facebook className="w-4 h-4" />, label: "Facebook" },
                { icon: <Instagram className="w-4 h-4" />, label: "Instagram" },
                { icon: <Twitter className="w-4 h-4" />, label: "Twitter" },
              ].map((s) => (
                <button
                  key={s.label}
                  aria-label={s.label}
                  className="w-9 h-9 bg-background border border-border hover:border-primary hover:text-primary text-muted-foreground flex items-center justify-center rounded-sm transition-all duration-200"
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Houston Mobile Mechanic. All rights reserved.</p>
          <div className="flex flex-col items-center gap-3 text-center md:items-end md:text-right">
            <p>
              Amazon affiliate disclosure: As an Amazon Associate, we earn from qualifying purchases.
            </p>
            <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 uppercase tracking-wider" aria-label="Legal">
              <Link href="/privacy-policy" className="transition-colors hover:text-primary">Privacy Policy</Link>
              <Link href="/terms-of-service" className="transition-colors hover:text-primary">Terms of Service</Link>
              <Link href="/refund-policy" className="transition-colors hover:text-primary">No Refund Policy</Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
