import dotenv from "dotenv";
import neo4j from "neo4j-driver";
dotenv.config();
const testCognoDB = async (params) => {
  console.log("🔄 Attempting to connect to CognoDB...");
  console.log(`URI: ${process.env.NEO4J_URI}`);
  console.log(`User: ${process.env.NEO4J_USER}`);

  const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
  );
  const session = driver.session();
  try {
    const result = await session.run('RETURN "CognoDB is online!" AS message');
    const message = result.records[0].get("message");
    console.log(`✅ SUCCESS: ${message}`);
    console.log("🎉 Your credentials are correct. You can start building!");
  } catch (error) {
    console.error("❌ CONNECTION FAILED:");
    console.error(error.message);
    console.log("\n🔧 Troubleshooting tips:");
    console.log(
      "1. Check if your CognoDB instance is still running in the console.",
    );
    console.log(
      "2. Verify the URI, Username (cognodb), and Password in your .env file.",
    );
    console.log("3. Ensure there are no extra spaces in your .env values.");
  } finally {
    await session.close();
    await driver.close();
  }
};
testCognoDB();
