import { Request, Response } from "express";
import { convertQueryToRealTypes } from "#utils/helpers";
import {
  createIqamaahRange,
  deleteIqamaahRange,
  getIqamaahMonthSchedule,
  updateIqamaahRange,
  upsertIqamaahTimes,
} from "#services/iqamaah-times";
import {
  validateDeleteIqamaahRangeBody,
  validateIqamaahTimesPayload,
  validateUpdateIqamaahRangeBody,
  validateUpsertIqamaahRangeBody,
} from "#validators/iqamaah-times";
import {
  DeleteIqamaahRangeBody,
  IqamaahPrayerKey,
  IqamaahTimesPayload,
  UpdateIqamaahRangeBody,
  UpsertIqamaahRangeBody,
} from "#interfaces/iqamaah-times";

const normalizePrayerKey = (raw: any): IqamaahPrayerKey => {
  const value = String(raw ?? "").trim();
  const lower = value.toLowerCase();

  if (lower === "fajar") return "fajr";
  if (lower === "zuhr") return "dhuhr";
  if (lower === "jummah" || lower === "jumu'ah") return "jumuah";

  return lower as IqamaahPrayerKey;
};

const normalizeIqamaahPayload = (raw: any): IqamaahTimesPayload => {
  const body: any = { ...raw };

  // Backward-compatible aliases
  if (body.fajar !== undefined && body.fajr === undefined) body.fajr = body.fajar;
  if (body.zuhr !== undefined && body.dhuhr === undefined) body.dhuhr = body.zuhr;
  if (body.jummah !== undefined && body.jumuah === undefined) body.jumuah = body.jummah;
  if (body["jumu'ah"] !== undefined && body.jumuah === undefined) body.jumuah = body["jumu'ah"];

  return body as IqamaahTimesPayload;
};

export const createIqamaahTimes = async (req: Request, res: Response) => {
  try {
    const body = normalizeIqamaahPayload(convertQueryToRealTypes(req.body));

    validateIqamaahTimesPayload(body);

    const saved = await upsertIqamaahTimes(body);
    res.json({ data: saved });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getIqamaahTimesForMonth = async (req: Request, res: Response) => {
  try {
    const raw = convertQueryToRealTypes(req.query as any) as any;
    const year = Number(raw.year);
    const month = Number(raw.month);

    const result = await getIqamaahMonthSchedule(year, month);
    res.json({ year, month, ...result });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const createIqamaahTimesRange = async (req: Request, res: Response) => {
  try {
    const raw = convertQueryToRealTypes(req.body) as any;
    const body: UpsertIqamaahRangeBody = {
      prayer: normalizePrayerKey(raw.prayer),
      startDate: raw.startDate,
      endDate: raw.endDate,
      time: raw.time,
    };

    validateUpsertIqamaahRangeBody(body);
    const updated = await createIqamaahRange(body);
    res.json({ data: updated });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateIqamaahTimesRange = async (req: Request, res: Response) => {
  try {
    const raw = convertQueryToRealTypes(req.body) as any;
    const body: UpdateIqamaahRangeBody = {
      prayer: normalizePrayerKey(raw.prayer),
      startDate: raw.startDate,
      endDate: raw.endDate,
      time: raw.time,
      oldTime: raw.oldTime,
      oldStartDate: raw.oldStartDate,
      oldEndDate: raw.oldEndDate,
    };

    validateUpdateIqamaahRangeBody(body);
    const updated = await updateIqamaahRange(body);
    res.json({ data: updated });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteIqamaahTimesRange = async (req: Request, res: Response) => {
  try {
    const raw = convertQueryToRealTypes(req.body) as any;
    const body: DeleteIqamaahRangeBody = {
      prayer: normalizePrayerKey(raw.prayer),
      startDate: raw.startDate,
      endDate: raw.endDate,
      time: raw.time,
    };

    validateDeleteIqamaahRangeBody(body);
    const updated = await deleteIqamaahRange(body);
    res.json({ data: updated });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
