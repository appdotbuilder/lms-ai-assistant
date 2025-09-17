import { z } from 'zod';

// User roles enum
export const userRoleSchema = z.enum(['admin', 'teacher', 'student']);
export type UserRole = z.infer<typeof userRoleSchema>;

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

// Authentication schemas
export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: userRoleSchema.default('student')
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// User management schemas
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserRoleInputSchema = z.object({
  user_id: z.number(),
  role: userRoleSchema
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleInputSchema>;

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

export const createCourseInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  teacher_id: z.number()
});

export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

export const updateCourseInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional()
});

export type UpdateCourseInput = z.infer<typeof updateCourseInputSchema>;

// Lesson schema
export const lessonSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  title: z.string(),
  content: z.string().nullable(),
  order_index: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Lesson = z.infer<typeof lessonSchema>;

export const createLessonInputSchema = z.object({
  course_id: z.number(),
  title: z.string().min(1),
  content: z.string().nullable(),
  order_index: z.number().int()
});

export type CreateLessonInput = z.infer<typeof createLessonInputSchema>;

export const updateLessonInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  content: z.string().nullable().optional(),
  order_index: z.number().int().optional()
});

export type UpdateLessonInput = z.infer<typeof updateLessonInputSchema>;

// File attachment schema
export const fileAttachmentSchema = z.object({
  id: z.number(),
  lesson_id: z.number(),
  filename: z.string(),
  file_path: z.string(),
  file_type: z.string(),
  file_size: z.number().int(),
  created_at: z.coerce.date()
});

export type FileAttachment = z.infer<typeof fileAttachmentSchema>;

export const createFileAttachmentInputSchema = z.object({
  lesson_id: z.number(),
  filename: z.string(),
  file_path: z.string(),
  file_type: z.string(),
  file_size: z.number().int()
});

export type CreateFileAttachmentInput = z.infer<typeof createFileAttachmentInputSchema>;

// Quiz schema
export const quizSchema = z.object({
  id: z.number(),
  lesson_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  time_limit: z.number().int().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Quiz = z.infer<typeof quizSchema>;

export const createQuizInputSchema = z.object({
  lesson_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  time_limit: z.number().int().nullable()
});

export type CreateQuizInput = z.infer<typeof createQuizInputSchema>;

export const updateQuizInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  time_limit: z.number().int().nullable().optional()
});

export type UpdateQuizInput = z.infer<typeof updateQuizInputSchema>;

// Quiz question schema
export const quizQuestionSchema = z.object({
  id: z.number(),
  quiz_id: z.number(),
  question_text: z.string(),
  question_type: z.enum(['multiple_choice', 'true_false']),
  options: z.array(z.string()),
  correct_answer: z.string(),
  points: z.number().int(),
  order_index: z.number().int(),
  created_at: z.coerce.date()
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const createQuizQuestionInputSchema = z.object({
  quiz_id: z.number(),
  question_text: z.string().min(1),
  question_type: z.enum(['multiple_choice', 'true_false']),
  options: z.array(z.string()),
  correct_answer: z.string(),
  points: z.number().int().positive(),
  order_index: z.number().int()
});

export type CreateQuizQuestionInput = z.infer<typeof createQuizQuestionInputSchema>;

// Quiz submission schema
export const quizSubmissionSchema = z.object({
  id: z.number(),
  quiz_id: z.number(),
  student_id: z.number(),
  answers: z.record(z.string(), z.string()),
  score: z.number().int().nullable(),
  submitted_at: z.coerce.date()
});

export type QuizSubmission = z.infer<typeof quizSubmissionSchema>;

export const submitQuizInputSchema = z.object({
  quiz_id: z.number(),
  student_id: z.number(),
  answers: z.record(z.string(), z.string())
});

export type SubmitQuizInput = z.infer<typeof submitQuizInputSchema>;

// Assignment schema
export const assignmentSchema = z.object({
  id: z.number(),
  lesson_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  due_date: z.coerce.date().nullable(),
  max_points: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Assignment = z.infer<typeof assignmentSchema>;

export const createAssignmentInputSchema = z.object({
  lesson_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  due_date: z.coerce.date().nullable(),
  max_points: z.number().int().positive()
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentInputSchema>;

export const updateAssignmentInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  max_points: z.number().int().positive().optional()
});

export type UpdateAssignmentInput = z.infer<typeof updateAssignmentInputSchema>;

// Assignment submission schema
export const assignmentSubmissionSchema = z.object({
  id: z.number(),
  assignment_id: z.number(),
  student_id: z.number(),
  content: z.string().nullable(),
  file_path: z.string().nullable(),
  submitted_at: z.coerce.date(),
  grade: z.number().int().nullable(),
  feedback: z.string().nullable(),
  graded_at: z.coerce.date().nullable()
});

export type AssignmentSubmission = z.infer<typeof assignmentSubmissionSchema>;

export const submitAssignmentInputSchema = z.object({
  assignment_id: z.number(),
  student_id: z.number(),
  content: z.string().nullable(),
  file_path: z.string().nullable()
});

export type SubmitAssignmentInput = z.infer<typeof submitAssignmentInputSchema>;

export const gradeAssignmentInputSchema = z.object({
  submission_id: z.number(),
  grade: z.number().int(),
  feedback: z.string().nullable()
});

export type GradeAssignmentInput = z.infer<typeof gradeAssignmentInputSchema>;