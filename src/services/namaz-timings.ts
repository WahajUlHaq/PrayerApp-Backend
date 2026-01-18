import {
    NamazTimingsFetchResponse,
  NamazTimingsParams,
  NamazTimingsResponse,
} from "#interfaces/namaz-timings";
import { NamazTimingModel } from "#models/namaz-timings";
import { axiosWrapper } from "#utils/axios";

export const fetchNamazTimings = async (
  params: NamazTimingsParams
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
    const query = {
      address,
      method,
      shafaq,
      school,
      midnightMode,
      calendarMethod,
      latitudeAdjustmentMethod,
      tune,
      adjustment,
      //   timezonestring: "UTC",
      //   iso8601: true,
    };

    const res = await axiosWrapper.get<NamazTimingsResponse>(url, query);

    await NamazTimingModel.findOneAndUpdate(
      { year, month, address },
      {
        year,
        month,
        address,
        data: res.data.data,
      },
      { upsert: true, new: true }
    );

    return res.data as NamazTimingsResponse;
  } catch (err: any) {
    console.error("Error fetching Namaz timings:", err);
    throw new Error(err.message || "Failed to fetch Namaz timings");
  }
};

export const getNamazTimings = async (
): Promise<NamazTimingsFetchResponse> => {
  try {
    const record = await NamazTimingModel.findOne({}).sort({ updatedAt: -1 }).lean<any>();

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

        
