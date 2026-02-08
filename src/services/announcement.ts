import fs from "fs";
import path from "path";
import { AnnouncementModel } from "#models/announcement";
import { Announcement, CreateAnnouncementBody, AnnouncementResponse } from "#interfaces/announcement";
import { getMasjidConfig } from "#services/masjid-config";
import dotenv from "dotenv";

dotenv.config();

const uploadsRoot = path.join(process.cwd(), "uploads", "announcements");
const SERVER_URL = process.env.SERVER_URL;

// Ensure uploads directory exists
const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsRoot)) {
    fs.mkdirSync(uploadsRoot, { recursive: true });
  }
};

// Parse announcements from masjid config (separated by |||)
const parseAnnouncements = (announcementsText: string | undefined): string[] => {
  if (!announcementsText || announcementsText.trim() === '') {
    return [];
  }
  
  return announcementsText
    .split('|||')
    .map(a => a.trim())
    .filter(a => a.length > 0);
};

// Create announcement - Always use mobile TTS
export const createAnnouncement = async (data: CreateAnnouncementBody): Promise<AnnouncementResponse> => {
  try {
    console.log("[Announcement] Creating new announcement");

    // Fetch masjid config to get announcements
    const masjidConfig = await getMasjidConfig();
    
    if (!masjidConfig || !masjidConfig.announcements) {
      throw new Error("No announcements found in masjid config");
    }

    // Parse announcements (separated by |||)
    const announcementsList = parseAnnouncements(masjidConfig.announcements);
    
    if (announcementsList.length === 0) {
      throw new Error("No valid announcements found in masjid config");
    }

    console.log(`[Announcement] Found ${announcementsList.length} announcement(s)`);
    
    // Combine all announcements
    const combinedText = announcementsList.join('. ');
    
    console.log("[Announcement] Text:", combinedText.substring(0, 100) + "...");
    console.log("[Announcement] Using mobile TTS for voice-over");

    // Save announcement to database
    const announcement = await AnnouncementModel.create({
      text: combinedText,
      audioUrl: undefined,
      useMobileTTS: true,
      elevenLabsError: undefined,
    });

    console.log("[Announcement] ✅ Saved! Mobile will handle TTS");

    return {
      _id: announcement._id.toString(),
      text: announcement.text,
      audioUrl: undefined,
      useMobileTTS: true,
      elevenLabsError: undefined,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
    };
  } catch (err: any) {
    console.error("[Announcement] Error creating announcement:", err);
    throw new Error(err.message || "Failed to create announcement");
  }
};

// Get all announcements
export const getAllAnnouncements = async (): Promise<AnnouncementResponse[]> => {
  try {
    const announcements = await AnnouncementModel.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean<Announcement[]>();

    return announcements.map((a) => ({
      _id: a._id.toString(),
      text: a.text,
      audioUrl: a.audioUrl,
      useMobileTTS: a.useMobileTTS,
      elevenLabsError: a.elevenLabsError,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  } catch (err: any) {
    console.error("[Announcement] Error getting announcements:", err);
    throw new Error(err.message || "Failed to get announcements");
  }
};

// Get announcement by ID
export const getAnnouncementById = async (id: string): Promise<AnnouncementResponse | null> => {
  try {
    const announcement = await AnnouncementModel.findById(id).lean<Announcement>();
    if (!announcement) return null;

    return {
      _id: announcement._id.toString(),
      text: announcement.text,
      audioUrl: announcement.audioUrl,
      useMobileTTS: announcement.useMobileTTS,
      elevenLabsError: announcement.elevenLabsError,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
    };
  } catch (err: any) {
    console.error("[Announcement] Error getting announcement:", err);
    throw new Error(err.message || "Failed to get announcement");
  }
};

// Delete announcement
export const deleteAnnouncement = async (id: string): Promise<boolean> => {
  try {
    const announcement = await AnnouncementModel.findById(id).lean<Announcement>();
    if (!announcement) return false;

    // Delete audio file if exists
    if (announcement.audioUrl) {
      const filename = path.basename(announcement.audioUrl);
      const audioPath = path.join(uploadsRoot, filename);
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    }

    await AnnouncementModel.findByIdAndDelete(id);
    return true;
  } catch (err: any) {
    console.error("[Announcement] Error deleting announcement:", err);
    throw new Error(err.message || "Failed to delete announcement");
  }
};
