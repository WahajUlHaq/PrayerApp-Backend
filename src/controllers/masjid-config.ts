import { Request, Response } from "express";
import { convertQueryToRealTypes, getYearMonthFromTimeZone } from "#utils/helpers";
import * as masjidConfigService from "#services/masjid-config";
import { validateMasjidConfigRequest } from "#validators/masjid-config";
import { MasjidConfigParams, UpsertMasjidConfigBody } from "#interfaces/masjid-config";
import { refreshNamazTimingsForConfig } from "#cron/namaz-timings-refresh";
import { getNamazTimings } from "#services/namaz-timings";
import { parseFlexibleDateToUTC } from "#utils/date";

function findNextHijriMonthText(timingsData: any[]): string | undefined {
  if (!timingsData || timingsData.length === 0) return undefined;
  const today = new Date();
  let todayIdx = timingsData.findIndex(d => {
    try {
      return parseFlexibleDateToUTC(d.date.gregorian.date).toDateString() === today.toDateString();
    } catch { return false; }
  });
  if (todayIdx === -1) todayIdx = 0;
  const currentHijriMonth = timingsData[todayIdx]?.date?.hijri?.month?.number;
  let foundMonth = currentHijriMonth;
  // Loop forward to find the first day of a different (future) hijri month
  for (let i = todayIdx + 1; i < timingsData.length; i++) {
    const hijri = timingsData[i]?.date?.hijri;
    if (hijri && hijri.month.number !== foundMonth && hijri.day === "1") {
      return `Next Hijri month is ${hijri.month.en} on ${timingsData[i].date.readable}`;
    }
  }
  return undefined;
}

export const upsertMasjidConfig = async (req: Request, res: Response) => {
  try {
    const body = convertQueryToRealTypes(req.body) as UpsertMasjidConfigBody;
    const { year, month } = getYearMonthFromTimeZone(body.timeZone);

    const payload: MasjidConfigParams = {
      ...body,
      year,
      month,
    };

    validateMasjidConfigRequest(payload);

    const saved = await masjidConfigService.upsertMasjidConfig(payload);

    // Ensure namaz timings reflect the latest config immediately.
    let namazRefresh: { ok: boolean; error?: string } = { ok: true };
    try {
      await refreshNamazTimingsForConfig(saved as any);
    } catch (e: any) {
      namazRefresh = { ok: false, error: e?.message || String(e) };
      console.error("[masjid-config] Namaz refetch failed:", namazRefresh.error);
    }

    // Next Hijri month logic (same as get)
    let nextHijriMonthText = undefined;
    try {
      const timings = await getNamazTimings();
      nextHijriMonthText = findNextHijriMonthText(timings.data);
    } catch {}
    res.json({ data: saved, namazRefresh });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getMasjidConfig = async (_req: Request, res: Response) => {
  try {
    const record = await masjidConfigService.getMasjidConfig();
    let nextHijriMonthText = undefined;
    try {
      const timings = await getNamazTimings();
      nextHijriMonthText = findNextHijriMonthText(timings.data);
    } catch {}
    res.json({ data: record });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
