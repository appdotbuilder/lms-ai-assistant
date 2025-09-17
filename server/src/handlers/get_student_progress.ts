import { db } from '../db';
import { studentProgressTable, contentTable } from '../db/schema';
import { type StudentProgress } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export async function getStudentProgress(studentId: number, courseId?: number): Promise<StudentProgress[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(studentProgressTable.student_id, studentId)
    ];

    let results;

    // Handle with or without course filtering
    if (courseId !== undefined) {
      // When filtering by course, join with content table
      conditions.push(eq(contentTable.course_id, courseId));

      const joinResults = await db.select()
        .from(studentProgressTable)
        .innerJoin(
          contentTable,
          eq(studentProgressTable.content_id, contentTable.id)
        )
        .where(and(...conditions))
        .execute();

      // Extract progress data from joined result
      results = joinResults.map(result => result.student_progress);
    } else {
      // When not filtering by course, query student_progress table directly
      results = await db.select()
        .from(studentProgressTable)
        .where(and(...conditions))
        .execute();
    }

    return results.map(progressData => ({
      ...progressData,
      // Ensure dates are proper Date objects
      created_at: new Date(progressData.created_at),
      updated_at: new Date(progressData.updated_at),
      completion_date: progressData.completion_date ? new Date(progressData.completion_date) : null
    }));
  } catch (error) {
    console.error('Failed to get student progress:', error);
    throw error;
  }
}