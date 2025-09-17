import { db } from '../db';
import { studentProgressTable, courseEnrollmentsTable, contentTable } from '../db/schema';
import { type UpdateProgressInput, type StudentProgress } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateProgress(input: UpdateProgressInput): Promise<StudentProgress> {
  try {
    // First, verify that the student has access to the content by checking enrollment
    const contentWithCourse = await db.select({
      content_id: contentTable.id,
      course_id: contentTable.course_id
    })
      .from(contentTable)
      .where(eq(contentTable.id, input.content_id))
      .execute();

    if (contentWithCourse.length === 0) {
      throw new Error('Content not found');
    }

    const courseId = contentWithCourse[0].course_id;

    // Verify student is enrolled in the course
    const enrollment = await db.select()
      .from(courseEnrollmentsTable)
      .where(and(
        eq(courseEnrollmentsTable.course_id, courseId),
        eq(courseEnrollmentsTable.student_id, input.student_id)
      ))
      .execute();

    if (enrollment.length === 0) {
      throw new Error('Student is not enrolled in this course');
    }

    // Check if progress record already exists
    const existingProgress = await db.select()
      .from(studentProgressTable)
      .where(and(
        eq(studentProgressTable.student_id, input.student_id),
        eq(studentProgressTable.content_id, input.content_id)
      ))
      .execute();

    const now = new Date();
    const completionDate = input.completed ? now : null;

    if (existingProgress.length > 0) {
      // Update existing progress record
      const updatedProgress = await db.update(studentProgressTable)
        .set({
          completed: input.completed,
          completion_date: completionDate,
          time_spent_minutes: input.time_spent_minutes,
          updated_at: now
        })
        .where(eq(studentProgressTable.id, existingProgress[0].id))
        .returning()
        .execute();

      return updatedProgress[0];
    } else {
      // Create new progress record
      const newProgress = await db.insert(studentProgressTable)
        .values({
          student_id: input.student_id,
          content_id: input.content_id,
          completed: input.completed,
          completion_date: completionDate,
          time_spent_minutes: input.time_spent_minutes
        })
        .returning()
        .execute();

      return newProgress[0];
    }
  } catch (error) {
    console.error('Update progress failed:', error);
    throw error;
  }
}