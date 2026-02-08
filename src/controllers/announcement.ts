import { Request, Response } from "express";
import {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  deleteAnnouncement,
} from "#services/announcement";
import { CreateAnnouncementBody } from "#interfaces/announcement";

// Create a new announcement
export const createAnnouncementController = async (req: Request, res: Response) => {
  try {
    // Text is fetched from masjid config, not from request body
    const announcement = await createAnnouncement({ text: "" });
    res.status(201).json(announcement);
  } catch (err: any) {
    console.error("Error creating announcement:", err);
    res.status(500).json({ message: err.message || "Failed to create announcement" });
  }
};

// Get all announcements
export const getAllAnnouncementsController = async (req: Request, res: Response) => {
  try {
    const announcements = await getAllAnnouncements();
    res.json(announcements);
  } catch (err: any) {
    console.error("Error getting announcements:", err);
    res.status(500).json({ message: err.message || "Failed to get announcements" });
  }
};

// Get announcement by ID
export const getAnnouncementController = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const announcement = await getAnnouncementById(id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.json(announcement);
  } catch (err: any) {
    console.error("Error getting announcement:", err);
    res.status(500).json({ message: err.message || "Failed to get announcement" });
  }
};

// Delete announcement
export const deleteAnnouncementController = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const deleted = await deleteAnnouncement(id);

    if (!deleted) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.json({ message: "Announcement deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting announcement:", err);
    res.status(500).json({ message: err.message || "Failed to delete announcement" });
  }
};
