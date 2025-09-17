import { db } from '../db';
import { contentTable, coursesTable } from '../db/schema';
import { type CreateContentInput, type Content } from '../schema';
import { eq } from 'drizzle-orm';

export const createContent = async (input: CreateContentInput): Promise<Content> => {
  try {
    // Verify that the course exists
    const courseExists = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();

    if (courseExists.length === 0) {
      throw new Error(`Course with ID ${input.course_id} not found`);
    }

    // Insert content record
    const result = await db.insert(contentTable)
      .values({
        course_id: input.course_id,
        title: input.title,
        description: input.description,
        content_type: input.content_type,
        content_data: input.content_data,
        order_index: input.order_index
      })
      .returning()
      .execute();

    const content = result[0];
    return {
      ...content
    };
  } catch (error) {
    console.error('Content creation failed:', error);
    throw error;
  }
};