import {
  DeleteIqamaahRangeBody,
  IqamaahPrayerKey,
  IqamaahRange,
  IqamaahTimesPayload,
  UpdateIqamaahRangeBody,
  UpsertIqamaahRangeBody,
} from "#interfaces/iqamaah-times";
import { parseFlexibleDateToUTC } from "#utils/date";

const ALLOWED_PRAYERS: IqamaahPrayerKey[] = ["fajr", "dhuhr", "asr", "isha", "jumuah"];

// Accept HH:mm and H:mm (e.g., 05:04 or 5:04)
const TIME_24H_REGEX = /^([01]?\d|2[0-3]):[0-5]\d$/;

const assertValidPrayer = (prayer: any) => {
  const p = String(prayer ?? "").trim().toLowerCase();
  if (!ALLOWED_PRAYERS.includes(p as IqamaahPrayerKey)) {
    throw new Error(`prayer must be one of: ${ALLOWED_PRAYERS.join(", ")}`);
  }
};

const validateRange = (range: IqamaahRange, prayer: IqamaahPrayerKey, idx: number) => {
  if (!range.startDate || !range.endDate) {
    throw new Error(`${prayer}[${idx}]: startDate and endDate are required`);
  }

  const start = parseFlexibleDateToUTC(range.startDate);
  const end = parseFlexibleDateToUTC(range.endDate);

  if (start.getTime() > end.getTime()) {
    throw new Error(`${prayer}[${idx}]: startDate cannot be after endDate`);
  }

  if (!range.time || !TIME_24H_REGEX.test(range.time)) {
    throw new Error(`${prayer}[${idx}]: time must be in HH:mm (24h) format`);
  }
};

export const validateIqamaahTimesPayload = (data: IqamaahTimesPayload): boolean => {
  const keys: IqamaahPrayerKey[] = ["fajr", "dhuhr", "asr", "isha", "jumuah"];

  for (const key of keys) {
    const value = (data as any)[key];

    if (!Array.isArray(value)) throw new Error(`${key} must be an array`);

    value.forEach((r: any, idx: number) => validateRange(r as IqamaahRange, key, idx));
  }

  return true;
};

export const validateUpsertIqamaahRangeBody = (data: UpsertIqamaahRangeBody): boolean => {
  if (!data.prayer) throw new Error("prayer is required");
  assertValidPrayer(data.prayer);
  // leverage shared range validation
  validateRange(
    { startDate: data.startDate, endDate: data.endDate, time: data.time },
    data.prayer,
    0
  );
  return true;
};

export const validateUpdateIqamaahRangeBody = (data: UpdateIqamaahRangeBody): boolean => {
  validateUpsertIqamaahRangeBody(data);

  if (data.oldStartDate !== undefined) {
    parseFlexibleDateToUTC(data.oldStartDate);
  }

  if (data.oldEndDate !== undefined) {
    parseFlexibleDateToUTC(data.oldEndDate);
  }

  if (data.oldStartDate !== undefined && data.oldEndDate !== undefined) {
    const s = parseFlexibleDateToUTC(data.oldStartDate);
    const e = parseFlexibleDateToUTC(data.oldEndDate);
    if (s.getTime() > e.getTime()) throw new Error("oldStartDate cannot be after oldEndDate");
  }

  if (data.oldTime !== undefined && data.oldTime !== "" && !TIME_24H_REGEX.test(String(data.oldTime))) {
    throw new Error("oldTime must be in HH:mm (24h) format");
  }

  return true;
};

export const validateDeleteIqamaahRangeBody = (data: DeleteIqamaahRangeBody): boolean => {
  if (!data.prayer) throw new Error("prayer is required");
  assertValidPrayer(data.prayer);
  if (!data.startDate || !data.endDate) throw new Error("startDate and endDate are required");
  const start = parseFlexibleDateToUTC(data.startDate);
  const end = parseFlexibleDateToUTC(data.endDate);
  if (start.getTime() > end.getTime()) throw new Error("startDate cannot be after endDate");
  if (data.time !== undefined && data.time !== "" && !TIME_24H_REGEX.test(String(data.time))) {
    throw new Error("time must be in HH:mm (24h) format");
  }
  return true;
};
