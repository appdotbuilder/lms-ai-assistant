import { db } from '../db';
import { fileAttachmentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import path from 'path';

export async function deleteFileAttachment(attachmentId: number): Promise<void> {
  try {
    // First, get the file attachment to retrieve file path
    const attachmentQuery = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.id, attachmentId))
      .execute();

    if (attachmentQuery.length === 0) {
      throw new Error(`File attachment with id ${attachmentId} not found`);
    }

    const attachment = attachmentQuery[0];

    // Delete from database first
    await db.delete(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.id, attachmentId))
      .execute();

    // Try to delete the physical file
    try {
      // Resolve the file path (assuming it's relative to the project root or an absolute path)
      const filePath = path.resolve(attachment.file_path);
      await unlink(filePath);
    } catch (fileError) {
      // Log file deletion error but don't fail the operation
      // Database deletion was successful, so the attachment is effectively removed
      console.error(`Failed to delete file at ${attachment.file_path}:`, fileError);
    }

  } catch (error) {
    console.error('File attachment deletion failed:', error);
    throw error;
  }
}