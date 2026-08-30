import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  Search, ShoppingCart, Star, Filter, ChevronDown, Wrench, Zap, Battery,
  Droplets, Settings2, Wind, Eye, Truck, Plus, Minus, Trash2, CreditCard,
  X, ExternalLink, ShieldCheck, Package
} from "lucide-react";
import { useListStripeProducts, useCreateCheckout, useGetEbayStatus, useListEbayParts } from "@workspace/api-client-react";

// ─── helpers ───────────────────────────────────────────────────────────────

function categoryIcon(cat: string): ReactNode {
  const map: Record<string, ReactNode> = {
    "Oil Filters":  <Droplets className="w-10 h-10" />,
    "Brake Pads":   <Settings2 className="w-10 h-10" />,
    "Batteries":    <Battery className="w-10 h-10" />,
    "Spark Plugs":  <Zap className="w-10 h-10" />,
    "Air Filters":  <Wind className="w-10 h-10" />,
    "Wiper Blades": <Eye className="w-10 h-10" />,
    "Cooling":      <Wrench className="w-10 h-10" />,
    "Belts":        <Truck className="w-10 h-10" />,
  };
  return map[cat] ?? <Package className="w-10 h-10" />;
}

function categoryAccent(cat: string): string {
  const map: Record<string, string> = {
    "Oil Filters":  "#f97316",
    "Brake Pads":   "#ef4444",
    "Batteries":    "#eab308",
    "Spark Plugs":  "#a855f7",
    "Air Filters":  "#22c55e",
    "Wiper Blades": "#38bdf8",
    "Cooling":      "#06b6d4",
    "Belts":        "#f59e0b",
  };
  return map[cat] ?? "#f97316";
}

const EBAY_CATEGORIES = ["All", "Oil Filters", "Brake Pads", "Batteries", "Spark Plugs", "Air Filters", "Wiper Blades", "Cooling", "Belts"];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function useIntersection(ref: React.RefObject<Element | null>, threshold = 0.1) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

// ─── eBay shop ─────────────────────────────────────────────────────────────

function EbayShop() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visible = useIntersection(ref);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const queryCategory = activeCategory === "All" ? undefined : activeCategory;
  const queryQ = debouncedSearch || undefined;

  const { data, isLoading, error } = useListEbayParts(
    { q: queryQ, category: queryCategory, limit: 12 },
  );

  const parts = data?.data ?? [];

  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts by name, type, or vehicle..."
            className="w-full bg-background border border-border text-foreground placeholder-muted-foreground pl-10 pr-4 py-3 rounded-sm focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden inline-flex items-center gap-2 bg-background border border-border px-4 py-3 rounded-sm text-sm text-muted-foreground hover:border-primary transition-colors"
        >
          <Filter className="w-4 h-4" /> Filter <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Category tabs */}
      <div className={`flex flex-wrap gap-2 mb-8 ${!showFilters ? "hidden sm:flex" : "flex"}`}>
        {EBAY_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeCategory === cat
                ? "bg-primary text-white"
                : "bg-background border border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* eBay badge */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-card border border-border rounded-sm">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Parts are fulfilled by verified eBay Motors sellers. Click any part to purchase on eBay — secure checkout, buyer protection, and fast shipping included.
        </p>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-background animate-pulse">
              <div className="h-48 bg-muted" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-10 bg-muted rounded mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : error || parts.length === 0 ? (
        <div className="text-center py-20 border border-border rounded-sm bg-background">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{error ? "Could not load parts — try again shortly." : "No parts found. Try a different search."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-border">
          {parts.map((part, i) => {
            const accent = categoryAccent(activeCategory === "All" ? "Oil Filters" : activeCategory);
            const freeShipping = part.shipping === "0.00" || part.shipping === "0" || part.shipping === null;
            return (
              <a
                key={part.id}
                href={part.itemUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`bg-background group flex flex-col transition-all duration-300 hover:bg-card cursor-pointer ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: `${i * 30}ms` }}
              >
                {/* Image */}
                <div className="relative overflow-hidden bg-muted" style={{ paddingBottom: "66%" }}>
                  {part.imageUrl ? (
                    <img
                      src={part.imageUrl}
                      alt={part.title}
                      className="absolute inset-0 w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ color: accent }}>
                      {categoryIcon(activeCategory === "All" ? "Oil Filters" : activeCategory)}
                    </div>
                  )}
                  {freeShipping && (
                    <span className="absolute top-2 left-2 bg-green-700 text-white text-xs font-bold px-2 py-0.5 rounded-sm">FREE SHIP</span>
                  )}
                  <span className="absolute top-2 right-2 bg-background/80 text-white text-xs px-2 py-0.5 rounded-sm border border-border">{part.condition}</span>
                </div>

                {/* Info */}
                <div className="flex flex-col flex-1 p-5">
                  <h3 className="text-xs text-white font-medium leading-snug mb-3 line-clamp-3 flex-1">{part.title}</h3>

                  <div className="flex items-center gap-2 mb-3">
                    <StarRating rating={4.8} />
                    {part.sellerFeedback && (
                      <span className="text-xs text-muted-foreground">{part.sellerFeedback}%</span>
                    )}
                  </div>

                  {part.shipping && part.shipping !== "0.00" && part.shipping !== "0" && (
                    <p className="text-xs text-muted-foreground mb-2">+${part.shipping} shipping</p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    {typeof part.price === "number" ? (
                      <span className="font-serif text-xl text-white">${part.price.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">See price</span>
                    )}
                  </div>

                  <div className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-2.5 rounded-sm text-sm font-bold uppercase tracking-wider transition-all duration-200 shadow-[0_0_15px_rgba(249,115,22,0.2)] hover:shadow-[0_0_25px_rgba(249,115,22,0.35)]">
                    <ExternalLink className="w-4 h-4" />
                    Buy on eBay
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Stripe cart shop (fallback) ────────────────────────────────────────────

type CartItem = { priceId: string; name: string; price: number; quantity: number; category: string };

function StripeShop() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const visible = useIntersection(ref);

  const { data: productsData, isLoading } = useListStripeProducts();
  const checkoutMutation = useCreateCheckout();

  const products = productsData?.data ?? [];
  const categories = ["All", ...Array.from(new Set(products.map((p) => p.metadata?.category ?? "Other")))];

  const filtered = products.filter((p) => {
    const cat = p.metadata?.category ?? "Other";
    const matchesCategory = activeCategory === "All" || cat === activeCategory;
    const term = search.toLowerCase();
    const matchesSearch = !term || p.name.toLowerCase().includes(term) || (p.metadata?.brand ?? "").toLowerCase().includes(term) || cat.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: typeof products[0]) => {
    const price = product.prices[0];
    if (!price) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.priceId === price.id);
      if (existing) return prev.map((i) => i.priceId === price.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { priceId: price.id, name: product.name, price: price.unit_amount, quantity: 1, category: product.metadata?.category ?? "Part" }];
    });
    setCartOpen(true);
  };

  const updateQty = (priceId: string, delta: number) =>
    setCart((prev) => prev.map((i) => i.priceId === priceId ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0));
  const removeItem = (priceId: string) => setCart((prev) => prev.filter((i) => i.priceId !== priceId));

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleCheckout = () => {
    setCheckoutError("");
    checkoutMutation.mutate(
      { data: { items: cart.map((i) => ({ priceId: i.priceId, quantity: i.quantity })), customerEmail: email || null } },
      {
        onSuccess: (res) => { if (res.url) window.location.href = res.url; },
        onError: () => setCheckoutError("Checkout failed. Please try again or call us."),
      }
    );
  };

  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
      {/* Cart sidebar */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-md bg-background border-l border-border flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl text-white">Your Cart</h3>
                {cartCount > 0 && <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{cartCount}</span>}
              </div>
              <button onClick={() => setCartOpen(false)}><X className="w-5 h-5 text-muted-foreground hover:text-white" /></button>
            </div>
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <ShoppingCart className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Your cart is empty.</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {cart.map((item) => (
                    <div key={item.priceId} className="bg-card border border-border rounded-sm p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-primary font-bold uppercase tracking-wider mb-0.5">{item.category}</p>
                          <p className="text-sm text-white font-medium leading-snug line-clamp-2">{item.name}</p>
                        </div>
                        <button onClick={() => removeItem(item.priceId)}><Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" /></button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 border border-border rounded-sm">
                          <button onClick={() => updateQty(item.priceId, -1)} className="p-1.5 hover:text-primary"><Minus className="w-3 h-3" /></button>
                          <span className="text-sm font-bold px-1 min-w-[1.5rem] text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item.priceId, 1)} className="p-1.5 hover:text-primary"><Plus className="w-3 h-3" /></button>
                        </div>
                        <span className="font-serif text-white">${((item.price * item.quantity) / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 border-t border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-serif text-2xl text-white">${(cartTotal / 100).toFixed(2)}</span>
                  </div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email for receipt (optional)"
                    className="w-full bg-background border border-border text-foreground placeholder-muted-foreground px-4 py-3 rounded-sm focus:outline-none focus:border-primary transition-colors text-sm" />
                  {checkoutError && <p className="text-destructive text-xs">{checkoutError}</p>}
                  <button onClick={handleCheckout} disabled={checkoutMutation.isPending}
                    className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white py-4 rounded-sm font-serif text-lg tracking-widest transition-all duration-300">
                    <CreditCard className="w-5 h-5" />
                    {checkoutMutation.isPending ? "Redirecting..." : "Checkout Securely"}
                  </button>
                  <p className="text-center text-xs text-muted-foreground">Powered by Stripe. Secure & encrypted.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search + categories */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts..."
            className="w-full bg-background border border-border text-foreground placeholder-muted-foreground pl-10 pr-4 py-3 rounded-sm focus:outline-none focus:border-primary transition-colors text-sm" />
        </div>
        <button onClick={() => setCartOpen(true)} className="shrink-0 relative inline-flex items-center gap-3 bg-background border border-border hover:border-primary px-5 py-3 rounded-sm text-sm font-bold transition-all hover:text-primary">
          <ShoppingCart className="w-5 h-5" />
          View Cart
          {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all duration-200 ${activeCategory === cat ? "bg-primary text-white" : "bg-background border border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-background animate-pulse">
              <div className="h-40 bg-muted" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-10 bg-muted rounded mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-border">
          {filtered.map((product, i) => {
            const category = product.metadata?.category ?? "Other";
            const accent = categoryAccent(category);
            const price = product.prices[0];
            const inCart = cart.find((c) => c.priceId === price?.id);
            return (
              <div key={product.id}
                className={`bg-background group flex flex-col transition-all duration-300 hover:bg-card ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: `${i * 40}ms` }}>
                <div className="relative flex items-center justify-center py-10 overflow-hidden" style={{ background: `${accent}12`, borderBottom: `1px solid ${accent}22` }}>
                  <div className="absolute inset-0 opacity-5 blur-2xl" style={{ background: `radial-gradient(circle at 50% 50%, ${accent}, transparent 70%)` }} />
                  <div className="relative z-10 group-hover:scale-110 transition-transform duration-300" style={{ color: accent }}>{categoryIcon(category)}</div>
                  <span className="absolute top-3 left-3 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-sm" style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}33` }}>{category}</span>
                  {inCart && <span className="absolute top-3 right-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded-sm">×{inCart.quantity}</span>}
                </div>
                <div className="flex flex-col flex-1 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>{product.metadata?.brand ?? ""}</p>
                  <h3 className="font-serif text-sm text-white mb-2 leading-snug">{product.name}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed mb-3 flex-1 line-clamp-2">{product.description}</p>
                  <StarRating rating={4.7} />
                  <div className="flex items-center justify-between my-4">
                    {price ? <span className="font-serif text-xl text-white">${(price.unit_amount / 100).toFixed(2)}</span> : <span className="text-muted-foreground text-sm">Unavailable</span>}
                  </div>
                  {price ? (
                    <button onClick={() => addToCart(product)}
                      className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-2.5 rounded-sm text-sm font-bold uppercase tracking-wider transition-all duration-200">
                      <Plus className="w-4 h-4" /> Add to Cart
                    </button>
                  ) : (
                    <button disabled className="w-full py-2.5 rounded-sm text-sm font-bold uppercase tracking-wider bg-muted text-muted-foreground cursor-not-allowed">Unavailable</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button onClick={() => setCartOpen(true)}
            className="flex items-center gap-3 bg-primary text-white px-6 py-4 rounded-sm shadow-[0_0_30px_rgba(249,115,22,0.5)] hover:bg-primary/90 transition-all font-serif text-lg tracking-wide">
            <ShoppingCart className="w-5 h-5" />
            {cartCount} item{cartCount !== 1 ? "s" : ""} — ${(cartTotal / 100).toFixed(2)}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────

export default function CarPartsShop() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const sectionVisible = useIntersection(sectionRef);

  const { data: statusData } = useGetEbayStatus();
  const ebayConfigured = statusData?.configured ?? false;

  return (
    <section id="parts" className="py-24 md:py-32 bg-card/30 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      <div className="absolute top-0 right-0 w-96 h-96 opacity-10 blur-3xl rounded-full" style={{ background: "radial-gradient(circle, hsl(24 95% 53%) 0%, transparent 70%)" }} />

      <div
        ref={sectionRef}
        className={`container mx-auto px-4 md:px-6 relative z-10 transition-all duration-700 ${sectionVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent px-4 py-2 rounded-sm mb-4 text-sm font-bold uppercase tracking-widest">
              <ShoppingCart className="w-4 h-4" />
              Parts Shop
            </div>
            <h2 className="font-serif text-4xl md:text-5xl text-white leading-none">
              {ebayConfigured ? (
                <>Real Parts,<br /><span className="text-primary">Real Photos</span></>
              ) : (
                <>Buy Parts,<br /><span className="text-primary">Pay Right Here</span></>
              )}
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-relaxed">
              {ebayConfigured
                ? "Live inventory from eBay Motors — real product photos, competitive prices, and fast shipping."
                : "Browse quality parts, add to cart, and pay securely — without leaving this page."}
            </p>
          </div>
        </div>

        {ebayConfigured ? <EbayShop /> : <StripeShop />}
      </div>
    </section>
  );
}
