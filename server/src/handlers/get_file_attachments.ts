import { db } from '../db';
import { fileAttachmentsTable } from '../db/schema';
import { type FileAttachment } from '../schema';
import { eq } from 'drizzle-orm';

export const getFileAttachmentsByLesson = async (lessonId: number): Promise<FileAttachment[]> => {
  try {
    const results = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.lesson_id, lessonId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch file attachments:', error);
    throw error;
  }
};