import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sessionRoutes from "./routes/session.js";
import answerRoutes from "./routes/answer.js";
import retryRoutes from "./routes/retry.js";

dotenv.config();

export function createApp(): express.Express {
  const app = express();
  app.use(cors({ origin: "http://localhost:5173" }));
  app.use(express.json());
  app.use("/session", sessionRoutes);
  app.use("/session", answerRoutes);
  app.use("/session", retryRoutes);
  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 8080);
  createApp().listen(port, () => console.log(`API server listening on ${port}`));
}
