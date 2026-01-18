import { Schema, model } from "mongoose";

const IqamaahRangeSchema = new Schema(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    time: { type: String, required: true },
  },
  { _id: false }
);

const IqamaahTimesSchema = new Schema(
  {
    fajr: { type: [IqamaahRangeSchema], required: true, default: [] },
    dhuhr: { type: [IqamaahRangeSchema], required: true, default: [] },
    asr: { type: [IqamaahRangeSchema], required: true, default: [] },
    isha: { type: [IqamaahRangeSchema], required: true, default: [] },
    jumuah: { type: [IqamaahRangeSchema], required: true, default: [] },
  },
  { timestamps: true }
);

export const IqamaahTimesModel = model("IqamaahTimes", IqamaahTimesSchema);
