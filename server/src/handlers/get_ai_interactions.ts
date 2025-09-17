import { db } from '../db';
import { aiInteractionsTable } from '../db/schema';
import { type AiInteraction } from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export const getAiInteractions = async (studentId: number, courseId?: number): Promise<AiInteraction[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by student ID
    conditions.push(eq(aiInteractionsTable.student_id, studentId));
    
    // Add course filter if provided
    if (courseId !== undefined) {
      conditions.push(eq(aiInteractionsTable.course_id, courseId));
    }
    
    // Build and execute query
    const results = await db.select()
      .from(aiInteractionsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(aiInteractionsTable.created_at))
      .execute();
    
    return results;
  } catch (error) {
    console.error('Failed to get AI interactions:', error);
    throw error;
  }
};