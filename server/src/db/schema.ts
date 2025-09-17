import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  integer, 
  boolean, 
  pgEnum,
  numeric,
  jsonb
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'administrator']);
export const contentTypeEnum = pgEnum('content_type', ['text_lesson', 'video', 'quiz', 'assignment']);
export const questionTypeEnum = pgEnum('question_type', ['multiple_choice', 'true_false', 'short_answer']);
export const assignmentStatusEnum = pgEnum('assignment_status', ['draft', 'published', 'archived']);
export const interactionTypeEnum = pgEnum('interaction_type', ['question_answer', 'knowledge_recall', 'quiz_generation']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Courses table
export const coursesTable = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  teacher_id: integer('teacher_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Content table
export const contentTable = pgTable('content', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').notNull().references(() => coursesTable.id),
  title: text('title').notNull(),
  description: text('description'),
  content_type: contentTypeEnum('content_type').notNull(),
  content_data: text('content_data').notNull(), // JSON string containing type-specific data
  order_index: integer('order_index').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Quizzes table
export const quizzesTable = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  content_id: integer('content_id').notNull().references(() => contentTable.id),
  title: text('title').notNull(),
  description: text('description'),
  time_limit_minutes: integer('time_limit_minutes'),
  max_attempts: integer('max_attempts'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Quiz questions table
export const quizQuestionsTable = pgTable('quiz_questions', {
  id: serial('id').primaryKey(),
  quiz_id: integer('quiz_id').notNull().references(() => quizzesTable.id),
  question_text: text('question_text').notNull(),
  question_type: questionTypeEnum('question_type').notNull(),
  correct_answer: text('correct_answer').notNull(),
  options: text('options'), // JSON string for multiple choice options
  points: numeric('points', { precision: 5, scale: 2 }).notNull(),
  order_index: integer('order_index').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Assignments table
export const assignmentsTable = pgTable('assignments', {
  id: serial('id').primaryKey(),
  content_id: integer('content_id').notNull().references(() => contentTable.id),
  title: text('title').notNull(),
  description: text('description'),
  instructions: text('instructions').notNull(),
  due_date: timestamp('due_date'),
  max_points: numeric('max_points', { precision: 5, scale: 2 }).notNull(),
  status: assignmentStatusEnum('status').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Course enrollments table
export const courseEnrollmentsTable = pgTable('course_enrollments', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').notNull().references(() => coursesTable.id),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  enrolled_at: timestamp('enrolled_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at')
});

// Student progress table
export const studentProgressTable = pgTable('student_progress', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  content_id: integer('content_id').notNull().references(() => contentTable.id),
  completed: boolean('completed').notNull().default(false),
  completion_date: timestamp('completion_date'),
  time_spent_minutes: integer('time_spent_minutes').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Quiz attempts table
export const quizAttemptsTable = pgTable('quiz_attempts', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  quiz_id: integer('quiz_id').notNull().references(() => quizzesTable.id),
  score: numeric('score', { precision: 5, scale: 2 }),
  max_score: numeric('max_score', { precision: 5, scale: 2 }).notNull(),
  completed: boolean('completed').notNull().default(false),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at')
});

// Assignment submissions table
export const assignmentSubmissionsTable = pgTable('assignment_submissions', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  assignment_id: integer('assignment_id').notNull().references(() => assignmentsTable.id),
  submission_text: text('submission_text'),
  file_url: text('file_url'),
  score: numeric('score', { precision: 5, scale: 2 }),
  feedback: text('feedback'),
  submitted_at: timestamp('submitted_at').defaultNow().notNull(),
  graded_at: timestamp('graded_at')
});

// AI interactions table
export const aiInteractionsTable = pgTable('ai_interactions', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  course_id: integer('course_id').notNull().references(() => coursesTable.id),
  content_id: integer('content_id').references(() => contentTable.id),
  question: text('question').notNull(),
  response: text('response').notNull(),
  interaction_type: interactionTypeEnum('interaction_type').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  teachingCourses: many(coursesTable),
  enrollments: many(courseEnrollmentsTable),
  progress: many(studentProgressTable),
  quizAttempts: many(quizAttemptsTable),
  assignmentSubmissions: many(assignmentSubmissionsTable),
  aiInteractions: many(aiInteractionsTable),
}));

export const coursesRelations = relations(coursesTable, ({ one, many }) => ({
  teacher: one(usersTable, {
    fields: [coursesTable.teacher_id],
    references: [usersTable.id],
  }),
  content: many(contentTable),
  enrollments: many(courseEnrollmentsTable),
  aiInteractions: many(aiInteractionsTable),
}));

export const contentRelations = relations(contentTable, ({ one, many }) => ({
  course: one(coursesTable, {
    fields: [contentTable.course_id],
    references: [coursesTable.id],
  }),
  quizzes: many(quizzesTable),
  assignments: many(assignmentsTable),
  progress: many(studentProgressTable),
  aiInteractions: many(aiInteractionsTable),
}));

export const quizzesRelations = relations(quizzesTable, ({ one, many }) => ({
  content: one(contentTable, {
    fields: [quizzesTable.content_id],
    references: [contentTable.id],
  }),
  questions: many(quizQuestionsTable),
  attempts: many(quizAttemptsTable),
}));

export const quizQuestionsRelations = relations(quizQuestionsTable, ({ one }) => ({
  quiz: one(quizzesTable, {
    fields: [quizQuestionsTable.quiz_id],
    references: [quizzesTable.id],
  }),
}));

export const assignmentsRelations = relations(assignmentsTable, ({ one, many }) => ({
  content: one(contentTable, {
    fields: [assignmentsTable.content_id],
    references: [contentTable.id],
  }),
  submissions: many(assignmentSubmissionsTable),
}));

export const courseEnrollmentsRelations = relations(courseEnrollmentsTable, ({ one }) => ({
  course: one(coursesTable, {
    fields: [courseEnrollmentsTable.course_id],
    references: [coursesTable.id],
  }),
  student: one(usersTable, {
    fields: [courseEnrollmentsTable.student_id],
    references: [usersTable.id],
  }),
}));

export const studentProgressRelations = relations(studentProgressTable, ({ one }) => ({
  student: one(usersTable, {
    fields: [studentProgressTable.student_id],
    references: [usersTable.id],
  }),
  content: one(contentTable, {
    fields: [studentProgressTable.content_id],
    references: [contentTable.id],
  }),
}));

export const quizAttemptsRelations = relations(quizAttemptsTable, ({ one }) => ({
  student: one(usersTable, {
    fields: [quizAttemptsTable.student_id],
    references: [usersTable.id],
  }),
  quiz: one(quizzesTable, {
    fields: [quizAttemptsTable.quiz_id],
    references: [quizzesTable.id],
  }),
}));

export const assignmentSubmissionsRelations = relations(assignmentSubmissionsTable, ({ one }) => ({
  student: one(usersTable, {
    fields: [assignmentSubmissionsTable.student_id],
    references: [usersTable.id],
  }),
  assignment: one(assignmentsTable, {
    fields: [assignmentSubmissionsTable.assignment_id],
    references: [assignmentsTable.id],
  }),
}));

export const aiInteractionsRelations = relations(aiInteractionsTable, ({ one }) => ({
  student: one(usersTable, {
    fields: [aiInteractionsTable.student_id],
    references: [usersTable.id],
  }),
  course: one(coursesTable, {
    fields: [aiInteractionsTable.course_id],
    references: [coursesTable.id],
  }),
  content: one(contentTable, {
    fields: [aiInteractionsTable.content_id],
    references: [contentTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Course = typeof coursesTable.$inferSelect;
export type NewCourse = typeof coursesTable.$inferInsert;

export type Content = typeof contentTable.$inferSelect;
export type NewContent = typeof contentTable.$inferInsert;

export type Quiz = typeof quizzesTable.$inferSelect;
export type NewQuiz = typeof quizzesTable.$inferInsert;

export type QuizQuestion = typeof quizQuestionsTable.$inferSelect;
export type NewQuizQuestion = typeof quizQuestionsTable.$inferInsert;

export type Assignment = typeof assignmentsTable.$inferSelect;
export type NewAssignment = typeof assignmentsTable.$inferInsert;

export type CourseEnrollment = typeof courseEnrollmentsTable.$inferSelect;
export type NewCourseEnrollment = typeof courseEnrollmentsTable.$inferInsert;

export type StudentProgress = typeof studentProgressTable.$inferSelect;
export type NewStudentProgress = typeof studentProgressTable.$inferInsert;

export type QuizAttempt = typeof quizAttemptsTable.$inferSelect;
export type NewQuizAttempt = typeof quizAttemptsTable.$inferInsert;

export type AssignmentSubmission = typeof assignmentSubmissionsTable.$inferSelect;
export type NewAssignmentSubmission = typeof assignmentSubmissionsTable.$inferInsert;

export type AiInteraction = typeof aiInteractionsTable.$inferSelect;
export type NewAiInteraction = typeof aiInteractionsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  courses: coursesTable,
  content: contentTable,
  quizzes: quizzesTable,
  quizQuestions: quizQuestionsTable,
  assignments: assignmentsTable,
  courseEnrollments: courseEnrollmentsTable,
  studentProgress: studentProgressTable,
  quizAttempts: quizAttemptsTable,
  assignmentSubmissions: assignmentSubmissionsTable,
  aiInteractions: aiInteractionsTable,
};