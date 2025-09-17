import { db } from '../db';
import { quizAttemptsTable } from '../db/schema';
import { type QuizAttempt } from '../schema';
import { eq, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getQuizAttempts(quizId: number, studentId?: number): Promise<QuizAttempt[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    conditions.push(eq(quizAttemptsTable.quiz_id, quizId));

    if (studentId !== undefined) {
      conditions.push(eq(quizAttemptsTable.student_id, studentId));
    }

    // Build and execute query
    const results = await db.select()
      .from(quizAttemptsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(attempt => ({
      ...attempt,
      score: attempt.score ? parseFloat(attempt.score) : null,
      max_score: parseFloat(attempt.max_score)
    }));
  } catch (error) {
    console.error('Get quiz attempts failed:', error);
    throw error;
  }
}