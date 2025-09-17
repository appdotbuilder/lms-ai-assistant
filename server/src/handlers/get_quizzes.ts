import { db } from '../db';
import { quizzesTable } from '../db/schema';
import { type Quiz } from '../schema';
import { eq } from 'drizzle-orm';

export async function getQuizzesByLesson(lessonId: number): Promise<Quiz[]> {
  try {
    const results = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.lesson_id, lessonId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch quizzes by lesson:', error);
    throw error;
  }
}

export async function getQuiz(quizId: number): Promise<Quiz | null> {
  try {
    const results = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, quizId))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch quiz:', error);
    throw error;
  }
}