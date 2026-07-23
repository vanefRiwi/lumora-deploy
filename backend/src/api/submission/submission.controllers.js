import { submissionServices } from "./submission.services.js";

// POST /api/submissions
export const submit = async (req, res, next) => {
  try {
    const result = await submissionServices.submit(req.user.id, req.body);
    return res.status(201).json({ ok: true, result });
  } catch (error) {
    next(error);
  }
};

// GET /api/courses/:courseId/progress
export const getProgress = async (req, res, next) => {
  try {
    const progress = await submissionServices.getProgress(req.user.id, req.params.courseId);
    return res.status(200).json(progress);
  } catch (error) {
    next(error);
  }
};
