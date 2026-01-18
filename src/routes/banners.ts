import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { BannerModel } from "#models/banner";

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

const upload = multer({
  storage: multer.memoryStorage(),
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

const createBannerFilename = (originalname: string) => {
  const ext = path.extname(originalname || "").slice(0, 10);
  const safeExt = ext && ext.length <= 10 ? ext : "";
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${random}${safeExt}`;
};

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
    router.post(`${BASE_ROUTE}`, upload.array("banners", 10), async (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const tickerText = normalizeTickerText((req as any).body?.tickerText);

    if (tickerText) {
      writeTickerText(tickerText);
    }

    const created = await Promise.all(
      files.map(async (f) => {
        const filename = createBannerFilename(f.originalname || "image");
        const dataBase64 = f.buffer.toString("base64");
        const doc = await BannerModel.create({
          filename,
          mimeType: f.mimetype,
          size: f.size,
          dataBase64,
        });

        return {
          filename: doc.filename,
          url: `data:${doc.mimeType};base64,${doc.dataBase64}`,
          size: doc.size,
          mimeType: doc.mimeType,
        };
      })
    );

    res.json({ tickerText: tickerText || readTickerText(), data: created });
  });

  // List banners saved on server
  router.get(`${BASE_ROUTE}`, async (_req, res) => {
    const tickerText = readTickerText();
    const docs = await BannerModel.find({}).sort({ createdAt: -1 }).lean<any>();
    const data = docs.map((d: any) => ({
      filename: d.filename,
      url: `data:${d.mimeType};base64,${d.dataBase64}`,
      size: d.size,
      mimeType: d.mimeType,
    }));

    res.json({ tickerText, data });
  });

  // Get (serve) a banner image
  router.get(`${BASE_ROUTE}/:filename`, async (req, res) => {
    const { filename } = req.params;
    if (!isSafeFilename(filename)) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    const doc = await BannerModel.findOne({ filename }).lean<any>();
    if (!doc) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.json({
      filename: doc.filename,
      url: `data:${doc.mimeType};base64,${doc.dataBase64}`,
      size: doc.size,
      mimeType: doc.mimeType,
    });
  });

  // Delete a banner image
  router.delete(`${BASE_ROUTE}/:filename`, async (req, res) => {
    const { filename } = req.params;
    if (!isSafeFilename(filename)) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    const deleted = await BannerModel.findOneAndDelete({ filename }).lean<any>();
    if (!deleted) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.json({ message: "Deleted" });
  });
};

export default bannersRoutes;
