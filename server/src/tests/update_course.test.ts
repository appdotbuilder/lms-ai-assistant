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

  it('should update course title', async () => {
    // Create a teacher user first
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

    const teacher = teacherResult[0];

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Original Title',
        description: 'Original description',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Update the course title
    const updateInput: UpdateCourseInput = {
      id: course.id,
      title: 'Updated Title'
    };

    const result = await updateCourse(updateInput);

    // Verify the result
    expect(result.id).toEqual(course.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Original description');
    expect(result.teacher_id).toEqual(teacher.id);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > course.updated_at).toBe(true);
  });

  it('should update course description', async () => {
    // Create a teacher user first
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

    const teacher = teacherResult[0];

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'Original description',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Update the course description
    const updateInput: UpdateCourseInput = {
      id: course.id,
      description: 'Updated description'
    };

    const result = await updateCourse(updateInput);

    // Verify the result
    expect(result.id).toEqual(course.id);
    expect(result.title).toEqual('Test Course');
    expect(result.description).toEqual('Updated description');
    expect(result.teacher_id).toEqual(teacher.id);
  });

  it('should update both title and description', async () => {
    // Create a teacher user first
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

    const teacher = teacherResult[0];

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Original Title',
        description: 'Original description',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Update both title and description
    const updateInput: UpdateCourseInput = {
      id: course.id,
      title: 'Updated Title',
      description: 'Updated description'
    };

    const result = await updateCourse(updateInput);

    // Verify the result
    expect(result.id).toEqual(course.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Updated description');
    expect(result.teacher_id).toEqual(teacher.id);
  });

  it('should set description to null when provided', async () => {
    // Create a teacher user first
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

    const teacher = teacherResult[0];

    // Create a course with description
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'Original description',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Update the course to set description to null
    const updateInput: UpdateCourseInput = {
      id: course.id,
      description: null
    };

    const result = await updateCourse(updateInput);

    // Verify the result
    expect(result.id).toEqual(course.id);
    expect(result.title).toEqual('Test Course');
    expect(result.description).toBeNull();
    expect(result.teacher_id).toEqual(teacher.id);
  });

  it('should persist changes to database', async () => {
    // Create a teacher user first
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

    const teacher = teacherResult[0];

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Original Title',
        description: 'Original description',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Update the course
    const updateInput: UpdateCourseInput = {
      id: course.id,
      title: 'Updated Title',
      description: 'Updated description'
    };

    await updateCourse(updateInput);

    // Verify changes persisted in database
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, course.id))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].title).toEqual('Updated Title');
    expect(courses[0].description).toEqual('Updated description');
    expect(courses[0].teacher_id).toEqual(teacher.id);
    expect(courses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent course', async () => {
    const updateInput: UpdateCourseInput = {
      id: 9999, // Non-existent ID
      title: 'Updated Title'
    };

    await expect(updateCourse(updateInput)).rejects.toThrow(/Course with id 9999 not found/i);
  });

  it('should only update provided fields', async () => {
    // Create a teacher user first
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

    const teacher = teacherResult[0];

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Original Title',
        description: 'Original description',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Update only the title (no description field provided)
    const updateInput: UpdateCourseInput = {
      id: course.id,
      title: 'Updated Title Only'
    };

    const result = await updateCourse(updateInput);

    // Verify only title was updated, description remained unchanged
    expect(result.id).toEqual(course.id);
    expect(result.title).toEqual('Updated Title Only');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.teacher_id).toEqual(teacher.id);
  });
});