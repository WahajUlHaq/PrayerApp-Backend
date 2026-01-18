export const convertQueryToRealTypes = (queries: Record<string, any>): Record<string, any> => {
  const converted: Record<string, any> = {};

  for (const key in queries) {
    let value = queries[key];

    if (value === null || value === undefined) continue;

    // If already number/boolean, leave it
    if (typeof value === "number" || typeof value === "boolean") {
      converted[key] = value;
      continue;
    }

    // If string
    if (typeof value === "string") {
      const lower = value.toLowerCase().trim();

      // Boolean
      if (lower === "true") {
        converted[key] = true;
      } else if (lower === "false") {
        converted[key] = false;
      }
      // Number
      else if (!isNaN(Number(value)) && value.trim() !== "") {
        converted[key] = Number(value);
      }
      // Comma-separated array
    //   else if (value.includes(",")) {
    //     const arr = value.split(",").map((v) => {
    //       const n = Number(v.trim());
    //       return isNaN(n) ? v.trim() : n; // convert numbers if possible
    //     });
    //     converted[key] = arr;
    //   }
      // Just a string
      else {
        converted[key] = value;
      }
    }
    // If array already, process each element
    else if (Array.isArray(value)) {
      converted[key] = value.map((v) => {
        if (typeof v === "string") {
          const n = Number(v.trim());
          if (!isNaN(n)) return n;
          const lower = v.toLowerCase().trim();
          if (lower === "true") return true;
          if (lower === "false") return false;
          return v.trim();
        }
        return v;
      });
    }
    // Any other type, leave as is
    else {
      converted[key] = value;
    }
  }

  return converted;
};

export const getYearMonthFromTimeZone = (timeZone: string): { year: number; month: number } => {
  try {
     if (!timeZone || String(timeZone).trim() === "") {
      throw new Error("timeZone is required");
    }

    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
    });

    const parts = dtf.formatToParts(new Date());
    const year = Number(parts.find((p) => p.type === "year")?.value);
    const month = Number(parts.find((p) => p.type === "month")?.value);

    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      throw new Error("Could not compute year/month");
    }

    return { year, month };
  } catch (_err) {
    throw new Error("Invalid timeZone. Use an IANA timezone like 'Asia/Karachi'.");
  }
};
