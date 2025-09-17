import { db } from '../db';
import { lessonsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateLessonInput, type Lesson } from '../schema';

export const updateLesson = async (input: UpdateLessonInput): Promise<Lesson> => {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof lessonsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.content !== undefined) {
      updateData.content = input.content;
    }

    if (input.order_index !== undefined) {
      updateData.order_index = input.order_index;
    }

    // Update the lesson
    const result = await db.update(lessonsTable)
      .set(updateData)
      .where(eq(lessonsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Lesson with ID ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Lesson update failed:', error);
    throw error;
  }
};