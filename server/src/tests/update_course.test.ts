import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type UpdateCourseInput } from '../schema';
import { updateCourse } from '../handlers/update_course';
import { eq } from 'drizzle-orm';

describe('updateCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let courseId: number;

  beforeEach(async () => {
    // Create a test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    teacherId = teacherResult[0].id;

    // Create a test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Original Course Title',
        description: 'Original course description',
        teacher_id: teacherId
      })
      .returning()
      .execute();

    courseId = courseResult[0].id;
  });

  it('should update course title only', async () => {
    const input: UpdateCourseInput = {
      id: courseId,
      title: 'Updated Course Title'
    };

    const result = await updateCourse(input);

    expect(result.id).toEqual(courseId);
    expect(result.title).toEqual('Updated Course Title');
    expect(result.description).toEqual('Original course description'); // Should remain unchanged
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
  });

  it('should update course description only', async () => {
    const input: UpdateCourseInput = {
      id: courseId,
      description: 'Updated course description'
    };

    const result = await updateCourse(input);

    expect(result.id).toEqual(courseId);
    expect(result.title).toEqual('Original Course Title'); // Should remain unchanged
    expect(result.description).toEqual('Updated course description');
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both title and description', async () => {
    const input: UpdateCourseInput = {
      id: courseId,
      title: 'New Course Title',
      description: 'New course description'
    };

    const result = await updateCourse(input);

    expect(result.id).toEqual(courseId);
    expect(result.title).toEqual('New Course Title');
    expect(result.description).toEqual('New course description');
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update description to null', async () => {
    const input: UpdateCourseInput = {
      id: courseId,
      description: null
    };

    const result = await updateCourse(input);

    expect(result.id).toEqual(courseId);
    expect(result.title).toEqual('Original Course Title'); // Should remain unchanged
    expect(result.description).toBeNull();
    expect(result.teacher_id).toEqual(teacherId);
  });

  it('should save updates to database', async () => {
    const input: UpdateCourseInput = {
      id: courseId,
      title: 'Database Test Title',
      description: 'Database test description'
    };

    await updateCourse(input);

    // Verify changes were persisted to database
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].title).toEqual('Database Test Title');
    expect(courses[0].description).toEqual('Database test description');
    expect(courses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp', async () => {
    // Get original timestamp
    const originalCourses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();
    
    const originalUpdatedAt = originalCourses[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateCourseInput = {
      id: courseId,
      title: 'Timestamp Test'
    };

    const result = await updateCourse(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent course', async () => {
    const input: UpdateCourseInput = {
      id: 99999,
      title: 'Non-existent Course'
    };

    expect(updateCourse(input)).rejects.toThrow(/Course with id 99999 not found/);
  });

  it('should handle update with no optional fields', async () => {
    const input: UpdateCourseInput = {
      id: courseId
    };

    const result = await updateCourse(input);

    // Should return the course with updated timestamp but no field changes
    expect(result.id).toEqual(courseId);
    expect(result.title).toEqual('Original Course Title');
    expect(result.description).toEqual('Original course description');
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should preserve teacher_id during update', async () => {
    const input: UpdateCourseInput = {
      id: courseId,
      title: 'Teacher Preservation Test'
    };

    const result = await updateCourse(input);

    expect(result.teacher_id).toEqual(teacherId);
    
    // Verify in database
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    expect(courses[0].teacher_id).toEqual(teacherId);
  });
});