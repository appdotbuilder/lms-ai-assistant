import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, contentTable, courseEnrollmentsTable, aiInteractionsTable } from '../db/schema';
import { type CreateAiInteractionInput } from '../schema';
import { createAiInteraction } from '../handlers/create_ai_interaction';
import { eq } from 'drizzle-orm';

// Test data setup
const createTestUser = async (role: 'student' | 'teacher' = 'student') => {
  const result = await db.insert(usersTable)
    .values({
      email: `test${Date.now()}@example.com`,
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User',
      role: role
    })
    .returning()
    .execute();
  return result[0];
};

const createTestCourse = async (teacherId: number) => {
  const result = await db.insert(coursesTable)
    .values({
      title: 'Test Course',
      description: 'A test course for AI interactions',
      teacher_id: teacherId
    })
    .returning()
    .execute();
  return result[0];
};

const createTestContent = async (courseId: number) => {
  const result = await db.insert(contentTable)
    .values({
      course_id: courseId,
      title: 'Test Content',
      description: 'Test content for AI interactions',
      content_type: 'text_lesson',
      content_data: '{"text": "This is test lesson content"}',
      order_index: 1
    })
    .returning()
    .execute();
  return result[0];
};

const enrollStudent = async (studentId: number, courseId: number) => {
  await db.insert(courseEnrollmentsTable)
    .values({
      student_id: studentId,
      course_id: courseId
    })
    .execute();
};

describe('createAiInteraction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an AI interaction with question_answer type', async () => {
    // Setup test data
    const teacher = await createTestUser('teacher');
    const student = await createTestUser('student');
    const course = await createTestCourse(teacher.id);
    const content = await createTestContent(course.id);
    await enrollStudent(student.id, course.id);

    const input: CreateAiInteractionInput = {
      student_id: student.id,
      course_id: course.id,
      content_id: content.id,
      question: 'What is the main concept in this lesson?',
      interaction_type: 'question_answer'
    };

    const result = await createAiInteraction(input);

    // Validate the result
    expect(result.id).toBeDefined();
    expect(result.student_id).toEqual(student.id);
    expect(result.course_id).toEqual(course.id);
    expect(result.content_id).toEqual(content.id);
    expect(result.question).toEqual(input.question);
    expect(result.interaction_type).toEqual('question_answer');
    expect(result.response).toContain('Thank you for your question');
    expect(result.response).toContain(input.question);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an AI interaction with knowledge_recall type', async () => {
    const teacher = await createTestUser('teacher');
    const student = await createTestUser('student');
    const course = await createTestCourse(teacher.id);
    await enrollStudent(student.id, course.id);

    const input: CreateAiInteractionInput = {
      student_id: student.id,
      course_id: course.id,
      content_id: null,
      question: 'Generate practice questions for this topic',
      interaction_type: 'knowledge_recall'
    };

    const result = await createAiInteraction(input);

    expect(result.interaction_type).toEqual('knowledge_recall');
    expect(result.response).toContain('practice questions');
    expect(result.response).toContain('key concepts');
    expect(result.content_id).toBeNull();
  });

  it('should create an AI interaction with quiz_generation type', async () => {
    const teacher = await createTestUser('teacher');
    const student = await createTestUser('student');
    const course = await createTestCourse(teacher.id);
    await enrollStudent(student.id, course.id);

    const input: CreateAiInteractionInput = {
      student_id: student.id,
      course_id: course.id,
      content_id: null,
      question: 'Create quiz questions about this material',
      interaction_type: 'quiz_generation'
    };

    const result = await createAiInteraction(input);

    expect(result.interaction_type).toEqual('quiz_generation');
    expect(result.response).toContain('Quiz questions generated');
    expect(result.response).toContain('Multiple Choice');
    expect(result.response).toContain('True/False');
  });

  it('should save AI interaction to database', async () => {
    const teacher = await createTestUser('teacher');
    const student = await createTestUser('student');
    const course = await createTestCourse(teacher.id);
    await enrollStudent(student.id, course.id);

    const input: CreateAiInteractionInput = {
      student_id: student.id,
      course_id: course.id,
      content_id: null,
      question: 'Test question for database persistence',
      interaction_type: 'question_answer'
    };

    const result = await createAiInteraction(input);

    // Verify the interaction was saved to the database
    const savedInteractions = await db.select()
      .from(aiInteractionsTable)
      .where(eq(aiInteractionsTable.id, result.id))
      .execute();

    expect(savedInteractions).toHaveLength(1);
    const savedInteraction = savedInteractions[0];
    expect(savedInteraction.student_id).toEqual(student.id);
    expect(savedInteraction.course_id).toEqual(course.id);
    expect(savedInteraction.question).toEqual(input.question);
    expect(savedInteraction.response).toContain('Thank you for your question');
    expect(savedInteraction.created_at).toBeInstanceOf(Date);
  });

  it('should throw error if student does not exist', async () => {
    const teacher = await createTestUser('teacher');
    const course = await createTestCourse(teacher.id);

    const input: CreateAiInteractionInput = {
      student_id: 99999, // Non-existent student ID
      course_id: course.id,
      content_id: null,
      question: 'This should fail',
      interaction_type: 'question_answer'
    };

    await expect(createAiInteraction(input)).rejects.toThrow(/Student not found/i);
  });

  it('should throw error if user is not a student', async () => {
    const teacher = await createTestUser('teacher');
    const course = await createTestCourse(teacher.id);

    const input: CreateAiInteractionInput = {
      student_id: teacher.id, // Teacher trying to create AI interaction
      course_id: course.id,
      content_id: null,
      question: 'This should fail',
      interaction_type: 'question_answer'
    };

    await expect(createAiInteraction(input)).rejects.toThrow(/not a student/i);
  });

  it('should throw error if course does not exist', async () => {
    const student = await createTestUser('student');

    const input: CreateAiInteractionInput = {
      student_id: student.id,
      course_id: 99999, // Non-existent course ID
      content_id: null,
      question: 'This should fail',
      interaction_type: 'question_answer'
    };

    await expect(createAiInteraction(input)).rejects.toThrow(/Course not found/i);
  });

  it('should throw error if student is not enrolled in course', async () => {
    const teacher = await createTestUser('teacher');
    const student = await createTestUser('student');
    const course = await createTestCourse(teacher.id);
    // Note: Not enrolling the student in the course

    const input: CreateAiInteractionInput = {
      student_id: student.id,
      course_id: course.id,
      content_id: null,
      question: 'This should fail',
      interaction_type: 'question_answer'
    };

    await expect(createAiInteraction(input)).rejects.toThrow(/not enrolled/i);
  });

  it('should throw error if content does not exist', async () => {
    const teacher = await createTestUser('teacher');
    const student = await createTestUser('student');
    const course = await createTestCourse(teacher.id);
    await enrollStudent(student.id, course.id);

    const input: CreateAiInteractionInput = {
      student_id: student.id,
      course_id: course.id,
      content_id: 99999, // Non-existent content ID
      question: 'This should fail',
      interaction_type: 'question_answer'
    };

    await expect(createAiInteraction(input)).rejects.toThrow(/Content not found/i);
  });

  it('should throw error if content does not belong to course', async () => {
    const teacher = await createTestUser('teacher');
    const student = await createTestUser('student');
    const course1 = await createTestCourse(teacher.id);
    const course2 = await createTestCourse(teacher.id);
    const content = await createTestContent(course2.id); // Content belongs to course2
    await enrollStudent(student.id, course1.id);

    const input: CreateAiInteractionInput = {
      student_id: student.id,
      course_id: course1.id, // But trying to access with course1
      content_id: content.id,
      question: 'This should fail',
      interaction_type: 'question_answer'
    };

    await expect(createAiInteraction(input)).rejects.toThrow(/does not belong to this course/i);
  });

  it('should handle interaction without content_id', async () => {
    const teacher = await createTestUser('teacher');
    const student = await createTestUser('student');
    const course = await createTestCourse(teacher.id);
    await enrollStudent(student.id, course.id);

    const input: CreateAiInteractionInput = {
      student_id: student.id,
      course_id: course.id,
      content_id: null, // No specific content
      question: 'General question about the course',
      interaction_type: 'question_answer'
    };

    const result = await createAiInteraction(input);

    expect(result.content_id).toBeNull();
    expect(result.question).toEqual(input.question);
    expect(result.response).toContain('contextual AI response');
  });
});