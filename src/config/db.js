import neo4j from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();

// Ensure the required environment variables exist
if (
  !process.env.NEO4J_URI ||
  !process.env.NEO4J_USER ||
  !process.env.NEO4J_PASSWORD
) {
  console.error(
    "❌ Missing CognoDB environment variables. Check your .env file.",
  );
  process.exit(1);
}

// Create the driver instance
export const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
);

// Graceful shutdown function (important for clean exits)
export const closeDriver = async () => {
  await driver.close();
  console.log("🔒 CognoDB driver closed.");
};
