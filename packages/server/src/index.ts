import express from "express";
import cors from "cors";
import { router } from "./routes.js";
import { dbPath } from "./db.js";

const app = express();

// Kap. 1.2 ("Keine öffentliche Erreichbarkeit aus dem Internet") und NF-05:
// Stufe 1 läuft auf einem einzelnen Laptop, Stufe 2 auf dem Pi im lokalen
// WLAN — beides kein Grund, den Server an alle Interfaces zu binden. Wer ihn
// bewusst im WLAN erreichbar machen will (Stufe 2), setzt HOST explizit.
const host = process.env.HOST ?? "127.0.0.1";

// Es gibt keinen produktiven Grund, warum eine beliebige Website aus dem
// Browser der MA heraus die (unauthentifizierte) API ansprechen können soll.
// Standardmäßig nur der Vite-Dev-Origin, sonst über CORS_ORIGIN konfigurierbar.
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
app.use(cors({ origin: corsOrigin }));

app.use(express.json());
app.use("/api", router);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT ?? 3001);
app.listen(port, host, () => {
  console.log(`Turnierverwaltung-Server läuft auf http://${host}:${port} (DB: ${dbPath})`);
});
