import { Router } from "express";
import {
  getCourses,
  getMyCourses,
  getMyStats,
  getCourseById,
  createCourse,
  updateCourse,
  getCourseFull,
  createCourseFull,
  updateCourseFull,
} from "./course.controllers.js";
import { verifyJWT, authorizeRoles } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validation.middleware.js";

const router = Router();

// 🎓 Catálogo general (para estudiantes y tutores)
router.get("/", verifyJWT, getCourses);

// 👨‍🏫 Panel del Tutor: solo los cursos del tutor autenticado
router.get("/mine", verifyJWT, authorizeRoles("tutor"), getMyCourses);

// 📊 Stats agregadas del tutor autenticado
router.get("/stats", verifyJWT, authorizeRoles("tutor"), getMyStats);

// 📝 Crear curso (exclusivo Tutor)
router.post("/", verifyJWT, authorizeRoles("tutor"), validateBody(["title"]), createCourse);

// 🧩 Curso COMPLETO para el editor (curso + secciones + items + final)
router.post("/full", verifyJWT, authorizeRoles("tutor"), validateBody(["title"]), createCourseFull);
router.get("/:id/full", verifyJWT, authorizeRoles("tutor"), getCourseFull);
router.put("/:id/full", verifyJWT, authorizeRoles("tutor"), validateBody(["title"]), updateCourseFull);

// 🔍 Detalle de un curso puntual
router.get("/:id", verifyJWT, getCourseById);

// 🔄 Editar curso (exclusivo Tutor dueño)
router.put("/:id", verifyJWT, authorizeRoles("tutor"), updateCourse);

export default router;
