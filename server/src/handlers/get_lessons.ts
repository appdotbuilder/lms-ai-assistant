import { db } from '../db';
import { lessonsTable } from '../db/schema';
import { type Lesson } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getLessonsByCourse(courseId: number): Promise<Lesson[]> {
  try {
    const results = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.course_id, courseId))
      .orderBy(asc(lessonsTable.order_index))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get lessons by course:', error);
    throw error;
  }
}

export async function getLesson(lessonId: number): Promise<Lesson | null> {
  try {
    const results = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lessonId))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to get lesson:', error);
    throw error;
  }
}