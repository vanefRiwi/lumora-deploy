import { sectionServices } from "./section.services.js";

// GET /api/courses/:courseId/sections
export const getSections = async (req, res, next) => {
  try {
    const sections = await sectionServices.getSectionsForCourse(req.params.courseId);
    return res.status(200).json(sections);
  } catch (error) {
    next(error);
  }
};

// POST /api/courses/:courseId/sections
export const createSection = async (req, res, next) => {
  try {
    const section = await sectionServices.createSection(req.params.courseId, req.user.id, req.body);
    return res.status(201).json({ ok: true, section });
  } catch (error) {
    next(error);
  }
};

// GET /api/sections/:sectionId/items
export const getSectionItems = async (req, res, next) => {
  try {
    const items = await sectionServices.getSectionItemsAggregate(req.params.sectionId, req.user);
    return res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};
