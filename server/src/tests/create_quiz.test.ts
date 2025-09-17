import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, contentTable, quizzesTable } from '../db/schema';
import { type CreateQuizInput } from '../schema';
import { createQuiz } from '../handlers/create_quiz';
import { eq } from 'drizzle-orm';

describe('createQuiz', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  async function createTestData() {
    // Create a teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    const teacher = teacherResult[0];

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacher.id
      })
      .returning()
      .execute();
    const course = courseResult[0];

    // Create content
    const contentResult = await db.insert(contentTable)
      .values({
        course_id: course.id,
        title: 'Test Content',
        description: 'Content for testing',
        content_type: 'quiz',
        content_data: '{"lesson": "test"}',
        order_index: 1
      })
      .returning()
      .execute();
    const content = contentResult[0];

    return { teacher, course, content };
  }

  it('should create a quiz with all fields', async () => {
    const { content } = await createTestData();

    const testInput: CreateQuizInput = {
      content_id: content.id,
      title: 'Math Quiz',
      description: 'A quiz about basic mathematics',
      time_limit_minutes: 30,
      max_attempts: 3
    };

    const result = await createQuiz(testInput);

    // Basic field validation
    expect(result.title).toEqual('Math Quiz');
    expect(result.description).toEqual('A quiz about basic mathematics');
    expect(result.content_id).toEqual(content.id);
    expect(result.time_limit_minutes).toEqual(30);
    expect(result.max_attempts).toEqual(3);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a quiz with optional fields as null', async () => {
    const { content } = await createTestData();

    const testInput: CreateQuizInput = {
      content_id: content.id,
      title: 'Simple Quiz',
      description: null,
      time_limit_minutes: null,
      max_attempts: null
    };

    const result = await createQuiz(testInput);

    expect(result.title).toEqual('Simple Quiz');
    expect(result.description).toBeNull();
    expect(result.time_limit_minutes).toBeNull();
    expect(result.max_attempts).toBeNull();
    expect(result.content_id).toEqual(content.id);
    expect(result.id).toBeDefined();
  });

  it('should save quiz to database', async () => {
    const { content } = await createTestData();

    const testInput: CreateQuizInput = {
      content_id: content.id,
      title: 'Database Quiz',
      description: 'Testing database persistence',
      time_limit_minutes: 45,
      max_attempts: 2
    };

    const result = await createQuiz(testInput);

    // Query database to verify the quiz was saved
    const quizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, result.id))
      .execute();

    expect(quizzes).toHaveLength(1);
    expect(quizzes[0].title).toEqual('Database Quiz');
    expect(quizzes[0].description).toEqual('Testing database persistence');
    expect(quizzes[0].content_id).toEqual(content.id);
    expect(quizzes[0].time_limit_minutes).toEqual(45);
    expect(quizzes[0].max_attempts).toEqual(2);
    expect(quizzes[0].created_at).toBeInstanceOf(Date);
    expect(quizzes[0].updated_at).toBeInstanceOf(Date);
  });

  it('should fail when content does not exist', async () => {
    const testInput: CreateQuizInput = {
      content_id: 999, // Non-existent content ID
      title: 'Invalid Quiz',
      description: 'This should fail',
      time_limit_minutes: 30,
      max_attempts: 1
    };

    await expect(createQuiz(testInput)).rejects.toThrow(/Content with id 999 not found/i);
  });

  it('should create multiple quizzes for the same content', async () => {
    const { content } = await createTestData();

    const quiz1Input: CreateQuizInput = {
      content_id: content.id,
      title: 'Quiz 1',
      description: 'First quiz',
      time_limit_minutes: 20,
      max_attempts: 1
    };

    const quiz2Input: CreateQuizInput = {
      content_id: content.id,
      title: 'Quiz 2',
      description: 'Second quiz',
      time_limit_minutes: 40,
      max_attempts: 2
    };

    const result1 = await createQuiz(quiz1Input);
    const result2 = await createQuiz(quiz2Input);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.title).toEqual('Quiz 1');
    expect(result2.title).toEqual('Quiz 2');
    expect(result1.content_id).toEqual(content.id);
    expect(result2.content_id).toEqual(content.id);

    // Verify both exist in database
    const allQuizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.content_id, content.id))
      .execute();

    expect(allQuizzes).toHaveLength(2);
  });

  it('should handle edge case with zero time limit and attempts', async () => {
    const { content } = await createTestData();

    const testInput: CreateQuizInput = {
      content_id: content.id,
      title: 'Edge Case Quiz',
      description: 'Testing edge cases',
      time_limit_minutes: null, // No time limit
      max_attempts: null // Unlimited attempts
    };

    const result = await createQuiz(testInput);

    expect(result.title).toEqual('Edge Case Quiz');
    expect(result.time_limit_minutes).toBeNull();
    expect(result.max_attempts).toBeNull();
    expect(result.content_id).toEqual(content.id);
  });
});