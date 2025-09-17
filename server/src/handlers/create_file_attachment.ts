import { db } from '../db';
import { fileAttachmentsTable, lessonsTable } from '../db/schema';
import { type CreateFileAttachmentInput, type FileAttachment } from '../schema';
import { eq } from 'drizzle-orm';

export const createFileAttachment = async (input: CreateFileAttachmentInput): Promise<FileAttachment> => {
  try {
    // Verify that the lesson exists before creating the file attachment
    const lesson = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, input.lesson_id))
      .execute();

    if (lesson.length === 0) {
      throw new Error(`Lesson with ID ${input.lesson_id} not found`);
    }

    // Insert file attachment record
    const result = await db.insert(fileAttachmentsTable)
      .values({
        lesson_id: input.lesson_id,
        filename: input.filename,
        file_path: input.file_path,
        file_type: input.file_type,
        file_size: input.file_size
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('File attachment creation failed:', error);
    throw error;
  }
};