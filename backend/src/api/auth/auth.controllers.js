import { authServices } from "./auth.services.js";

/**
 * Login controller (task #7)
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Email and password are required" });
    }

    const result = await authServices.loginUser(email, password);
    
    // ⚠️ Task requirement: Handle 401 error correctly
    if (!result) {
      return res.status(401).json({ ok: false, message: "Invalid email or password" });
    }

    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * Signup controller (task #8)
 */
export const register = async (req, res, next) => {
  try {
    const { full_name, email, password, role, learning_goal } = req.body;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ ok: false, message: "Missing required fields" });
    }

    const result = await authServices.registerUser({ 
      full_name, 
      email, 
      password, 
      role, 
      learning_goal 
    });

    // We return 201 Created with the same structure as login.
    return res.status(201).json({ ok: true, ...result });
  } catch (error) {
    if (error.message === "EMAIL_ALREADY_TAKEN") {
      return res.status(400).json({ ok: false, message: "This email is already registered" });
    }
    next(error);
  }
};
