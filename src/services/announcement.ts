import fs from "fs";
import path from "path";
import axios from "axios";
import { AnnouncementModel } from "#models/announcement";
import { Announcement, CreateAnnouncementBody, AnnouncementResponse } from "#interfaces/announcement";
import { getMasjidConfig } from "#services/masjid-config";
import dotenv from "dotenv";
import { ElevenLabsClient, play } from '@elevenlabs/elevenlabs-js';

dotenv.config();

const uploadsRoot = path.join(process.cwd(), "uploads", "announcements");
const SERVER_URL = process.env.SERVER_URL;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Default voice

// Ensure uploads directory exists
const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsRoot)) {
    fs.mkdirSync(uploadsRoot, { recursive: true });
  }
};

interface ElevenLabsError {
  isLimitReached: boolean;
  error: string;
}

// Convert numbers to digit-by-digit format for voice-over
// Example: "123" becomes "1 2 3", "Call 555-1234" becomes "Call 5 5 5 1 2 3 4"
const convertNumbersToDigits = (text: string): string => {
  return text.replace(/\d+/g, (match) => {
    // Join digits with space for natural pronunciation (one zero two, not one hundred two)
    return match.split('').join(' ');
  });
};

// Add extensive pauses to significantly slow down speech
const addPausesForSlowerSpeech = (text: string): string => {
  // First add pauses at punctuation
  let processedText = text
    .replace(/\./g, '. . . . . . ')    // Very long pause after periods (6 dots = ~3 seconds)
    .replace(/,/g, ', . . ')            // Medium pause after commas
    .replace(/\|\|\|/g, '. . . . . . . . '); // Extra long pause between announcements (8 dots)
  
  // Add slight pause after every 3-4 words for even slower pace
  const words = processedText.split(' ');
  const slowedWords: string[] = [];
  
  words.forEach((word, index) => {
    slowedWords.push(word);
    // Add small pause every 3 words (except at punctuation which already has pauses)
    if ((index + 1) % 3 === 0 && !word.includes('.') && !word.includes(',')) {
      slowedWords.push('.');
    }
  });
  
  return slowedWords.join(' ');
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

// Generate voice using ElevenLabs API
const generateVoiceWithElevenLabs = async (text: string): Promise<{ success: boolean; audioPath?: string; error?: ElevenLabsError }> => {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    ensureUploadsDir();

    // console.log("[ElevenLabs] Generating voice for text:", text.substring(0, 50) + "...");

    const elevenlabs = new ElevenLabsClient({
      apiKey: ELEVENLABS_API_KEY,
    });

    const audioStream = await elevenlabs.textToSpeech.convert(
      ELEVENLABS_VOICE_ID, // voice_id
      {
        text: text,
        modelId: 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128',
        voiceSettings: {
          stability: 0.85,         // Much higher = very consistent, deliberate, slower delivery
          similarityBoost: 0.3,    // Lower = softer, less rushed (0-1)
          style: 0.0,              // Minimal style for slower, neutral tone
          useSpeakerBoost: false   // Disable boost for softer sound
        }
      }
    );

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    // Save audio file
    const filename = `announcement-${Date.now()}.mp3`;
    const audioPath = path.join(uploadsRoot, filename);
    fs.writeFileSync(audioPath, audioBuffer);

    console.log("[ElevenLabs] ✅ Voice generated successfully:", filename);

    return {
      success: true,
      audioPath,
    };
  } catch (error: any) {
    console.error("[ElevenLabs] ❌ Error generating voice:", error.message);

    // Check if it's a quota/limit error
    const isLimitReached = 
      error.response?.status === 401 ||
      error.response?.status === 429 ||
      error.response?.data?.detail?.status === "quota_exceeded" ||
      error.message?.toLowerCase().includes("quota") ||
      error.message?.toLowerCase().includes("limit");

    return {
      success: false,
      error: {
        isLimitReached,
        error: error.response?.data?.detail?.message || error.message || "Failed to generate voice",
      },
    };
  }
};

// Create announcement with ElevenLabs voice generation
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
    
    // Combine all announcements - addPausesForSlowerSpeech will handle the pauses
    const combinedText = announcementsList.join('|||');
    
    let audioUrl: string | undefined;
    let useMobileTTS = false;
    let elevenLabsError: string | undefined;

    // Check if admin has enabled mobile TTS preference in masjid config
    if (masjidConfig.useMobileTTS === true) {
      // Admin wants to always use mobile TTS - skip ElevenLabs entirely
      useMobileTTS = true;
      console.log("[Announcement] 🔊 Admin preference: Using mobile TTS (masjid config setting)");
    } else {
      // Admin wants to try ElevenLabs (or no preference set)
      
      // Check if we have the same announcement before (to reuse audio)
      const existingAnnouncement = await AnnouncementModel.findOne({ 
        text: combinedText,
        audioUrl: { $exists: true, $ne: null }
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean<Announcement>();

      if (existingAnnouncement && existingAnnouncement.audioUrl) {
        // Reuse existing audio for same announcement text
        audioUrl = existingAnnouncement.audioUrl;
        useMobileTTS = false;
        console.log("[Announcement] ✅ Reusing existing audio for same announcement:", audioUrl);
      } else {
        // Generate new audio
        console.log("[Announcement] 🎙️ Generating new audio with ElevenLabs...");
        
        // Convert numbers to digit-by-digit format
        let textForVoice = convertNumbersToDigits(combinedText);
        
        // Add pauses for slower speech
        textForVoice = addPausesForSlowerSpeech(textForVoice);
        
        console.log("[Announcement] Text for voice generation:", textForVoice.substring(0, 100) + "...");

        // Try to generate voice with ElevenLabs
        const voiceResult = await generateVoiceWithElevenLabs(textForVoice);

        if (voiceResult.success && voiceResult.audioPath) {
          // Success - use ElevenLabs audio
          const filename = path.basename(voiceResult.audioPath);
          audioUrl = `${SERVER_URL}/api/announcements/audio/${filename}`;
          useMobileTTS = false;
          console.log("[Announcement] ✅ Using ElevenLabs audio:", audioUrl);
        } else {
          // Error or limit reached - fallback to mobile TTS
          useMobileTTS = true;
          elevenLabsError = voiceResult.error?.error;
          
          if (voiceResult.error?.isLimitReached) {
            console.log("[Announcement] ⚠️ ElevenLabs limit reached, using mobile TTS");
          } else {
            console.log("[Announcement] ⚠️ ElevenLabs error, using mobile TTS:", elevenLabsError);
          }
        }
      }
    }

    // Save announcement to database
    const announcement = await AnnouncementModel.create({
      text: combinedText, // Store original text without digit conversion
      audioUrl,
      useMobileTTS,
      elevenLabsError,
    });

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
