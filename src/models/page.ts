import { Schema, model } from "mongoose";

const ScheduleSchema = new Schema(
  {
    type: { type: String, enum: ["recurring", "daterange"], required: true },
    // For recurring schedules (e.g., every Friday)
    dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sunday, 6=Saturday
    startTime: { type: String }, // Format: "HH:mm" (e.g., "10:00")
    endTime: { type: String }, // Format: "HH:mm" (e.g., "11:00")
    // For date range schedules
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { _id: false }
);

const SlideSchema = new Schema(
  {
    image: { type: String, required: true }, // File path to uploaded image
    duration: { type: Number, default: 5 }, // Duration in seconds
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const PageSchema = new Schema(
  {
    title: { type: String, required: true },
    pageType: { 
      type: String, 
      enum: ["text", "image", "slider", "text-slider", "image-text"], 
      required: true,
      default: "text"
    },
    content: { type: String, default: "" }, // Text content
    image: { type: String }, // Single image (for 'image' or 'image-text' types)
    slides: [SlideSchema], // Multiple images with timing (for 'slider' or 'text-slider' types)
    pageDuration: { type: Number }, // Optional manual page duration override (in seconds)
    order: { type: Number, default: 0 },
    schedules: [ScheduleSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PageModel = model("Page", PageSchema);
