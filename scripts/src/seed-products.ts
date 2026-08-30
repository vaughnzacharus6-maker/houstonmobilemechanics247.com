import { getUncachableStripeClient } from './stripeClient';

const PARTS = [
  { name: "Motorcraft FL-820-S Oil Filter", description: "OEM-grade full-flow oil filter. Traps 97% of contaminants. Fits most Ford, Lincoln, and Mercury vehicles.", price: 1099, category: "Oil Filters", brand: "Motorcraft", vehicles: "Ford, Lincoln, Mercury" },
  { name: "Bosch 3312 Premium FILTECH Oil Filter", description: "FILTECH media with electrostatic layer. 20% more capacity. For most domestic and import vehicles.", price: 1299, category: "Oil Filters", brand: "Bosch", vehicles: "Most domestic & import" },
  { name: "ACDelco 45K0073 Brake Pad Set", description: "OE-grade semi-metallic brake pads. Superior stopping power with low noise and dust.", price: 2999, category: "Brake Pads", brand: "ACDelco", vehicles: "GM, Chevy, Buick, Cadillac" },
  { name: "Power Stop Z23 Evolution Brake Pads", description: "Carbon-fiber ceramic formula. Virtually dust-free. Direct bolt-on for trucks and SUVs.", price: 4499, category: "Brake Pads", brand: "Power Stop", vehicles: "Trucks, SUVs, Towing builds" },
  { name: "Optima RedTop 35 Battery", description: "720 CCA Spiralcell technology. 15x more vibration resistant. Powerful cold-weather starts.", price: 19999, category: "Batteries", brand: "Optima", vehicles: "Sedans, SUVs, Trucks" },
  { name: "DieHard Group 35 EFB Battery", description: "Enhanced Flooded Battery. 800 CCA for powerful starts. Ideal for standard power needs.", price: 13999, category: "Batteries", brand: "DieHard", vehicles: "Most sedans & crossovers" },
  { name: "NGK G-Power Platinum Spark Plug", description: "Platinum-tipped. Triple gasket seal. OEM-quality ignition for maximum performance.", price: 1099, category: "Spark Plugs", brand: "NGK", vehicles: "Honda, Toyota, Nissan, imports" },
  { name: "Bosch Double Iridium Spark Plug", description: "Ultra-fine iridium pin. 4x longer life than copper plugs. Fastest flame kernel growth.", price: 1499, category: "Spark Plugs", brand: "Bosch", vehicles: "European vehicles, GM, Ford" },
  { name: "K&N High Performance Air Filter", description: "Washable and reusable. Up to 50% more airflow than paper filters. Million-mile limited warranty.", price: 5499, category: "Air Filters", brand: "K&N", vehicles: "Most vehicles (check fitment)" },
  { name: "Motorcraft Winter Wiper Blade", description: "All-weather beam blade. No-clog design. Uniform pressure across entire blade length.", price: 2299, category: "Wiper Blades", brand: "Motorcraft", vehicles: "Universal fit" },
  { name: "Prestone Radiator Flush & Cleaner", description: "Flushes scale, rust, and deposits. Safe for all cooling systems. One-step radiator clean.", price: 1099, category: "Cooling", brand: "Prestone", vehicles: "All vehicles" },
  { name: "Dayco Serpentine Belt", description: "OEM-quality EPDM belt. Quieter, longer-lasting. Resists heat, cold, and ozone cracking.", price: 2999, category: "Belts", brand: "Dayco", vehicles: "Check fitment by year/make/model" },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  console.log('Seeding car parts into Stripe...\n');

  for (const part of PARTS) {
    // Check if product already exists
    const existing = await stripe.products.search({
      query: `name:'${part.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`[SKIP] ${part.name} already exists`);
      continue;
    }

    const product = await stripe.products.create({
      name: part.name,
      description: part.description,
      metadata: {
        category: part.category,
        brand: part.brand,
        vehicles: part.vehicles,
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: part.price,
      currency: 'usd',
    });

    console.log(`[OK] ${part.name} — $${(part.price / 100).toFixed(2)} (${price.id})`);
  }

  console.log('\nDone! Webhooks will sync data to the database.');
}

seedProducts().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
