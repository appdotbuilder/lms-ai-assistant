import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type UpdateCourseInput, type Course } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const updateCourse = async (input: UpdateCourseInput): Promise<Course> => {
  try {
    // First, check if the course exists
    const existingCourses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.id))
      .execute();

    if (existingCourses.length === 0) {
      throw new Error(`Course with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: { title?: string; description?: string | null; updated_at: Date } = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    // Update the course
    const result = await db.update(coursesTable)
      .set(updateData)
      .where(eq(coursesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Failed to update course');
    }

    return result[0];
  } catch (error) {
    console.error('Course update failed:', error);
    throw error;
  }
};