import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, contentTable, quizzesTable, quizQuestionsTable } from '../db/schema';
import { getQuizQuestions } from '../handlers/get_quiz_questions';
import { type CreateUserInput, type CreateCourseInput, type CreateContentInput, type CreateQuizInput, type CreateQuizQuestionInput } from '../schema';
import { eq } from 'drizzle-orm';

// Test data setup
const testUserInput: CreateUserInput = {
  email: 'teacher@test.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Teacher',
  role: 'teacher'
};

const testCourseInput: CreateCourseInput = {
  title: 'Test Course',
  description: 'A test course',
  teacher_id: 1 // Will be set after user creation
};

const testContentInput: CreateContentInput = {
  course_id: 1, // Will be set after course creation
  title: 'Test Lesson',
  description: 'A test lesson',
  content_type: 'quiz',
  content_data: '{"lesson": "content"}',
  order_index: 0
};

const testQuizInput: CreateQuizInput = {
  content_id: 1, // Will be set after content creation
  title: 'Test Quiz',
  description: 'A test quiz',
  time_limit_minutes: 30,
  max_attempts: 3
};

const testQuestion1Input: CreateQuizQuestionInput = {
  quiz_id: 1, // Will be set after quiz creation
  question_text: 'What is 2 + 2?',
  question_type: 'multiple_choice',
  correct_answer: '4',
  options: '["2", "3", "4", "5"]',
  points: 5.0,
  order_index: 0
};

const testQuestion2Input: CreateQuizQuestionInput = {
  quiz_id: 1, // Will be set after quiz creation
  question_text: 'Is the sky blue?',
  question_type: 'true_false',
  correct_answer: 'true',
  options: null,
  points: 3.5,
  order_index: 1
};

const testQuestion3Input: CreateQuizQuestionInput = {
  quiz_id: 1, // Will be set after quiz creation
  question_text: 'Explain photosynthesis',
  question_type: 'short_answer',
  correct_answer: 'Process where plants convert sunlight to energy',
  options: null,
  points: 10.0,
  order_index: 2
};

describe('getQuizQuestions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all questions for a quiz ordered by order_index', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        first_name: testUserInput.first_name,
        last_name: testUserInput.last_name,
        role: testUserInput.role
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourseInput,
        teacher_id: userResult[0].id
      })
      .returning()
      .execute();

    const contentResult = await db.insert(contentTable)
      .values({
        ...testContentInput,
        course_id: courseResult[0].id
      })
      .returning()
      .execute();

    const quizResult = await db.insert(quizzesTable)
      .values({
        ...testQuizInput,
        content_id: contentResult[0].id
      })
      .returning()
      .execute();

    // Create quiz questions in different order to test ordering
    await db.insert(quizQuestionsTable)
      .values([
        {
          ...testQuestion3Input, // order_index: 2
          quiz_id: quizResult[0].id,
          points: testQuestion3Input.points.toString()
        },
        {
          ...testQuestion1Input, // order_index: 0
          quiz_id: quizResult[0].id,
          points: testQuestion1Input.points.toString()
        },
        {
          ...testQuestion2Input, // order_index: 1
          quiz_id: quizResult[0].id,
          points: testQuestion2Input.points.toString()
        }
      ])
      .execute();

    const result = await getQuizQuestions(quizResult[0].id);

    // Should return 3 questions
    expect(result).toHaveLength(3);

    // Should be ordered by order_index (0, 1, 2)
    expect(result[0].order_index).toBe(0);
    expect(result[0].question_text).toBe('What is 2 + 2?');
    expect(result[0].question_type).toBe('multiple_choice');
    expect(result[0].correct_answer).toBe('4');
    expect(result[0].options).toBe('["2", "3", "4", "5"]');
    expect(result[0].points).toBe(5.0);
    expect(typeof result[0].points).toBe('number');

    expect(result[1].order_index).toBe(1);
    expect(result[1].question_text).toBe('Is the sky blue?');
    expect(result[1].question_type).toBe('true_false');
    expect(result[1].correct_answer).toBe('true');
    expect(result[1].options).toBeNull();
    expect(result[1].points).toBe(3.5);
    expect(typeof result[1].points).toBe('number');

    expect(result[2].order_index).toBe(2);
    expect(result[2].question_text).toBe('Explain photosynthesis');
    expect(result[2].question_type).toBe('short_answer');
    expect(result[2].correct_answer).toBe('Process where plants convert sunlight to energy');
    expect(result[2].options).toBeNull();
    expect(result[2].points).toBe(10.0);
    expect(typeof result[2].points).toBe('number');

    // All questions should have the correct quiz_id
    result.forEach(question => {
      expect(question.quiz_id).toBe(quizResult[0].id);
      expect(question.id).toBeDefined();
      expect(question.created_at).toBeInstanceOf(Date);
      expect(question.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for non-existent quiz', async () => {
    const result = await getQuizQuestions(999);
    
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for quiz with no questions', async () => {
    // Create quiz with no questions
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        first_name: testUserInput.first_name,
        last_name: testUserInput.last_name,
        role: testUserInput.role
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourseInput,
        teacher_id: userResult[0].id
      })
      .returning()
      .execute();

    const contentResult = await db.insert(contentTable)
      .values({
        ...testContentInput,
        course_id: courseResult[0].id
      })
      .returning()
      .execute();

    const quizResult = await db.insert(quizzesTable)
      .values({
        ...testQuizInput,
        content_id: contentResult[0].id
      })
      .returning()
      .execute();

    const result = await getQuizQuestions(quizResult[0].id);
    
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle single question correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        first_name: testUserInput.first_name,
        last_name: testUserInput.last_name,
        role: testUserInput.role
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourseInput,
        teacher_id: userResult[0].id
      })
      .returning()
      .execute();

    const contentResult = await db.insert(contentTable)
      .values({
        ...testContentInput,
        course_id: courseResult[0].id
      })
      .returning()
      .execute();

    const quizResult = await db.insert(quizzesTable)
      .values({
        ...testQuizInput,
        content_id: contentResult[0].id
      })
      .returning()
      .execute();

    // Create single question
    await db.insert(quizQuestionsTable)
      .values({
        ...testQuestion1Input,
        quiz_id: quizResult[0].id,
        points: testQuestion1Input.points.toString()
      })
      .execute();

    const result = await getQuizQuestions(quizResult[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].question_text).toBe('What is 2 + 2?');
    expect(result[0].points).toBe(5.0);
    expect(typeof result[0].points).toBe('number');
  });

  it('should handle different question types correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        first_name: testUserInput.first_name,
        last_name: testUserInput.last_name,
        role: testUserInput.role
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourseInput,
        teacher_id: userResult[0].id
      })
      .returning()
      .execute();

    const contentResult = await db.insert(contentTable)
      .values({
        ...testContentInput,
        course_id: courseResult[0].id
      })
      .returning()
      .execute();

    const quizResult = await db.insert(quizzesTable)
      .values({
        ...testQuizInput,
        content_id: contentResult[0].id
      })
      .returning()
      .execute();

    await db.insert(quizQuestionsTable)
      .values([
        {
          ...testQuestion1Input,
          quiz_id: quizResult[0].id,
          points: testQuestion1Input.points.toString()
        },
        {
          ...testQuestion2Input,
          quiz_id: quizResult[0].id,
          points: testQuestion2Input.points.toString()
        },
        {
          ...testQuestion3Input,
          quiz_id: quizResult[0].id,
          points: testQuestion3Input.points.toString()
        }
      ])
      .execute();

    const result = await getQuizQuestions(quizResult[0].id);

    // Verify each question type
    const multipleChoice = result.find(q => q.question_type === 'multiple_choice');
    expect(multipleChoice?.options).toBe('["2", "3", "4", "5"]');
    expect(multipleChoice?.correct_answer).toBe('4');

    const trueFalse = result.find(q => q.question_type === 'true_false');
    expect(trueFalse?.options).toBeNull();
    expect(trueFalse?.correct_answer).toBe('true');

    const shortAnswer = result.find(q => q.question_type === 'short_answer');
    expect(shortAnswer?.options).toBeNull();
    expect(shortAnswer?.correct_answer).toBe('Process where plants convert sunlight to energy');
  });

  it('should verify questions are saved to database correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        first_name: testUserInput.first_name,
        last_name: testUserInput.last_name,
        role: testUserInput.role
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourseInput,
        teacher_id: userResult[0].id
      })
      .returning()
      .execute();

    const contentResult = await db.insert(contentTable)
      .values({
        ...testContentInput,
        course_id: courseResult[0].id
      })
      .returning()
      .execute();

    const quizResult = await db.insert(quizzesTable)
      .values({
        ...testQuizInput,
        content_id: contentResult[0].id
      })
      .returning()
      .execute();

    await db.insert(quizQuestionsTable)
      .values({
        ...testQuestion1Input,
        quiz_id: quizResult[0].id,
        points: testQuestion1Input.points.toString()
      })
      .execute();

    const handlerResult = await getQuizQuestions(quizResult[0].id);

    // Verify in database
    const dbQuestions = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, quizResult[0].id))
      .execute();

    expect(dbQuestions).toHaveLength(1);
    expect(dbQuestions[0].question_text).toBe('What is 2 + 2?');
    expect(parseFloat(dbQuestions[0].points)).toBe(5.0);

    // Verify handler returns correct data
    expect(handlerResult).toHaveLength(1);
    expect(handlerResult[0].question_text).toBe('What is 2 + 2?');
    expect(handlerResult[0].points).toBe(5.0);
    expect(typeof handlerResult[0].points).toBe('number');
  });
});