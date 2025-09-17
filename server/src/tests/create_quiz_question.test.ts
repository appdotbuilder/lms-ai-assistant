import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, contentTable, quizzesTable, quizQuestionsTable } from '../db/schema';
import { type CreateQuizQuestionInput } from '../schema';
import { createQuizQuestion } from '../handlers/create_quiz_question';
import { eq } from 'drizzle-orm';

describe('createQuizQuestion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let quizId: number;

  beforeEach(async () => {
    // Create prerequisite data for each test
    // Create teacher user
    const teacher = await db.insert(usersTable)
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
    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacher[0].id
      })
      .returning()
      .execute();

    // Create content
    const content = await db.insert(contentTable)
      .values({
        course_id: course[0].id,
        title: 'Test Content',
        description: 'Content for testing',
        content_type: 'quiz',
        content_data: '{"test": true}',
        order_index: 1
      })
      .returning()
      .execute();

    // Create quiz
    const quiz = await db.insert(quizzesTable)
      .values({
        content_id: content[0].id,
        title: 'Test Quiz',
        description: 'A quiz for testing',
        time_limit_minutes: 30,
        max_attempts: 3
      })
      .returning()
      .execute();

    quizId = quiz[0].id;
  });

  it('should create a multiple choice quiz question', async () => {
    const testInput: CreateQuizQuestionInput = {
      quiz_id: quizId,
      question_text: 'What is 2 + 2?',
      question_type: 'multiple_choice',
      correct_answer: '4',
      options: JSON.stringify(['2', '3', '4', '5']),
      points: 10.5,
      order_index: 1
    };

    const result = await createQuizQuestion(testInput);

    // Basic field validation
    expect(result.quiz_id).toEqual(quizId);
    expect(result.question_text).toEqual('What is 2 + 2?');
    expect(result.question_type).toEqual('multiple_choice');
    expect(result.correct_answer).toEqual('4');
    expect(result.options).toEqual(JSON.stringify(['2', '3', '4', '5']));
    expect(result.points).toEqual(10.5);
    expect(typeof result.points).toEqual('number'); // Verify numeric conversion
    expect(result.order_index).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a true/false quiz question', async () => {
    const testInput: CreateQuizQuestionInput = {
      quiz_id: quizId,
      question_text: 'The sky is blue.',
      question_type: 'true_false',
      correct_answer: 'true',
      options: null,
      points: 5,
      order_index: 2
    };

    const result = await createQuizQuestion(testInput);

    expect(result.question_type).toEqual('true_false');
    expect(result.correct_answer).toEqual('true');
    expect(result.options).toBeNull();
    expect(result.points).toEqual(5);
    expect(typeof result.points).toEqual('number');
  });

  it('should create a short answer quiz question', async () => {
    const testInput: CreateQuizQuestionInput = {
      quiz_id: quizId,
      question_text: 'What is the capital of France?',
      question_type: 'short_answer',
      correct_answer: 'Paris',
      options: null,
      points: 15.75,
      order_index: 3
    };

    const result = await createQuizQuestion(testInput);

    expect(result.question_type).toEqual('short_answer');
    expect(result.correct_answer).toEqual('Paris');
    expect(result.options).toBeNull();
    expect(result.points).toEqual(15.75);
    expect(typeof result.points).toEqual('number');
  });

  it('should save quiz question to database', async () => {
    const testInput: CreateQuizQuestionInput = {
      quiz_id: quizId,
      question_text: 'What is 2 + 2?',
      question_type: 'multiple_choice',
      correct_answer: '4',
      options: JSON.stringify(['2', '3', '4', '5']),
      points: 10,
      order_index: 1
    };

    const result = await createQuizQuestion(testInput);

    // Query using proper drizzle syntax
    const quizQuestions = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.id, result.id))
      .execute();

    expect(quizQuestions).toHaveLength(1);
    expect(quizQuestions[0].question_text).toEqual('What is 2 + 2?');
    expect(quizQuestions[0].question_type).toEqual('multiple_choice');
    expect(quizQuestions[0].correct_answer).toEqual('4');
    expect(quizQuestions[0].options).toEqual(JSON.stringify(['2', '3', '4', '5']));
    expect(parseFloat(quizQuestions[0].points)).toEqual(10);
    expect(quizQuestions[0].created_at).toBeInstanceOf(Date);
    expect(quizQuestions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when quiz does not exist', async () => {
    const testInput: CreateQuizQuestionInput = {
      quiz_id: 99999, // Non-existent quiz ID
      question_text: 'What is 2 + 2?',
      question_type: 'multiple_choice',
      correct_answer: '4',
      options: JSON.stringify(['2', '3', '4', '5']),
      points: 10,
      order_index: 1
    };

    await expect(createQuizQuestion(testInput)).rejects.toThrow(/quiz with id 99999 not found/i);
  });

  it('should throw error when multiple choice question has no options', async () => {
    const testInput: CreateQuizQuestionInput = {
      quiz_id: quizId,
      question_text: 'What is 2 + 2?',
      question_type: 'multiple_choice',
      correct_answer: '4',
      options: null,
      points: 10,
      order_index: 1
    };

    await expect(createQuizQuestion(testInput)).rejects.toThrow(/options are required for multiple choice questions/i);
  });

  it('should throw error when multiple choice question has invalid JSON options', async () => {
    const testInput: CreateQuizQuestionInput = {
      quiz_id: quizId,
      question_text: 'What is 2 + 2?',
      question_type: 'multiple_choice',
      correct_answer: '4',
      options: 'invalid json',
      points: 10,
      order_index: 1
    };

    await expect(createQuizQuestion(testInput)).rejects.toThrow(/options must be valid json/i);
  });

  it('should handle decimal points correctly', async () => {
    const testInput: CreateQuizQuestionInput = {
      quiz_id: quizId,
      question_text: 'Complex question',
      question_type: 'short_answer',
      correct_answer: 'Complex answer',
      options: null,
      points: 7.25,
      order_index: 1
    };

    const result = await createQuizQuestion(testInput);

    // Verify numeric conversion maintains precision
    expect(result.points).toEqual(7.25);
    expect(typeof result.points).toEqual('number');

    // Verify database storage
    const stored = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.id, result.id))
      .execute();

    expect(parseFloat(stored[0].points)).toEqual(7.25);
  });

  it('should handle valid JSON options for multiple choice', async () => {
    const options = ['Option A', 'Option B', 'Option C', 'Option D'];
    const testInput: CreateQuizQuestionInput = {
      quiz_id: quizId,
      question_text: 'Choose the correct option',
      question_type: 'multiple_choice',
      correct_answer: 'Option A',
      options: JSON.stringify(options),
      points: 12,
      order_index: 1
    };

    const result = await createQuizQuestion(testInput);

    expect(result.options).toEqual(JSON.stringify(options));
    expect(JSON.parse(result.options!)).toEqual(options);
  });
});