import cron from "node-cron";

import { MasjidConfigModel } from "#models/masjid-config";
import { fetchNamazTimings } from "#services/namaz-timings";
import { getYearMonthFromTimeZone } from "#utils/helpers";

type MasjidConfigLike = {
	address: string;
	timeZone: string;
	method?: number;
	shafaq?: string;
	school?: number;
	midnightMode?: number;
	calendarMethod?: string;
	latitudeAdjustmentMethod?: number;
	tune?: any;
	adjustment?: any;
};

export const refreshNamazTimingsForConfig = async (config: MasjidConfigLike): Promise<void> => {
	const timeZone: string = config.timeZone;
	const { year, month } = getYearMonthFromTimeZone(timeZone);

	await fetchNamazTimings({
		year,
		month,
		address: config.address,
		method: config.method,
		shafaq: config.shafaq,
		school: config.school,
		midnightMode: config.midnightMode,
		calendarMethod: config.calendarMethod,
		latitudeAdjustmentMethod: config.latitudeAdjustmentMethod,
		tune: config.tune,
		adjustment: config.adjustment,
	});

	await MasjidConfigModel.findOneAndUpdate(
		{},
		{ ...(config as any), year, month },
		{ upsert: true, new: true }
	);

	console.log(`[namaz] Refreshed namaz timings month ${month}-${year} (${timeZone})`);
};

export const refreshNamazTimingsFromMasjidConfig = async (): Promise<void> => {
	const config = await MasjidConfigModel.findOne({}).lean<any>();

	if (!config) {
		console.log("[cron] No masjid config found; skipping namaz refresh");
		return;
	}

	await refreshNamazTimingsForConfig(config);
};

export const startNamazTimingsDailyCron = (): void => {
	const expression = process.env.NAMAZ_REFRESH_CRON ?? "10 0 * * *"; // 00:10 daily (server time)

	cron.schedule(expression, async () => {
		try {
			await refreshNamazTimingsFromMasjidConfig();
		} catch (err: any) {
			console.error("[cron] Failed to refresh namaz timings:", err?.message || err);
		}
	});

	console.log(`[cron] Scheduled namaz timings refresh: ${expression}`);
};
