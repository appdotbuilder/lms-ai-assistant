import { db } from '../db';
import { coursesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Course } from '../schema';

export const getCourseById = async (id: number): Promise<Course | null> => {
  try {
    const result = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, id))
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error('Failed to fetch course by ID:', error);
    throw error;
  }
};