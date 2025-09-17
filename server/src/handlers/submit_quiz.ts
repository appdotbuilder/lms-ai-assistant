import { db } from '../db';
import { quizSubmissionsTable, quizQuestionsTable } from '../db/schema';
import { type SubmitQuizInput, type QuizSubmission } from '../schema';
import { eq } from 'drizzle-orm';

export const submitQuiz = async (input: SubmitQuizInput): Promise<QuizSubmission> => {
  try {
    // Get all questions for this quiz to calculate the score
    const questions = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, input.quiz_id))
      .execute();

    // Calculate score by comparing answers with correct answers
    let totalScore = 0;
    for (const question of questions) {
      const studentAnswer = input.answers[question.id.toString()];
      if (studentAnswer && studentAnswer === question.correct_answer) {
        totalScore += question.points;
      }
    }

    // Insert the quiz submission with calculated score
    const result = await db.insert(quizSubmissionsTable)
      .values({
        quiz_id: input.quiz_id,
        student_id: input.student_id,
        answers: input.answers,
        score: totalScore
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Quiz submission failed:', error);
    throw error;
  }
};