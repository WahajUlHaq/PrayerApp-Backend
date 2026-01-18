import { Schema, model } from "mongoose";

const NamazTimingSchema = new Schema(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    address: { type: String, required: true },
    data: {
      type: [Schema.Types.Mixed],
      required: true,
    },
  },
  { timestamps: true }
);

export const NamazTimingModel = model("NamazTiming", NamazTimingSchema);
