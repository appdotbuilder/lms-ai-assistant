import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type Course } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCourses(): Promise<Course[]> {
  try {
    const results = await db.select()
      .from(coursesTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    throw error;
  }
}

export async function getCoursesByTeacher(teacherId: number): Promise<Course[]> {
  try {
    const results = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.teacher_id, teacherId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch courses by teacher:', error);
    throw error;
  }
}