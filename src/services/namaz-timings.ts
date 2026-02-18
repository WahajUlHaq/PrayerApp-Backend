import {
  NamazTimingsFetchResponse,
  NamazTimingsParams,
  NamazTimingsResponse,
} from "#interfaces/namaz-timings";
import { MasjidConfigModel } from "#models/masjid-config";
import { NamazTimingModel } from "#models/namaz-timings";
import { axiosWrapper } from "#utils/axios";

export const fetchNamazTimings = async (
  params: NamazTimingsParams,
): Promise<NamazTimingsResponse> => {
  try {
    const {
      year,
      month,
      address,
      method,
      shafaq,
      school,
      midnightMode,
      calendarMethod,
      latitudeAdjustmentMethod,
      tune,
      adjustment,
    } = params;
    const url = `${process.env.NAMAZ_TIME_API_BASE}/${year}/${month}`;

    const getMasjidConfigQuery = await MasjidConfigModel.findOne({}).lean();

    const customAngle1 = getMasjidConfigQuery?.customAngles
      ? getMasjidConfigQuery.customAngles.split(",")[0]
      : null;
    const customAngle2 = getMasjidConfigQuery?.customAngles
      ? getMasjidConfigQuery.customAngles.split(",")[1]
      : null;

    const query = {
      address,
      method,
      shafaq,
      school,
      midnightMode,
      calendarMethod,
      latitudeAdjustmentMethod,
      adjustment: getMasjidConfigQuery?.monthAdjustment ?? 0,
      tune,
      ...(method == 99 && {
        methodSettings: `${customAngle1}, null, ${customAngle2}`,
      }),
      // methodSettings:
      //   timezonestring: "UTC",
      //   iso8601: true,
    };

    console.log("Fetching Namaz timings with query:", query);

    const res = await axiosWrapper.get<NamazTimingsResponse>(url, query);

    await NamazTimingModel.findOneAndUpdate(
      { year, month, address },
      {
        year,
        month,
        address,
        data: res.data.data,
      },
      { upsert: true, new: true },
    );

    return res.data as NamazTimingsResponse;
  } catch (err: any) {
    console.error("Error fetching Namaz timings:", err);
    throw new Error(err.message || "Failed to fetch Namaz timings");
  }
};

export const getNamazTimings = async (): Promise<NamazTimingsFetchResponse> => {
  try {
    const record = await NamazTimingModel.findOne({})
      .sort({ updatedAt: -1 })
      .lean<any>();

    if (!record) {
      throw new Error("No Namaz timings found in the database");
    }

    return {
      data: Array.isArray(record.data) ? record.data : [],
    } as NamazTimingsFetchResponse;
  } catch (err: any) {
    console.error("Error retrieving Namaz timings from DB:", err);
    throw new Error(err.message || "Failed to retrieve Namaz timings");
  }
};
