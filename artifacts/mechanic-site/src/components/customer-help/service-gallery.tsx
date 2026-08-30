import { ArrowUpRight, MapPin, Sparkles } from "lucide-react";
import { Link } from "wouter";

const assetBase = import.meta.env.BASE_URL;

type ServiceScene = {
  title: string;
  eyebrow: string;
  description: string;
  image: string;
  alt: string;
  href: string;
  tone: string;
};

const scenes: ServiceScene[] = [
  {
    title: "Roadside diagnostics",
    eyebrow: "01 / Find the fault",
    description: "A clear answer when the dash light comes on or the road stops making sense.",
    image: `${assetBase}generated/roadside-diagnostics.jpg`,
    alt: "Illustration of a mobile mechanic scanning a pickup truck beside a Houston roadway at sunset",
    href: "/services/engine-diagnostics",
    tone: "from-[#f97316]/80",
  },
  {
    title: "Battery & electrical",
    eyebrow: "02 / Start strong",
    description: "Battery testing, replacement, alternator and starter diagnosis at your location.",
    image: `${assetBase}generated/battery-service.jpg`,
    alt: "Illustration of a mechanic replacing a vehicle battery beside a service van",
    href: "/services/battery-electrical",
    tone: "from-[#d85a16]/75",
  },
  {
    title: "Tire service",
    eyebrow: "03 / Keep rolling",
    description: "Flat changes, spare mounting and tire checks without the tow-truck wait.",
    image: `${assetBase}generated/tire-service.jpg`,
    alt: "Illustration of a mobile mechanic servicing a truck tire in a residential driveway",
    href: "/services/tires",
    tone: "from-[#b94d1c]/75",
  },
  {
    title: "Semi & fleet service",
    eyebrow: "04 / Move freight",
    description: "On-location support for heavy-duty vehicles, trucks and commercial operators.",
    image: `${assetBase}generated/semi-service.jpg`,
    alt: "Illustration of a heavy-duty mechanic working on a semi truck near downtown Houston",
    href: "/services/semi-truck-engine",
    tone: "from-[#9d401d]/80",
  },
];

function SceneLink({ scene, lead = false }: { scene: ServiceScene; lead?: boolean }) {
  return (
    <Link
      href={scene.href}
      className={`group relative isolate block overflow-hidden border border-white/10 bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${lead ? "min-h-[480px] md:min-h-[610px]" : "min-h-[280px] md:min-h-[294px]"}`}
      data-testid={`link-service-scene-${scene.href.split("/").pop()}`}
    >
      <img
        src={scene.image}
        alt={scene.alt}
        loading={lead ? "eager" : "lazy"}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        data-testid={`image-service-scene-${scene.href.split("/").pop()}`}
      />
      {lead && (
        <img
          src={`${assetBase}logo.svg`}
          alt=""
          className="absolute left-5 top-5 h-10 w-auto border border-white/20 bg-black/45 p-1.5 shadow-lg backdrop-blur-sm md:left-7 md:top-7"
          aria-hidden="true"
        />
      )}
      <div className={`absolute inset-0 bg-gradient-to-t ${scene.tone} via-black/25 to-black/10 opacity-90`} />
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
        <div className="mb-3 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">
          <span>{scene.eyebrow}</span>
          <ArrowUpRight className="h-4 w-4 text-white transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
        <h3 className={`${lead ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl"} font-serif leading-[0.95] text-white`}>
          {scene.title}
        </h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">{scene.description}</p>
        <span className="mt-4 inline-flex items-center border-b border-primary pb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
          Explore service
        </span>
      </div>
    </Link>
  );
}

export function ServiceGallery() {
  return (
    <section
      className="relative overflow-hidden border-y border-border bg-[#10100f] py-20 md:py-28"
      data-testid="section-service-gallery"
      aria-labelledby="service-gallery-title"
    >
      <div className="absolute -right-24 top-12 h-72 w-72 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="container relative mx-auto px-4 md:px-6">
        <div className="mb-10 flex flex-col justify-between gap-7 md:mb-14 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              <span className="inline-flex items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                AI-generated illustrative service scenes
              </span>
              <span className="text-muted-foreground">Not verified job photos</span>
            </div>
            <h2 id="service-gallery-title" className="font-serif text-4xl leading-[0.92] text-white md:text-7xl">
              We bring the shop
              <span className="text-primary"> to you.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              From a Houston shoulder to a fleet yard, our work happens where your vehicle is. Here is what an on-location visit can look like.
            </p>
          </div>
          <div className="flex max-w-xs items-start gap-3 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>Home driveway, office lot, roadside or yard — we come prepared.</span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-7">
            <SceneLink scene={scenes[0]} lead />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:col-span-5">
            {scenes.slice(1, 3).map((scene) => <SceneLink key={scene.href} scene={scene} />)}
          </div>
          <div className="md:col-span-5">
            <SceneLink scene={scenes[3]} />
          </div>
          <div className="flex min-h-[180px] flex-col justify-between border border-primary/30 bg-primary p-6 md:col-span-7 md:min-h-0 md:flex-row md:items-end md:p-8">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/70">Need a hand now?</span>
              <p className="mt-2 max-w-md font-serif text-2xl uppercase leading-tight text-primary-foreground md:text-3xl">Tell us where it hurts. We’ll tell you what happens next.</p>
            </div>
            <Link
              href="/#contact"
              className="mt-6 inline-flex w-fit items-center gap-2 border border-primary-foreground/50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-primary-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground md:mt-0"
              data-testid="link-service-scene-contact"
            >
              Get an estimate <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}