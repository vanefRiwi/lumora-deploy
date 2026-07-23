import { itemServices } from "./item.services.js";

// PUT /api/sections/:sectionId/welcome
export const upsertWelcome = async (req, res, next) => {
  try {
    const welcome = await itemServices.upsertWelcome(req.params.sectionId, req.user.id, req.body);
    return res.status(200).json({ ok: true, welcome });
  } catch (error) {
    next(error);
  }
};

// PUT /api/sections/:sectionId/review
export const upsertReview = async (req, res, next) => {
  try {
    const review = await itemServices.upsertReview(req.params.sectionId, req.user.id, req.body);
    return res.status(200).json({ ok: true, review });
  } catch (error) {
    next(error);
  }
};

// PUT /api/sections/:sectionId/quizz
export const upsertQuizz = async (req, res, next) => {
  try {
    const quizz = await itemServices.upsertQuizz(req.params.sectionId, req.user.id, req.body);
    return res.status(200).json({ ok: true, quizz });
  } catch (error) {
    next(error);
  }
};

// GET /api/courses/:courseId/final-assessment
export const getFinalAssessment = async (req, res, next) => {
  try {
    const final = await itemServices.getFinalAssessment(req.params.courseId, req.user);
    return res.status(200).json(final);
  } catch (error) {
    next(error);
  }
};

// PUT /api/courses/:courseId/final-assessment
export const upsertFinalAssessment = async (req, res, next) => {
  try {
    const final = await itemServices.upsertFinalAssessment(req.params.courseId, req.user.id, req.body);
    return res.status(200).json({ ok: true, final });
  } catch (error) {
    next(error);
  }
};

// GET /api/sections/:sectionId/contents
export const getContents = async (req, res, next) => {
  try {
    const contents = await itemServices.getContents(req.params.sectionId);
    return res.status(200).json(contents);
  } catch (error) {
    next(error);
  }
};

// POST /api/sections/:sectionId/contents
export const createContent = async (req, res, next) => {
  try {
    const content = await itemServices.createContent(req.params.sectionId, req.user.id, req.body);
    return res.status(201).json(content);
  } catch (error) {
    next(error);
  }
};

// PUT /api/contents/:id
export const updateContent = async (req, res, next) => {
  try {
    const content = await itemServices.updateContent(req.params.id, req.user.id, req.body);
    return res.status(200).json(content);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/contents/:id
export const deleteContent = async (req, res, next) => {
  try {
    await itemServices.deleteContent(req.params.id, req.user.id);
    return res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
};
