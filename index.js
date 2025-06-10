// index.js
import express from "express";
import bodyParser from "body-parser";
import router from "./routes/routes.js";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";

dotenv.config();

const app = express();
const server = createServer(app);

// For __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS config
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set EJS views
app.set("views", path.join(__dirname, "public_html", "src", "views"));
app.set("view engine", "ejs");

// Use router
app.use("/", router);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
