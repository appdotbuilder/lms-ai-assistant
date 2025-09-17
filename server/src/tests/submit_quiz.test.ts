import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, quizzesTable, quizQuestionsTable, quizSubmissionsTable } from '../db/schema';
import { type SubmitQuizInput } from '../schema';
import { submitQuiz } from '../handlers/submit_quiz';
import { eq } from 'drizzle-orm';

describe('submitQuiz', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createTestData = async () => {
    // Create teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create student user
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Student',
        role: 'student'
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
        content: 'Test lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    // Create quiz
    const quizResult = await db.insert(quizzesTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit: 30
      })
      .returning()
      .execute();

    // Create quiz questions
    const question1Result = await db.insert(quizQuestionsTable)
      .values({
        quiz_id: quizResult[0].id,
        question_text: 'What is 2 + 2?',
        question_type: 'multiple_choice',
        options: ['2', '3', '4', '5'],
        correct_answer: '4',
        points: 10,
        order_index: 1
      })
      .returning()
      .execute();

    const question2Result = await db.insert(quizQuestionsTable)
      .values({
        quiz_id: quizResult[0].id,
        question_text: 'Is the sky blue?',
        question_type: 'true_false',
        options: ['true', 'false'],
        correct_answer: 'true',
        points: 5,
        order_index: 2
      })
      .returning()
      .execute();

    return {
      teacher: teacherResult[0],
      student: studentResult[0],
      course: courseResult[0],
      lesson: lessonResult[0],
      quiz: quizResult[0],
      question1: question1Result[0],
      question2: question2Result[0]
    };
  };

  it('should submit quiz with correct answers and calculate perfect score', async () => {
    const testData = await createTestData();

    const input: SubmitQuizInput = {
      quiz_id: testData.quiz.id,
      student_id: testData.student.id,
      answers: {
        [testData.question1.id.toString()]: '4',
        [testData.question2.id.toString()]: 'true'
      }
    };

    const result = await submitQuiz(input);

    // Verify submission fields
    expect(result.quiz_id).toEqual(testData.quiz.id);
    expect(result.student_id).toEqual(testData.student.id);
    expect(result.answers).toEqual(input.answers);
    expect(result.score).toEqual(15); // 10 + 5 points
    expect(result.id).toBeDefined();
    expect(result.submitted_at).toBeInstanceOf(Date);
  });

  it('should submit quiz with partial correct answers and calculate partial score', async () => {
    const testData = await createTestData();

    const input: SubmitQuizInput = {
      quiz_id: testData.quiz.id,
      student_id: testData.student.id,
      answers: {
        [testData.question1.id.toString()]: '4', // Correct
        [testData.question2.id.toString()]: 'false' // Incorrect
      }
    };

    const result = await submitQuiz(input);

    expect(result.score).toEqual(10); // Only question 1 correct
    expect(result.answers).toEqual(input.answers);
  });

  it('should submit quiz with all incorrect answers and calculate zero score', async () => {
    const testData = await createTestData();

    const input: SubmitQuizInput = {
      quiz_id: testData.quiz.id,
      student_id: testData.student.id,
      answers: {
        [testData.question1.id.toString()]: '3', // Incorrect
        [testData.question2.id.toString()]: 'false' // Incorrect
      }
    };

    const result = await submitQuiz(input);

    expect(result.score).toEqual(0);
    expect(result.answers).toEqual(input.answers);
  });

  it('should submit quiz with missing answers and calculate partial score', async () => {
    const testData = await createTestData();

    const input: SubmitQuizInput = {
      quiz_id: testData.quiz.id,
      student_id: testData.student.id,
      answers: {
        [testData.question1.id.toString()]: '4'
        // Missing answer for question 2
      }
    };

    const result = await submitQuiz(input);

    expect(result.score).toEqual(10); // Only question 1 answered correctly
    expect(result.answers).toEqual(input.answers);
  });

  it('should save submission to database', async () => {
    const testData = await createTestData();

    const input: SubmitQuizInput = {
      quiz_id: testData.quiz.id,
      student_id: testData.student.id,
      answers: {
        [testData.question1.id.toString()]: '4',
        [testData.question2.id.toString()]: 'true'
      }
    };

    const result = await submitQuiz(input);

    // Query database to verify submission was saved
    const submissions = await db.select()
      .from(quizSubmissionsTable)
      .where(eq(quizSubmissionsTable.id, result.id))
      .execute();

    expect(submissions).toHaveLength(1);
    expect(submissions[0].quiz_id).toEqual(testData.quiz.id);
    expect(submissions[0].student_id).toEqual(testData.student.id);
    expect(submissions[0].score).toEqual(15);
    expect(submissions[0].submitted_at).toBeInstanceOf(Date);
  });

  it('should handle quiz with no questions and return zero score', async () => {
    const testData = await createTestData();

    // Delete all questions from the quiz
    await db.delete(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, testData.quiz.id))
      .execute();

    const input: SubmitQuizInput = {
      quiz_id: testData.quiz.id,
      student_id: testData.student.id,
      answers: {}
    };

    const result = await submitQuiz(input);

    expect(result.score).toEqual(0);
    expect(result.answers).toEqual({});
  });

  it('should handle submission with extra answers not matching any questions', async () => {
    const testData = await createTestData();

    const input: SubmitQuizInput = {
      quiz_id: testData.quiz.id,
      student_id: testData.student.id,
      answers: {
        [testData.question1.id.toString()]: '4',
        [testData.question2.id.toString()]: 'true',
        '9999': 'extra answer' // Non-existent question ID
      }
    };

    const result = await submitQuiz(input);

    expect(result.score).toEqual(15); // Should still calculate correctly for valid questions
    expect(result.answers).toEqual(input.answers); // Should preserve all answers as submitted
  });
});