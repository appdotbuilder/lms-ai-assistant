import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  contentTable, 
  quizzesTable, 
  quizQuestionsTable, 
  quizAttemptsTable, 
  courseEnrollmentsTable 
} from '../db/schema';
import { type SubmitQuizAttemptInput } from '../schema';
import { submitQuizAttempt } from '../handlers/submit_quiz_attempt';
import { eq, and } from 'drizzle-orm';

describe('submitQuizAttempt', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  async function createTestData() {
    // Create teacher
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create student
    const student = await db.insert(usersTable)
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
    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacher[0].id
      })
      .returning()
      .execute();

    // Enroll student in course
    await db.insert(courseEnrollmentsTable)
      .values({
        course_id: course[0].id,
        student_id: student[0].id
      })
      .execute();

    // Create content
    const content = await db.insert(contentTable)
      .values({
        course_id: course[0].id,
        title: 'Quiz Content',
        description: 'Content with a quiz',
        content_type: 'quiz',
        content_data: '{}',
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

    // Create quiz questions
    const questions = await db.insert(quizQuestionsTable)
      .values([
        {
          quiz_id: quiz[0].id,
          question_text: 'What is 2 + 2?',
          question_type: 'short_answer',
          correct_answer: '4',
          options: null,
          points: '10',
          order_index: 1
        },
        {
          quiz_id: quiz[0].id,
          question_text: 'Is the sky blue?',
          question_type: 'true_false',
          correct_answer: 'true',
          options: null,
          points: '5',
          order_index: 2
        },
        {
          quiz_id: quiz[0].id,
          question_text: 'What is the capital of France?',
          question_type: 'multiple_choice',
          correct_answer: 'Paris',
          options: '["Paris", "London", "Berlin", "Madrid"]',
          points: '15',
          order_index: 3
        }
      ])
      .returning()
      .execute();

    return {
      teacher: teacher[0],
      student: student[0],
      course: course[0],
      content: content[0],
      quiz: quiz[0],
      questions
    };
  }

  it('should successfully submit a quiz attempt with all correct answers', async () => {
    const testData = await createTestData();
    
    const input: SubmitQuizAttemptInput = {
      student_id: testData.student.id,
      quiz_id: testData.quiz.id,
      answers: {
        [testData.questions[0].id]: '4',
        [testData.questions[1].id]: 'true',
        [testData.questions[2].id]: 'Paris'
      }
    };

    const result = await submitQuizAttempt(input);

    // Verify basic fields
    expect(result.student_id).toEqual(testData.student.id);
    expect(result.quiz_id).toEqual(testData.quiz.id);
    expect(result.score).toEqual(30); // 10 + 5 + 15
    expect(result.max_score).toEqual(30);
    expect(result.completed).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(typeof result.score).toBe('number');
    expect(typeof result.max_score).toBe('number');
  });

  it('should submit quiz attempt with partial correct answers', async () => {
    const testData = await createTestData();
    
    const input: SubmitQuizAttemptInput = {
      student_id: testData.student.id,
      quiz_id: testData.quiz.id,
      answers: {
        [testData.questions[0].id]: '4',      // Correct (10 points)
        [testData.questions[1].id]: 'false',  // Incorrect (0 points)
        [testData.questions[2].id]: 'London'  // Incorrect (0 points)
      }
    };

    const result = await submitQuizAttempt(input);

    expect(result.score).toEqual(10); // Only first answer correct
    expect(result.max_score).toEqual(30);
    expect(result.completed).toBe(true);
  });

  it('should save quiz attempt to database', async () => {
    const testData = await createTestData();
    
    const input: SubmitQuizAttemptInput = {
      student_id: testData.student.id,
      quiz_id: testData.quiz.id,
      answers: {
        [testData.questions[0].id]: '4'
      }
    };

    const result = await submitQuizAttempt(input);

    // Verify data was saved to database
    const attempts = await db.select()
      .from(quizAttemptsTable)
      .where(eq(quizAttemptsTable.id, result.id))
      .execute();

    expect(attempts).toHaveLength(1);
    expect(attempts[0].student_id).toEqual(testData.student.id);
    expect(attempts[0].quiz_id).toEqual(testData.quiz.id);
    expect(parseFloat(attempts[0].score!)).toEqual(10);
    expect(parseFloat(attempts[0].max_score)).toEqual(30);
    expect(attempts[0].completed).toBe(true);
  });

  it('should handle case-insensitive answer matching', async () => {
    const testData = await createTestData();
    
    const input: SubmitQuizAttemptInput = {
      student_id: testData.student.id,
      quiz_id: testData.quiz.id,
      answers: {
        [testData.questions[0].id]: '4',        // Exact match
        [testData.questions[1].id]: 'TRUE',     // Case insensitive
        [testData.questions[2].id]: 'paris'     // Case insensitive
      }
    };

    const result = await submitQuizAttempt(input);

    expect(result.score).toEqual(30); // All answers should be considered correct
  });

  it('should update existing incomplete attempt', async () => {
    const testData = await createTestData();
    
    // Create an incomplete attempt first
    const incompleteAttempt = await db.insert(quizAttemptsTable)
      .values({
        student_id: testData.student.id,
        quiz_id: testData.quiz.id,
        score: null,
        max_score: '30',
        completed: false,
        started_at: new Date()
      })
      .returning()
      .execute();

    const input: SubmitQuizAttemptInput = {
      student_id: testData.student.id,
      quiz_id: testData.quiz.id,
      answers: {
        [testData.questions[0].id]: '4'
      }
    };

    const result = await submitQuizAttempt(input);

    // Should update the existing attempt, not create a new one
    expect(result.id).toEqual(incompleteAttempt[0].id);
    expect(result.score).toEqual(10);
    expect(result.completed).toBe(true);
    expect(result.completed_at).toBeInstanceOf(Date);

    // Verify only one attempt exists
    const allAttempts = await db.select()
      .from(quizAttemptsTable)
      .where(
        and(
          eq(quizAttemptsTable.student_id, testData.student.id),
          eq(quizAttemptsTable.quiz_id, testData.quiz.id)
        )
      )
      .execute();

    expect(allAttempts).toHaveLength(1);
  });

  it('should reject submission when student is not enrolled in course', async () => {
    const testData = await createTestData();

    // Create another student not enrolled in the course
    const unenrolledStudent = await db.insert(usersTable)
      .values({
        email: 'unenrolled@test.com',
        password_hash: 'hashed_password',
        first_name: 'Unenrolled',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const input: SubmitQuizAttemptInput = {
      student_id: unenrolledStudent[0].id,
      quiz_id: testData.quiz.id,
      answers: {
        [testData.questions[0].id]: '4'
      }
    };

    await expect(submitQuizAttempt(input)).rejects.toThrow(/not enrolled in the course/i);
  });

  it('should reject submission when quiz does not exist', async () => {
    const testData = await createTestData();
    
    const input: SubmitQuizAttemptInput = {
      student_id: testData.student.id,
      quiz_id: 999999, // Non-existent quiz ID
      answers: {
        '1': 'some answer'
      }
    };

    await expect(submitQuizAttempt(input)).rejects.toThrow(/Quiz with id 999999 not found/i);
  });

  it('should reject submission when max attempts exceeded', async () => {
    const testData = await createTestData();

    // Create 3 completed attempts (which is the max for our test quiz)
    for (let i = 0; i < 3; i++) {
      await db.insert(quizAttemptsTable)
        .values({
          student_id: testData.student.id,
          quiz_id: testData.quiz.id,
          score: '10',
          max_score: '30',
          completed: true,
          started_at: new Date(),
          completed_at: new Date()
        })
        .execute();
    }

    const input: SubmitQuizAttemptInput = {
      student_id: testData.student.id,
      quiz_id: testData.quiz.id,
      answers: {
        [testData.questions[0].id]: '4'
      }
    };

    await expect(submitQuizAttempt(input)).rejects.toThrow(/exceeded maximum attempts/i);
  });

  it('should handle quiz with no questions', async () => {
    const testData = await createTestData();

    // Delete all questions
    await db.delete(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, testData.quiz.id))
      .execute();

    const input: SubmitQuizAttemptInput = {
      student_id: testData.student.id,
      quiz_id: testData.quiz.id,
      answers: {}
    };

    await expect(submitQuizAttempt(input)).rejects.toThrow(/No questions found/i);
  });

  it('should handle quiz with no max attempts limit', async () => {
    const testData = await createTestData();

    // Update quiz to have no max attempts limit
    await db.update(quizzesTable)
      .set({ max_attempts: null })
      .where(eq(quizzesTable.id, testData.quiz.id))
      .execute();

    // Create many previous attempts
    for (let i = 0; i < 10; i++) {
      await db.insert(quizAttemptsTable)
        .values({
          student_id: testData.student.id,
          quiz_id: testData.quiz.id,
          score: '10',
          max_score: '30',
          completed: true,
          started_at: new Date(),
          completed_at: new Date()
        })
        .execute();
    }

    const input: SubmitQuizAttemptInput = {
      student_id: testData.student.id,
      quiz_id: testData.quiz.id,
      answers: {
        [testData.questions[0].id]: '4'
      }
    };

    // Should not throw error despite many previous attempts
    const result = await submitQuizAttempt(input);
    expect(result.score).toEqual(10);
    expect(result.completed).toBe(true);
  });

  it('should handle empty answers object', async () => {
    const testData = await createTestData();
    
    const input: SubmitQuizAttemptInput = {
      student_id: testData.student.id,
      quiz_id: testData.quiz.id,
      answers: {}
    };

    const result = await submitQuizAttempt(input);

    // All answers are wrong, so score should be 0
    expect(result.score).toEqual(0);
    expect(result.max_score).toEqual(30);
    expect(result.completed).toBe(true);
  });
});