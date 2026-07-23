// Middleware central de errores (va al final en index.js)
export const errorHandler = (err, req, res, next) => {
  console.error("❌", err.message);
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Internal Server Error",
  });
};
