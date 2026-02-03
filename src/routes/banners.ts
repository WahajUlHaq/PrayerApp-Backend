import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { BannerModel } from "#models/banner";
import dotenv from "dotenv";

dotenv.config();

const BASE_ROUTE = "/banners";
const SERVER_URL = process.env.SERVER_URL

const getFullBannerUrl = (filename: string) => {
  return `${SERVER_URL}/api${BASE_ROUTE}/${filename}`;
};

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
    ensureUploadsDir();
    cb(null, uploadsRoot);
  },
  filename: (_req, file, cb) => {
    const filename = createBannerFilename(file.originalname || "image");
    cb(null, filename);
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

    // Parse durations array if provided (JSON string)
    let durations: number[] = [];
    if (req.body.durations) {
      try {
        durations = JSON.parse(req.body.durations);
      } catch {
        durations = [];
      }
    }

    // Get current max order to append new banners at the end
    const maxOrderDoc = await BannerModel.findOne({}).sort({ order: -1 }).lean<any>();
    const startOrder = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

    const created = await Promise.all(
      files.map(async (f, index) => {
        const doc = await BannerModel.create({
          filename: f.filename,
          mimeType: f.mimetype,
          size: f.size,
          filepath: f.path,
          order: startOrder + index,
          duration: durations[index] || 5,
        });

        return {
          filename: doc.filename,
          url: getFullBannerUrl(doc.filename),
          size: doc.size,
          mimeType: doc.mimeType,
          order: doc.order,
          duration: doc.duration,
        };
      })
    );

    res.json({ tickerText: tickerText || readTickerText(), data: created });
  });

  // List banners saved on server
  router.get(`${BASE_ROUTE}`, async (_req, res) => {
    const tickerText = readTickerText();
    const docs = await BannerModel.find({}).sort({ order: 1, createdAt: -1 }).lean<any>();
    const data = docs.map((d: any) => ({
      filename: d.filename,
      url: getFullBannerUrl(d.filename),
      size: d.size,
      mimeType: d.mimeType,
      order: d.order,
      duration: d.duration,
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

    const filePath = path.join(uploadsRoot, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on disk" });
    }

    res.contentType(doc.mimeType);
    res.sendFile(filePath);
  });

  // Update banner order
  router.put(`${BASE_ROUTE}/order`, async (req, res) => {
    const { banners } = req.body;

    if (!Array.isArray(banners)) {
      return res.status(400).json({ message: "banners must be an array" });
    }

    // Validate and update each banner's order and duration
    const updates = banners.map((item: any, index: number) => {
      if (!item.filename || !isSafeFilename(item.filename)) {
        throw new Error(`Invalid filename: ${item.filename}`);
      }
      
      const updateData: any = { order: index };
      
      // If duration is provided, update it
      if (item.duration !== undefined) {
        updateData.duration = item.duration;
      }
      
      return BannerModel.updateOne(
        { filename: item.filename },
        { $set: updateData }
      );
    });

    try {
      await Promise.all(updates);
      const docs = await BannerModel.find({}).sort({ order: 1 }).lean<any>();
      const data = docs.map((d: any) => ({
        filename: d.filename,
        url: getFullBannerUrl(d.filename),
        size: d.size,
        mimeType: d.mimeType,
        order: d.order,
        duration: d.duration,
      }));
      res.json({ message: "Order updated", data });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
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

    // Delete the file from disk
    const filePath = path.join(uploadsRoot, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: "Deleted" });
  });
};

export default bannersRoutes;
