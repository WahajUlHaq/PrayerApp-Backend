export interface MasjidConfigParams {
  year: number;
  month: number;
  address: string;
  timeZone: string;
  qrLink: string;
  tickerText?: string;
  maghribSunsetAdditionMinutes?: number;
  method?: number;
  shafaq?: string;
  school?: number;
  midnightMode?: number;
  calendarMethod?: string;
  latitudeAdjustmentMethod?: number;
  tune?: string;
  adjustment?: string;
  alwaysDisplayIqamaahTime?: boolean;
  displayTimerDuration?: number;
  announcements?: string;
  useMobileTTS?: boolean;
}

export type UpsertMasjidConfigBody = Omit<MasjidConfigParams, "year" | "month"> & {
  year?: number;
  month?: number;
};
