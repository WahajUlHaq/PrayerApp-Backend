import {
  IqamaahDayRow,
  IqamaahPrayerKey,
  IqamaahTimesDoc,
  IqamaahTimesPayload,
} from "#interfaces/iqamaah-times";
import { IqamaahTimesModel } from "#models/iqamaah-times";
import {
  addUTCDays,
  compareUTCDate,
  formatUTCDateToISO,
  parseFlexibleDateToUTC,
} from "#utils/date";

type StoredRange = { startDate: Date; endDate: Date; time: string };

const PRAYERS: IqamaahPrayerKey[] = ["fajr", "dhuhr", "asr", "isha", "jumuah"];

const normalizeTimeToHHMM = (value: unknown): string => {
  const s = String(value ?? "").trim();
  const m = s.match(/^([0-2]?\d):([0-5]\d)$/);
  if (!m) return s;
  const hh = m[1].padStart(2, "0");
  return `${hh}:${m[2]}`;
};

const normalizeStoredDoc = (doc: any): any => {
  const out: any = { ...doc };
  for (const p of PRAYERS) {
    if (!Array.isArray(out[p])) out[p] = [];
  }
  return out;
};

const toStoredRanges = (ranges: any[]): StoredRange[] =>
  (Array.isArray(ranges) ? ranges : []).map((r: any) => ({
    startDate: parseFlexibleDateToUTC(r.startDate),
    endDate: parseFlexibleDateToUTC(r.endDate),
    time: normalizeTimeToHHMM(r.time),
  }));

const toApiRanges = (ranges: StoredRange[]) =>
  ranges.map((r) => ({
    startDate: formatUTCDateToISO(r.startDate),
    endDate: formatUTCDateToISO(r.endDate),
    time: r.time,
  }));

const sortRanges = (ranges: StoredRange[]): StoredRange[] =>
  [...ranges].sort((a, b) => compareUTCDate(a.startDate, b.startDate) || compareUTCDate(a.endDate, b.endDate));

const mergeAdjacentSameTime = (ranges: StoredRange[]): StoredRange[] => {
  if (ranges.length === 0) return [];
  const sorted = sortRanges(ranges);
  const merged: StoredRange[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = sorted[i];

    const prevNextDay = addUTCDays(prev.endDate, 1);
    const isContiguous = prevNextDay.getTime() === cur.startDate.getTime();

    if (prev.time === cur.time && isContiguous) {
      prev.endDate = cur.endDate;
      continue;
    }

    merged.push(cur);
  }

  return merged;
};

const splitAndReplaceRange = (existing: StoredRange[], nextRange: StoredRange): StoredRange[] => {
  const result: StoredRange[] = [];

  for (const r of existing) {
    const noOverlap = r.endDate.getTime() < nextRange.startDate.getTime() || r.startDate.getTime() > nextRange.endDate.getTime();
    if (noOverlap) {
      result.push({ ...r });
      continue;
    }

    // left part
    if (r.startDate.getTime() < nextRange.startDate.getTime()) {
      result.push({
        startDate: r.startDate,
        endDate: addUTCDays(nextRange.startDate, -1),
        time: r.time,
      });
    }

    // right part
    if (r.endDate.getTime() > nextRange.endDate.getTime()) {
      result.push({
        startDate: addUTCDays(nextRange.endDate, 1),
        endDate: r.endDate,
        time: r.time,
      });
    }
  }

  result.push({ ...nextRange });
  return mergeAdjacentSameTime(result);
};

const deleteRangeFromExisting = (
  existing: StoredRange[],
  delStart: Date,
  delEnd: Date,
  timeFilter?: string
): StoredRange[] => {
  const result: StoredRange[] = [];

  for (const r of existing) {
    if (timeFilter !== undefined && timeFilter !== "" && r.time !== timeFilter) {
      result.push({ ...r });
      continue;
    }

    const noOverlap = r.endDate.getTime() < delStart.getTime() || r.startDate.getTime() > delEnd.getTime();
    if (noOverlap) {
      result.push({ ...r });
      continue;
    }

    // left part
    if (r.startDate.getTime() < delStart.getTime()) {
      result.push({
        startDate: r.startDate,
        endDate: addUTCDays(delStart, -1),
        time: r.time,
      });
    }

    // right part
    if (r.endDate.getTime() > delEnd.getTime()) {
      result.push({
        startDate: addUTCDays(delEnd, 1),
        endDate: r.endDate,
        time: r.time,
      });
    }
  }

  return mergeAdjacentSameTime(result);
};

const resolvePrayerTimeForDate = (ranges: StoredRange[], date: Date): string | undefined => {
  const matches = ranges.filter(
    (r) => r.startDate.getTime() <= date.getTime() && r.endDate.getTime() >= date.getTime()
  );
  if (matches.length === 0) return undefined;

  // pick the most specific/latest-start match
  matches.sort((a, b) => compareUTCDate(b.startDate, a.startDate));
  return matches[0].time;
};

const resolveJumuahTimesForDate = (ranges: StoredRange[], date: Date, missing = "--:--"): string[] => {
  const matches = ranges
    .filter((r) => r.startDate.getTime() <= date.getTime() && r.endDate.getTime() >= date.getTime())
    .map((r) => r.time)
    .sort();
  return matches.length > 0 ? matches : [missing];
};

export const upsertIqamaahTimes = async (payload: IqamaahTimesPayload): Promise<IqamaahTimesDoc> => {
  try {
    const storedPayload: any = {};
    const today = utcTodayStart();
    for (const p of PRAYERS) {
      storedPayload[p] = toStoredRanges((payload as any)[p]).filter((r) => r.endDate.getTime() >= today.getTime());
    }

    const doc = await IqamaahTimesModel.findOneAndUpdate({}, { $set: storedPayload }, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }).lean<any>();

    const normalized = normalizeStoredDoc(doc);
    const out: any = { ...normalized };
    for (const p of PRAYERS) {
      out[p] = toApiRanges(out[p]);
    }
    return out as IqamaahTimesDoc;
  } catch (err: any) {
    console.error("Error upserting Iqamaah times:", err);
    throw new Error(err.message || "Failed to save Iqamaah times");
  }
};

const fetchStoredPrayerRanges = (doc: any, prayer: IqamaahPrayerKey): StoredRange[] =>
  (doc?.[prayer] ?? []).map((r: any) => ({
    startDate: new Date(r.startDate),
    endDate: new Date(r.endDate),
    time: String(r.time),
  }));

const toApiDoc = (record: any): IqamaahTimesDoc => {
  const normalized = normalizeStoredDoc(record ?? {});
  const out: any = { ...normalized };
  for (const p of PRAYERS) out[p] = toApiRanges(out[p]);
  return out as IqamaahTimesDoc;
};

export const createIqamaahRange = async (params: {
  prayer: IqamaahPrayerKey;
  startDate: string;
  endDate: string;
  time: string;
}): Promise<IqamaahTimesDoc> => {
  const prayer = params.prayer;
  const nextRange: StoredRange = {
    startDate: parseFlexibleDateToUTC(params.startDate),
    endDate: parseFlexibleDateToUTC(params.endDate),
    time: normalizeTimeToHHMM(params.time),
  };

  const record = await IqamaahTimesModel.findOne({}).lean<any>();
  const normalized = normalizeStoredDoc(record ?? {});

  const today = utcTodayStart();
  const current = fetchStoredPrayerRanges(normalized, prayer).filter((r) => r.endDate.getTime() >= today.getTime());
  const updatedRanges =
    prayer === "jumuah"
      ? sortRanges([...current, nextRange])
      : splitAndReplaceRange(current, nextRange);

  const updated = await IqamaahTimesModel.findOneAndUpdate(
    {},
    { $set: { [prayer]: updatedRanges } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<any>();

  return toApiDoc(updated);
};

export const updateIqamaahRange = async (params: {
  prayer: IqamaahPrayerKey;
  startDate: string;
  endDate: string;
  time: string;
  oldTime?: string;
  oldStartDate?: string;
  oldEndDate?: string;
}): Promise<IqamaahTimesDoc> => {
  const prayer = params.prayer;
  const nextRange: StoredRange = {
    startDate: parseFlexibleDateToUTC(params.startDate),
    endDate: parseFlexibleDateToUTC(params.endDate),
    time: normalizeTimeToHHMM(params.time),
  };

  const record = await IqamaahTimesModel.findOne({}).lean<any>();
  const normalized = normalizeStoredDoc(record ?? {});

  const today = utcTodayStart();
  const current = fetchStoredPrayerRanges(normalized, prayer).filter((r) => r.endDate.getTime() >= today.getTime());

  // If old* fields are provided, do a targeted replace: delete old window (+ optional oldTime), then add new range.
  if (params.oldTime !== undefined || params.oldStartDate !== undefined || params.oldEndDate !== undefined) {
    const delStart = parseFlexibleDateToUTC(params.oldStartDate ?? params.startDate);
    const delEnd = parseFlexibleDateToUTC(params.oldEndDate ?? params.endDate);

    // Deterministic update: remove ONLY the exact matching old range entry(ies).
    // This avoids slicing and prevents "everything deleted" / unexpected leftovers.
    const withoutOld = current.filter((r) => {
      const isSameWindow = r.startDate.getTime() === delStart.getTime() && r.endDate.getTime() === delEnd.getTime();
      if (!isSameWindow) return true;
      if (params.oldTime !== undefined && params.oldTime !== "") {
        return r.time !== normalizeTimeToHHMM(params.oldTime);
      }
      return false;
    });

    const updatedRanges = sortRanges([...withoutOld, nextRange]);

    const updated = await IqamaahTimesModel.findOneAndUpdate(
      {},
      { $set: { [prayer]: updatedRanges } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean<any>();

    return toApiDoc(updated);
  }

  // Default behavior (no old*): update a SINGLE existing range (do not split into leftovers).
  // This prevents shrinking a range from accidentally re-extending via merge.
  const overlaps = (a: StoredRange, b: StoredRange) =>
    !(a.endDate.getTime() < b.startDate.getTime() || a.startDate.getTime() > b.endDate.getTime());

  let idx = current.findIndex((r) => r.startDate.getTime() <= nextRange.startDate.getTime() && r.endDate.getTime() >= nextRange.startDate.getTime());
  if (idx === -1) {
    idx = current.findIndex((r) => overlaps(r, nextRange));
  }

  const withoutOne = idx >= 0 ? current.filter((_, i) => i !== idx) : [...current];
  const updatedRanges = sortRanges([...withoutOne, nextRange]);

  const updated = await IqamaahTimesModel.findOneAndUpdate(
    {},
    { $set: { [prayer]: updatedRanges } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<any>();

  return toApiDoc(updated);
};

export const deleteIqamaahRange = async (params: {
  prayer: IqamaahPrayerKey;
  startDate: string;
  endDate: string;
  time?: string;
}): Promise<IqamaahTimesDoc> => {
  const prayer = params.prayer;
  const delStart = parseFlexibleDateToUTC(params.startDate);
  const delEnd = parseFlexibleDateToUTC(params.endDate);

  const record = await IqamaahTimesModel.findOne({}).lean<any>();
  if (!record) throw new Error("No Iqamaah times found to delete from");

  const normalized = normalizeStoredDoc(record);
  const today = utcTodayStart();
  const current = fetchStoredPrayerRanges(normalized, prayer).filter((r) => r.endDate.getTime() >= today.getTime());
  const updatedRanges = deleteRangeFromExisting(current, delStart, delEnd, params.time);

  const updated = await IqamaahTimesModel.findOneAndUpdate(
    {},
    { $set: { [prayer]: updatedRanges } },
    { new: true }
  ).lean<any>();

  return toApiDoc(updated);
};

export const getIqamaahTimes = async (): Promise<IqamaahTimesDoc> => {
  try {
    const record = await IqamaahTimesModel.findOne({}).sort({ updatedAt: -1 }).lean<any>();

    if (!record) {
      throw new Error("No Iqamaah times found in the database");
    }

    const normalized = normalizeStoredDoc(record);
    const out: any = { ...normalized };
    for (const p of PRAYERS) {
      out[p] = toApiRanges(out[p]);
    }
    return out as IqamaahTimesDoc;
  } catch (err: any) {
    console.error("Error retrieving Iqamaah times from DB:", err);
    throw new Error(err.message || "Failed to retrieve Iqamaah times");
  }
};

const maxDate = (a: Date, b: Date) => (a.getTime() >= b.getTime() ? a : b);
const minDate = (a: Date, b: Date) => (a.getTime() <= b.getTime() ? a : b);

const clipRangesToWindow = (ranges: StoredRange[], windowStart: Date, windowEnd: Date): StoredRange[] => {
  const out: StoredRange[] = [];

  for (const r of ranges) {
    const noOverlap = r.endDate.getTime() < windowStart.getTime() || r.startDate.getTime() > windowEnd.getTime();
    if (noOverlap) continue;

    out.push({
      startDate: maxDate(r.startDate, windowStart),
      endDate: minDate(r.endDate, windowEnd),
      time: r.time,
    });
  }

  return out;
};

export const getIqamaahTimesForMonth = async (year: number, month: number): Promise<IqamaahTimesDoc> => {
  if (!Number.isInteger(year) || year < 1900 || year > 3000) {
    throw new Error("year must be a valid number (e.g., 2026)");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("month must be between 1 and 12");
  }

  const record = await IqamaahTimesModel.findOne({}).sort({ updatedAt: -1 }).lean<any>();
  const existing = normalizeStoredDoc(record ?? {});

  const windowStart = new Date(Date.UTC(year, month - 1, 1));
  const windowEnd = new Date(Date.UTC(year, month, 0)); // last day of month

  const toStored = (arr: any[]): StoredRange[] =>
    (arr ?? []).map((r: any) => ({ startDate: new Date(r.startDate), endDate: new Date(r.endDate), time: String(r.time) }));

  const out: any = { ...existing };
  for (const p of PRAYERS) {
    const clipped = clipRangesToWindow(toStored(existing[p] ?? []), windowStart, windowEnd);
    out[p] = toApiRanges(p === "jumuah" ? sortRanges(clipped) : mergeAdjacentSameTime(clipped));
  }

  return out as IqamaahTimesDoc;
};

const utcTodayStart = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const purgeExpiredRangesFromDoc = (doc: any): { updatedDoc: any; changed: boolean } => {
  const today = utcTodayStart();
  let changed = false;
  const out: any = { ...doc };

  for (const p of PRAYERS) {
    const ranges: StoredRange[] = (doc?.[p] ?? []).map((r: any) => ({
      startDate: new Date(r.startDate),
      endDate: new Date(r.endDate),
      time: String(r.time),
    }));

    const kept = ranges.filter((r) => r.endDate.getTime() >= today.getTime());
    if (kept.length !== ranges.length) changed = true;
    out[p] = kept;
  }

  return { updatedDoc: out, changed };
};

export const getIqamaahMonthSchedule = async (
  year: number,
  month: number
): Promise<{ data: IqamaahDayRow[] }> => {
  if (!Number.isInteger(year) || year < 1900 || year > 3000) {
    throw new Error("year must be a valid number (e.g., 2026)");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("month must be between 1 and 12");
  }

  const record = await IqamaahTimesModel.findOne({}).sort({ updatedAt: -1 }).lean<any>();
  const normalized = normalizeStoredDoc(record ?? {});
  // IMPORTANT: do not mutate DB on fetch. Apply expired-range purge only in-memory for display.
  const effectiveDoc = record ? purgeExpiredRangesFromDoc(normalized).updatedDoc : normalized;

  const windowStart = new Date(Date.UTC(year, month - 1, 1));
  const windowEnd = new Date(Date.UTC(year, month, 0));

  const toStored = (arr: any[]): StoredRange[] =>
    (arr ?? []).map((r: any) => ({ startDate: new Date(r.startDate), endDate: new Date(r.endDate), time: String(r.time) }));

  const stored: Record<IqamaahPrayerKey, StoredRange[]> = {
    fajr: clipRangesToWindow(toStored(effectiveDoc.fajr), windowStart, windowEnd),
    dhuhr: clipRangesToWindow(toStored(effectiveDoc.dhuhr), windowStart, windowEnd),
    asr: clipRangesToWindow(toStored(effectiveDoc.asr), windowStart, windowEnd),
    isha: clipRangesToWindow(toStored(effectiveDoc.isha), windowStart, windowEnd),
    jumuah: clipRangesToWindow(toStored(effectiveDoc.jumuah), windowStart, windowEnd),
  };

  const rows: IqamaahDayRow[] = [];
  for (let d = windowStart; d.getTime() <= windowEnd.getTime(); d = addUTCDays(d, 1)) {
    const fajrNow = resolvePrayerTimeForDate(stored.fajr, d);
    const dhuhrNow = resolvePrayerTimeForDate(stored.dhuhr, d);
    const asrNow = resolvePrayerTimeForDate(stored.asr, d);
    const ishaNow = resolvePrayerTimeForDate(stored.isha, d);

    rows.push({
      date: formatUTCDateToISO(d),
      fajr: fajrNow ?? "--:--",
      dhuhr: dhuhrNow ?? "--:--",
      asr: asrNow ?? "--:--",
      isha: ishaNow ?? "--:--",
      jumuah: resolveJumuahTimesForDate(stored.jumuah, d, "--:--"),
    });
  }

  return { data: rows };
};

export const deleteIqamaahTimes = async (): Promise<void> => {
  try {
    const doc = await IqamaahTimesModel.findOneAndDelete({}).lean<IqamaahTimesDoc>();
    if (!doc) {
      throw new Error("No Iqamaah times found to delete");
    }
  } catch (err: any) {
    console.error("Error deleting Iqamaah times:", err);
    throw new Error(err.message || "Failed to delete Iqamaah times");
  }
};
