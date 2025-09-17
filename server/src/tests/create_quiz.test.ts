import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { quizzesTable, usersTable, coursesTable, lessonsTable } from '../db/schema';
import { type CreateQuizInput } from '../schema';
import { createQuiz } from '../handlers/create_quiz';
import { eq } from 'drizzle-orm';

describe('createQuiz', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a quiz with all fields', async () => {
    // Create prerequisite data: user -> course -> lesson
    const user = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: user[0].id
      })
      .returning()
      .execute();

    const lesson = await db.insert(lessonsTable)
      .values({
        course_id: course[0].id,
        title: 'Test Lesson',
        content: 'Lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const testInput: CreateQuizInput = {
      lesson_id: lesson[0].id,
      title: 'Mid-term Quiz',
      description: 'Quiz covering chapters 1-5',
      time_limit: 60
    };

    const result = await createQuiz(testInput);

    // Basic field validation
    expect(result.lesson_id).toEqual(lesson[0].id);
    expect(result.title).toEqual('Mid-term Quiz');
    expect(result.description).toEqual('Quiz covering chapters 1-5');
    expect(result.time_limit).toEqual(60);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a quiz with minimal fields (null description and time_limit)', async () => {
    // Create prerequisite data: user -> course -> lesson
    const user = await db.insert(usersTable)
      .values({
        email: 'teacher2@example.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course 2',
        description: 'Another test course',
        teacher_id: user[0].id
      })
      .returning()
      .execute();

    const lesson = await db.insert(lessonsTable)
      .values({
        course_id: course[0].id,
        title: 'Test Lesson 2',
        content: 'Lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const testInput: CreateQuizInput = {
      lesson_id: lesson[0].id,
      title: 'Simple Quiz',
      description: null,
      time_limit: null
    };

    const result = await createQuiz(testInput);

    expect(result.lesson_id).toEqual(lesson[0].id);
    expect(result.title).toEqual('Simple Quiz');
    expect(result.description).toBeNull();
    expect(result.time_limit).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save quiz to database', async () => {
    // Create prerequisite data: user -> course -> lesson
    const user = await db.insert(usersTable)
      .values({
        email: 'teacher3@example.com',
        password_hash: 'hashed_password',
        first_name: 'Bob',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course 3',
        description: 'Yet another test course',
        teacher_id: user[0].id
      })
      .returning()
      .execute();

    const lesson = await db.insert(lessonsTable)
      .values({
        course_id: course[0].id,
        title: 'Test Lesson 3',
        content: 'Lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const testInput: CreateQuizInput = {
      lesson_id: lesson[0].id,
      title: 'Final Quiz',
      description: 'Comprehensive final quiz',
      time_limit: 90
    };

    const result = await createQuiz(testInput);

    // Query the database to verify the quiz was saved
    const quizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, result.id))
      .execute();

    expect(quizzes).toHaveLength(1);
    expect(quizzes[0].lesson_id).toEqual(lesson[0].id);
    expect(quizzes[0].title).toEqual('Final Quiz');
    expect(quizzes[0].description).toEqual('Comprehensive final quiz');
    expect(quizzes[0].time_limit).toEqual(90);
    expect(quizzes[0].created_at).toBeInstanceOf(Date);
    expect(quizzes[0].updated_at).toBeInstanceOf(Date);
  });

  it('should fail when lesson_id does not exist', async () => {
    const testInput: CreateQuizInput = {
      lesson_id: 999999, // Non-existent lesson ID
      title: 'Invalid Quiz',
      description: 'This should fail',
      time_limit: 30
    };

    // Should throw error due to foreign key constraint violation
    await expect(createQuiz(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});