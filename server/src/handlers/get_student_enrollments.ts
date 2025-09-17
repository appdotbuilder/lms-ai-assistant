import { db } from '../db';
import { courseEnrollmentsTable, coursesTable, usersTable } from '../db/schema';
import { type CourseEnrollment } from '../schema';
import { eq } from 'drizzle-orm';

export const getStudentEnrollments = async (studentId: number): Promise<CourseEnrollment[]> => {
  try {
    // Query enrollments with course and teacher details
    const results = await db.select({
      id: courseEnrollmentsTable.id,
      course_id: courseEnrollmentsTable.course_id,
      student_id: courseEnrollmentsTable.student_id,
      enrolled_at: courseEnrollmentsTable.enrolled_at,
      completed_at: courseEnrollmentsTable.completed_at,
      course: {
        id: coursesTable.id,
        title: coursesTable.title,
        description: coursesTable.description,
        teacher_id: coursesTable.teacher_id,
        created_at: coursesTable.created_at,
        updated_at: coursesTable.updated_at
      },
      teacher: {
        id: usersTable.id,
        email: usersTable.email,
        first_name: usersTable.first_name,
        last_name: usersTable.last_name,
        role: usersTable.role
      }
    })
    .from(courseEnrollmentsTable)
    .innerJoin(coursesTable, eq(courseEnrollmentsTable.course_id, coursesTable.id))
    .innerJoin(usersTable, eq(coursesTable.teacher_id, usersTable.id))
    .where(eq(courseEnrollmentsTable.student_id, studentId))
    .execute();

    // Transform results to include course and teacher details as part of the enrollment
    return results.map(result => ({
      id: result.id,
      course_id: result.course_id,
      student_id: result.student_id,
      enrolled_at: result.enrolled_at,
      completed_at: result.completed_at,
      // Additional enriched data
      course_title: result.course.title,
      course_description: result.course.description,
      teacher_name: `${result.teacher.first_name} ${result.teacher.last_name}`,
      teacher_email: result.teacher.email
    })) as CourseEnrollment[];
  } catch (error) {
    console.error('Failed to get student enrollments:', error);
    throw error;
  }
};