import { Schema, model } from "mongoose";

const BannerSchema = new Schema(
  {
    filename: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    filepath: { type: String, required: true },
    order: { type: Number, default: 0 },
    duration: { type: Number, default: 5 },
  },
  { timestamps: true }
);

export const BannerModel = model("Banner", BannerSchema);
