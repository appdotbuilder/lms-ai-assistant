import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, fileAttachmentsTable } from '../db/schema';
import { getFileAttachmentsByLesson } from '../handlers/get_file_attachments';

describe('getFileAttachmentsByLesson', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when lesson has no file attachments', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: userResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const result = await getFileAttachmentsByLesson(lessonResult[0].id);

    expect(result).toEqual([]);
  });

  it('should return file attachments for a specific lesson', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: userResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    // Create file attachments
    const attachment1 = await db.insert(fileAttachmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        filename: 'document1.pdf',
        file_path: '/uploads/document1.pdf',
        file_type: 'application/pdf',
        file_size: 1024000
      })
      .returning()
      .execute();

    const attachment2 = await db.insert(fileAttachmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        filename: 'presentation.pptx',
        file_path: '/uploads/presentation.pptx',
        file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        file_size: 2048000
      })
      .returning()
      .execute();

    const result = await getFileAttachmentsByLesson(lessonResult[0].id);

    expect(result).toHaveLength(2);
    
    // Verify first attachment
    const resultAttachment1 = result.find(a => a.filename === 'document1.pdf');
    expect(resultAttachment1).toBeDefined();
    expect(resultAttachment1!.lesson_id).toEqual(lessonResult[0].id);
    expect(resultAttachment1!.file_path).toEqual('/uploads/document1.pdf');
    expect(resultAttachment1!.file_type).toEqual('application/pdf');
    expect(resultAttachment1!.file_size).toEqual(1024000);
    expect(resultAttachment1!.id).toBeDefined();
    expect(resultAttachment1!.created_at).toBeInstanceOf(Date);

    // Verify second attachment
    const resultAttachment2 = result.find(a => a.filename === 'presentation.pptx');
    expect(resultAttachment2).toBeDefined();
    expect(resultAttachment2!.lesson_id).toEqual(lessonResult[0].id);
    expect(resultAttachment2!.file_path).toEqual('/uploads/presentation.pptx');
    expect(resultAttachment2!.file_type).toEqual('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    expect(resultAttachment2!.file_size).toEqual(2048000);
  });

  it('should only return attachments for the specified lesson', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create two lessons
    const lesson1Result = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Lesson 1',
        content: 'First lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const lesson2Result = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Lesson 2',
        content: 'Second lesson content',
        order_index: 2
      })
      .returning()
      .execute();

    // Create file attachments for both lessons
    await db.insert(fileAttachmentsTable)
      .values({
        lesson_id: lesson1Result[0].id,
        filename: 'lesson1_doc.pdf',
        file_path: '/uploads/lesson1_doc.pdf',
        file_type: 'application/pdf',
        file_size: 1024000
      })
      .execute();

    await db.insert(fileAttachmentsTable)
      .values({
        lesson_id: lesson2Result[0].id,
        filename: 'lesson2_doc.pdf',
        file_path: '/uploads/lesson2_doc.pdf',
        file_type: 'application/pdf',
        file_size: 2048000
      })
      .execute();

    await db.insert(fileAttachmentsTable)
      .values({
        lesson_id: lesson1Result[0].id,
        filename: 'lesson1_image.jpg',
        file_path: '/uploads/lesson1_image.jpg',
        file_type: 'image/jpeg',
        file_size: 512000
      })
      .execute();

    // Get attachments for lesson 1 only
    const result = await getFileAttachmentsByLesson(lesson1Result[0].id);

    expect(result).toHaveLength(2);
    
    // All results should belong to lesson 1
    result.forEach(attachment => {
      expect(attachment.lesson_id).toEqual(lesson1Result[0].id);
    });

    // Verify specific files for lesson 1
    const filenames = result.map(a => a.filename).sort();
    expect(filenames).toEqual(['lesson1_doc.pdf', 'lesson1_image.jpg']);
  });

  it('should return empty array for non-existent lesson', async () => {
    const nonExistentLessonId = 99999;
    
    const result = await getFileAttachmentsByLesson(nonExistentLessonId);
    
    expect(result).toEqual([]);
  });
});