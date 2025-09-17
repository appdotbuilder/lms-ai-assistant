import { db } from '../db';
import { contentTable, coursesTable } from '../db/schema';
import { type Content } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getCourseContent = async (courseId: number): Promise<Content[]> => {
  try {
    // Verify course exists first
    const course = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .limit(1)
      .execute();

    if (course.length === 0) {
      throw new Error(`Course with id ${courseId} not found`);
    }

    // Fetch all content for the course, ordered by order_index
    const results = await db.select()
      .from(contentTable)
      .where(eq(contentTable.course_id, courseId))
      .orderBy(asc(contentTable.order_index))
      .execute();

    // Return the content array (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to fetch course content:', error);
    throw error;
  }
};