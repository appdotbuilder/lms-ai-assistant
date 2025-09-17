import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  createCourseInputSchema,
  updateCourseInputSchema,
  enrollStudentInputSchema,
  createContentInputSchema,
  createQuizInputSchema,
  createQuizQuestionInputSchema,
  createAssignmentInputSchema,
  submitQuizAttemptInputSchema,
  submitAssignmentInputSchema,
  gradeAssignmentInputSchema,
  updateProgressInputSchema,
  createAiInteractionInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { getUserById } from './handlers/get_user_by_id';
import { updateUser } from './handlers/update_user';
import { createCourse } from './handlers/create_course';
import { getCourses } from './handlers/get_courses';
import { getCourseById } from './handlers/get_course_by_id';
import { updateCourse } from './handlers/update_course';
import { enrollStudent } from './handlers/enroll_student';
import { createContent } from './handlers/create_content';
import { getCourseContent } from './handlers/get_course_content';
import { getContentById } from './handlers/get_content_by_id';
import { createQuiz } from './handlers/create_quiz';
import { createQuizQuestion } from './handlers/create_quiz_question';
import { getQuizQuestions } from './handlers/get_quiz_questions';
import { submitQuizAttempt } from './handlers/submit_quiz_attempt';
import { createAssignment } from './handlers/create_assignment';
import { submitAssignment } from './handlers/submit_assignment';
import { gradeAssignment } from './handlers/grade_assignment';
import { updateProgress } from './handlers/update_progress';
import { getStudentProgress } from './handlers/get_student_progress';
import { createAiInteraction } from './handlers/create_ai_interaction';
import { getAiInteractions } from './handlers/get_ai_interactions';
import { getStudentEnrollments } from './handlers/get_student_enrollments';
import { getAssignmentSubmissions } from './handlers/get_assignment_submissions';
import { getQuizAttempts } from './handlers/get_quiz_attempts';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  getUserById: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserById(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Course management routes
  createCourse: publicProcedure
    .input(createCourseInputSchema)
    .mutation(({ input }) => createCourse(input)),
  
  getCourses: publicProcedure
    .query(() => getCourses()),
  
  getCourseById: publicProcedure
    .input(z.number())
    .query(({ input }) => getCourseById(input)),
  
  updateCourse: publicProcedure
    .input(updateCourseInputSchema)
    .mutation(({ input }) => updateCourse(input)),
  
  enrollStudent: publicProcedure
    .input(enrollStudentInputSchema)
    .mutation(({ input }) => enrollStudent(input)),
  
  getStudentEnrollments: publicProcedure
    .input(z.number())
    .query(({ input }) => getStudentEnrollments(input)),

  // Content management routes
  createContent: publicProcedure
    .input(createContentInputSchema)
    .mutation(({ input }) => createContent(input)),
  
  getCourseContent: publicProcedure
    .input(z.number())
    .query(({ input }) => getCourseContent(input)),
  
  getContentById: publicProcedure
    .input(z.number())
    .query(({ input }) => getContentById(input)),

  // Quiz management routes
  createQuiz: publicProcedure
    .input(createQuizInputSchema)
    .mutation(({ input }) => createQuiz(input)),
  
  createQuizQuestion: publicProcedure
    .input(createQuizQuestionInputSchema)
    .mutation(({ input }) => createQuizQuestion(input)),
  
  getQuizQuestions: publicProcedure
    .input(z.number())
    .query(({ input }) => getQuizQuestions(input)),
  
  submitQuizAttempt: publicProcedure
    .input(submitQuizAttemptInputSchema)
    .mutation(({ input }) => submitQuizAttempt(input)),
  
  getQuizAttempts: publicProcedure
    .input(z.object({
      quizId: z.number(),
      studentId: z.number().optional()
    }))
    .query(({ input }) => getQuizAttempts(input.quizId, input.studentId)),

  // Assignment management routes
  createAssignment: publicProcedure
    .input(createAssignmentInputSchema)
    .mutation(({ input }) => createAssignment(input)),
  
  submitAssignment: publicProcedure
    .input(submitAssignmentInputSchema)
    .mutation(({ input }) => submitAssignment(input)),
  
  gradeAssignment: publicProcedure
    .input(gradeAssignmentInputSchema)
    .mutation(({ input }) => gradeAssignment(input)),
  
  getAssignmentSubmissions: publicProcedure
    .input(z.number())
    .query(({ input }) => getAssignmentSubmissions(input)),

  // Progress tracking routes
  updateProgress: publicProcedure
    .input(updateProgressInputSchema)
    .mutation(({ input }) => updateProgress(input)),
  
  getStudentProgress: publicProcedure
    .input(z.object({
      studentId: z.number(),
      courseId: z.number().optional()
    }))
    .query(({ input }) => getStudentProgress(input.studentId, input.courseId)),

  // AI assistant routes
  createAiInteraction: publicProcedure
    .input(createAiInteractionInputSchema)
    .mutation(({ input }) => createAiInteraction(input)),
  
  getAiInteractions: publicProcedure
    .input(z.object({
      studentId: z.number(),
      courseId: z.number().optional()
    }))
    .query(({ input }) => getAiInteractions(input.studentId, input.courseId)),
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
  console.log(`TRPC LMS Server listening at port: ${port}`);
}

start();