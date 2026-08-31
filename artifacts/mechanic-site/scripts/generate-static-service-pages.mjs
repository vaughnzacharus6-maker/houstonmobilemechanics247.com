import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(siteDir, "dist", "public");
const baseHtml = await readFile(path.join(outputDir, "index.html"), "utf8");
const origin = "https://houstonmobilemechanics247.com";

const services = [
  { slug: "oil-change", title: "Mobile Oil Change in Houston, TX", description: "Mobile oil change service in Houston, TX. Full synthetic, conventional and high-mileage oil changes at your home, office or roadside location.", summary: "Protect your engine without visiting a shop. We bring the correct oil, filter and tools to your Houston location and complete the service on site." },
  { slug: "brake-repair", title: "Mobile Brake Repair in Houston, TX", description: "Mobile brake repair in Houston, TX. Brake pads, rotors and brake-system inspections completed at your home, office or roadside location.", summary: "Squealing, grinding or a soft brake pedal needs prompt attention. We inspect and repair brakes where your vehicle is parked." },
  { slug: "battery-electrical", title: "Mobile Battery Replacement in Houston, TX", description: "Mobile battery replacement and electrical diagnosis in Houston, TX. Dead batteries, alternators and starter problems tested and repaired on site.", summary: "Stranded with a dead battery or a no-start condition? We test the battery, alternator and starter before recommending the correct repair." },
  { slug: "tires", title: "24/7 Mobile Tire Service in Houston, TX", description: "24/7 mobile tire service in Houston, TX. Emergency flat-tire changes, spare mounting, tire rotation and roadside tire help at your location.", summary: "Whether you are roadside or in your driveway, we respond with mobile flat-tire and spare-mounting service across the Houston area." },
  { slug: "engine-diagnostics", title: "Mobile Engine Diagnostics in Houston, TX", description: "Mobile engine diagnostics in Houston, TX. Professional OBD-II scans and check-engine-light diagnosis performed at your home or office.", summary: "We scan fault codes, review live vehicle data and inspect the engine to identify the cause behind a warning light or drivability problem." },
  { slug: "ac-cooling", title: "Mobile A/C Repair in Houston, TX", description: "Mobile A/C and cooling-system service in Houston, TX. A/C recharge, coolant service and thermostat diagnosis performed at your location.", summary: "Stay comfortable and protect your engine in Houston heat with on-site air-conditioning and cooling-system diagnosis." },
  { slug: "fuel-system", title: "Mobile Fuel System Repair in Houston, TX", description: "Mobile fuel-system repair in Houston, TX. Fuel-pump testing, injector cleaning and fuel-filter service completed at your location.", summary: "Hard starts, stalling and rough idle can point to fuel-delivery problems. We test pressure and diagnose the system before replacing parts." },
  { slug: "transmission", title: "Mobile Transmission Service in Houston, TX", description: "Mobile transmission service in Houston, TX. Fluid service, filter replacement and transmission diagnostics performed at your location.", summary: "Slipping or harsh shifts should not be ignored. We inspect fluid condition, scan transmission codes and explain the next repair step." },
  { slug: "semi-truck-engine", title: "Mobile Semi-Truck Engine Service in Houston, TX", description: "Mobile semi-truck engine service in Houston, TX. On-site oil changes, filter replacement and diesel diagnostics for Class 7 and 8 trucks.", summary: "Reduce commercial downtime with diesel engine maintenance and diagnosis at your yard, warehouse or breakdown location." },
  { slug: "big-rig-brakes", title: "Mobile Big-Rig Brake Service in Houston, TX", description: "Mobile big-rig brake inspection in Houston, TX. DOT-focused brake adjustment and air-brake system service at your yard or roadside location.", summary: "We inspect commercial brake stroke, linings, chambers and air-system performance to help keep trucks safe and road-ready." },
  { slug: "trailer-fleet-lighting", title: "Mobile Trailer Lighting Repair in Houston, TX", description: "Mobile trailer and fleet-lighting repair in Houston, TX. Marker lights, brake lights, harnesses and connectors repaired on site.", summary: "We trace failed trailer-light circuits and repair bulbs, grounds, harnesses and connectors at your fleet yard or roadside location." },
  { slug: "commercial-roadside", title: "24/7 Commercial Roadside Assistance in Houston", description: "24/7 commercial roadside assistance in Houston, TX. Mobile tire, fuel, battery and emergency repair help for trucks and fleet vehicles.", summary: "Every hour of truck downtime costs money. We dispatch mobile help for commercial breakdowns across Houston's major road corridors." },
  { slug: "coolant-air-system", title: "Mobile Diesel Coolant & Air Service in Houston", description: "Mobile diesel coolant and air-system service in Houston, TX. Radiator, air-dryer and leak diagnosis for semi trucks and fleets.", summary: "We service cooling and compressed-air systems on site to help prevent overheating, brake-air problems and unplanned downtime." },
  { slug: "fleet-maintenance", title: "Mobile Fleet Maintenance in Houston, TX", description: "Mobile fleet maintenance in Houston, TX. Scheduled preventive service and on-site repairs for commercial cars, vans and trucks.", summary: "Keep fleet vehicles productive with scheduled maintenance at your yard or workplace and clear service records for every unit." },
];

function replaceMeta(html, selector, value) {
  const escaped = value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return html.replace(selector, `$1${escaped}$3`);
}

for (const service of services) {
  const url = `${origin}/services/${service.slug}`;
  const pageTitle = `${service.title} | Houston Mobile Mechanic 24/7`;
  let html = baseHtml.replace(/<title>[^<]*<\/title>/, `<title>${pageTitle}</title>`);
  html = replaceMeta(html, /(<meta name="description" content=")([^"]*)(")/, service.description);
  html = html.replace(/(<link rel="canonical" href=")([^"]*)(")/, `$1${url}$3`);
  html = replaceMeta(html, /(<meta property="og:title" content=")([^"]*)(")/, pageTitle);
  html = replaceMeta(html, /(<meta property="og:description" content=")([^"]*)(")/, service.description);
  html = html.replace(/(<meta property="og:url" content=")([^"]*)(")/, `$1${url}$3`);
  html = replaceMeta(html, /(<meta name="twitter:title" content=")([^"]*)(")/, pageTitle);
  html = replaceMeta(html, /(<meta name="twitter:description" content=")([^"]*)(")/, service.description);

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    url,
    areaServed: { "@type": "City", name: "Houston" },
    provider: { "@id": `${origin}/#business` },
  };
  html = html.replace("</head>", `    <script type="application/ld+json">${JSON.stringify(serviceSchema)}</script>\n  </head>`);

  const crawlableContent = `<div id="root"><main style="max-width:960px;margin:0 auto;padding:48px 24px;font-family:Inter,Arial,sans-serif;background:#182126;color:#fff;min-height:100vh"><nav><a href="/" style="color:#ff7417">Houston Mobile Mechanic 24/7</a></nav><h1>${service.title}</h1><p>${service.summary}</p><p>${service.description}</p><p>Call <a href="tel:8329301444" style="color:#ff7417">(832) 930-1444</a> for 24/7 mobile service within Houston and the surrounding 50-mile service area.</p><h2>Related mobile mechanic services</h2><ul>${services.filter((item) => item.slug !== service.slug).slice(0, 5).map((item) => `<li><a href="/services/${item.slug}" style="color:#ff7417">${item.title}</a></li>`).join("")}</ul></main></div>`;
  html = html.replace('<div id="root"></div>', crawlableContent);

  const routeDir = path.join(outputDir, "services", service.slug);
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, "index.html"), html);
}

console.log(`Generated ${services.length} crawlable service pages.`);
