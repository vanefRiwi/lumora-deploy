import jwt from "jsonwebtoken";

/**
 * Verification middleware for JWT (for all protected routes)
 * Extracts the token from the 'Authorization: Bearer <token>' header
 */
export const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Validate that the header exists and follows the correct industry format
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ 
      ok: false, 
      message: "Access denied. No token provided or invalid format." 
    });
  }

  // Separate the 'Bearer' text from the actual token
  const token = authHeader.split(" ")[1];

  try {
    // Verify the token using our production secret
    // ⚠️ Must be IDENTICAL to the fallback used to SIGN in auth.services.js.
    // A mismatched fallback made every protected route fail with 403 when
    // JWT_SECRET was not set in the environment.
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "lumora_fallback_secret");
    
    // CRITICAL INJECTION: Save the decoded data into 'req.user'
    // Now any subsequent controller will know the ID and role of the logged-in user.
    req.user = decoded; 
    
    next(); // Give the green light to proceed to the controller
  } catch (error) {
    // If the token has expired or the signature mismatch, return a direct 403 Forbidden
    return res.status(403).json({ 
      ok: false, 
      message: "Invalid or expired session token." 
    });
  }
};

/**
 * Blocker #2: Complementary Role-Based Authorization Middleware
 * Allows us to use patterns like: authorizeRoles('tutor') to protect exclusive routes
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Validate that the user is authenticated and that their role is in the allowed list
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        ok: false, 
        message: "Forbidden: Your account role does not have permission to access this resource." 
      });
    }
    next();
  };
};
