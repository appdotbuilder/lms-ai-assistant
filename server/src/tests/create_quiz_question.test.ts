import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, quizzesTable, quizQuestionsTable } from '../db/schema';
import { type CreateQuizQuestionInput } from '../schema';
import { createQuizQuestion } from '../handlers/create_quiz_question';
import { eq } from 'drizzle-orm';

// Test input for multiple choice question
const testMultipleChoiceInput: CreateQuizQuestionInput = {
  quiz_id: 1,
  question_text: 'What is the capital of France?',
  question_type: 'multiple_choice',
  options: ['London', 'Berlin', 'Paris', 'Madrid'],
  correct_answer: 'Paris',
  points: 10,
  order_index: 1
};

// Test input for true/false question
const testTrueFalseInput: CreateQuizQuestionInput = {
  quiz_id: 1,
  question_text: 'The Earth is flat.',
  question_type: 'true_false',
  options: ['True', 'False'],
  correct_answer: 'False',
  points: 5,
  order_index: 2
};

describe('createQuizQuestion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create prerequisite data: user, course, lesson, and quiz
    const user = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
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
        description: 'A course for testing',
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

    await db.insert(quizzesTable)
      .values({
        id: 1,
        lesson_id: lesson[0].id,
        title: 'Test Quiz',
        description: 'A quiz for testing',
        time_limit: 30
      })
      .execute();
  });

  it('should create a multiple choice quiz question', async () => {
    const result = await createQuizQuestion(testMultipleChoiceInput);

    // Basic field validation
    expect(result.quiz_id).toEqual(1);
    expect(result.question_text).toEqual('What is the capital of France?');
    expect(result.question_type).toEqual('multiple_choice');
    expect(result.options).toEqual(['London', 'Berlin', 'Paris', 'Madrid']);
    expect(result.correct_answer).toEqual('Paris');
    expect(result.points).toEqual(10);
    expect(result.order_index).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a true/false quiz question', async () => {
    const result = await createQuizQuestion(testTrueFalseInput);

    // Basic field validation
    expect(result.quiz_id).toEqual(1);
    expect(result.question_text).toEqual('The Earth is flat.');
    expect(result.question_type).toEqual('true_false');
    expect(result.options).toEqual(['True', 'False']);
    expect(result.correct_answer).toEqual('False');
    expect(result.points).toEqual(5);
    expect(result.order_index).toEqual(2);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save quiz question to database', async () => {
    const result = await createQuizQuestion(testMultipleChoiceInput);

    // Query the database to verify the question was saved
    const questions = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.id, result.id))
      .execute();

    expect(questions).toHaveLength(1);
    expect(questions[0].quiz_id).toEqual(1);
    expect(questions[0].question_text).toEqual('What is the capital of France?');
    expect(questions[0].question_type).toEqual('multiple_choice');
    expect(questions[0].options).toEqual(['London', 'Berlin', 'Paris', 'Madrid']);
    expect(questions[0].correct_answer).toEqual('Paris');
    expect(questions[0].points).toEqual(10);
    expect(questions[0].order_index).toEqual(1);
    expect(questions[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle multiple questions for the same quiz', async () => {
    // Create first question
    const result1 = await createQuizQuestion(testMultipleChoiceInput);
    
    // Create second question
    const result2 = await createQuizQuestion(testTrueFalseInput);

    // Verify both questions exist in database
    const questions = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, 1))
      .execute();

    expect(questions).toHaveLength(2);
    expect(questions.map(q => q.id)).toContain(result1.id);
    expect(questions.map(q => q.id)).toContain(result2.id);
    expect(questions.map(q => q.question_type)).toContain('multiple_choice');
    expect(questions.map(q => q.question_type)).toContain('true_false');
  });

  it('should handle questions with different point values', async () => {
    const highValueQuestion: CreateQuizQuestionInput = {
      ...testMultipleChoiceInput,
      question_text: 'High value question',
      points: 25,
      order_index: 1
    };

    const result = await createQuizQuestion(highValueQuestion);

    expect(result.points).toEqual(25);
    expect(result.question_text).toEqual('High value question');
  });

  it('should throw error for non-existent quiz', async () => {
    const invalidInput: CreateQuizQuestionInput = {
      ...testMultipleChoiceInput,
      quiz_id: 999 // Non-existent quiz
    };

    await expect(createQuizQuestion(invalidInput)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should handle questions with complex options arrays', async () => {
    const complexQuestion: CreateQuizQuestionInput = {
      quiz_id: 1,
      question_text: 'Which of the following are programming languages?',
      question_type: 'multiple_choice',
      options: ['JavaScript', 'HTML', 'Python', 'CSS', 'Java'],
      correct_answer: 'JavaScript',
      points: 15,
      order_index: 1
    };

    const result = await createQuizQuestion(complexQuestion);

    expect(result.options).toHaveLength(5);
    expect(result.options).toContain('JavaScript');
    expect(result.options).toContain('Python');
    expect(result.options).toContain('Java');
    expect(result.correct_answer).toEqual('JavaScript');
  });
});