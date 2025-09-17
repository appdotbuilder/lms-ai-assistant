import { db } from '../db';
import { quizzesTable, contentTable } from '../db/schema';
import { type CreateQuizInput, type Quiz } from '../schema';
import { eq } from 'drizzle-orm';

export const createQuiz = async (input: CreateQuizInput): Promise<Quiz> => {
  try {
    // Verify that the content exists
    const existingContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, input.content_id))
      .execute();

    if (existingContent.length === 0) {
      throw new Error(`Content with id ${input.content_id} not found`);
    }

    // Insert quiz record
    const result = await db.insert(quizzesTable)
      .values({
        content_id: input.content_id,
        title: input.title,
        description: input.description,
        time_limit_minutes: input.time_limit_minutes,
        max_attempts: input.max_attempts
      })
      .returning()
      .execute();

    const quiz = result[0];
    return quiz;
  } catch (error) {
    console.error('Quiz creation failed:', error);
    throw error;
  }
};