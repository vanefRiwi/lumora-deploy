// Centralized error-handling middleware (goes at the end of index.js)
export const errorHandler = (err, req, res, next) => {
  console.error("❌", err.message);
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Internal Server Error",
  });
};
