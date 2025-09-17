import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  registerInputSchema,
  loginInputSchema,
  createUserInputSchema,
  updateUserRoleInputSchema,
  createCourseInputSchema,
  updateCourseInputSchema,
  createLessonInputSchema,
  updateLessonInputSchema,
  createFileAttachmentInputSchema,
  createQuizInputSchema,
  updateQuizInputSchema,
  createQuizQuestionInputSchema,
  submitQuizInputSchema,
  createAssignmentInputSchema,
  updateAssignmentInputSchema,
  submitAssignmentInputSchema,
  gradeAssignmentInputSchema
} from './schema';

// Import handlers
import { register } from './handlers/register';
import { login } from './handlers/login';
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUserRole } from './handlers/update_user_role';
import { createCourse } from './handlers/create_course';
import { getCourses, getCoursesByTeacher } from './handlers/get_courses';
import { updateCourse } from './handlers/update_course';
import { deleteCourse } from './handlers/delete_course';
import { createLesson } from './handlers/create_lesson';
import { getLessonsByCourse, getLesson } from './handlers/get_lessons';
import { updateLesson } from './handlers/update_lesson';
import { deleteLesson } from './handlers/delete_lesson';
import { createFileAttachment } from './handlers/create_file_attachment';
import { getFileAttachmentsByLesson } from './handlers/get_file_attachments';
import { deleteFileAttachment } from './handlers/delete_file_attachment';
import { createQuiz } from './handlers/create_quiz';
import { getQuizzesByLesson, getQuiz } from './handlers/get_quizzes';
import { updateQuiz } from './handlers/update_quiz';
import { deleteQuiz } from './handlers/delete_quiz';
import { createQuizQuestion } from './handlers/create_quiz_question';
import { getQuizQuestions } from './handlers/get_quiz_questions';
import { updateQuizQuestion } from './handlers/update_quiz_question';
import { deleteQuizQuestion } from './handlers/delete_quiz_question';
import { submitQuiz } from './handlers/submit_quiz';
import { getQuizSubmissionsByQuiz, getQuizSubmissionsByStudent } from './handlers/get_quiz_submissions';
import { createAssignment } from './handlers/create_assignment';
import { getAssignmentsByLesson, getAssignment } from './handlers/get_assignments';
import { updateAssignment } from './handlers/update_assignment';
import { deleteAssignment } from './handlers/delete_assignment';
import { submitAssignment } from './handlers/submit_assignment';
import { getAssignmentSubmissionsByAssignment, getAssignmentSubmissionsByStudent } from './handlers/get_assignment_submissions';
import { gradeAssignment } from './handlers/grade_assignment';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => register(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // Admin user management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  updateUserRole: publicProcedure
    .input(updateUserRoleInputSchema)
    .mutation(({ input }) => updateUserRole(input)),

  // Course management routes
  createCourse: publicProcedure
    .input(createCourseInputSchema)
    .mutation(({ input }) => createCourse(input)),

  getCourses: publicProcedure
    .query(() => getCourses()),

  getCoursesByTeacher: publicProcedure
    .input(z.object({ teacherId: z.number() }))
    .query(({ input }) => getCoursesByTeacher(input.teacherId)),

  updateCourse: publicProcedure
    .input(updateCourseInputSchema)
    .mutation(({ input }) => updateCourse(input)),

  deleteCourse: publicProcedure
    .input(z.object({ courseId: z.number() }))
    .mutation(({ input }) => deleteCourse(input.courseId)),

  // Lesson management routes
  createLesson: publicProcedure
    .input(createLessonInputSchema)
    .mutation(({ input }) => createLesson(input)),

  getLessonsByCourse: publicProcedure
    .input(z.object({ courseId: z.number() }))
    .query(({ input }) => getLessonsByCourse(input.courseId)),

  getLesson: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(({ input }) => getLesson(input.lessonId)),

  updateLesson: publicProcedure
    .input(updateLessonInputSchema)
    .mutation(({ input }) => updateLesson(input)),

  deleteLesson: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .mutation(({ input }) => deleteLesson(input.lessonId)),

  // File attachment routes
  createFileAttachment: publicProcedure
    .input(createFileAttachmentInputSchema)
    .mutation(({ input }) => createFileAttachment(input)),

  getFileAttachmentsByLesson: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(({ input }) => getFileAttachmentsByLesson(input.lessonId)),

  deleteFileAttachment: publicProcedure
    .input(z.object({ attachmentId: z.number() }))
    .mutation(({ input }) => deleteFileAttachment(input.attachmentId)),

  // Quiz management routes
  createQuiz: publicProcedure
    .input(createQuizInputSchema)
    .mutation(({ input }) => createQuiz(input)),

  getQuizzesByLesson: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(({ input }) => getQuizzesByLesson(input.lessonId)),

  getQuiz: publicProcedure
    .input(z.object({ quizId: z.number() }))
    .query(({ input }) => getQuiz(input.quizId)),

  updateQuiz: publicProcedure
    .input(updateQuizInputSchema)
    .mutation(({ input }) => updateQuiz(input)),

  deleteQuiz: publicProcedure
    .input(z.object({ quizId: z.number() }))
    .mutation(({ input }) => deleteQuiz(input.quizId)),

  // Quiz question routes
  createQuizQuestion: publicProcedure
    .input(createQuizQuestionInputSchema)
    .mutation(({ input }) => createQuizQuestion(input)),

  getQuizQuestions: publicProcedure
    .input(z.object({ quizId: z.number() }))
    .query(({ input }) => getQuizQuestions(input.quizId)),

  updateQuizQuestion: publicProcedure
    .input(z.object({
      questionId: z.number(),
      updates: z.object({
        question_text: z.string().optional(),
        question_type: z.enum(['multiple_choice', 'true_false']).optional(),
        options: z.array(z.string()).optional(),
        correct_answer: z.string().optional(),
        points: z.number().int().optional(),
        order_index: z.number().int().optional()
      })
    }))
    .mutation(({ input }) => updateQuizQuestion(input.questionId, input.updates)),

  deleteQuizQuestion: publicProcedure
    .input(z.object({ questionId: z.number() }))
    .mutation(({ input }) => deleteQuizQuestion(input.questionId)),

  // Quiz submission routes
  submitQuiz: publicProcedure
    .input(submitQuizInputSchema)
    .mutation(({ input }) => submitQuiz(input)),

  getQuizSubmissionsByQuiz: publicProcedure
    .input(z.object({ quizId: z.number() }))
    .query(({ input }) => getQuizSubmissionsByQuiz(input.quizId)),

  getQuizSubmissionsByStudent: publicProcedure
    .input(z.object({ studentId: z.number() }))
    .query(({ input }) => getQuizSubmissionsByStudent(input.studentId)),

  // Assignment management routes
  createAssignment: publicProcedure
    .input(createAssignmentInputSchema)
    .mutation(({ input }) => createAssignment(input)),

  getAssignmentsByLesson: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(({ input }) => getAssignmentsByLesson(input.lessonId)),

  getAssignment: publicProcedure
    .input(z.object({ assignmentId: z.number() }))
    .query(({ input }) => getAssignment(input.assignmentId)),

  updateAssignment: publicProcedure
    .input(updateAssignmentInputSchema)
    .mutation(({ input }) => updateAssignment(input)),

  deleteAssignment: publicProcedure
    .input(z.object({ assignmentId: z.number() }))
    .mutation(({ input }) => deleteAssignment(input.assignmentId)),

  // Assignment submission routes
  submitAssignment: publicProcedure
    .input(submitAssignmentInputSchema)
    .mutation(({ input }) => submitAssignment(input)),

  getAssignmentSubmissionsByAssignment: publicProcedure
    .input(z.object({ assignmentId: z.number() }))
    .query(({ input }) => getAssignmentSubmissionsByAssignment(input.assignmentId)),

  getAssignmentSubmissionsByStudent: publicProcedure
    .input(z.object({ studentId: z.number() }))
    .query(({ input }) => getAssignmentSubmissionsByStudent(input.studentId)),

  gradeAssignment: publicProcedure
    .input(gradeAssignmentInputSchema)
    .mutation(({ input }) => gradeAssignment(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();