import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, quizzesTable, quizQuestionsTable } from '../db/schema';
import { getQuizQuestions } from '../handlers/get_quiz_questions';

describe('getQuizQuestions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return quiz questions ordered by order_index', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      email: 'teacher@example.com',
      password_hash: 'hashed_password',
      first_name: 'John',
      last_name: 'Doe',
      role: 'teacher'
    }).returning().execute();

    const course = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A course for testing',
      teacher_id: user[0].id
    }).returning().execute();

    const lesson = await db.insert(lessonsTable).values({
      course_id: course[0].id,
      title: 'Test Lesson',
      content: 'Lesson content',
      order_index: 1
    }).returning().execute();

    const quiz = await db.insert(quizzesTable).values({
      lesson_id: lesson[0].id,
      title: 'Test Quiz',
      description: 'A quiz for testing',
      time_limit: 30
    }).returning().execute();

    // Create quiz questions with different order indices
    await db.insert(quizQuestionsTable).values([
      {
        quiz_id: quiz[0].id,
        question_text: 'Question 3',
        question_type: 'multiple_choice',
        options: ['A', 'B', 'C', 'D'],
        correct_answer: 'A',
        points: 10,
        order_index: 3
      },
      {
        quiz_id: quiz[0].id,
        question_text: 'Question 1',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        points: 5,
        order_index: 1
      },
      {
        quiz_id: quiz[0].id,
        question_text: 'Question 2',
        question_type: 'multiple_choice',
        options: ['Option 1', 'Option 2', 'Option 3'],
        correct_answer: 'Option 2',
        points: 15,
        order_index: 2
      }
    ]).execute();

    const result = await getQuizQuestions(quiz[0].id);

    expect(result).toHaveLength(3);
    
    // Verify ordering by order_index
    expect(result[0].question_text).toEqual('Question 1');
    expect(result[0].order_index).toEqual(1);
    expect(result[1].question_text).toEqual('Question 2');
    expect(result[1].order_index).toEqual(2);
    expect(result[2].question_text).toEqual('Question 3');
    expect(result[2].order_index).toEqual(3);

    // Verify all fields are properly returned
    expect(result[0].quiz_id).toEqual(quiz[0].id);
    expect(result[0].question_type).toEqual('true_false');
    expect(result[0].options).toEqual(['True', 'False']);
    expect(result[0].correct_answer).toEqual('True');
    expect(result[0].points).toEqual(5);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].id).toBeDefined();
  });

  it('should return empty array for quiz with no questions', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      email: 'teacher@example.com',
      password_hash: 'hashed_password',
      first_name: 'John',
      last_name: 'Doe',
      role: 'teacher'
    }).returning().execute();

    const course = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A course for testing',
      teacher_id: user[0].id
    }).returning().execute();

    const lesson = await db.insert(lessonsTable).values({
      course_id: course[0].id,
      title: 'Test Lesson',
      content: 'Lesson content',
      order_index: 1
    }).returning().execute();

    const quiz = await db.insert(quizzesTable).values({
      lesson_id: lesson[0].id,
      title: 'Empty Quiz',
      description: 'A quiz with no questions',
      time_limit: null
    }).returning().execute();

    const result = await getQuizQuestions(quiz[0].id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent quiz', async () => {
    const result = await getQuizQuestions(99999);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle different question types correctly', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      email: 'teacher@example.com',
      password_hash: 'hashed_password',
      first_name: 'John',
      last_name: 'Doe',
      role: 'teacher'
    }).returning().execute();

    const course = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A course for testing',
      teacher_id: user[0].id
    }).returning().execute();

    const lesson = await db.insert(lessonsTable).values({
      course_id: course[0].id,
      title: 'Test Lesson',
      content: 'Lesson content',
      order_index: 1
    }).returning().execute();

    const quiz = await db.insert(quizzesTable).values({
      lesson_id: lesson[0].id,
      title: 'Mixed Question Types Quiz',
      description: 'A quiz with different question types',
      time_limit: 45
    }).returning().execute();

    // Create questions with different types
    await db.insert(quizQuestionsTable).values([
      {
        quiz_id: quiz[0].id,
        question_text: 'Multiple choice question',
        question_type: 'multiple_choice',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answer: 'Option B',
        points: 10,
        order_index: 1
      },
      {
        quiz_id: quiz[0].id,
        question_text: 'True or false question',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'False',
        points: 5,
        order_index: 2
      }
    ]).execute();

    const result = await getQuizQuestions(quiz[0].id);

    expect(result).toHaveLength(2);
    
    // Verify multiple choice question
    const multipleChoice = result[0];
    expect(multipleChoice.question_type).toEqual('multiple_choice');
    expect(multipleChoice.options).toEqual(['Option A', 'Option B', 'Option C', 'Option D']);
    expect(multipleChoice.correct_answer).toEqual('Option B');
    expect(Array.isArray(multipleChoice.options)).toBe(true);

    // Verify true/false question
    const trueFalse = result[1];
    expect(trueFalse.question_type).toEqual('true_false');
    expect(trueFalse.options).toEqual(['True', 'False']);
    expect(trueFalse.correct_answer).toEqual('False');
    expect(Array.isArray(trueFalse.options)).toBe(true);
  });

  it('should only return questions for the specified quiz', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      email: 'teacher@example.com',
      password_hash: 'hashed_password',
      first_name: 'John',
      last_name: 'Doe',
      role: 'teacher'
    }).returning().execute();

    const course = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A course for testing',
      teacher_id: user[0].id
    }).returning().execute();

    const lesson = await db.insert(lessonsTable).values({
      course_id: course[0].id,
      title: 'Test Lesson',
      content: 'Lesson content',
      order_index: 1
    }).returning().execute();

    // Create two quizzes
    const quiz1 = await db.insert(quizzesTable).values({
      lesson_id: lesson[0].id,
      title: 'Quiz 1',
      description: 'First quiz',
      time_limit: 30
    }).returning().execute();

    const quiz2 = await db.insert(quizzesTable).values({
      lesson_id: lesson[0].id,
      title: 'Quiz 2',
      description: 'Second quiz',
      time_limit: 30
    }).returning().execute();

    // Create questions for both quizzes
    await db.insert(quizQuestionsTable).values([
      {
        quiz_id: quiz1[0].id,
        question_text: 'Quiz 1 Question 1',
        question_type: 'multiple_choice',
        options: ['A', 'B', 'C'],
        correct_answer: 'A',
        points: 10,
        order_index: 1
      },
      {
        quiz_id: quiz1[0].id,
        question_text: 'Quiz 1 Question 2',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        points: 5,
        order_index: 2
      },
      {
        quiz_id: quiz2[0].id,
        question_text: 'Quiz 2 Question 1',
        question_type: 'multiple_choice',
        options: ['X', 'Y', 'Z'],
        correct_answer: 'Y',
        points: 15,
        order_index: 1
      }
    ]).execute();

    const result1 = await getQuizQuestions(quiz1[0].id);
    const result2 = await getQuizQuestions(quiz2[0].id);

    // Quiz 1 should have 2 questions
    expect(result1).toHaveLength(2);
    expect(result1[0].question_text).toEqual('Quiz 1 Question 1');
    expect(result1[1].question_text).toEqual('Quiz 1 Question 2');
    expect(result1.every(q => q.quiz_id === quiz1[0].id)).toBe(true);

    // Quiz 2 should have 1 question
    expect(result2).toHaveLength(1);
    expect(result2[0].question_text).toEqual('Quiz 2 Question 1');
    expect(result2[0].quiz_id).toEqual(quiz2[0].id);
  });
});