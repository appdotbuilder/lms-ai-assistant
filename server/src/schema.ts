import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['student', 'teacher', 'administrator']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Content type enum
export const contentTypeSchema = z.enum(['text_lesson', 'video', 'quiz', 'assignment']);
export type ContentType = z.infer<typeof contentTypeSchema>;

// Quiz question type enum
export const questionTypeSchema = z.enum(['multiple_choice', 'true_false', 'short_answer']);
export type QuestionType = z.infer<typeof questionTypeSchema>;

// Assignment status enum
export const assignmentStatusSchema = z.enum(['draft', 'published', 'archived']);
export type AssignmentStatus = z.infer<typeof assignmentStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Course schema
export const courseSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  teacher_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Course = z.infer<typeof courseSchema>;

// Content schema
export const contentSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  content_type: contentTypeSchema,
  content_data: z.string(), // JSON string containing type-specific data
  order_index: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Content = z.infer<typeof contentSchema>;

// Quiz schema
export const quizSchema = z.object({
  id: z.number(),
  content_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  time_limit_minutes: z.number().int().nullable(),
  max_attempts: z.number().int().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Quiz = z.infer<typeof quizSchema>;

// Quiz question schema
export const quizQuestionSchema = z.object({
  id: z.number(),
  quiz_id: z.number(),
  question_text: z.string(),
  question_type: questionTypeSchema,
  correct_answer: z.string(),
  options: z.string().nullable(), // JSON string for multiple choice options
  points: z.number(),
  order_index: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

// Assignment schema
export const assignmentSchema = z.object({
  id: z.number(),
  content_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  instructions: z.string(),
  due_date: z.coerce.date().nullable(),
  max_points: z.number(),
  status: assignmentStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Assignment = z.infer<typeof assignmentSchema>;

// Course enrollment schema
export const courseEnrollmentSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  student_id: z.number(),
  enrolled_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable()
});

export type CourseEnrollment = z.infer<typeof courseEnrollmentSchema>;

// Student progress schema
export const studentProgressSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  content_id: z.number(),
  completed: z.boolean(),
  completion_date: z.coerce.date().nullable(),
  time_spent_minutes: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type StudentProgress = z.infer<typeof studentProgressSchema>;

// Quiz attempt schema
export const quizAttemptSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  quiz_id: z.number(),
  score: z.number().nullable(),
  max_score: z.number(),
  completed: z.boolean(),
  started_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable()
});

export type QuizAttempt = z.infer<typeof quizAttemptSchema>;

// Assignment submission schema
export const assignmentSubmissionSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  assignment_id: z.number(),
  submission_text: z.string().nullable(),
  file_url: z.string().nullable(),
  score: z.number().nullable(),
  feedback: z.string().nullable(),
  submitted_at: z.coerce.date(),
  graded_at: z.coerce.date().nullable()
});

export type AssignmentSubmission = z.infer<typeof assignmentSubmissionSchema>;

// AI assistant interaction schema
export const aiInteractionSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  course_id: z.number(),
  content_id: z.number().nullable(),
  question: z.string(),
  response: z.string(),
  interaction_type: z.enum(['question_answer', 'knowledge_recall', 'quiz_generation']),
  created_at: z.coerce.date()
});

export type AiInteraction = z.infer<typeof aiInteractionSchema>;

// Input schemas for creating entities

// Create user input
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Create course input
export const createCourseInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  teacher_id: z.number()
});

export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

// Create content input
export const createContentInputSchema = z.object({
  course_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  content_type: contentTypeSchema,
  content_data: z.string(),
  order_index: z.number().int().nonnegative()
});

export type CreateContentInput = z.infer<typeof createContentInputSchema>;

// Create quiz input
export const createQuizInputSchema = z.object({
  content_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  time_limit_minutes: z.number().int().positive().nullable(),
  max_attempts: z.number().int().positive().nullable()
});

export type CreateQuizInput = z.infer<typeof createQuizInputSchema>;

// Create quiz question input
export const createQuizQuestionInputSchema = z.object({
  quiz_id: z.number(),
  question_text: z.string().min(1),
  question_type: questionTypeSchema,
  correct_answer: z.string().min(1),
  options: z.string().nullable(),
  points: z.number().positive(),
  order_index: z.number().int().nonnegative()
});

export type CreateQuizQuestionInput = z.infer<typeof createQuizQuestionInputSchema>;

// Create assignment input
export const createAssignmentInputSchema = z.object({
  content_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  instructions: z.string().min(1),
  due_date: z.coerce.date().nullable(),
  max_points: z.number().positive(),
  status: assignmentStatusSchema
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentInputSchema>;

// Enroll student input
export const enrollStudentInputSchema = z.object({
  course_id: z.number(),
  student_id: z.number()
});

export type EnrollStudentInput = z.infer<typeof enrollStudentInputSchema>;

// Update progress input
export const updateProgressInputSchema = z.object({
  student_id: z.number(),
  content_id: z.number(),
  completed: z.boolean(),
  time_spent_minutes: z.number().int().nonnegative()
});

export type UpdateProgressInput = z.infer<typeof updateProgressInputSchema>;

// Submit quiz attempt input
export const submitQuizAttemptInputSchema = z.object({
  student_id: z.number(),
  quiz_id: z.number(),
  answers: z.record(z.string()) // question_id -> answer mapping
});

export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptInputSchema>;

// Submit assignment input
export const submitAssignmentInputSchema = z.object({
  student_id: z.number(),
  assignment_id: z.number(),
  submission_text: z.string().nullable(),
  file_url: z.string().nullable()
});

export type SubmitAssignmentInput = z.infer<typeof submitAssignmentInputSchema>;

// AI interaction input
export const createAiInteractionInputSchema = z.object({
  student_id: z.number(),
  course_id: z.number(),
  content_id: z.number().nullable(),
  question: z.string().min(1),
  interaction_type: z.enum(['question_answer', 'knowledge_recall', 'quiz_generation'])
});

export type CreateAiInteractionInput = z.infer<typeof createAiInteractionInputSchema>;

// Update schemas for entities

// Update user input
export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: userRoleSchema.optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Update course input
export const updateCourseInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional()
});

export type UpdateCourseInput = z.infer<typeof updateCourseInputSchema>;

// Grade assignment input
export const gradeAssignmentInputSchema = z.object({
  submission_id: z.number(),
  score: z.number().nonnegative(),
  feedback: z.string().nullable()
});

export type GradeAssignmentInput = z.infer<typeof gradeAssignmentInputSchema>;