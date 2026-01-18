import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

const BASE_ROUTE = "/banners";

const uploadsRoot = path.join(process.cwd(), "uploads", "banners");
const tickerFilePath = path.join(uploadsRoot, "ticker.json");

const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsRoot)) {
    fs.mkdirSync(uploadsRoot, { recursive: true });
  }
};

const readTickerText = (): string => {
  try {
    ensureUploadsDir();
    if (!fs.existsSync(tickerFilePath)) return "";
    const raw = fs.readFileSync(tickerFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed?.tickerText === "string" ? parsed.tickerText : "";
  } catch {
    return "";
  }
};

const writeTickerText = (tickerText: string) => {
  ensureUploadsDir();
  fs.writeFileSync(tickerFilePath, JSON.stringify({ tickerText }, null, 2), "utf8");
};

const normalizeTickerText = (value: unknown): string => {
  const text = String(value ?? "").trim();
  // Keep it generous but bounded to avoid huge payloads.
  return text.slice(0, 2000);
};

const isSafeFilename = (name: string) => {
  if (!name) return false;
  if (name.includes("..")) return false;
  if (name.includes("/") || name.includes("\\")) return false;
  return true;
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureUploadsDir();
      cb(null, uploadsRoot);
    } catch (e) {
      cb(e as Error, uploadsRoot);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").slice(0, 10);
    const safeExt = ext && ext.length <= 10 ? ext : "";
    const random = Math.random().toString(36).slice(2, 10);
    cb(null, `${Date.now()}-${random}${safeExt}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB per image
    files: 10,
  },
});

const bannersRoutes = (router: Router) => {
  // Get current ticker text
  router.get(`${BASE_ROUTE}/ticker`, (_req, res) => {
    const tickerText = readTickerText();
    res.json({ tickerText });
  });

  // Update ticker text
  router.put(`${BASE_ROUTE}/ticker`, (req, res) => {
    const tickerText = normalizeTickerText((req as any).body?.tickerText);
    writeTickerText(tickerText);
    res.json({ tickerText });
  });

  // Upload multiple banner images (multipart/form-data, field: banners)
  router.post(`${BASE_ROUTE}`, upload.array("banners", 10), (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const tickerText = normalizeTickerText((req as any).body?.tickerText);

    if (tickerText) {
      writeTickerText(tickerText);
    }

    const data = files.map((f) => ({
      filename: f.filename,
      url: `${baseUrl}/api${BASE_ROUTE}/${encodeURIComponent(f.filename)}`,
      size: f.size,
      mimeType: f.mimetype,
    }));

    res.json({ tickerText: tickerText || readTickerText(), data });
  });

  // List banners saved on server
  router.get(`${BASE_ROUTE}`, (_req, res) => {
    ensureUploadsDir();
    const entries = fs.readdirSync(uploadsRoot, { withFileTypes: true });
    const baseUrl = `${_req.protocol}://${_req.get("host")}`;
    const tickerText = readTickerText();

    const data = entries
      .filter((e) => e.isFile())
      .filter((e) => e.name !== path.basename(tickerFilePath))
      .map((e) => ({
        filename: e.name,
        url: `${baseUrl}/api${BASE_ROUTE}/${encodeURIComponent(e.name)}`,
      }));

    res.json({ tickerText, data });
  });

  // Get (serve) a banner image
  router.get(`${BASE_ROUTE}/:filename`, (req, res) => {
    const { filename } = req.params;
    if (!isSafeFilename(filename)) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    ensureUploadsDir();
    const fullPath = path.join(uploadsRoot, filename);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.sendFile(fullPath);
  });

  // Delete a banner image
  router.delete(`${BASE_ROUTE}/:filename`, (req, res) => {
    const { filename } = req.params;
    if (!isSafeFilename(filename)) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    ensureUploadsDir();
    const fullPath = path.join(uploadsRoot, filename);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "Banner not found" });
    }

    fs.unlinkSync(fullPath);
    res.json({ message: "Deleted" });
  });
};

export default bannersRoutes;
