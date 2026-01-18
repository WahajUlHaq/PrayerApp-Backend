import { Request, Response } from "express";
import { convertQueryToRealTypes, getYearMonthFromTimeZone } from "#utils/helpers";
import * as masjidConfigService from "#services/masjid-config";
import { validateMasjidConfigRequest } from "#validators/masjid-config";
import { MasjidConfigParams, UpsertMasjidConfigBody } from "#interfaces/masjid-config";
import { refreshNamazTimingsForConfig } from "#cron/namaz-timings-refresh";

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

    res.json({ data: saved, namazRefresh });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getMasjidConfig = async (_req: Request, res: Response) => {
  try {
    const record = await masjidConfigService.getMasjidConfig();

    res.json({ data: record });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
