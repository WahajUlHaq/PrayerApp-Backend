export const parseFlexibleDateToUTC = (value: string): Date => {
  if (!value || String(value).trim() === "") throw new Error("Date is required");
  const s = String(value).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  // M/D/YYYY or MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [mm, dd, yyyy] = s.split("/").map(Number);
    return new Date(Date.UTC(yyyy, mm - 1, dd));
  }

  throw new Error("Invalid date format. Use YYYY-MM-DD or M/D/YYYY");
};

export const formatUTCDateToISO = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const addUTCDays = (date: Date, days: number): Date => {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

export const compareUTCDate = (a: Date, b: Date): number => a.getTime() - b.getTime();

export const maxUTCDate = (a: Date, b: Date): Date => (a.getTime() >= b.getTime() ? a : b);
export const minUTCDate = (a: Date, b: Date): Date => (a.getTime() <= b.getTime() ? a : b);
