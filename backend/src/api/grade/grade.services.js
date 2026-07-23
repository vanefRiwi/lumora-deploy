import { gradeRepository } from "./grade.repository.js";
import { sectionRepository } from "../section/section.repository.js";
import { courseRepository } from "../course/course.repository.js";

// Misma fórmula que el frontend (courseService.calculateFinalGrade):
// promedio de (quizz de cada sección + examen final), no presentados = 0.
function buildBreakdown(sections, submissions) {
  const quizzesBySection = {};
  let finalSub = null;
  for (const s of submissions) {
    if (s.item_type === "quizz") quizzesBySection[s.section_id] = s;
    if (s.item_type === "final") finalSub = s;
  }

  const totalItems = sections.length + 1;
  let sum = 0;
  let presented = 0;
  let points = 0;
  const breakdown = [];

  for (const sec of sections) {
    const q = quizzesBySection[sec.id];
    const pct = q ? Math.round((q.score / q.total) * 100) : null;
    if (q) { sum += pct; presented++; points += q.points || 0; }
    breakdown.push({
      id: sec.id, label: `Quizz — ${sec.title}`,
      score: q?.score ?? null, total: q?.total ?? null, percent: pct,
      points: q?.points || 0, status: q ? "Graded" : "Not started",
    });
  }

  const fPct = finalSub ? Math.round((finalSub.score / finalSub.total) * 100) : null;
  if (finalSub) { sum += fPct; presented++; points += finalSub.points || 0; }
  breakdown.push({
    id: "final", label: "Final Assessment",
    score: finalSub?.score ?? null, total: finalSub?.total ?? null, percent: fPct,
    points: finalSub?.points || 0, status: finalSub ? "Graded" : "Not started",
  });

  const finalGrade = presented ? Math.round((sum / totalItems) * 10) / 10 : null;
  return { breakdown, finalGrade, points };
}

export const gradeServices = {
  /**
   * GET /api/courses/:id/students (tutor) — estudiantes inscritos con su
   * nota desglosada, calculada server-side con la MISMA fórmula del frontend.
   */
  getCourseStudents: async (courseId, tutorId) => {
    const course = await courseRepository.findById(courseId);
    if (!course) throw Object.assign(new Error("Curso no encontrado"), { status: 404 });
    if (course.tutor_id !== Number(tutorId)) {
      throw Object.assign(new Error("No eres dueño de este curso"), { status: 403 });
    }

    const sections = await sectionRepository.findByCourse(courseId);
    const students = await gradeRepository.findStudentsWithSubmissions(courseId);

    return students.map((st) => {
      const { breakdown, finalGrade, points } = buildBreakdown(sections, st.submissions);

      // `progress` con el MISMO shape que GET /courses/:id/progress, para que el
      // dashboard del frontend reutilice calculateFinalGrade() sin cambios.
      const progress = { quizzes: {}, reviews: {}, final: null };
      for (const s of st.submissions) {
        if (s.item_type === "quizz") {
          progress.quizzes[s.section_id] = { score: s.score, total: s.total, points: s.points };
        } else if (s.item_type === "review") {
          progress.reviews[s.section_id] = { completed: true };
        } else if (s.item_type === "final") {
          progress.final = { score: s.score, total: s.total, points: s.points };
        }
      }

      return {
        id: st.id, full_name: st.full_name, email: st.email,
        finalGrade, breakdown, points, progress,
      };
    });
  },
};
