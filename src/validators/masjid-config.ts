import { MasjidConfigParams } from "#interfaces/masjid-config";
import { validateNamazTimingsRequest } from "#validators/namaz-timings";

export const validateMasjidConfigRequest = (data: MasjidConfigParams): boolean => {
	if (!data.qrLink || String(data.qrLink).trim() === "") {
		throw new Error("qrLink is required");
	}

	validateNamazTimingsRequest(data);
	return true;
};
