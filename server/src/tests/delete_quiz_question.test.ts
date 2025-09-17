import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, quizzesTable, quizQuestionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteQuizQuestion } from '../handlers/delete_quiz_question';

describe('deleteQuizQuestion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let questionId: number;

  beforeEach(async () => {
    // Create prerequisite data: user, course, lesson, quiz, and quiz question
    const user = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
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
        content: 'Test content',
        order_index: 1
      })
      .returning()
      .execute();

    const quiz = await db.insert(quizzesTable)
      .values({
        lesson_id: lesson[0].id,
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit: 30
      })
      .returning()
      .execute();

    const question = await db.insert(quizQuestionsTable)
      .values({
        quiz_id: quiz[0].id,
        question_text: 'What is 2+2?',
        question_type: 'multiple_choice',
        options: ['3', '4', '5', '6'],
        correct_answer: '4',
        points: 10,
        order_index: 1
      })
      .returning()
      .execute();

    questionId = question[0].id;
  });

  it('should delete a quiz question', async () => {
    // Verify question exists before deletion
    const questionsBefore = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.id, questionId))
      .execute();

    expect(questionsBefore).toHaveLength(1);

    // Delete the question
    await deleteQuizQuestion(questionId);

    // Verify question is deleted
    const questionsAfter = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.id, questionId))
      .execute();

    expect(questionsAfter).toHaveLength(0);
  });

  it('should handle deletion of non-existent question gracefully', async () => {
    const nonExistentId = 99999;

    // Should not throw error when deleting non-existent question
    await expect(() => deleteQuizQuestion(nonExistentId)).not.toThrow();

    // Verify original question still exists
    const questions = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.id, questionId))
      .execute();

    expect(questions).toHaveLength(1);
  });

  it('should only delete the specified question', async () => {
    // Create another question
    const quiz = await db.select()
      .from(quizzesTable)
      .execute();

    const secondQuestion = await db.insert(quizQuestionsTable)
      .values({
        quiz_id: quiz[0].id,
        question_text: 'What is 3+3?',
        question_type: 'multiple_choice',
        options: ['5', '6', '7', '8'],
        correct_answer: '6',
        points: 15,
        order_index: 2
      })
      .returning()
      .execute();

    // Delete first question
    await deleteQuizQuestion(questionId);

    // Verify first question is deleted
    const firstQuestion = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.id, questionId))
      .execute();

    expect(firstQuestion).toHaveLength(0);

    // Verify second question still exists
    const remainingQuestion = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.id, secondQuestion[0].id))
      .execute();

    expect(remainingQuestion).toHaveLength(1);
    expect(remainingQuestion[0].question_text).toEqual('What is 3+3?');
  });
});