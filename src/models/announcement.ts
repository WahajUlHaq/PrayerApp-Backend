import { Schema, model } from "mongoose";
import { Announcement } from "#interfaces/announcement";

const AnnouncementSchema = new Schema<Announcement>(
  {
    text: { type: String, required: true },
    audioUrl: { type: String, required: false },
    useMobileTTS: { type: Boolean, required: true, default: false },
    elevenLabsError: { type: String, required: false },
  },
  {
    timestamps: true,
  }
);

export const AnnouncementModel = model<Announcement>("Announcement", AnnouncementSchema);
