import { db } from '../db';
import { usersTable, coursesTable, courseEnrollmentsTable } from '../db/schema';
import { type EnrollStudentInput, type CourseEnrollment } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function enrollStudent(input: EnrollStudentInput): Promise<CourseEnrollment> {
  try {
    // Verify that the student exists and has student role
    const student = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.student_id))
      .execute();

    if (student.length === 0) {
      throw new Error('Student not found');
    }

    if (student[0].role !== 'student') {
      throw new Error('User is not a student');
    }

    // Verify that the course exists
    const course = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();

    if (course.length === 0) {
      throw new Error('Course not found');
    }

    // Check for duplicate enrollment
    const existingEnrollment = await db.select()
      .from(courseEnrollmentsTable)
      .where(
        and(
          eq(courseEnrollmentsTable.course_id, input.course_id),
          eq(courseEnrollmentsTable.student_id, input.student_id)
        )
      )
      .execute();

    if (existingEnrollment.length > 0) {
      throw new Error('Student is already enrolled in this course');
    }

    // Create the enrollment
    const result = await db.insert(courseEnrollmentsTable)
      .values({
        course_id: input.course_id,
        student_id: input.student_id,
        enrolled_at: new Date()
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Student enrollment failed:', error);
    throw error;
  }
}