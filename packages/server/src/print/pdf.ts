import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CANDIDATE_PATHS = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

function findChrome(): string {
  const found = CANDIDATE_PATHS.find((p) => p && fs.existsSync(p));
  if (!found) {
    throw new Error(
      "Kein Chrome/Chromium gefunden. CHROME_PATH setzen oder google-chrome installieren (für Aushang-PDFs nötig)."
    );
  }
  return found;
}

export type Orientation = "portrait" | "landscape";

export async function htmlToPdf(html: string, orientation: Orientation): Promise<Buffer> {
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      landscape: orientation === "landscape",
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
