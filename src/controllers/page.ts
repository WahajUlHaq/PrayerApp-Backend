import { Request, Response } from "express";
import {
  createPage,
  getAllPages,
  getActivePages,
  getPageById,
  updatePage,
  deletePage,
  updatePageOrder,
  calculatePageDuration,
} from "#services/page";
import { CreatePageBody, UpdatePageBody } from "#interfaces/page";
import path from "path";

const SERVER_URL = process.env.SERVER_URL

// Helper to generate image URL from file path
const getImageUrl = (filePath: string) => {
  // Extract relative path from full path (everything after 'uploads')
  const relativePath = filePath.split('uploads').pop()?.replace(/\\/g, '/');
  return `${SERVER_URL}/uploads${relativePath}`;
};

// Create a new page
export const createPageController = async (req: Request, res: Response) => {
  try {
    const body: CreatePageBody = req.body;

    // Parse schedules if sent as string
    if (typeof body.schedules === "string") {
      body.schedules = JSON.parse(body.schedules);
    }

    // Parse slide metadata if sent as string
    let slideMetadata;
    if (req.body.slidesMetadata) {
      slideMetadata = JSON.parse(req.body.slidesMetadata);
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const singleImage = files?.image?.[0]?.path;
    const sliderImages = files?.slides?.map((f) => f.path);

    const page = await createPage(body, singleImage, sliderImages, slideMetadata);

    const response = {
      ...page,
      imageUrl: page.image ? getImageUrl(page.image) : null,
      slides: page.slides?.map((slide) => ({
        ...slide,
        imageUrl: getImageUrl(slide.image),
      })),
      totalDuration: calculatePageDuration(page),
    };

    res.status(201).json(response);
  } catch (err: any) {
    console.error("Error creating page:", err);
    res.status(500).json({ message: err.message || "Failed to create page" });
  }
};

// Get all pages
export const getAllPagesController = async (req: Request, res: Response) => {
  try {
    const pages = await getAllPages();
    
    const response = pages.map((page) => ({
      ...page,
      imageUrl: page.image ? getImageUrl(page.image) : null,
      slides: page.slides?.map((slide) => ({
        ...slide,
        imageUrl: getImageUrl(slide.image),
      })),
      totalDuration: calculatePageDuration(page),
    }));

    res.json(response);
  } catch (err: any) {
    console.error("Error getting pages:", err);
    res.status(500).json({ message: err.message || "Failed to get pages" });
  }
};

// Get currently active pages
export const getActivePagesController = async (req: Request, res: Response) => {
  try {
    const pages = await getActivePages();
    
    const response = pages.map((page) => ({
      ...page,
      imageUrl: page.image ? getImageUrl(page.image) : null,
      slides: page.slides?.map((slide) => ({
        ...slide,
        imageUrl: getImageUrl(slide.image),
      })),
      totalDuration: calculatePageDuration(page),
    }));

    res.json(response);
  } catch (err: any) {
    console.error("Error getting active pages:", err);
    res.status(500).json({ message: err.message || "Failed to get active pages" });
  }
};

// Get a single page
export const getPageController = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const page = await getPageById(id);

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    const response = {
      ...page,
      imageUrl: page.image ? getImageUrl(page.image) : null,
      slides: page.slides?.map((slide) => ({
        ...slide,
        imageUrl: getImageUrl(slide.image),
      })),
      totalDuration: calculatePageDuration(page),
    };

    res.json(response);
  } catch (err: any) {
    console.error("Error getting page:", err);
    res.status(500).json({ message: err.message || "Failed to get page" });
  }
};

// Update a page
export const updatePageController = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const body: UpdatePageBody = req.body;

    // Parse schedules if sent as string
    if (typeof body.schedules === "string") {
      body.schedules = JSON.parse(body.schedules);
    }

    // Parse existing slides metadata if sent as string (for updating existing slides)
    let existingSlidesMetadata;
    if (body.existingSlides) {
      existingSlidesMetadata = JSON.parse(body.existingSlides);
    }

    // Parse new slides metadata if sent as string (for new file uploads)
    let newSlidesMetadata;
    if (req.body.slidesMetadata) {
      newSlidesMetadata = JSON.parse(req.body.slidesMetadata);
    }

    // Parse removeSlides if sent as string
    let removeSlideImages;
    if (body.removeSlides) {
      removeSlideImages = JSON.parse(body.removeSlides);
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const singleImage = files?.image?.[0]?.path;
    const sliderImages = files?.slides?.map((f) => f.path);

    const page = await updatePage(id, body, singleImage, sliderImages, existingSlidesMetadata, newSlidesMetadata, removeSlideImages);

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    const response = {
      ...page,
      imageUrl: page.image ? getImageUrl(page.image) : null,
      slides: page.slides?.map((slide) => ({
        ...slide,
        imageUrl: getImageUrl(slide.image),
      })),
      totalDuration: calculatePageDuration(page),
    };

    res.json(response);
  } catch (err: any) {
    console.error("Error updating page:", err);
    res.status(500).json({ message: err.message || "Failed to update page" });
  }
};

// Delete a page
export const deletePageController = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const deleted = await deletePage(id);

    if (!deleted) {
      return res.status(404).json({ message: "Page not found" });
    }

    res.json({ message: "Page deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting page:", err);
    res.status(500).json({ message: err.message || "Failed to delete page" });
  }
};

// Get mobile-optimized pages (flattens sliders into individual pages)
export const getMobilePagesController = async (req: Request, res: Response) => {
  try {
    const pages = await getActivePages();
    const mobilePages: any[] = [];

    pages.forEach((page) => {
      // Handle slider types - convert each slide to individual page
      if (page.pageType === "slider" && page.slides && page.slides.length > 0) {
        page.slides.forEach((slide) => {
          if (slide.isActive) {
            mobilePages.push({
              _id: `${page._id}_${slide.image}`,
              title: page.title,
              pageType: "image",
              image: slide.image,
              imageUrl: getImageUrl(slide.image),
              pageDuration: slide.duration,
              order: page.order,
              schedules: page.schedules,
              isActive: page.isActive,
              createdAt: page.createdAt,
              updatedAt: page.updatedAt,
            });
          }
        });
      }
      // Handle text-slider - convert each slide to image-text page
      else if (page.pageType === "text-slider" && page.slides && page.slides.length > 0) {
        page.slides.forEach((slide) => {
          if (slide.isActive) {
            mobilePages.push({
              _id: `${page._id}_${slide.image}`,
              title: page.title,
              pageType: "image-text",
              content: page.content,
              image: slide.image,
              imageUrl: getImageUrl(slide.image),
              pageDuration: slide.duration,
              order: page.order,
              schedules: page.schedules,
              isActive: page.isActive,
              createdAt: page.createdAt,
              updatedAt: page.updatedAt,
            });
          }
        });
      }
      // Other page types remain as-is
      else {
        mobilePages.push({
          ...page,
          imageUrl: page.image ? getImageUrl(page.image) : null,
          pageDuration: page.pageDuration || calculatePageDuration(page),
        });
      }
    });

    res.json(mobilePages);
  } catch (err: any) {
    console.error("Error getting mobile pages:", err);
    res.status(500).json({ message: err.message || "Failed to get mobile pages" });
  }
};

// Update page order
export const updatePageOrderController = async (req: Request, res: Response) => {
  try {
    const { pageIds } = req.body;

    if (!Array.isArray(pageIds)) {
      return res.status(400).json({ message: "pageIds must be an array" });
    }

    const pages = await updatePageOrder(pageIds);

    const response = pages.map((page) => ({
      ...page,
      imageUrl: page.image ? getImageUrl(page.image) : null,
      slides: page.slides?.map((slide) => ({
        ...slide,
        imageUrl: getImageUrl(slide.image),
      })),
      totalDuration: calculatePageDuration(page),
    }));

    res.json({ message: "Order updated successfully", data: response });
  } catch (err: any) {
    console.error("Error updating page order:", err);
    res.status(500).json({ message: err.message || "Failed to update page order" });
  }
};
