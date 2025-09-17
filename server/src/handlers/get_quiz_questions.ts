import { db } from '../db';
import { quizQuestionsTable } from '../db/schema';
import { type QuizQuestion } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getQuizQuestions = async (quizId: number): Promise<QuizQuestion[]> => {
  try {
    const results = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, quizId))
      .orderBy(asc(quizQuestionsTable.order_index))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(question => ({
      ...question,
      points: parseFloat(question.points)
    }));
  } catch (error) {
    console.error('Failed to get quiz questions:', error);
    throw error;
  }
};