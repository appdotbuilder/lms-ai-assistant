import { db } from '../db';
import { quizQuestionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteQuizQuestion(questionId: number): Promise<void> {
  try {
    // Delete the quiz question by ID
    await db.delete(quizQuestionsTable)
      .where(eq(quizQuestionsTable.id, questionId))
      .execute();
  } catch (error) {
    console.error('Quiz question deletion failed:', error);
    throw error;
  }
}