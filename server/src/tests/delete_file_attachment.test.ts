import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, fileAttachmentsTable } from '../db/schema';
import { type CreateFileAttachmentInput } from '../schema';
import { deleteFileAttachment } from '../handlers/delete_file_attachment';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Test data setup
const testUser = {
  email: 'teacher@test.com',
  password_hash: 'hashed_password',
  first_name: 'Test',
  last_name: 'Teacher',
  role: 'teacher' as const
};

const testCourse = {
  title: 'Test Course',
  description: 'A course for testing',
  teacher_id: 0 // Will be set after user creation
};

const testLesson = {
  course_id: 0, // Will be set after course creation
  title: 'Test Lesson',
  content: 'Test lesson content',
  order_index: 1
};

describe('deleteFileAttachment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let courseId: number;
  let lessonId: number;
  let testDir: string;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({ ...testCourse, teacher_id: userId })
      .returning()
      .execute();
    courseId = courseResult[0].id;

    // Create test lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({ ...testLesson, course_id: courseId })
      .returning()
      .execute();
    lessonId = lessonResult[0].id;

    // Create test directory for files
    testDir = path.join(process.cwd(), 'test_files');
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }
  });

  it('should delete file attachment from database', async () => {
    // Create test file attachment
    const attachmentInput: CreateFileAttachmentInput = {
      lesson_id: lessonId,
      filename: 'test-document.pdf',
      file_path: path.join(testDir, 'test-document.pdf'),
      file_type: 'application/pdf',
      file_size: 1024
    };

    const attachmentResult = await db.insert(fileAttachmentsTable)
      .values(attachmentInput)
      .returning()
      .execute();

    const attachmentId = attachmentResult[0].id;

    // Delete the attachment
    await deleteFileAttachment(attachmentId);

    // Verify it's deleted from database
    const deletedAttachments = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.id, attachmentId))
      .execute();

    expect(deletedAttachments).toHaveLength(0);
  });

  it('should delete both database record and physical file', async () => {
    const testFilePath = path.join(testDir, 'test-file.txt');
    
    // Create physical test file
    await writeFile(testFilePath, 'test content');
    expect(existsSync(testFilePath)).toBe(true);

    // Create file attachment record
    const attachmentInput: CreateFileAttachmentInput = {
      lesson_id: lessonId,
      filename: 'test-file.txt',
      file_path: testFilePath,
      file_type: 'text/plain',
      file_size: 12
    };

    const attachmentResult = await db.insert(fileAttachmentsTable)
      .values(attachmentInput)
      .returning()
      .execute();

    const attachmentId = attachmentResult[0].id;

    // Delete the attachment
    await deleteFileAttachment(attachmentId);

    // Verify database record is deleted
    const deletedAttachments = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.id, attachmentId))
      .execute();

    expect(deletedAttachments).toHaveLength(0);

    // Verify physical file is deleted
    expect(existsSync(testFilePath)).toBe(false);
  });

  it('should throw error for non-existent attachment', async () => {
    const nonExistentId = 99999;

    await expect(deleteFileAttachment(nonExistentId))
      .rejects.toThrow(/File attachment with id 99999 not found/i);
  });

  it('should delete database record even if physical file deletion fails', async () => {
    // Create attachment with non-existent file path
    const attachmentInput: CreateFileAttachmentInput = {
      lesson_id: lessonId,
      filename: 'non-existent.pdf',
      file_path: '/path/that/does/not/exist/file.pdf',
      file_type: 'application/pdf',
      file_size: 2048
    };

    const attachmentResult = await db.insert(fileAttachmentsTable)
      .values(attachmentInput)
      .returning()
      .execute();

    const attachmentId = attachmentResult[0].id;

    // Delete should succeed despite file not existing
    await deleteFileAttachment(attachmentId);

    // Verify database record is still deleted
    const deletedAttachments = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.id, attachmentId))
      .execute();

    expect(deletedAttachments).toHaveLength(0);
  });

  it('should handle multiple file attachments correctly', async () => {
    // Create multiple test files and attachments
    const file1Path = path.join(testDir, 'file1.txt');
    const file2Path = path.join(testDir, 'file2.txt');
    
    await writeFile(file1Path, 'content 1');
    await writeFile(file2Path, 'content 2');

    const attachment1 = await db.insert(fileAttachmentsTable)
      .values({
        lesson_id: lessonId,
        filename: 'file1.txt',
        file_path: file1Path,
        file_type: 'text/plain',
        file_size: 9
      })
      .returning()
      .execute();

    const attachment2 = await db.insert(fileAttachmentsTable)
      .values({
        lesson_id: lessonId,
        filename: 'file2.txt',
        file_path: file2Path,
        file_type: 'text/plain',
        file_size: 9
      })
      .returning()
      .execute();

    // Delete only the first attachment
    await deleteFileAttachment(attachment1[0].id);

    // Verify first attachment is deleted
    const deletedAttachment = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.id, attachment1[0].id))
      .execute();

    expect(deletedAttachment).toHaveLength(0);
    expect(existsSync(file1Path)).toBe(false);

    // Verify second attachment still exists
    const remainingAttachment = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.id, attachment2[0].id))
      .execute();

    expect(remainingAttachment).toHaveLength(1);
    expect(existsSync(file2Path)).toBe(true);
  });

  it('should verify attachment properties before deletion', async () => {
    const attachmentInput: CreateFileAttachmentInput = {
      lesson_id: lessonId,
      filename: 'test-props.pdf',
      file_path: path.join(testDir, 'test-props.pdf'),
      file_type: 'application/pdf',
      file_size: 5120
    };

    const attachmentResult = await db.insert(fileAttachmentsTable)
      .values(attachmentInput)
      .returning()
      .execute();

    const attachment = attachmentResult[0];

    // Verify attachment properties
    expect(attachment.lesson_id).toBe(lessonId);
    expect(attachment.filename).toBe('test-props.pdf');
    expect(attachment.file_type).toBe('application/pdf');
    expect(attachment.file_size).toBe(5120);
    expect(attachment.created_at).toBeInstanceOf(Date);

    // Delete the attachment
    await deleteFileAttachment(attachment.id);

    // Verify deletion
    const deletedAttachments = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.id, attachment.id))
      .execute();

    expect(deletedAttachments).toHaveLength(0);
  });
});