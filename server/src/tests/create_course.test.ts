import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type CreateCourseInput } from '../schema';
import { createCourse } from '../handlers/create_course';
import { eq } from 'drizzle-orm';

describe('createCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a course with valid teacher', async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    const testInput: CreateCourseInput = {
      title: 'Introduction to Computer Science',
      description: 'A comprehensive introduction to programming and computer science concepts',
      teacher_id: teacher.id
    };

    const result = await createCourse(testInput);

    // Basic field validation
    expect(result.title).toEqual('Introduction to Computer Science');
    expect(result.description).toEqual(testInput.description);
    expect(result.teacher_id).toEqual(teacher.id);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a course with null description', async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    const testInput: CreateCourseInput = {
      title: 'Mathematics 101',
      description: null,
      teacher_id: teacher.id
    };

    const result = await createCourse(testInput);

    expect(result.title).toEqual('Mathematics 101');
    expect(result.description).toBeNull();
    expect(result.teacher_id).toEqual(teacher.id);
    expect(result.id).toBeDefined();
  });

  it('should save course to database', async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'Alice',
        last_name: 'Johnson',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    const testInput: CreateCourseInput = {
      title: 'Biology Fundamentals',
      description: 'Basic concepts in biology and life sciences',
      teacher_id: teacher.id
    };

    const result = await createCourse(testInput);

    // Query the database to verify the course was saved
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, result.id))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].title).toEqual('Biology Fundamentals');
    expect(courses[0].description).toEqual(testInput.description);
    expect(courses[0].teacher_id).toEqual(teacher.id);
    expect(courses[0].created_at).toBeInstanceOf(Date);
    expect(courses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when teacher does not exist', async () => {
    const testInput: CreateCourseInput = {
      title: 'Non-existent Teacher Course',
      description: 'This should fail',
      teacher_id: 999 // Non-existent teacher ID
    };

    await expect(createCourse(testInput)).rejects.toThrow(/Teacher with id 999 not found/i);
  });

  it('should throw error when user is not a teacher', async () => {
    // Create a student user
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        password_hash: 'hashed_password',
        first_name: 'Bob',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const student = studentResult[0];

    const testInput: CreateCourseInput = {
      title: 'Student Trying to Teach',
      description: 'This should fail',
      teacher_id: student.id
    };

    await expect(createCourse(testInput)).rejects.toThrow(/User with id \d+ is not a teacher/i);
  });

  it('should throw error when user is an administrator', async () => {
    // Create an administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();

    const admin = adminResult[0];

    const testInput: CreateCourseInput = {
      title: 'Admin Trying to Teach',
      description: 'This should fail',
      teacher_id: admin.id
    };

    await expect(createCourse(testInput)).rejects.toThrow(/User with id \d+ is not a teacher/i);
  });

  it('should handle multiple courses for same teacher', async () => {
    // Create a teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'Multi',
        last_name: 'Course',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create first course
    const firstInput: CreateCourseInput = {
      title: 'Course 1',
      description: 'First course',
      teacher_id: teacher.id
    };

    // Create second course
    const secondInput: CreateCourseInput = {
      title: 'Course 2',
      description: 'Second course',
      teacher_id: teacher.id
    };

    const firstResult = await createCourse(firstInput);
    const secondResult = await createCourse(secondInput);

    // Both courses should be created successfully
    expect(firstResult.id).toBeDefined();
    expect(secondResult.id).toBeDefined();
    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.teacher_id).toEqual(teacher.id);
    expect(secondResult.teacher_id).toEqual(teacher.id);

    // Verify both are in database
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.teacher_id, teacher.id))
      .execute();

    expect(courses).toHaveLength(2);
  });
});