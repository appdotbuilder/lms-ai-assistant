import { db } from '../db';
import { quizAttemptsTable, quizQuestionsTable, quizzesTable, courseEnrollmentsTable, contentTable } from '../db/schema';
import { type SubmitQuizAttemptInput, type QuizAttempt } from '../schema';
import { eq, and, count } from 'drizzle-orm';

export const submitQuizAttempt = async (input: SubmitQuizAttemptInput): Promise<QuizAttempt> => {
  try {
    // First, verify that the quiz exists and get its details
    const quiz = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, input.quiz_id))
      .execute();

    if (quiz.length === 0) {
      throw new Error(`Quiz with id ${input.quiz_id} not found`);
    }

    // Verify that the student is enrolled in the course that contains this quiz
    const enrollment = await db.select()
      .from(courseEnrollmentsTable)
      .innerJoin(contentTable, eq(courseEnrollmentsTable.course_id, contentTable.course_id))
      .innerJoin(quizzesTable, eq(contentTable.id, quizzesTable.content_id))
      .where(
        and(
          eq(courseEnrollmentsTable.student_id, input.student_id),
          eq(quizzesTable.id, input.quiz_id)
        )
      )
      .execute();

    if (enrollment.length === 0) {
      throw new Error(`Student ${input.student_id} is not enrolled in the course for quiz ${input.quiz_id}`);
    }

    // Check if the student has exceeded max attempts (if there's a limit)
    if (quiz[0].max_attempts !== null) {
      const attemptCount = await db.select({ count: count() })
        .from(quizAttemptsTable)
        .where(
          and(
            eq(quizAttemptsTable.student_id, input.student_id),
            eq(quizAttemptsTable.quiz_id, input.quiz_id),
            eq(quizAttemptsTable.completed, true)
          )
        )
        .execute();

      if (attemptCount[0].count >= quiz[0].max_attempts) {
        throw new Error(`Student ${input.student_id} has exceeded maximum attempts (${quiz[0].max_attempts}) for quiz ${input.quiz_id}`);
      }
    }

    // Get all quiz questions to calculate score
    const questions = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, input.quiz_id))
      .execute();

    if (questions.length === 0) {
      throw new Error(`No questions found for quiz ${input.quiz_id}`);
    }

    // Calculate score based on answers
    let totalScore = 0;
    let maxScore = 0;

    for (const question of questions) {
      maxScore += parseFloat(question.points);
      
      const studentAnswer = input.answers[question.id.toString()];
      if (studentAnswer && studentAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()) {
        totalScore += parseFloat(question.points);
      }
    }

    // Check if there's an existing incomplete attempt to update
    const existingAttempt = await db.select()
      .from(quizAttemptsTable)
      .where(
        and(
          eq(quizAttemptsTable.student_id, input.student_id),
          eq(quizAttemptsTable.quiz_id, input.quiz_id),
          eq(quizAttemptsTable.completed, false)
        )
      )
      .execute();

    let result;
    const now = new Date();

    if (existingAttempt.length > 0) {
      // Update existing incomplete attempt
      result = await db.update(quizAttemptsTable)
        .set({
          score: totalScore.toString(),
          completed: true,
          completed_at: now
        })
        .where(eq(quizAttemptsTable.id, existingAttempt[0].id))
        .returning()
        .execute();
    } else {
      // Create new completed attempt
      result = await db.insert(quizAttemptsTable)
        .values({
          student_id: input.student_id,
          quiz_id: input.quiz_id,
          score: totalScore.toString(),
          max_score: maxScore.toString(),
          completed: true,
          started_at: now,
          completed_at: now
        })
        .returning()
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    const attempt = result[0];
    return {
      ...attempt,
      score: attempt.score ? parseFloat(attempt.score) : null,
      max_score: parseFloat(attempt.max_score)
    };
  } catch (error) {
    console.error('Quiz attempt submission failed:', error);
    throw error;
  }
};