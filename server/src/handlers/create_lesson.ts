import { db } from '../db';
import { lessonsTable, coursesTable } from '../db/schema';
import { type CreateLessonInput, type Lesson } from '../schema';
import { eq } from 'drizzle-orm';

export const createLesson = async (input: CreateLessonInput): Promise<Lesson> => {
  try {
    // Verify the course exists before creating the lesson
    const courseExists = await db.select({ id: coursesTable.id })
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();

    if (courseExists.length === 0) {
      throw new Error(`Course with id ${input.course_id} does not exist`);
    }

    // Insert lesson record
    const result = await db.insert(lessonsTable)
      .values({
        course_id: input.course_id,
        title: input.title,
        content: input.content,
        order_index: input.order_index
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Lesson creation failed:', error);
    throw error;
  }
};