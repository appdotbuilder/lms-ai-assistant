import { db } from '../db';
import { coursesTable, courseEnrollmentsTable, usersTable } from '../db/schema';
import { type Course } from '../schema';
import { eq } from 'drizzle-orm';

export interface GetCoursesInput {
  user_id: number;
  user_role: 'student' | 'teacher' | 'administrator';
}

const getCoursesWithFilter = async (input: GetCoursesInput): Promise<Course[]> => {
  try {
    let results: Course[];

    if (input.user_role === 'administrator') {
      // Administrators can see all courses
      results = await db.select()
        .from(coursesTable)
        .execute();
    } else if (input.user_role === 'teacher') {
      // Teachers can see courses they teach
      results = await db.select()
        .from(coursesTable)
        .where(eq(coursesTable.teacher_id, input.user_id))
        .execute();
    } else if (input.user_role === 'student') {
      // Students can see courses they are enrolled in
      const enrolledCourses = await db.select({
        id: coursesTable.id,
        title: coursesTable.title,
        description: coursesTable.description,
        teacher_id: coursesTable.teacher_id,
        created_at: coursesTable.created_at,
        updated_at: coursesTable.updated_at
      })
        .from(coursesTable)
        .innerJoin(courseEnrollmentsTable, eq(coursesTable.id, courseEnrollmentsTable.course_id))
        .where(eq(courseEnrollmentsTable.student_id, input.user_id))
        .execute();
      
      results = enrolledCourses;
    } else {
      // Invalid role
      results = [];
    }

    return results;
  } catch (error) {
    console.error('Failed to get courses:', error);
    throw error;
  }
};

// Export both signatures for flexibility
export const getCoursesFiltered = getCoursesWithFilter;

// Backward compatibility export for the original function signature
export async function getCourses(): Promise<Course[]> {
  // For backward compatibility, return all courses (like an administrator view)
  // In a real application, this would require authentication context
  try {
    return await db.select()
      .from(coursesTable)
      .execute();
  } catch (error) {
    console.error('Failed to get all courses:', error);
    throw error;
  }
}