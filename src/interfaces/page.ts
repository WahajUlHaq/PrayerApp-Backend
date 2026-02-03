export interface Schedule {
  type: "recurring" | "daterange";
  // For recurring schedules (every specific day of week)
  dayOfWeek?: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime?: string; // "HH:mm" format (e.g., "10:00")
  endTime?: string; // "HH:mm" format (e.g., "11:00")
  // For date range schedules
  startDate?: Date;
  endDate?: Date;
}

export interface Slide {
  image: string; // File path
  duration: number; // Duration in seconds
  isActive: boolean;
}

export type PageType = "text" | "image" | "slider" | "text-slider" | "image-text";

export interface Page {
  _id?: string;
  title: string;
  pageType: PageType;
  content?: string;
  image?: string; // For single image types
  slides?: Slide[]; // For slider types
  pageDuration?: number; // Optional manual page duration override (in seconds)
  order: number;
  schedules: Schedule[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePageBody {
  title: string;
  pageType: PageType;
  content?: string;
  pageDuration?: number; // Optional manual page duration override (in seconds)
  order?: number;
  schedules?: Schedule[];
  isActive?: boolean;
  slidesMetadata?: string; // JSON string of slide metadata: [{ duration: 5, isActive: true }, ...]
}

export interface UpdatePageBody {
  title?: string;
  pageType?: PageType;
  content?: string;
  pageDuration?: number; // Optional manual page duration override (in seconds)
  order?: number;
  schedules?: Schedule[];
  isActive?: boolean;
  existingSlides?: string; // JSON string of existing slide metadata to update: [{ image: "path", duration: 5, isActive: true }, ...]
  removeSlides?: string; // JSON array of slide image paths to remove
}
