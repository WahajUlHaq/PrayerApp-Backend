import { Document } from "mongoose";

export interface Announcement extends Document {
  text: string;
  audioUrl?: string;
  useMobileTTS: boolean;
  elevenLabsError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAnnouncementBody {
  text: string;
}

export interface AnnouncementResponse {
  _id: string;
  text: string;
  audioUrl?: string;
  useMobileTTS: boolean;
  elevenLabsError?: string;
  createdAt: Date;
  updatedAt: Date;
}
