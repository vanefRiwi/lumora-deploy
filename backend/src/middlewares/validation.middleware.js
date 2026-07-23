// Valida que existan los campos obligatorios en el body
export const validateBody = (fields = []) => (req, res, next) => {
  const missing = fields.filter((f) => req.body[f] == null || req.body[f] === "");
  if (missing.length) {
    return res.status(400).json({ ok: false, message: `Faltan campos: ${missing.join(", ")}` });
  }
  next();
};
