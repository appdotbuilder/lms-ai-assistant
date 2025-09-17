import { db } from '../db';
import { assignmentsTable } from '../db/schema';
import { type Assignment } from '../schema';
import { eq } from 'drizzle-orm';

export async function getAssignmentsByLesson(lessonId: number): Promise<Assignment[]> {
  try {
    const results = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.lesson_id, lessonId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch assignments by lesson:', error);
    throw error;
  }
}

export async function getAssignment(assignmentId: number): Promise<Assignment | null> {
  try {
    const results = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch assignment:', error);
    throw error;
  }
}