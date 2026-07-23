import { userServices } from "./user.services.js";

// GET /api/users/me
export const getMe = async (req, res, next) => {
  try {
    const user = await userServices.getProfile(req.user.id);
    return res.status(200).json({ ok: true, user });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/me
export const updateMe = async (req, res, next) => {
  try {
    const user = await userServices.updateProfile(req.user.id, req.body);
    return res.status(200).json({ ok: true, user });
  } catch (error) {
    next(error);
  }
};
