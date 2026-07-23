import { userRepository } from "./user.repository.js";

export const userServices = {
  getProfile: async (userId) => {
    const user = await userRepository.findById(userId);
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
    return user;
  },

  updateProfile: async (userId, payload) => {
    const { full_name, email, learning_goal } = payload;
    if (!full_name?.trim() || !email?.trim()) {
      throw Object.assign(new Error("Name and email are required fields"), { status: 400 });
    }

    // If email changes, validates that it's not taken by another user.
    const existing = await userRepository.findByEmail(email.trim());
    if (existing && existing.id !== userId) {
      throw Object.assign(new Error("That email is already in use"), { status: 400 });
    }

    const updated = await userRepository.updateProfile(userId, {
      full_name: full_name.trim(),
      email: email.trim(),
      learning_goal: learning_goal || null,
    });
    if (!updated) throw Object.assign(new Error("User not found"), { status: 404 });
    return updated;
  },
};