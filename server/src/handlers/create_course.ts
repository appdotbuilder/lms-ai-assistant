import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type CreateCourseInput, type Course } from '../schema';
import { eq } from 'drizzle-orm';

export const createCourse = async (input: CreateCourseInput): Promise<Course> => {
  try {
    // Verify that the teacher exists and has teacher role
    const teacher = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.teacher_id))
      .execute();

    if (teacher.length === 0) {
      throw new Error(`Teacher with id ${input.teacher_id} not found`);
    }

    if (teacher[0].role !== 'teacher') {
      throw new Error(`User with id ${input.teacher_id} is not a teacher`);
    }

    // Insert course record
    const result = await db.insert(coursesTable)
      .values({
        title: input.title,
        description: input.description,
        teacher_id: input.teacher_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Course creation failed:', error);
    throw error;
  }
};