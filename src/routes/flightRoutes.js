import express from "express";
const router = express.Router();
import {
  getAirports,
  getCheapestRoute,
  getDirectFlights,
} from "../controllers/flightController.js";

// Define the routes
router.get("/airports", getAirports);
router.get("/direct-flights", getDirectFlights);
router.get("/cheapest-route", getCheapestRoute);

export default router;
