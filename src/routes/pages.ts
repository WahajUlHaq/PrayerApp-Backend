import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import {
  createPageController,
  getAllPagesController,
  getActivePagesController,
  getMobilePagesController,
  getPageController,
  updatePageController,
  deletePageController,
  updatePageOrderController,
} from "#controllers/page";
import { PageModel } from "#models/page";

const BASE_ROUTE = "/pages";

const uploadsRoot = path.join(process.cwd(), "uploads", "pages");

const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsRoot)) {
    fs.mkdirSync(uploadsRoot, { recursive: true });
  }
};

const createPageFilename = (originalname: string) => {
  const ext = path.extname(originalname || "").slice(0, 10);
  const safeExt = ext && ext.length <= 10 ? ext : "";
  const random = Math.random().toString(36).slice(2, 10);
  return `page-${Date.now()}-${random}${safeExt}`;
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadsDir();
    cb(null, uploadsRoot);
  },
  filename: (_req, file, cb) => {
    const filename = createPageFilename(file.originalname || "image");
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
    fileSize: 10 * 1024 * 1024, // 10MB per image
    files: 20, // Support up to 20 images for slider
  },
});

const pagesRoutes = (router: Router) => {
  // Create a new page (supports both single image and multiple slider images)
  router.post(
    `${BASE_ROUTE}`,
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "slides", maxCount: 20 },
    ]),
    createPageController
  );

  // Get all pages
  router.get(`${BASE_ROUTE}`, getAllPagesController);

  // Get currently active pages
  router.get(`${BASE_ROUTE}/active`, getActivePagesController);

  // Get mobile-optimized pages (flattens sliders into individual pages)
  router.get(`${BASE_ROUTE}/mob`, getMobilePagesController);

  // Get a single page
  router.get(`${BASE_ROUTE}/:id`, getPageController);

  // Update a page (supports both single image and multiple slider images)
  router.put(
    `${BASE_ROUTE}/:id`,
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "slides", maxCount: 20 },
    ]),
    updatePageController
  );

  // Delete a page
  router.delete(`${BASE_ROUTE}/:id`, deletePageController);

  // Update page order
  router.put(`${BASE_ROUTE}/order/update`, updatePageOrderController);

  // Serve page image (single image or slider image)
  router.get(`${BASE_ROUTE}/image/:id/:imagePath`, async (req, res) => {
    try {
      const { id, imagePath } = req.params;
      const page = await PageModel.findById(id).lean<any>();

      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      const decodedPath = decodeURIComponent(imagePath as string);

      // Check if it's the main image or a slide image
      let fullImagePath: string | null = null;
      
      if (page.image && page.image === decodedPath) {
        fullImagePath = page.image;
      } else if (page.slides) {
        const slide = page.slides.find((s: any) => s.image === decodedPath);
        if (slide) {
          fullImagePath = slide.image;
        }
      }

      if (!fullImagePath || !fs.existsSync(fullImagePath)) {
        return res.status(404).json({ message: "Image file not found" });
      }

      // Detect mime type from file extension
      const ext = path.extname(fullImagePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
      };
      const mimeType = mimeTypes[ext] || "image/jpeg";

      res.contentType(mimeType);
      res.sendFile(fullImagePath);
    } catch (err: any) {
      console.error("Error serving page image:", err);
      res.status(500).json({ message: "Failed to serve image" });
    }
  });
};

export default pagesRoutes;
