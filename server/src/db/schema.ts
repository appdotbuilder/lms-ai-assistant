import { serial, text, pgTable, timestamp, integer, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'teacher', 'student']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull().default('student'),
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

// Lessons table
export const lessonsTable = pgTable('lessons', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').notNull().references(() => coursesTable.id),
  title: text('title').notNull(),
  content: text('content'),
  order_index: integer('order_index').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// File attachments table
export const fileAttachmentsTable = pgTable('file_attachments', {
  id: serial('id').primaryKey(),
  lesson_id: integer('lesson_id').notNull().references(() => lessonsTable.id),
  filename: text('filename').notNull(),
  file_path: text('file_path').notNull(),
  file_type: text('file_type').notNull(),
  file_size: integer('file_size').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Quizzes table
export const quizzesTable = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  lesson_id: integer('lesson_id').notNull().references(() => lessonsTable.id),
  title: text('title').notNull(),
  description: text('description'),
  time_limit: integer('time_limit'), // in minutes
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Quiz questions table
export const quizQuestionsTable = pgTable('quiz_questions', {
  id: serial('id').primaryKey(),
  quiz_id: integer('quiz_id').notNull().references(() => quizzesTable.id),
  question_text: text('question_text').notNull(),
  question_type: text('question_type').notNull(), // 'multiple_choice' or 'true_false'
  options: jsonb('options').notNull().$type<string[]>(), // Array of options
  correct_answer: text('correct_answer').notNull(),
  points: integer('points').notNull(),
  order_index: integer('order_index').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Quiz submissions table
export const quizSubmissionsTable = pgTable('quiz_submissions', {
  id: serial('id').primaryKey(),
  quiz_id: integer('quiz_id').notNull().references(() => quizzesTable.id),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  answers: jsonb('answers').notNull().$type<Record<string, string>>(), // Question ID to answer mapping
  score: integer('score'),
  submitted_at: timestamp('submitted_at').defaultNow().notNull()
});

// Assignments table
export const assignmentsTable = pgTable('assignments', {
  id: serial('id').primaryKey(),
  lesson_id: integer('lesson_id').notNull().references(() => lessonsTable.id),
  title: text('title').notNull(),
  description: text('description'),
  due_date: timestamp('due_date'),
  max_points: integer('max_points').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Assignment submissions table
export const assignmentSubmissionsTable = pgTable('assignment_submissions', {
  id: serial('id').primaryKey(),
  assignment_id: integer('assignment_id').notNull().references(() => assignmentsTable.id),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  content: text('content'),
  file_path: text('file_path'),
  submitted_at: timestamp('submitted_at').defaultNow().notNull(),
  grade: integer('grade'),
  feedback: text('feedback'),
  graded_at: timestamp('graded_at')
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  courses: many(coursesTable),
  quizSubmissions: many(quizSubmissionsTable),
  assignmentSubmissions: many(assignmentSubmissionsTable)
}));

export const coursesRelations = relations(coursesTable, ({ one, many }) => ({
  teacher: one(usersTable, {
    fields: [coursesTable.teacher_id],
    references: [usersTable.id]
  }),
  lessons: many(lessonsTable)
}));

export const lessonsRelations = relations(lessonsTable, ({ one, many }) => ({
  course: one(coursesTable, {
    fields: [lessonsTable.course_id],
    references: [coursesTable.id]
  }),
  fileAttachments: many(fileAttachmentsTable),
  quizzes: many(quizzesTable),
  assignments: many(assignmentsTable)
}));

export const fileAttachmentsRelations = relations(fileAttachmentsTable, ({ one }) => ({
  lesson: one(lessonsTable, {
    fields: [fileAttachmentsTable.lesson_id],
    references: [lessonsTable.id]
  })
}));

export const quizzesRelations = relations(quizzesTable, ({ one, many }) => ({
  lesson: one(lessonsTable, {
    fields: [quizzesTable.lesson_id],
    references: [lessonsTable.id]
  }),
  questions: many(quizQuestionsTable),
  submissions: many(quizSubmissionsTable)
}));

export const quizQuestionsRelations = relations(quizQuestionsTable, ({ one }) => ({
  quiz: one(quizzesTable, {
    fields: [quizQuestionsTable.quiz_id],
    references: [quizzesTable.id]
  })
}));

export const quizSubmissionsRelations = relations(quizSubmissionsTable, ({ one }) => ({
  quiz: one(quizzesTable, {
    fields: [quizSubmissionsTable.quiz_id],
    references: [quizzesTable.id]
  }),
  student: one(usersTable, {
    fields: [quizSubmissionsTable.student_id],
    references: [usersTable.id]
  })
}));

export const assignmentsRelations = relations(assignmentsTable, ({ one, many }) => ({
  lesson: one(lessonsTable, {
    fields: [assignmentsTable.lesson_id],
    references: [lessonsTable.id]
  }),
  submissions: many(assignmentSubmissionsTable)
}));

export const assignmentSubmissionsRelations = relations(assignmentSubmissionsTable, ({ one }) => ({
  assignment: one(assignmentsTable, {
    fields: [assignmentSubmissionsTable.assignment_id],
    references: [assignmentsTable.id]
  }),
  student: one(usersTable, {
    fields: [assignmentSubmissionsTable.student_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Course = typeof coursesTable.$inferSelect;
export type NewCourse = typeof coursesTable.$inferInsert;
export type Lesson = typeof lessonsTable.$inferSelect;
export type NewLesson = typeof lessonsTable.$inferInsert;
export type FileAttachment = typeof fileAttachmentsTable.$inferSelect;
export type NewFileAttachment = typeof fileAttachmentsTable.$inferInsert;
export type Quiz = typeof quizzesTable.$inferSelect;
export type NewQuiz = typeof quizzesTable.$inferInsert;
export type QuizQuestion = typeof quizQuestionsTable.$inferSelect;
export type NewQuizQuestion = typeof quizQuestionsTable.$inferInsert;
export type QuizSubmission = typeof quizSubmissionsTable.$inferSelect;
export type NewQuizSubmission = typeof quizSubmissionsTable.$inferInsert;
export type Assignment = typeof assignmentsTable.$inferSelect;
export type NewAssignment = typeof assignmentsTable.$inferInsert;
export type AssignmentSubmission = typeof assignmentSubmissionsTable.$inferSelect;
export type NewAssignmentSubmission = typeof assignmentSubmissionsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  courses: coursesTable,
  lessons: lessonsTable,
  fileAttachments: fileAttachmentsTable,
  quizzes: quizzesTable,
  quizQuestions: quizQuestionsTable,
  quizSubmissions: quizSubmissionsTable,
  assignments: assignmentsTable,
  assignmentSubmissions: assignmentSubmissionsTable
};