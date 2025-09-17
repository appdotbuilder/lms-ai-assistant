import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileAttachmentsTable, usersTable, coursesTable, lessonsTable } from '../db/schema';
import { type CreateFileAttachmentInput } from '../schema';
import { createFileAttachment } from '../handlers/create_file_attachment';
import { eq } from 'drizzle-orm';

describe('createFileAttachment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createPrerequisites = async () => {
    // Create a teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Create a lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: course.id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    return lessonResult[0];
  };

  const testInput: CreateFileAttachmentInput = {
    lesson_id: 1, // Will be overwritten in tests
    filename: 'test-document.pdf',
    file_path: '/uploads/lessons/test-document.pdf',
    file_type: 'application/pdf',
    file_size: 1024000
  };

  it('should create a file attachment successfully', async () => {
    const lesson = await createPrerequisites();
    const input = { ...testInput, lesson_id: lesson.id };

    const result = await createFileAttachment(input);

    // Verify returned data
    expect(result.id).toBeDefined();
    expect(result.lesson_id).toEqual(lesson.id);
    expect(result.filename).toEqual('test-document.pdf');
    expect(result.file_path).toEqual('/uploads/lessons/test-document.pdf');
    expect(result.file_type).toEqual('application/pdf');
    expect(result.file_size).toEqual(1024000);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save file attachment to database', async () => {
    const lesson = await createPrerequisites();
    const input = { ...testInput, lesson_id: lesson.id };

    const result = await createFileAttachment(input);

    // Query database to verify record was saved
    const fileAttachments = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.id, result.id))
      .execute();

    expect(fileAttachments).toHaveLength(1);
    expect(fileAttachments[0].lesson_id).toEqual(lesson.id);
    expect(fileAttachments[0].filename).toEqual('test-document.pdf');
    expect(fileAttachments[0].file_path).toEqual('/uploads/lessons/test-document.pdf');
    expect(fileAttachments[0].file_type).toEqual('application/pdf');
    expect(fileAttachments[0].file_size).toEqual(1024000);
    expect(fileAttachments[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different file types correctly', async () => {
    const lesson = await createPrerequisites();

    const videoInput: CreateFileAttachmentInput = {
      lesson_id: lesson.id,
      filename: 'lecture-video.mp4',
      file_path: '/uploads/lessons/lecture-video.mp4',
      file_type: 'video/mp4',
      file_size: 52428800 // 50MB
    };

    const result = await createFileAttachment(videoInput);

    expect(result.filename).toEqual('lecture-video.mp4');
    expect(result.file_type).toEqual('video/mp4');
    expect(result.file_size).toEqual(52428800);
  });

  it('should handle DOCX files correctly', async () => {
    const lesson = await createPrerequisites();

    const docxInput: CreateFileAttachmentInput = {
      lesson_id: lesson.id,
      filename: 'assignment-template.docx',
      file_path: '/uploads/lessons/assignment-template.docx',
      file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: 2048000 // 2MB
    };

    const result = await createFileAttachment(docxInput);

    expect(result.filename).toEqual('assignment-template.docx');
    expect(result.file_type).toEqual('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(result.file_size).toEqual(2048000);

    // Verify in database
    const savedAttachment = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.id, result.id))
      .execute();

    expect(savedAttachment[0].file_type).toEqual('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  it('should throw error when lesson does not exist', async () => {
    const input = { ...testInput, lesson_id: 99999 };

    await expect(createFileAttachment(input)).rejects.toThrow(/Lesson with ID 99999 not found/i);
  });

  it('should create multiple file attachments for the same lesson', async () => {
    const lesson = await createPrerequisites();

    // Create first attachment
    const input1: CreateFileAttachmentInput = {
      lesson_id: lesson.id,
      filename: 'document1.pdf',
      file_path: '/uploads/lessons/document1.pdf',
      file_type: 'application/pdf',
      file_size: 1024000
    };

    // Create second attachment
    const input2: CreateFileAttachmentInput = {
      lesson_id: lesson.id,
      filename: 'video1.mp4',
      file_path: '/uploads/lessons/video1.mp4',
      file_type: 'video/mp4',
      file_size: 10240000
    };

    const result1 = await createFileAttachment(input1);
    const result2 = await createFileAttachment(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.lesson_id).toEqual(lesson.id);
    expect(result2.lesson_id).toEqual(lesson.id);

    // Verify both attachments exist in database
    const attachments = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.lesson_id, lesson.id))
      .execute();

    expect(attachments).toHaveLength(2);
  });

  it('should handle large file sizes correctly', async () => {
    const lesson = await createPrerequisites();

    const largeFileInput: CreateFileAttachmentInput = {
      lesson_id: lesson.id,
      filename: 'large-video.mp4',
      file_path: '/uploads/lessons/large-video.mp4',
      file_type: 'video/mp4',
      file_size: 104857600 // 100MB
    };

    const result = await createFileAttachment(largeFileInput);

    expect(result.file_size).toEqual(104857600);
    expect(typeof result.file_size).toBe('number');

    // Verify in database
    const savedAttachment = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.id, result.id))
      .execute();

    expect(savedAttachment[0].file_size).toEqual(104857600);
  });
});