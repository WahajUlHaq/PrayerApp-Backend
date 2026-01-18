import { MasjidConfigParams } from "#interfaces/masjid-config";
import { MasjidConfigModel } from "#models/masjid-config";

export const upsertMasjidConfig = async (
  data: MasjidConfigParams
): Promise<MasjidConfigParams> => {
  try {
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
