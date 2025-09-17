import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, quizzesTable } from '../db/schema';
import { type UpdateQuizInput } from '../schema';
import { updateQuiz } from '../handlers/update_quiz';
import { eq } from 'drizzle-orm';

describe('updateQuiz', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create teacher user
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

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    // Create lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    // Create quiz
    const quizResult = await db.insert(quizzesTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Original Quiz Title',
        description: 'Original description',
        time_limit: 60
      })
      .returning()
      .execute();

    return {
      teacher: teacherResult[0],
      course: courseResult[0],
      lesson: lessonResult[0],
      quiz: quizResult[0]
    };
  };

  it('should update quiz title', async () => {
    const testData = await createTestData();

    const updateInput: UpdateQuizInput = {
      id: testData.quiz.id,
      title: 'Updated Quiz Title'
    };

    const result = await updateQuiz(updateInput);

    expect(result.id).toEqual(testData.quiz.id);
    expect(result.title).toEqual('Updated Quiz Title');
    expect(result.description).toEqual('Original description');
    expect(result.time_limit).toEqual(60);
    expect(result.lesson_id).toEqual(testData.lesson.id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testData.quiz.updated_at.getTime());
  });

  it('should update quiz description', async () => {
    const testData = await createTestData();

    const updateInput: UpdateQuizInput = {
      id: testData.quiz.id,
      description: 'Updated description'
    };

    const result = await updateQuiz(updateInput);

    expect(result.id).toEqual(testData.quiz.id);
    expect(result.title).toEqual('Original Quiz Title');
    expect(result.description).toEqual('Updated description');
    expect(result.time_limit).toEqual(60);
    expect(result.lesson_id).toEqual(testData.lesson.id);
  });

  it('should update quiz description to null', async () => {
    const testData = await createTestData();

    const updateInput: UpdateQuizInput = {
      id: testData.quiz.id,
      description: null
    };

    const result = await updateQuiz(updateInput);

    expect(result.id).toEqual(testData.quiz.id);
    expect(result.title).toEqual('Original Quiz Title');
    expect(result.description).toBeNull();
    expect(result.time_limit).toEqual(60);
    expect(result.lesson_id).toEqual(testData.lesson.id);
  });

  it('should update quiz time limit', async () => {
    const testData = await createTestData();

    const updateInput: UpdateQuizInput = {
      id: testData.quiz.id,
      time_limit: 120
    };

    const result = await updateQuiz(updateInput);

    expect(result.id).toEqual(testData.quiz.id);
    expect(result.title).toEqual('Original Quiz Title');
    expect(result.description).toEqual('Original description');
    expect(result.time_limit).toEqual(120);
    expect(result.lesson_id).toEqual(testData.lesson.id);
  });

  it('should update quiz time limit to null', async () => {
    const testData = await createTestData();

    const updateInput: UpdateQuizInput = {
      id: testData.quiz.id,
      time_limit: null
    };

    const result = await updateQuiz(updateInput);

    expect(result.id).toEqual(testData.quiz.id);
    expect(result.title).toEqual('Original Quiz Title');
    expect(result.description).toEqual('Original description');
    expect(result.time_limit).toBeNull();
    expect(result.lesson_id).toEqual(testData.lesson.id);
  });

  it('should update multiple fields simultaneously', async () => {
    const testData = await createTestData();

    const updateInput: UpdateQuizInput = {
      id: testData.quiz.id,
      title: 'Completely New Title',
      description: 'Completely new description',
      time_limit: 45
    };

    const result = await updateQuiz(updateInput);

    expect(result.id).toEqual(testData.quiz.id);
    expect(result.title).toEqual('Completely New Title');
    expect(result.description).toEqual('Completely new description');
    expect(result.time_limit).toEqual(45);
    expect(result.lesson_id).toEqual(testData.lesson.id);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updates to database', async () => {
    const testData = await createTestData();

    const updateInput: UpdateQuizInput = {
      id: testData.quiz.id,
      title: 'Database Test Title',
      description: 'Database test description'
    };

    await updateQuiz(updateInput);

    // Verify in database
    const updatedQuizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, testData.quiz.id))
      .execute();

    expect(updatedQuizzes).toHaveLength(1);
    expect(updatedQuizzes[0].title).toEqual('Database Test Title');
    expect(updatedQuizzes[0].description).toEqual('Database test description');
    expect(updatedQuizzes[0].time_limit).toEqual(60); // Should remain unchanged
    expect(updatedQuizzes[0].updated_at).toBeInstanceOf(Date);
    expect(updatedQuizzes[0].updated_at.getTime()).toBeGreaterThan(testData.quiz.updated_at.getTime());
  });

  it('should throw error when quiz does not exist', async () => {
    const updateInput: UpdateQuizInput = {
      id: 999999, // Non-existent quiz ID
      title: 'New Title'
    };

    await expect(updateQuiz(updateInput)).rejects.toThrow(/quiz not found/i);
  });

  it('should handle partial updates correctly', async () => {
    const testData = await createTestData();

    // Update only title
    const titleUpdate: UpdateQuizInput = {
      id: testData.quiz.id,
      title: 'Only Title Updated'
    };

    const result1 = await updateQuiz(titleUpdate);
    expect(result1.title).toEqual('Only Title Updated');
    expect(result1.description).toEqual('Original description');
    expect(result1.time_limit).toEqual(60);

    // Update only description
    const descriptionUpdate: UpdateQuizInput = {
      id: testData.quiz.id,
      description: 'Only Description Updated'
    };

    const result2 = await updateQuiz(descriptionUpdate);
    expect(result2.title).toEqual('Only Title Updated'); // Should keep previous update
    expect(result2.description).toEqual('Only Description Updated');
    expect(result2.time_limit).toEqual(60);

    // Update only time limit
    const timeLimitUpdate: UpdateQuizInput = {
      id: testData.quiz.id,
      time_limit: 90
    };

    const result3 = await updateQuiz(timeLimitUpdate);
    expect(result3.title).toEqual('Only Title Updated'); // Should keep previous update
    expect(result3.description).toEqual('Only Description Updated'); // Should keep previous update
    expect(result3.time_limit).toEqual(90);
  });
});