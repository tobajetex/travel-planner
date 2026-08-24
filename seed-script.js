// seed-script.js
// This script populates CognoDB with airports and flight routes.
// Run it with: node seed-script.js

import dotenv from "dotenv";
import neo4j from "neo4j-driver";
dotenv.config();

// --- 1. DEFINE YOUR DATA ---
// Using arrays makes it easy to add more airports/routes later.

const airports = [
  { code: "LHR", city: "London", country: "UK" },
  { code: "CDG", city: "Paris", country: "France" },
  { code: "JFK", city: "New York", country: "USA" },
  { code: "LAX", city: "Los Angeles", country: "USA" },
  { code: "DXB", city: "Dubai", country: "UAE" },
  { code: "SIN", city: "Singapore", country: "Singapore" },
  { code: "DEL", city: "Delhi", country: "India" },
  { code: "SYD", city: "Sydney", country: "Australia" },
  { code: "NRT", city: "Tokyo", country: "Japan" },
];

const routes = [
  // Direct routes with airlines, prices (USD), and distances (miles)
  {
    from: "LHR",
    to: "JFK",
    airline: "British Airways",
    price: 550,
    distance: 3450,
  },
  { from: "JFK", to: "LAX", airline: "American", price: 320, distance: 2475 },
  { from: "LAX", to: "NRT", airline: "United", price: 780, distance: 5470 },
  {
    from: "NRT",
    to: "SIN",
    airline: "Singapore Air",
    price: 490,
    distance: 3300,
  },
  { from: "LHR", to: "DXB", airline: "Emirates", price: 650, distance: 3420 },
  { from: "DXB", to: "SIN", airline: "Emirates", price: 440, distance: 3630 },
  { from: "LHR", to: "CDG", airline: "Air France", price: 120, distance: 215 },
  { from: "CDG", to: "DEL", airline: "Air India", price: 580, distance: 4120 },
  { from: "DEL", to: "SIN", airline: "IndiGo", price: 310, distance: 2420 },
  { from: "SIN", to: "SYD", airline: "Qantas", price: 520, distance: 3900 },
  // Reverse route (cheaper, different airline)
  { from: "JFK", to: "LHR", airline: "Norse", price: 380, distance: 3450 },
  { from: "LHR", to: "NRT", airline: "JAL", price: 710, distance: 5950 },
  { from: "DXB", to: "NRT", airline: "Emirates", price: 680, distance: 4740 },
  { from: "LAX", to: "DXB", airline: "Emirates", price: 920, distance: 8320 },
  // Extra route to connect Europe to Asia via Paris
  { from: "CDG", to: "NRT", airline: "Air France", price: 620, distance: 6050 },
];

// --- 2. CONNECT TO COGNODB ---
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
);

// --- 3. THE SEED FUNCTION ---
async function seedDatabase() {
  const session = driver.session();

  console.log("🚀 Starting database seed...");
  console.log(
    `📊 Found ${airports.length} airports and ${routes.length} routes.`,
  );

  try {
    // --- Step A: Wipe the database clean (Idempotent) ---
    console.log("🧹 Clearing existing data...");
    await session.run("MATCH (n) DETACH DELETE n");
    console.log("✅ Database cleared.");

    // --- Step B: Create Airports using UNWIND (Parameterized) ---
    console.log("✈️ Creating airports...");
    const airportResult = await session.run(
      `
      UNWIND $airports AS airport
      CREATE (a:Airport {
        code: airport.code,
        city: airport.city,
        country: airport.country
      })
      RETURN count(a) AS createdCount
      `,
      { airports: airports }, // <-- PARAMETERIZED. No string concatenation!
    );
    const airportCount = airportResult.records[0].get("createdCount");
    console.log(`✅ Created ${airportCount} airports.`);

    // --- Step C: Create Flight Routes using UNWIND (Parameterized) ---
    console.log("🛫 Creating flight routes...");
    const routeResult = await session.run(
      `
      UNWIND $routes AS route
      MATCH (from:Airport {code: route.from})
      MATCH (to:Airport {code: route.to})
      CREATE (from)-[:HAS_FLIGHT {
        airline: route.airline,
        price: route.price,
        distance: route.distance
      }]->(to)
      RETURN count(route) AS createdCount
      `,
      { routes: routes }, // <-- PARAMETERIZED.
    );
    const routeCount = routeResult.records[0].get("createdCount");
    console.log(`✅ Created ${routeCount} flight routes.`);

    console.log(
      "🎉 Seed completed successfully! Your CognoDB instance is ready.",
    );
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    // Log the full error stack for debugging
    if (error.code) console.error("Error code:", error.code);
    process.exit(1);
  } finally {
    // Always close the session and driver
    await session.close();
    await driver.close();
  }
}

// --- 4. RUN THE SEED ---
seedDatabase();
