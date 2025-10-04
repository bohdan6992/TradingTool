import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

type ExcelRow = Record<string, any>;

function normalizeName(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ""); // прибираємо пробіли/слеші/символи
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1) Де шукати файл: або EXCEL_PATH, або /data/Beta 03.05.xlsx в репо
    const envPath = process.env.EXCEL_PATH;
    const fallback = path.join(process.cwd(), "data", "Beta.xlsx");
    const filePath = envPath && fs.existsSync(envPath) ? envPath : fallback;

    if (!fs.existsSync(filePath)) {
      return res.status(500).json({
        error: "Excel файл не знайдено",
        hint: "Перевір EXCEL_PATH у .env.local або поклади файл у /data/Beta 03.05.xlsx",
        filePathTried: [envPath, fallback],
      });
    }

    const sheetRequested = (process.env.EXCEL_SHEET || "MAIN").trim(); // може бути "MAIN/"
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: "buffer" });

    // 2) Обираємо аркуш
    const names = wb.SheetNames;
    if (!names?.length) {
      return res.status(500).json({ error: "У книзі немає аркушів", filePath });
    }

    // спроби: точний збіг → нормалізований збіг → включає 'main' → перший
    const exact = names.find((n) => n === sheetRequested);
    const normalized = names.find((n) => normalizeName(n) === normalizeName(sheetRequested));
    const containsMain = names.find((n) => normalizeName(n).includes("main"));
    const chosen = exact || normalized || containsMain || names[0];

    const ws = wb.Sheets[chosen];
    if (!ws) {
      return res.status(404).json({
        error: `Аркуш не знайдено`,
        requested: sheetRequested,
        available: names,
        chosen,
        filePath,
      });
    }

    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const headers =
      (XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" })[0] as string[]) || [];

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ headers, rows, sheet: chosen, updatedAt: Date.now(), filePath });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "excel read error" });
  }
}
