import { NamazTimingsParams } from "#interfaces/namaz-timings";

export const validateNamazTimingsRequest = (data: NamazTimingsParams): boolean => {
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
  } = data;

  // Mandatory
  if (!year || year < 1900 || year > 2100) throw new Error("Invalid year");
  if (!month || month < 1 || month > 12) throw new Error("Invalid month");
  if (!address || address.trim() === "") throw new Error("Address is required");

  // Optional validations
  if (method !== undefined && ![...Array(24).keys(), 99].includes(method))
    throw new Error("Invalid method");

  if (shafaq !== undefined && !["general", "ahmer", "abyad"].includes(shafaq))
    throw new Error("Invalid shafaq");

  if (school !== undefined && ![0, 1].includes(school))
    throw new Error("Invalid school");

  if (midnightMode !== undefined && ![0, 1].includes(midnightMode))
    throw new Error("Invalid midnightMode");

  if (
    calendarMethod !== undefined &&
    !["HJCoSA", "UAQ", "DIYANET", "MATHEMATICAL"].includes(calendarMethod)
  )
    throw new Error("Invalid calendarMethod");

  if (
    latitudeAdjustmentMethod !== undefined &&
    ![1, 2, 3].includes(latitudeAdjustmentMethod)
  )
    throw new Error("Invalid latitudeAdjustmentMethod");

  if (tune !== undefined) {
    const arr = tune.split(",").map(Number);
    if (arr.length !== 9 || arr.some((n: number) => isNaN(n)))
      throw new Error("Invalid tune, must be 9 comma-separated integers");
  }

  if (adjustment !== undefined) {
    if (calendarMethod !== "MATHEMATICAL") {
      throw new Error(
        "Adjustment can only be provided if calendarMethod is 'MATHEMATICAL'"
      );
    }

    const adjNumber = Number(adjustment);

    if (!Number.isInteger(adjNumber))
      throw new Error("Adjustment must be an integer");
  }

  return true;
};
