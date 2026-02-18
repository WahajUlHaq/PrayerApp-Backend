import { MasjidConfigParams } from "#interfaces/masjid-config";
import { MasjidConfigModel } from "#models/masjid-config";

export const upsertMasjidConfig = async (
  data: MasjidConfigParams
): Promise<MasjidConfigParams> => {
  try {
    if (data.method == 99) {
      
      console.log("Custom angles provided for method 99:", data.customAngles);
      const splittedAngles = data.customAngles?.toString()?.split(",")
      if (!splittedAngles || splittedAngles.length < 2) {
        throw new Error("Custom angles must be a comma-separated string with at least 2 values for method 99");
      }
    }

    if (data?.monthAdjustment && (data.monthAdjustment < -2 || data.monthAdjustment > 2)) {
      throw new Error("Month adjustment must be between -2 and 2");
    }

    console.log("Upserting Masjid config with data:", data);
    const payload: MasjidConfigParams = {
      ...data,
      method: data.method ?? 0,
      shafaq: data.shafaq ?? "general",
      school: data.school ?? 0,
      midnightMode: data.midnightMode ?? 0,
      calendarMethod: data.calendarMethod ?? "HJCoSA",
    };

    const doc = await MasjidConfigModel.findOneAndUpdate({}, payload, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }).lean<MasjidConfigParams>();

    return doc as MasjidConfigParams;
  } catch (err: any) {
    console.error("Error upserting Masjid config:", err);
    throw new Error(err.message || "Failed to save Masjid config");
  }
};

export const getMasjidConfig = async (): Promise<MasjidConfigParams> => {
  try {
    const record = await MasjidConfigModel.findOne({}).lean<MasjidConfigParams>();

    // if (!record) {
    //   throw new Error("No Masjid config found in the database");
    // }

    return record as MasjidConfigParams;
  } catch (err: any) {
    console.error("Error retrieving Masjid config from DB:", err);
    throw new Error(err.message || "Failed to retrieve Masjid config");
  }
};
