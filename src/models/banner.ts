import { Schema, model } from "mongoose";

const BannerSchema = new Schema(
  {
    filename: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    dataBase64: { type: String, required: true },
  },
  { timestamps: true }
);

export const BannerModel = model("Banner", BannerSchema);
