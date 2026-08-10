import express from "express";
import cors from "cors";
import { router } from "./routes.js";
import { dbPath } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", router);

app.get("/api/health", (_req, res) => res.json({ ok: true, dbPath }));

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`Turnierverwaltung-Server läuft auf http://localhost:${port} (DB: ${dbPath})`);
});
