import { driver } from "../config/db.js";

// --- 1. GET ALL AIRPORTS (For the frontend dropdowns) ---
export const getAirports = async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (a:Airport) 
       RETURN a.code AS code, a.city AS city, a.country AS country
       ORDER BY a.city ASC`,
    );

    // Map the Neo4j records to a clean array of objects
    const airports = result.records.map((record) => ({
      code: record.get("code"),
      city: record.get("city"),
      country: record.get("country"),
      label: `${record.get("city")} (${record.get("code")})`, // e.g., "London (LHR)"
    }));

    res.json(airports);
  } catch (error) {
    console.error("Error fetching airports:", error.message);
    res.status(503).json({ error: "Database unreachable" });
  } finally {
    await session.close();
  }
};

// --- 2. GET DIRECT FLIGHTS FROM A SPECIFIC AIRPORT ---
export const getDirectFlights = async (req, res) => {
  const { from } = req.query;

  // Validate input
  if (!from) {
    return res.status(400).json({ error: 'Missing "from" airport code' });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (a:Airport {code: $from})-[f:HAS_FLIGHT]->(b:Airport)
       RETURN b.code AS destination, 
              b.city AS destinationCity,
              f.airline AS airline, 
              f.price AS price, 
              f.distance AS distance
       ORDER BY f.price ASC`,
      { from: from.toUpperCase() }, // <-- PARAMETERIZED
    );

    const flights = result.records.map((record) => ({
      destination: record.get("destination"),
      destinationCity: record.get("destinationCity"),
      airline: record.get("airline"),
      price: record.get("price"),
      distance: record.get("distance"),
    }));

    res.json(flights);
  } catch (error) {
    console.error("Error fetching direct flights:", error.message);
    res.status(503).json({ error: "Database unreachable" });
  } finally {
    await session.close();
  }
};

// --- 3. THE CHEAPEST ROUTE (Multi-hop + Awkward for SQL) ---
// This is the star query. It finds the cheapest path from A to B
// with up to 4 flights (1 to 4 hops).
// In SQL, this would require a recursive self-join that grows exponentially.
// In Cypher, it's just *1..4.
export const getCheapestRoute = async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res
      .status(400)
      .json({ error: 'Missing "from" or "to" airport code' });
  }

  // If the user selects the same airport, return a friendly error early.
  if (from.toUpperCase() === to.toUpperCase()) {
    return res
      .status(400)
      .json({ error: "Origin and destination cannot be the same" });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH path = (start:Airport {code: $from})-[:HAS_FLIGHT*1..4]-(end:Airport {code: $to})
       
       // Calculate the total cost by summing the 'price' property of every relationship in the path
       WITH path, 
            reduce(totalCost = 0, flight IN relationships(path) | totalCost + flight.price) AS totalCost,
            // Collect the airlines for each leg
            [flight IN relationships(path) | flight.airline] AS airlines,
            // Collect the prices for each leg (to show breakdown)
            [flight IN relationships(path) | flight.price] AS prices,
            // Get the list of airport codes along the way
            [node IN nodes(path) | node.code] AS stops,
            // Get the list of city names along the way (for a nicer display)
            [node IN nodes(path) | node.city] AS cityStops
       
       // Sort by total cost ascending (cheapest first) and take the top result
       RETURN totalCost, airlines, prices, stops, cityStops
       ORDER BY totalCost ASC
       LIMIT 1`,
      { from: from.toUpperCase(), to: to.toUpperCase() }, // <-- PARAMETERIZED
    );

    // If no routes are found (0 records), return a 404 empty state
    if (result.records.length === 0) {
      return res.status(404).json({
        message: "No routes found",
        hint: "Try a different destination or allow more layovers.",
      });
    }

    const record = result.records[0];
    const response = {
      totalCost: record.get("totalCost"),
      stops: record.get("stops"),
      cityStops: record.get("cityStops"),
      airlines: record.get("airlines"),
      prices: record.get("prices"),
    };

    res.json(response);
  } catch (error) {
    console.error("Error finding cheapest route:", error.message);
    res.status(503).json({ error: "Database unreachable" });
  } finally {
    await session.close();
  }
};
