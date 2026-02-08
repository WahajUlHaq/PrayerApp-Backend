import { Router } from "express";
import path from "path";
import fs from "fs";
import {
  createAnnouncementController,
  getAllAnnouncementsController,
  getAnnouncementController,
  deleteAnnouncementController,
} from "#controllers/announcement";

const BASE_ROUTE = "/announcements";
const uploadsRoot = path.join(process.cwd(), "uploads", "announcements");

const isSafeFilename = (filename: string): boolean => {
  return !filename.includes("..") && !filename.includes("/") && !filename.includes("\\");
};

const announcementRoutes = (router: Router) => {
  // Create announcement
  router.post(`${BASE_ROUTE}`, createAnnouncementController);

  // Get all announcements
  router.get(`${BASE_ROUTE}`, getAllAnnouncementsController);

  // Get announcement by ID
  router.get(`${BASE_ROUTE}/:id`, getAnnouncementController);

  // Delete announcement
  router.delete(`${BASE_ROUTE}/:id`, deleteAnnouncementController);

  // Serve audio file
  router.get(`${BASE_ROUTE}/audio/:filename`, async (req, res) => {
    const { filename } = req.params;
    if (!isSafeFilename(filename)) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    const filePath = path.join(uploadsRoot, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Audio file not found" });
    }

    res.contentType("audio/mpeg");
    res.sendFile(filePath);
  });
};

export default announcementRoutes;
