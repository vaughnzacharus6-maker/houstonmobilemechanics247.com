export interface ServiceDetail {
  slug: string;
  title: string;
  shortDesc: string;
  category: "passenger" | "heavy";
  tagline: string;
  whatIsIt: string;
  includes: string[];
  process: { step: string; detail: string }[];
  goodToKnow: string[];
  metaDescription: string;
}

export const services: ServiceDetail[] = [
  // ── Passenger / SUV ─────────────────────────────────────────────────────
  {
    slug: "oil-change",
    title: "Oil Change & Fluids",
    shortDesc: "Full synthetic, conventional, or high-mileage oil changes. Fluid top-offs and replacements.",
    category: "passenger",
    tagline: "The most important maintenance job — done at your door.",
    whatIsIt:
      "Engine oil keeps every moving part lubricated and cool. Skipping an oil change accelerates wear faster than almost any other neglected service. We come to you — driveway, parking lot, office — and handle the entire service on-site.",
    includes: [
      "Drain old oil and replace the oil filter",
      "Refill with your choice of full synthetic, conventional, or high-mileage oil",
      "Top off windshield washer fluid, coolant, brake fluid, power steering fluid, and transmission fluid as needed",
      "Inspect air filter and cabin air filter",
      "Check tire pressure and adjust to spec",
      "Multi-point visual inspection of belts, hoses, and undercarriage",
      "Reset oil life monitor (if applicable)",
    ],
    process: [
      { step: "Book your appointment", detail: "Call or fill out the form. We confirm a 1-hour arrival window." },
      { step: "We come to you", detail: "Our tech arrives with all tools and oil for your specific vehicle make/model." },
      { step: "Service complete", detail: "Typically done in 20–30 minutes. We dispose of the old oil responsibly." },
    ],
    goodToKnow: [
      "We service all makes and models — domestic, import, diesel, and hybrid.",
      "Bring your own oil and filter and we'll apply a labor-only rate.",
      "Most vehicles need an oil change every 5,000–7,500 miles with conventional oil, or 7,500–10,000 miles with full synthetic.",
    ],
    metaDescription:
      "Mobile oil change service in Houston TX. We come to your home or office. Full synthetic, conventional, and high-mileage oil changes for all vehicles.",
  },
  {
    slug: "brake-repair",
    title: "Brake Repair",
    shortDesc: "Pad replacement, rotor resurfacing, brake line inspection, and emergency brake repair.",
    category: "passenger",
    tagline: "Don't wait on brakes. We fix them where you are.",
    whatIsIt:
      "Worn brakes are the most dangerous deferred maintenance item on any vehicle. Squealing, grinding, or a soft pedal are all warning signs. We diagnose and repair brake systems on-site — no tow, no shop wait.",
    includes: [
      "Front and/or rear brake pad replacement",
      "Rotor inspection — resurface or replace as needed",
      "Brake caliper inspection and lubrication",
      "Brake line and brake hose visual inspection",
      "Brake fluid level check and top-off",
      "Emergency/parking brake adjustment",
      "Road-test (where possible) to verify stopping performance",
    ],
    process: [
      { step: "Diagnosis", detail: "We inspect all four corners and give you a clear breakdown of what needs attention." },
      { step: "Approval", detail: "We show you the worn parts before replacing anything. No surprise charges." },
      { step: "Repair", detail: "Most pad and rotor jobs are completed in 1–2 hours on-site." },
    ],
    goodToKnow: [
      "Grinding metal-on-metal sounds mean immediate attention — rotors may be past safe spec.",
      "We carry pads and rotors for most common vehicles; specialty parts may require a brief parts run.",
      "Brake fluid should be inspected annually — moisture absorption degrades stopping power over time.",
    ],
    metaDescription:
      "Mobile brake repair in Houston TX. Pad replacement, rotor resurfacing, and brake line inspection done at your location. Fast, honest service.",
  },
  {
    slug: "battery-electrical",
    title: "Battery & Electrical",
    shortDesc: "Dead battery jump-start, battery replacement, alternator, and starter diagnosis.",
    category: "passenger",
    tagline: "Stranded with a dead battery? We'll be there.",
    whatIsIt:
      "A dead battery, failing alternator, or bad starter can leave you stuck at the worst time. Our techs carry a full range of batteries and electrical diagnostic equipment to get you back on the road fast.",
    includes: [
      "Battery load test — determines true capacity vs. rated capacity",
      "Battery terminal cleaning and corrosion removal",
      "Battery replacement (we stock most group sizes)",
      "Alternator output test",
      "Starter draw test",
      "Check and reset battery-related fault codes",
      "Inspect wiring harness connections at the battery",
    ],
    process: [
      { step: "Test first", detail: "We run a full electrical test before recommending any replacement." },
      { step: "Clear explanation", detail: "We show you the test results in plain numbers — no guesswork." },
      { step: "Same-visit fix", detail: "Battery replacements are done on-site, usually in under 30 minutes." },
    ],
    goodToKnow: [
      "Most automotive batteries last 3–5 years in the Houston heat — heat accelerates chemical degradation.",
      "A bad battery can cause your car's computer to throw false codes and behave erratically.",
      "If your car starts fine but electrical accessories are flickering, that usually points to an alternator issue.",
    ],
    metaDescription:
      "Mobile battery replacement and electrical diagnosis in Houston TX. Dead battery, bad alternator, or starter problems fixed at your location.",
  },
  {
    slug: "tires",
    title: "Tires",
    shortDesc: "Flat tire changes, spare mounting, tire rotation, and inflation services.",
    category: "passenger",
    tagline: "Flat tire on the side of the road or in your driveway — we handle it.",
    whatIsIt:
      "Whether you're stranded roadside or noticed a slow leak at home, we respond quickly to get you rolling again. We handle emergency flat changes, spare mounting, and routine tire rotation to extend your tread life.",
    includes: [
      "Emergency flat tire change — mount spare or replace tire",
      "Tire rotation (all four positions)",
      "Tire pressure check and inflation to spec",
      "Visual inspection of tread depth and sidewall condition",
      "Valve stem inspection and replacement if needed",
      "Lug nut torque check to manufacturer spec",
    ],
    process: [
      { step: "Call us", detail: "Let us know your location and the situation — we'll give you an ETA immediately." },
      { step: "Arrive and assess", detail: "We check whether the tire can be patched or needs replacement." },
      { step: "Get you moving", detail: "Spare mounted or tire changed — usually in 20–30 minutes." },
    ],
    goodToKnow: [
      "A spare tire should only be driven at speeds under 50 mph and no more than 50–70 miles.",
      "We can source replacement tires and mount them for you — call for availability.",
      "Check tire pressure monthly — Houston's temperature swings cause pressure to fluctuate.",
    ],
    metaDescription:
      "Mobile tire service in Houston TX. Emergency flat tire changes, spare mounting, and tire rotation at your location. 24/7 roadside help available.",
  },
  {
    slug: "engine-diagnostics",
    title: "Engine Diagnostics",
    shortDesc: "OBD-II code scanning, check engine light diagnosis, and full engine inspection.",
    category: "passenger",
    tagline: "Check engine light on? We'll tell you exactly what it means.",
    whatIsIt:
      "Modern vehicles store fault codes in their onboard computer that point to specific systems and components. We scan those codes, interpret them in context, and do a hands-on inspection to give you a real diagnosis — not a parts-store guess.",
    includes: [
      "Full OBD-II / OBD-I code scan (all stored and pending codes)",
      "Live data stream analysis — sensors, fuel trims, O2 readings",
      "Visual engine bay inspection",
      "Vacuum leak check",
      "Fuel pressure test (where applicable)",
      "Written report of findings with recommended repairs",
      "Clear fault codes after confirmed repair",
    ],
    process: [
      { step: "Connect and scan", detail: "We plug in our professional scan tool — not the basic unit from an auto parts store." },
      { step: "Live data review", detail: "We watch sensor values in real time to catch intermittent issues." },
      { step: "Explain and quote", detail: "You get a plain-English explanation and repair estimate before any work begins." },
    ],
    goodToKnow: [
      "A flashing check engine light means misfire is active and you should stop driving immediately.",
      "Code readers from auto parts stores only give you the code number — not the root cause. That's our job.",
      "Some issues only appear under certain driving conditions — live data monitoring catches what code readers miss.",
    ],
    metaDescription:
      "Mobile engine diagnostic service in Houston TX. OBD-II code scan and check engine light diagnosis done at your home or office.",
  },
  {
    slug: "ac-cooling",
    title: "A/C & Cooling",
    shortDesc: "A/C recharge, coolant flush, thermostat replacement, and radiator repair.",
    category: "passenger",
    tagline: "Houston summers are brutal. Your A/C shouldn't be.",
    whatIsIt:
      "In Houston's climate, a working A/C and cooling system aren't optional. We diagnose and repair both the refrigerant side (A/C) and the engine cooling side (coolant, thermostat, radiator) — keeping you comfortable and your engine safe.",
    includes: [
      "A/C system pressure test and leak detection",
      "Refrigerant recharge (R-134a or R-1234yf)",
      "Evaporator and condenser visual inspection",
      "Coolant (antifreeze) flush and fill",
      "Thermostat replacement",
      "Radiator hose inspection and replacement",
      "Radiator cap pressure test",
      "Fan and fan clutch inspection",
    ],
    process: [
      { step: "Diagnose which system", detail: "A/C not cold vs. engine overheating are different problems — we identify which first." },
      { step: "Pressure test", detail: "We pressure-test both systems to find leaks before adding any fluid." },
      { step: "Repair on-site", detail: "Most A/C recharges and coolant flushes are completed in under an hour." },
    ],
    goodToKnow: [
      "If your A/C blows warm but the compressor is cycling, you likely just need a refrigerant recharge.",
      "Engine overheating in Houston traffic is a serious risk — low coolant or a stuck thermostat can warp a head gasket.",
      "R-1234yf refrigerant (newer vehicles) costs more than R-134a — call us for current pricing.",
    ],
    metaDescription:
      "Mobile A/C repair and cooling system service in Houston TX. A/C recharge, coolant flush, and thermostat replacement at your location.",
  },
  {
    slug: "fuel-system",
    title: "Fuel System",
    shortDesc: "Fuel pump replacement, injector cleaning, filter replacement, and fuel line repair.",
    category: "passenger",
    tagline: "Hard starts, rough idle, poor mileage — likely a fuel system issue.",
    whatIsIt:
      "The fuel system delivers the precise amount of fuel your engine needs at every RPM. A weak fuel pump, clogged filter, or dirty injectors cause hard starts, stalling, and poor mileage. We diagnose and repair the entire fuel delivery chain.",
    includes: [
      "Fuel pressure test at the rail",
      "Fuel filter replacement (in-line or in-tank external)",
      "Fuel injector cleaning service",
      "Fuel pump replacement",
      "Fuel line inspection and repair",
      "Evap system leak check (for EVAP codes)",
      "Throttle body cleaning",
    ],
    process: [
      { step: "Fuel pressure test", detail: "We test pressure at idle and under load to determine if the pump is weak." },
      { step: "Injector flow test", detail: "We check injector spray pattern and flow rate for imbalances." },
      { step: "Targeted repair", detail: "We fix the confirmed problem — no unnecessary parts replacement." },
    ],
    goodToKnow: [
      "A failing fuel pump often gives warning signs: whining noise from the fuel tank, hard hot starts, or surging at highway speed.",
      "Fuel filter replacement is often overlooked — a clogged filter strains the pump and causes the same symptoms as a failing pump.",
      "Dirty injectors reduce fuel economy and cause rough idle — injector cleaning is less expensive than replacement.",
    ],
    metaDescription:
      "Mobile fuel system repair in Houston TX. Fuel pump, injector cleaning, and fuel filter replacement done at your home or office.",
  },
  {
    slug: "transmission",
    title: "Transmission",
    shortDesc: "Fluid change, filter replacement, and transmission diagnostic services.",
    category: "passenger",
    tagline: "Slipping gears or rough shifts? Don't ignore it.",
    whatIsIt:
      "Transmission problems get worse when ignored. We handle fluid services, filter changes, and diagnostic work on automatic and manual transmissions. Catching issues early avoids the most expensive repair in any vehicle.",
    includes: [
      "Transmission fluid drain and fill (or full flush where applicable)",
      "Transmission filter and pan gasket replacement (automatic)",
      "Fluid condition and color inspection",
      "Transmission fault code scanning",
      "Shift quality assessment — slipping, hesitation, harsh shifts",
      "Torque converter and solenoid inspection (diagnostic)",
      "Manual transmission clutch adjustment inspection",
    ],
    process: [
      { step: "Check the fluid first", detail: "Fluid condition tells us a lot — burnt smell and dark color indicate heat damage." },
      { step: "Scan for codes", detail: "Most modern automatics have solenoid codes that pinpoint the failure." },
      { step: "Recommend next steps", detail: "We tell you honestly whether a service will fix it or if a rebuild is needed." },
    ],
    goodToKnow: [
      "Many manufacturers claim 'lifetime' transmission fluid — most experts recommend a change every 60,000–100,000 miles regardless.",
      "Early slipping is often caused by low fluid, not a worn transmission — a fluid service can resolve it.",
      "We do not perform full transmission rebuilds on-site, but we handle diagnostics and fluid services that extend transmission life.",
    ],
    metaDescription:
      "Mobile transmission service in Houston TX. Fluid change, filter replacement, and transmission diagnostics performed at your location.",
  },

  // ── Heavy Duty / Commercial ──────────────────────────────────────────────
  {
    slug: "semi-truck-engine",
    title: "Semi Truck Engine Service",
    shortDesc: "On-site engine oil changes, filter replacements, and diagnostic services for Class 7 and Class 8 trucks.",
    category: "heavy",
    tagline: "Keep your rig on the road — we come to your yard or breakdown location.",
    whatIsIt:
      "Diesel engine maintenance for Class 7 and Class 8 trucks done on-site at your truck yard, warehouse, or breakdown location. We handle preventive oil services and diagnostic work to keep your trucks running and avoid costly downtime.",
    includes: [
      "Diesel engine oil drain and fill (all viscosities)",
      "Oil filter, fuel filter, and air filter replacement",
      "DEF (diesel exhaust fluid) level check and fill",
      "Coolant level inspection",
      "Diesel-specific DPF and EGR fault code scanning",
      "Belt and serpentine drive inspection",
      "Multi-point engine bay visual inspection",
    ],
    process: [
      { step: "Schedule at your location", detail: "We come to your truck yard, loading dock, or breakdown site." },
      { step: "Service the unit", detail: "Our diesel-equipped service van carries the tools and supplies for most Class 7–8 trucks." },
      { step: "Document and report", detail: "We provide a service record for your maintenance file." },
    ],
    goodToKnow: [
      "We service Freightliner, Peterbilt, Kenworth, Volvo, International, and Mack trucks.",
      "Diesel oil intervals vary by engine load and duty cycle — consult your manufacturer spec.",
      "DPF regeneration issues are common in city-driven trucks — we can diagnose and advise on resolution.",
    ],
    metaDescription:
      "Mobile semi truck engine service in Houston TX. On-site oil changes, filter replacement, and diesel diagnostics for Class 7 and Class 8 trucks.",
  },
  {
    slug: "big-rig-brakes",
    title: "Big Rig Brake Inspection",
    shortDesc: "DOT-compliant brake adjustment, pad replacement, and air brake system inspection.",
    category: "heavy",
    tagline: "DOT-compliant brake work done at your yard or roadside.",
    whatIsIt:
      "Commercial vehicle brake failures cause accidents and costly fines. We perform DOT-standard brake inspections and adjustments at your location — keeping your fleet compliant and your drivers safe.",
    includes: [
      "Full brake stroke measurement — front and rear axles",
      "Brake adjustment to DOT stroke specifications",
      "Brake pad/lining thickness inspection",
      "S-cam, slack adjuster, and clevis pin inspection",
      "Air brake system leak-down test",
      "Glad hand and air line inspection",
      "Brake chamber inspection for damage or leaks",
    ],
    process: [
      { step: "Inspection first", detail: "We measure every brake chamber stroke and compare to DOT out-of-service criteria." },
      { step: "Adjust or replace", detail: "Brakes out of spec are adjusted; worn linings are replaced on-site." },
      { step: "Documentation", detail: "You receive a written inspection record for your DVIR and maintenance logs." },
    ],
    goodToKnow: [
      "Out-of-adjustment brakes are the #1 roadside inspection violation for commercial trucks.",
      "We carry common brake chamber sizes and slack adjusters for most configurations.",
      "Annual brake inspections are required by FMCSA — don't wait for a roadside DOT inspection to find out you're out of spec.",
    ],
    metaDescription:
      "Mobile big rig brake inspection in Houston TX. DOT-compliant brake adjustment, pad replacement, and air brake system service at your location.",
  },
  {
    slug: "trailer-fleet-lighting",
    title: "Trailer & Fleet Lighting",
    shortDesc: "Full trailer light repair, marker lights, brake lights, and harness troubleshooting.",
    category: "heavy",
    tagline: "Failed trailer lights mean a failed DOT inspection. We fix them fast.",
    whatIsIt:
      "Non-functioning trailer lights are a safety hazard and a guaranteed violation during any roadside inspection. We diagnose and repair the full trailer electrical system — from marker lights to harness connectors — at your yard or roadside.",
    includes: [
      "Full trailer lighting test — running, brake, turn, and reverse lights",
      "Marker light and clearance light replacement",
      "7-way connector and pigtail inspection and replacement",
      "Tail light assembly repair or replacement",
      "Harness continuity and short circuit testing",
      "ABS fault code check (where equipped)",
      "Reefer unit electrical inspection",
    ],
    process: [
      { step: "Full system test", detail: "We test every light circuit before replacing anything." },
      { step: "Trace the fault", detail: "We find the root cause — bad ground, broken wire, or failed component." },
      { step: "Repair on-site", detail: "Most lighting repairs are completed in under an hour." },
    ],
    goodToKnow: [
      "A bad ground is the most common cause of trailer lighting problems — not the bulb.",
      "We stock 7-way connectors, marker light assemblies, and common pigtail harnesses.",
      "Reefer trailer electrical work may require additional lead time — call ahead.",
    ],
    metaDescription:
      "Mobile trailer and fleet lighting repair in Houston TX. Marker lights, brake lights, harness troubleshooting, and 7-way connector repair at your location.",
  },
  {
    slug: "commercial-roadside",
    title: "Emergency Roadside — Commercial",
    shortDesc: "24/7 emergency callouts for commercial operators. Fuel delivery, tire changes, and electrical diagnosis.",
    category: "heavy",
    tagline: "24/7 emergency response for commercial operators across Houston.",
    whatIsIt:
      "Every hour a truck is down costs money. We respond to commercial roadside emergencies across the Houston metro — day or night — with the tools and parts to get your truck moving again without waiting for a tow.",
    includes: [
      "Emergency tire change — drive tires, steer tires, and trailer tires",
      "Diesel fuel delivery (DEF and diesel)",
      "Battery jump-start and replacement for diesel trucks",
      "Emergency air brake repairs",
      "Fuel system priming (after running out of fuel)",
      "Electrical diagnosis and emergency wiring repair",
      "On-site assessment and tow coordination if needed",
    ],
    process: [
      { step: "Call us immediately", detail: "We dispatch from the closest available location to minimize your wait." },
      { step: "Safety first", detail: "We help you position safely if on a highway or high-traffic road." },
      { step: "Get rolling", detail: "We fix what we can on-site — if a tow is needed we'll tell you honestly." },
    ],
    goodToKnow: [
      "We cover the entire Houston metro area including I-10, I-45, I-69, Loop 610, and Beltway 8 corridors.",
      "Keep our number saved — (832) 930-1444 — for any commercial breakdown.",
      "Fleet accounts with multiple units can set up priority dispatch agreements — call to discuss.",
    ],
    metaDescription:
      "24/7 commercial roadside emergency service in Houston TX. Emergency tire changes, fuel delivery, and electrical repair for semi trucks and commercial vehicles.",
  },
  {
    slug: "coolant-air-system",
    title: "Coolant & Air System Service",
    shortDesc: "Radiator flush, air dryer replacement, and air system leak detection for diesel fleets.",
    category: "heavy",
    tagline: "Overheating and air brake issues stop trucks — we prevent both.",
    whatIsIt:
      "Commercial diesel engines produce tremendous heat, and air brake systems depend on clean, dry air. We service both systems on-site — radiator flushes, air dryer replacement, and leak detection — before they cause a breakdown.",
    includes: [
      "Coolant flush and refill with the correct diesel-spec antifreeze",
      "Radiator and heater core pressure test",
      "Water pump inspection",
      "Air dryer cartridge replacement",
      "Air system leak-down test",
      "Air tank drain and check valve inspection",
      "Wet tank and governor inspection",
      "Air line and fitting inspection for leaks",
    ],
    process: [
      { step: "Pressure test both systems", detail: "We test the cooling system and air system before opening any component." },
      { step: "Replace service items", detail: "Air dryer cartridges and coolant are replaced to spec." },
      { step: "Verify and document", detail: "We confirm proper pressure hold and coolant temperature range." },
    ],
    goodToKnow: [
      "Air dryer cartridges should be replaced every 50,000 miles or annually — moisture in the air system corrodes brake components.",
      "Diesel coolant (ELC — Extended Life Coolant) is different from passenger vehicle antifreeze — using the wrong type causes liner pitting.",
      "An air system that takes too long to build pressure is often a sign of a failing air dryer or governor.",
    ],
    metaDescription:
      "Mobile coolant and air system service for semi trucks in Houston TX. Radiator flush, air dryer replacement, and air system leak detection.",
  },
  {
    slug: "fleet-maintenance",
    title: "Fleet Maintenance Programs",
    shortDesc: "Scheduled preventive maintenance packages for fleet operators. Keep your trucks on the road.",
    category: "heavy",
    tagline: "Scheduled PM programs that come to your yard — not the other way around.",
    whatIsIt:
      "Running a fleet means managing maintenance across multiple units. We offer scheduled preventive maintenance programs that come to your facility, keep detailed service records, and help you avoid unplanned breakdowns before they happen.",
    includes: [
      "Customized PM schedule based on your fleet size and duty cycle",
      "On-site service for all vehicles in a single visit",
      "Engine oil and filter service",
      "Brake inspection and adjustment",
      "Lights and electrical check",
      "Fluid level check across all systems",
      "Tire pressure and condition report",
      "Digital service records per unit",
      "Priority dispatch for emergency calls",
    ],
    process: [
      { step: "Fleet assessment", detail: "We review your current maintenance schedule and service history." },
      { step: "Custom PM plan", detail: "We build a schedule around your operation — mileage, hours, or calendar intervals." },
      { step: "Ongoing service", detail: "We show up at your facility on schedule — you focus on running your business." },
    ],
    goodToKnow: [
      "Fleet programs are available for operations with 3 or more vehicles.",
      "We provide monthly reporting on fleet condition and upcoming service needs.",
      "Emergency dispatch priority is included for all fleet program customers.",
    ],
    metaDescription:
      "Fleet maintenance programs in Houston TX. Scheduled preventive maintenance for commercial fleets — we come to your facility on a regular schedule.",
  },
];

export const servicesBySlug = Object.fromEntries(services.map((s) => [s.slug, s]));

export const passengerServices = services.filter((s) => s.category === "passenger");
export const heavyServices = services.filter((s) => s.category === "heavy");
