import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, contentTable } from '../db/schema';
import { type CreateUserInput, type CreateCourseInput, type CreateContentInput } from '../schema';
import { getCourseContent } from '../handlers/get_course_content';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser: CreateUserInput = {
  email: 'teacher@test.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'Teacher',
  role: 'teacher'
};

const testCourse: CreateCourseInput = {
  title: 'Test Course',
  description: 'A course for testing',
  teacher_id: 1 // Will be set after user creation
};

const testContent1: CreateContentInput = {
  course_id: 1, // Will be set after course creation
  title: 'First Lesson',
  description: 'Introduction lesson',
  content_type: 'text_lesson',
  content_data: '{"text": "Welcome to the course"}',
  order_index: 0
};

const testContent2: CreateContentInput = {
  course_id: 1,
  title: 'Video Lesson',
  description: 'Video content',
  content_type: 'video',
  content_data: '{"video_url": "http://example.com/video.mp4", "duration": 300}',
  order_index: 1
};

const testContent3: CreateContentInput = {
  course_id: 1,
  title: 'Quiz Time',
  description: 'Test your knowledge',
  content_type: 'quiz',
  content_data: '{"quiz_id": 1}',
  order_index: 2
};

describe('getCourseContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all content for a course ordered by order_index', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const course = await db.insert(coursesTable)
      .values({
        title: testCourse.title,
        description: testCourse.description,
        teacher_id: user[0].id
      })
      .returning()
      .execute();

    // Create content in non-sequential order to test ordering
    await db.insert(contentTable)
      .values([
        {
          ...testContent2,
          course_id: course[0].id
        },
        {
          ...testContent1,
          course_id: course[0].id
        },
        {
          ...testContent3,
          course_id: course[0].id
        }
      ])
      .execute();

    // Fetch content using handler
    const result = await getCourseContent(course[0].id);

    // Verify results
    expect(result).toHaveLength(3);
    
    // Verify correct ordering by order_index
    expect(result[0].title).toEqual('First Lesson');
    expect(result[0].order_index).toEqual(0);
    expect(result[0].content_type).toEqual('text_lesson');
    
    expect(result[1].title).toEqual('Video Lesson');
    expect(result[1].order_index).toEqual(1);
    expect(result[1].content_type).toEqual('video');
    
    expect(result[2].title).toEqual('Quiz Time');
    expect(result[2].order_index).toEqual(2);
    expect(result[2].content_type).toEqual('quiz');

    // Verify all expected fields are present
    result.forEach(content => {
      expect(content.id).toBeDefined();
      expect(content.course_id).toEqual(course[0].id);
      expect(content.title).toBeDefined();
      expect(content.content_type).toBeDefined();
      expect(content.content_data).toBeDefined();
      expect(typeof content.order_index).toBe('number');
      expect(content.created_at).toBeInstanceOf(Date);
      expect(content.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for course with no content', async () => {
    // Create course without content
    const user = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const course = await db.insert(coursesTable)
      .values({
        title: testCourse.title,
        description: testCourse.description,
        teacher_id: user[0].id
      })
      .returning()
      .execute();

    const result = await getCourseContent(course[0].id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should throw error for non-existent course', async () => {
    const nonExistentCourseId = 99999;

    await expect(getCourseContent(nonExistentCourseId))
      .rejects
      .toThrow(/Course with id 99999 not found/i);
  });

  it('should handle content with nullable fields correctly', async () => {
    // Create course and content with nullable description
    const user = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const course = await db.insert(coursesTable)
      .values({
        title: testCourse.title,
        description: testCourse.description,
        teacher_id: user[0].id
      })
      .returning()
      .execute();

    await db.insert(contentTable)
      .values({
        course_id: course[0].id,
        title: 'Content without description',
        description: null,
        content_type: 'assignment',
        content_data: '{"instructions": "Complete the assignment"}',
        order_index: 0
      })
      .execute();

    const result = await getCourseContent(course[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].title).toEqual('Content without description');
    expect(result[0].content_type).toEqual('assignment');
  });

  it('should only return content for the specified course', async () => {
    // Create two courses with different content
    const user = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const courses = await db.insert(coursesTable)
      .values([
        {
          title: 'Course 1',
          description: 'First course',
          teacher_id: user[0].id
        },
        {
          title: 'Course 2',
          description: 'Second course',
          teacher_id: user[0].id
        }
      ])
      .returning()
      .execute();

    // Add content to both courses
    await db.insert(contentTable)
      .values([
        {
          course_id: courses[0].id,
          title: 'Course 1 Content',
          description: null,
          content_type: 'text_lesson',
          content_data: '{"text": "Course 1 lesson"}',
          order_index: 0
        },
        {
          course_id: courses[1].id,
          title: 'Course 2 Content',
          description: null,
          content_type: 'video',
          content_data: '{"video_url": "http://example.com/video2.mp4"}',
          order_index: 0
        }
      ])
      .execute();

    // Fetch content for first course only
    const result = await getCourseContent(courses[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Course 1 Content');
    expect(result[0].course_id).toEqual(courses[0].id);
    expect(result[0].content_type).toEqual('text_lesson');
  });
});