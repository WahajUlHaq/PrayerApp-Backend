import fs from "fs";
import path from "path";
import { PageModel } from "#models/page";
import { Page, CreatePageBody, UpdatePageBody, Schedule, Slide } from "#interfaces/page";

const uploadsRoot = path.join(process.cwd(), "uploads", "pages");

// Calculate total page duration based on slides
export const calculatePageDuration = (page: Page): number => {
  if (page.pageType === "slider" || page.pageType === "text-slider") {
    if (!page.slides || page.slides.length === 0) return 5; // Default 5 seconds
    
    // Sum duration of all active slides
    return page.slides
      .filter((slide) => slide.isActive)
      .reduce((total, slide) => total + (slide.duration || 5), 0);
  }
  return 5; // Default for non-slider types
};

// Check if a page should be displayed at a given time
export const isPageActiveAtTime = (page: Page, checkTime: Date): boolean => {
  if (!page.isActive) return false;
  if (!page.schedules || page.schedules.length === 0) return true; // No schedule = always active

  const checkDay = checkTime.getDay(); // 0=Sunday, 6=Saturday
  const checkTimeString = `${String(checkTime.getHours()).padStart(2, "0")}:${String(checkTime.getMinutes()).padStart(2, "0")}`;

  for (const schedule of page.schedules) {
    if (schedule.type === "recurring") {
      // Check if day matches
      if (schedule.dayOfWeek !== checkDay) continue;

      // Check time range
      if (schedule.startTime && schedule.endTime) {
        if (checkTimeString >= schedule.startTime && checkTimeString <= schedule.endTime) {
          return true;
        }
      }
    } else if (schedule.type === "daterange") {
      // Check if current time is within date range
      if (schedule.startDate && schedule.endDate) {
        const start = new Date(schedule.startDate);
        const end = new Date(schedule.endDate);
        if (checkTime >= start && checkTime <= end) {
          return true;
        }
      }
    }
  }

  return false;
};

// Check if a page has any future schedules
export const hasAnyFutureSchedule = (page: Page, now: Date): boolean => {
  if (!page.schedules || page.schedules.length === 0) return true; // No schedule = always valid

  for (const schedule of page.schedules) {
    if (schedule.type === "recurring") {
      // Recurring schedules always have future occurrences
      return true;
    } else if (schedule.type === "daterange") {
      if (schedule.endDate) {
        const end = new Date(schedule.endDate);
        if (end > now) {
          return true; // Future schedule exists
        }
      }
    }
  }

  return false;
};

// Create a new page
export const createPage = async (
  data: CreatePageBody,
  imagePath?: string,
  slidePaths?: string[],
  slideMetadata?: Array<{ duration?: number; isActive?: boolean }>
): Promise<Page> => {
  try {
    const maxOrderDoc = await PageModel.findOne({}).sort({ order: -1 }).lean<any>();
    const order = data.order !== undefined ? data.order : (maxOrderDoc ? maxOrderDoc.order + 1 : 0);

    // Prepare slides array if slider type
    let slides: Slide[] | undefined;
    if (data.pageType === "slider" || data.pageType === "text-slider") {
      slides = (slidePaths || []).map((path, index) => ({
        image: path,
        duration: slideMetadata?.[index]?.duration || 5,
        isActive: slideMetadata?.[index]?.isActive !== false,
      }));
    }

    const doc = await PageModel.create({
      ...data,
      image: imagePath,
      slides,
      order,
      pageDuration: data.pageDuration,
    });

    return doc.toObject() as unknown as Page;
  } catch (err: any) {
    console.error("Error creating page:", err);
    throw new Error(err.message || "Failed to create page");
  }
};

// Get all pages (sorted by order)
export const getAllPages = async (): Promise<Page[]> => {
  try {
    const docs = await PageModel.find({}).sort({ order: 1, createdAt: -1 }).lean<Page[]>();
    return docs;
  } catch (err: any) {
    console.error("Error getting pages:", err);
    throw new Error(err.message || "Failed to get pages");
  }
};

// Get currently active pages
export const getActivePages = async (): Promise<Page[]> => {
  try {
    const allPages = await getAllPages();
    const now = new Date();
    
    return allPages.filter((page) => isPageActiveAtTime(page, now));
  } catch (err: any) {
    console.error("Error getting active pages:", err);
    throw new Error(err.message || "Failed to get active pages");
  }
};

// Get a single page by ID
export const getPageById = async (id: string): Promise<Page | null> => {
  try {
    const doc = await PageModel.findById(id).lean<Page>();
    return doc;
  } catch (err: any) {
    console.error("Error getting page:", err);
    throw new Error(err.message || "Failed to get page");
  }
};

// Update a page
export const updatePage = async (
  id: string,
  data: UpdatePageBody,
  newImagePath?: string,
  newSlidePaths?: string[],
  existingSlidesMetadata?: Array<{ image: string; duration?: number; isActive?: boolean }>,
  newSlidesMetadata?: Array<{ duration?: number; isActive?: boolean }>,
  removeSlideImages?: string[]
): Promise<Page | null> => {
  try {
    const existingPage = await PageModel.findById(id).lean<Page>();
    if (!existingPage) return null;

    // Handle single image deletion if new image uploaded
    if (newImagePath && existingPage.image) {
      if (fs.existsSync(existingPage.image)) {
        fs.unlinkSync(existingPage.image);
      }
    }

    // Handle slide removals
    if (removeSlideImages && removeSlideImages.length > 0) {
      removeSlideImages.forEach((imagePath) => {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    const updateData: any = { ...data };
    
    // Update single image
    if (newImagePath) {
      updateData.image = newImagePath;
    }

    // Handle slides update
    if (newSlidePaths && newSlidePaths.length > 0) {
      const newSlides: Slide[] = newSlidePaths.map((path, index) => ({
        image: path,
        duration: newSlidesMetadata?.[index]?.duration || 5,
        isActive: newSlidesMetadata?.[index]?.isActive !== false,
      }));

      // Start with existing slides (if any)
      let baseSlides = existingPage.slides || [];

      // Remove slides if specified
      if (removeSlideImages && removeSlideImages.length > 0) {
        baseSlides = baseSlides.filter(
          (slide) => !removeSlideImages.includes(slide.image)
        );
      }

      // Update metadata for existing slides if provided
      if (existingSlidesMetadata && existingSlidesMetadata.length > 0) {
        baseSlides = baseSlides.map((slide) => {
          const metadata = existingSlidesMetadata.find((m: any) => m.image === slide.image);
          if (metadata) {
            return {
              ...slide,
              duration: metadata.duration !== undefined ? metadata.duration : slide.duration,
              isActive: metadata.isActive !== undefined ? metadata.isActive : slide.isActive,
            };
          }
          return slide;
        });
      }

      // Merge existing slides with new slides
      updateData.slides = [...baseSlides, ...newSlides];
    } else if (existingSlidesMetadata && existingSlidesMetadata.length > 0 && existingPage.slides) {
      // Only update existing slide metadata (duration, isActive) without adding new slides
      updateData.slides = existingPage.slides.map((slide) => {
        const metadata = existingSlidesMetadata.find((m: any) => m.image === slide.image);
        if (metadata) {
          return {
            ...slide,
            duration: metadata.duration !== undefined ? metadata.duration : slide.duration,
            isActive: metadata.isActive !== undefined ? metadata.isActive : slide.isActive,
          };
        }
        return slide;
      });
    } else if (removeSlideImages && removeSlideImages.length > 0 && existingPage.slides) {
      // Only remove slides without adding new ones
      updateData.slides = existingPage.slides.filter(
        (slide) => !removeSlideImages.includes(slide.image)
      );
    }

    const doc = await PageModel.findByIdAndUpdate(id, updateData, { new: true }).lean<Page>();
    return doc;
  } catch (err: any) {
    console.error("Error updating page:", err);
    throw new Error(err.message || "Failed to update page");
  }
};

// Delete a page
export const deletePage = async (id: string): Promise<boolean> => {
  try {
    const doc = await PageModel.findByIdAndDelete(id).lean<Page>();
    if (!doc) return false;

    // Delete single image
    if (doc.image && fs.existsSync(doc.image)) {
      fs.unlinkSync(doc.image);
    }

    // Delete all slide images
    if (doc.slides && doc.slides.length > 0) {
      doc.slides.forEach((slide) => {
        if (slide.image && fs.existsSync(slide.image)) {
          fs.unlinkSync(slide.image);
        }
      });
    }

    return true;
  } catch (err: any) {
    console.error("Error deleting page:", err);
    throw new Error(err.message || "Failed to delete page");
  }
};

// Update page order
export const updatePageOrder = async (pageIds: string[]): Promise<Page[]> => {
  try {
    const updates = pageIds.map((id, index) => {
      return PageModel.updateOne({ _id: id }, { $set: { order: index } });
    });

    await Promise.all(updates);
    const docs = await PageModel.find({}).sort({ order: 1 }).lean<Page[]>();
    return docs;
  } catch (err: any) {
    console.error("Error updating page order:", err);
    throw new Error(err.message || "Failed to update page order");
  }
};

// Cleanup expired pages (mark as inactive instead of deleting)
export const cleanupExpiredPages = async (): Promise<void> => {
  try {
    const now = new Date();
    const allPages = await getAllPages();

    for (const page of allPages) {
      // Check if page is currently active or has future schedules
      const isActive = isPageActiveAtTime(page, now);
      const hasFuture = hasAnyFutureSchedule(page, now);

      // If not active and no future schedules, mark page as inactive
      if (!isActive && !hasFuture && page.isActive) {
        console.log(`[cleanup] Marking expired page as inactive: ${page.title}`);
        
        // Update page to inactive status (keep images for user to delete manually)
        await PageModel.findByIdAndUpdate(page._id, {
          $set: { isActive: false },
        });
      }
    }
  } catch (err: any) {
    console.error("Error cleaning up expired pages:", err);
  }
};
