export type IqamaahRange = {
  /** Inclusive start date. Accepts YYYY-MM-DD or M/D/YYYY */
  startDate: string;
  /** Inclusive end date. Accepts YYYY-MM-DD or M/D/YYYY */
  endDate: string;
  /** Time in HH:mm (24h). Example: "01:50" */
  time: string;
};

export type IqamaahPrayerKey =
  | "fajr"
  | "dhuhr"
  | "asr"
  | "isha"
  | "jumuah";

export interface IqamaahTimesPayload {
  fajr: IqamaahRange[];
  dhuhr: IqamaahRange[];
  asr: IqamaahRange[];
  isha: IqamaahRange[];
  /** Can have more than one Jumu'ah time and/or ranges */
  jumuah: IqamaahRange[];
}

export interface UpsertIqamaahRangeBody {
  prayer: IqamaahPrayerKey;
  startDate: string;
  endDate: string;
  time: string;
}

export interface UpdateIqamaahRangeBody extends UpsertIqamaahRangeBody {
  /** Optional: if provided, update (replace) only entries matching this time within the old range */
  oldTime?: string;
  /** Optional: old range startDate (defaults to startDate) */
  oldStartDate?: string;
  /** Optional: old range endDate (defaults to endDate) */
  oldEndDate?: string;
}

export interface DeleteIqamaahRangeBody {
  prayer: IqamaahPrayerKey;
  startDate: string;
  endDate: string;
  /** Optional: if provided, delete only entries with this time */
  time?: string;
}

export interface GetIqamaahTimesQuery {
  from?: string;
  to?: string;
  prayer?: IqamaahPrayerKey;
}

export type IqamaahDayRow = {
  date: string; // YYYY-MM-DD
  fajr: string;
  dhuhr: string;
  asr: string;
  isha: string;
  jumuah: string[];
};

export interface IqamaahTimesDoc extends IqamaahTimesPayload {
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IqamaahTimesResponse {
  data: IqamaahTimesDoc;
}
