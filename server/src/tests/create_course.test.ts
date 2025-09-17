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

  // Test data
  const teacherData = {
    email: 'teacher@example.com',
    password_hash: 'hashedpassword123',
    first_name: 'John',
    last_name: 'Teacher',
    role: 'teacher' as const
  };

  const studentData = {
    email: 'student@example.com',
    password_hash: 'hashedpassword123',
    first_name: 'Jane',
    last_name: 'Student',
    role: 'student' as const
  };

  it('should create a course with valid teacher', async () => {
    // Create a teacher first
    const teacherResult = await db.insert(usersTable)
      .values(teacherData)
      .returning()
      .execute();
    
    const teacher = teacherResult[0];

    const testInput: CreateCourseInput = {
      title: 'Introduction to Programming',
      description: 'Learn the basics of programming',
      teacher_id: teacher.id
    };

    const result = await createCourse(testInput);

    // Verify the returned course data
    expect(result.title).toEqual('Introduction to Programming');
    expect(result.description).toEqual('Learn the basics of programming');
    expect(result.teacher_id).toEqual(teacher.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a course with null description', async () => {
    // Create a teacher first
    const teacherResult = await db.insert(usersTable)
      .values(teacherData)
      .returning()
      .execute();
    
    const teacher = teacherResult[0];

    const testInput: CreateCourseInput = {
      title: 'Advanced Mathematics',
      description: null,
      teacher_id: teacher.id
    };

    const result = await createCourse(testInput);

    expect(result.title).toEqual('Advanced Mathematics');
    expect(result.description).toBeNull();
    expect(result.teacher_id).toEqual(teacher.id);
    expect(result.id).toBeDefined();
  });

  it('should save course to database', async () => {
    // Create a teacher first
    const teacherResult = await db.insert(usersTable)
      .values(teacherData)
      .returning()
      .execute();
    
    const teacher = teacherResult[0];

    const testInput: CreateCourseInput = {
      title: 'Database Design',
      description: 'Learn how to design efficient databases',
      teacher_id: teacher.id
    };

    const result = await createCourse(testInput);

    // Query the database to verify the course was saved
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, result.id))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].title).toEqual('Database Design');
    expect(courses[0].description).toEqual('Learn how to design efficient databases');
    expect(courses[0].teacher_id).toEqual(teacher.id);
    expect(courses[0].created_at).toBeInstanceOf(Date);
    expect(courses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when teacher does not exist', async () => {
    const testInput: CreateCourseInput = {
      title: 'Nonexistent Teacher Course',
      description: 'This should fail',
      teacher_id: 999 // Non-existent teacher ID
    };

    await expect(createCourse(testInput)).rejects.toThrow(/Teacher with ID 999 not found/i);
  });

  it('should throw error when user is not a teacher', async () => {
    // Create a student user (not a teacher)
    const studentResult = await db.insert(usersTable)
      .values(studentData)
      .returning()
      .execute();
    
    const student = studentResult[0];

    const testInput: CreateCourseInput = {
      title: 'Student Trying to Create Course',
      description: 'This should fail because student is not a teacher',
      teacher_id: student.id
    };

    await expect(createCourse(testInput)).rejects.toThrow(/User with ID \d+ is not a teacher/i);
  });

  it('should handle multiple courses for same teacher', async () => {
    // Create a teacher first
    const teacherResult = await db.insert(usersTable)
      .values(teacherData)
      .returning()
      .execute();
    
    const teacher = teacherResult[0];

    const course1Input: CreateCourseInput = {
      title: 'Course 1',
      description: 'First course',
      teacher_id: teacher.id
    };

    const course2Input: CreateCourseInput = {
      title: 'Course 2',
      description: 'Second course',
      teacher_id: teacher.id
    };

    const result1 = await createCourse(course1Input);
    const result2 = await createCourse(course2Input);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.teacher_id).toEqual(teacher.id);
    expect(result2.teacher_id).toEqual(teacher.id);

    // Verify both courses exist in database
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.teacher_id, teacher.id))
      .execute();

    expect(courses).toHaveLength(2);
    expect(courses.map(c => c.title)).toContain('Course 1');
    expect(courses.map(c => c.title)).toContain('Course 2');
  });
});