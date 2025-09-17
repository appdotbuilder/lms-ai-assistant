import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, contentTable } from '../db/schema';
import { type CreateUserInput, type CreateCourseInput, type CreateContentInput } from '../schema';
import { getContentById } from '../handlers/get_content_by_id';
import { eq } from 'drizzle-orm';

// Test data setup
const testTeacher: CreateUserInput = {
  email: 'teacher@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Teacher',
  role: 'teacher'
};

const testCourse: CreateCourseInput = {
  title: 'Test Course',
  description: 'A course for testing',
  teacher_id: 1 // Will be set after teacher creation
};

const testContent: CreateContentInput = {
  course_id: 1, // Will be set after course creation
  title: 'Test Content',
  description: 'Content for testing',
  content_type: 'text_lesson',
  content_data: '{"text": "This is a test lesson"}',
  order_index: 0
};

describe('getContentById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return content when it exists', async () => {
    // Create prerequisite teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: testTeacher.email,
        password_hash: 'hashed_password',
        first_name: testTeacher.first_name,
        last_name: testTeacher.last_name,
        role: testTeacher.role
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create prerequisite course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: testCourse.title,
        description: testCourse.description,
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create test content
    const contentResult = await db.insert(contentTable)
      .values({
        course_id: courseId,
        title: testContent.title,
        description: testContent.description,
        content_type: testContent.content_type,
        content_data: testContent.content_data,
        order_index: testContent.order_index
      })
      .returning()
      .execute();

    const contentId = contentResult[0].id;

    // Test the handler
    const result = await getContentById(contentId);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(contentId);
    expect(result!.title).toEqual('Test Content');
    expect(result!.description).toEqual('Content for testing');
    expect(result!.content_type).toEqual('text_lesson');
    expect(result!.content_data).toEqual('{"text": "This is a test lesson"}');
    expect(result!.order_index).toEqual(0);
    expect(result!.course_id).toEqual(courseId);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when content does not exist', async () => {
    const nonExistentId = 9999;

    const result = await getContentById(nonExistentId);

    expect(result).toBeNull();
  });

  it('should return content with different content types', async () => {
    // Create prerequisite teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: testTeacher.email,
        password_hash: 'hashed_password',
        first_name: testTeacher.first_name,
        last_name: testTeacher.last_name,
        role: testTeacher.role
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create prerequisite course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: testCourse.title,
        description: testCourse.description,
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create video content
    const videoContent = await db.insert(contentTable)
      .values({
        course_id: courseId,
        title: 'Video Lesson',
        description: 'A video lesson',
        content_type: 'video',
        content_data: '{"video_url": "https://example.com/video.mp4", "duration": 600}',
        order_index: 1
      })
      .returning()
      .execute();

    const videoId = videoContent[0].id;

    // Test the handler
    const result = await getContentById(videoId);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(videoId);
    expect(result!.title).toEqual('Video Lesson');
    expect(result!.content_type).toEqual('video');
    expect(result!.content_data).toEqual('{"video_url": "https://example.com/video.mp4", "duration": 600}');
    expect(result!.order_index).toEqual(1);
  });

  it('should handle content with null description', async () => {
    // Create prerequisite teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: testTeacher.email,
        password_hash: 'hashed_password',
        first_name: testTeacher.first_name,
        last_name: testTeacher.last_name,
        role: testTeacher.role
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create prerequisite course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: testCourse.title,
        description: testCourse.description,
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create content with null description
    const contentResult = await db.insert(contentTable)
      .values({
        course_id: courseId,
        title: 'Content Without Description',
        description: null,
        content_type: 'quiz',
        content_data: '{"questions": []}',
        order_index: 2
      })
      .returning()
      .execute();

    const contentId = contentResult[0].id;

    // Test the handler
    const result = await getContentById(contentId);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(contentId);
    expect(result!.title).toEqual('Content Without Description');
    expect(result!.description).toBeNull();
    expect(result!.content_type).toEqual('quiz');
  });

  it('should verify content is saved correctly in database', async () => {
    // Create prerequisite teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: testTeacher.email,
        password_hash: 'hashed_password',
        first_name: testTeacher.first_name,
        last_name: testTeacher.last_name,
        role: testTeacher.role
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create prerequisite course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: testCourse.title,
        description: testCourse.description,
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create test content
    const contentResult = await db.insert(contentTable)
      .values({
        course_id: courseId,
        title: testContent.title,
        description: testContent.description,
        content_type: testContent.content_type,
        content_data: testContent.content_data,
        order_index: testContent.order_index
      })
      .returning()
      .execute();

    const contentId = contentResult[0].id;

    // Get content via handler
    const handlerResult = await getContentById(contentId);

    // Verify by querying database directly
    const dbContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, contentId))
      .execute();

    expect(dbContent).toHaveLength(1);
    expect(handlerResult).not.toBeNull();
    expect(handlerResult!.id).toEqual(dbContent[0].id);
    expect(handlerResult!.title).toEqual(dbContent[0].title);
    expect(handlerResult!.content_type).toEqual(dbContent[0].content_type);
    expect(handlerResult!.created_at).toEqual(dbContent[0].created_at);
  });
});