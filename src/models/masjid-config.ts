import { Schema, model } from "mongoose";

const MasjidConfigSchema = new Schema(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    address: { type: String, required: true },
    timeZone: { type: String, required: true },
    qrLink: { type: String, required: true },
    tickerText: { type: String, required: false },
    maghribSunsetAdditionMinutes: { type: Number, required: false },
    method: { type: Number, required: false },
    shafaq: { type: String, required: false },
    school: { type: Number, required: false },
    midnightMode: { type: Number, required: false },
    calendarMethod: { type: String, required: false },
    latitudeAdjustmentMethod: { type: Number, required: false },
    tune: { type: String, required: false },
    adjustment: { type: Schema.Types.Mixed, required: false },
  },
  { timestamps: true }
);

export const MasjidConfigModel = model("MasjidConfig", MasjidConfigSchema);
