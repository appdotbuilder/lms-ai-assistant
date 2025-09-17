import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { getCourseById } from '../handlers/get_course_by_id';
import { eq } from 'drizzle-orm';

describe('getCourseById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return course by ID when course exists', async () => {
    // Create a teacher first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Introduction to Programming',
        description: 'Learn the basics of programming',
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Test the handler
    const result = await getCourseById(courseId);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(courseId);
    expect(result!.title).toEqual('Introduction to Programming');
    expect(result!.description).toEqual('Learn the basics of programming');
    expect(result!.teacher_id).toEqual(teacherId);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when course does not exist', async () => {
    const nonExistentId = 999;
    
    const result = await getCourseById(nonExistentId);
    
    expect(result).toBeNull();
  });

  it('should return course with null description', async () => {
    // Create a teacher first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher2@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create a course with null description
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Advanced Mathematics',
        description: null,
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Test the handler
    const result = await getCourseById(courseId);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(courseId);
    expect(result!.title).toEqual('Advanced Mathematics');
    expect(result!.description).toBeNull();
    expect(result!.teacher_id).toEqual(teacherId);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return the correct course when multiple courses exist', async () => {
    // Create teachers
    const teacher1Result = await db.insert(usersTable)
      .values({
        email: 'teacher1@test.com',
        password_hash: 'hashed_password',
        first_name: 'Alice',
        last_name: 'Johnson',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher2Result = await db.insert(usersTable)
      .values({
        email: 'teacher2@test.com',
        password_hash: 'hashed_password',
        first_name: 'Bob',
        last_name: 'Wilson',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher1Id = teacher1Result[0].id;
    const teacher2Id = teacher2Result[0].id;

    // Create multiple courses
    const course1Result = await db.insert(coursesTable)
      .values({
        title: 'Physics 101',
        description: 'Introduction to Physics',
        teacher_id: teacher1Id
      })
      .returning()
      .execute();

    const course2Result = await db.insert(coursesTable)
      .values({
        title: 'Chemistry 101',
        description: 'Introduction to Chemistry',
        teacher_id: teacher2Id
      })
      .returning()
      .execute();

    const course1Id = course1Result[0].id;
    const course2Id = course2Result[0].id;

    // Test fetching the second course
    const result = await getCourseById(course2Id);

    // Verify we get the correct course
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(course2Id);
    expect(result!.title).toEqual('Chemistry 101');
    expect(result!.description).toEqual('Introduction to Chemistry');
    expect(result!.teacher_id).toEqual(teacher2Id);

    // Verify it's not the first course
    expect(result!.id).not.toEqual(course1Id);
    expect(result!.title).not.toEqual('Physics 101');
  });

  it('should handle database operation successfully', async () => {
    // Create a teacher first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'secure_hash',
        first_name: 'Emma',
        last_name: 'Davis',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create and fetch a course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Data Structures',
        description: 'Learn about data structures and algorithms',
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Test the handler
    const result = await getCourseById(courseId);

    // Verify the course was properly saved and retrieved
    const directDbResult = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    expect(directDbResult).toHaveLength(1);
    expect(result).toEqual(directDbResult[0]);
  });
});