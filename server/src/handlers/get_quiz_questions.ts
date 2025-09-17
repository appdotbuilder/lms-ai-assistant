import { db } from '../db';
import { quizQuestionsTable } from '../db/schema';
import { type QuizQuestion } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getQuizQuestions(quizId: number): Promise<QuizQuestion[]> {
  try {
    const results = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, quizId))
      .orderBy(asc(quizQuestionsTable.order_index))
      .execute();

    return results.map(question => ({
      ...question,
      // Ensure JSONB fields are properly returned as expected types
      options: question.options as string[],
      question_type: question.question_type as 'multiple_choice' | 'true_false'
    }));
  } catch (error) {
    console.error('Failed to fetch quiz questions:', error);
    throw error;
  }
}