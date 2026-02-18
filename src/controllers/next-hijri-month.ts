import { Request, Response } from "express";
import { getMasjidConfig } from "#services/masjid-config";
import { getNamazTimings } from "#services/namaz-timings";

// Helper to find the next Hijri month and its first Gregorian date
function getNextHijriMonthText(namazData: any[]): string {
  if (!namazData || namazData.length === 0) return "No namaz data available.";

  let prevMonth = null;
  for (let i = 0; i < namazData.length; i++) {
    const hijri = namazData[i]?.date?.hijri;
    if (!hijri) continue;
    if (prevMonth && hijri.month.number !== prevMonth) {
      // Found the first day of the next Hijri month
      return `Next Hijri month is ${hijri.month.en} on ${namazData[i].date.readable}`;
    }
    prevMonth = hijri.month.number;
  }
  return "Could not determine next Hijri month.";
}

export const getNextHijriMonthInfo = async (_req: Request, res: Response) => {
  try {
    const masjidConfig = await getMasjidConfig();
    const namazTimings = await getNamazTimings();
    const text = getNextHijriMonthText(namazTimings.data);
    res.json({
      masjidConfig,
      nextHijriMonthText: text,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
