export interface NamazTimingsParams {
    year: number;
    month: number;
    address: string;
    method?: number;
    shafaq?: string;
    school?: number;
    midnightMode?: number;
    calendarMethod?: string;
    latitudeAdjustmentMethod?: number;
    tune?: string;
    adjustment?: string;
}

// src/interfaces/namaz-timings.ts

export interface NamazTimingsResponse {
  data: Array<{
    timings: Record<string, string>;
    date: {
      readable: string;
      timestamp: string;
      gregorian: {
        date: string;
        format: string;
        day: string;
        weekday: { en: string };
        month: { number: number; en: string };
        year: string;
      };
      hijri: {
        date: string;
        format: string;
        day: string;
        weekday: { en: string; ar: string };
        month: { number: number; en: string; ar: string; days: number };
        year: string;
        designation: { abbreviated: string; expanded: string };
        holidays: string[];
        adjustedHolidays: string[];
        method: string;
      };
    };
    meta: {
      latitude: number;
      longitude: number;
    };
  }>;
}

export interface NamazTimingsFetchResponse {
  data: Array<{
    timings: Record<string, string>;
    date: {
      readable: string;
      timestamp: string;
      gregorian: {
        date: string;
        format: string;
        day: string;
        weekday: { en: string };
        month: { number: number; en: string };
        year: string;
      };
      hijri: {
        date: string;
        format: string;
        day: string;
        weekday: { en: string; ar: string };
        month: { number: number; en: string; ar: string; days: number };
        year: string;
        designation: { abbreviated: string; expanded: string };
        holidays: string[];
        adjustedHolidays: string[];
        method: string;
      };
    };
    meta: {
      latitude: number;
      longitude: number;
    };
  }>;
}

