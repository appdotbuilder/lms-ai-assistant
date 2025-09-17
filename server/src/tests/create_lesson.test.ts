import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { lessonsTable, coursesTable, usersTable } from '../db/schema';
import { type CreateLessonInput } from '../schema';
import { createLesson } from '../handlers/create_lesson';
import { eq } from 'drizzle-orm';

describe('createLesson', () => {
  let testCourseId: number;
  let testTeacherId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test teacher user
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
    
    testTeacherId = teacherResult[0].id;

    // Create a test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        teacher_id: testTeacherId
      })
      .returning()
      .execute();
    
    testCourseId = courseResult[0].id;
  });

  afterEach(resetDB);

  it('should create a lesson with all fields', async () => {
    const testInput: CreateLessonInput = {
      course_id: testCourseId,
      title: 'Introduction to Programming',
      content: '<h1>Welcome to Programming</h1><p>This lesson covers the basics of programming.</p>',
      order_index: 1
    };

    const result = await createLesson(testInput);

    // Basic field validation
    expect(result.course_id).toEqual(testCourseId);
    expect(result.title).toEqual('Introduction to Programming');
    expect(result.content).toEqual('<h1>Welcome to Programming</h1><p>This lesson covers the basics of programming.</p>');
    expect(result.order_index).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a lesson with null content', async () => {
    const testInput: CreateLessonInput = {
      course_id: testCourseId,
      title: 'Empty Lesson',
      content: null,
      order_index: 2
    };

    const result = await createLesson(testInput);

    expect(result.course_id).toEqual(testCourseId);
    expect(result.title).toEqual('Empty Lesson');
    expect(result.content).toBeNull();
    expect(result.order_index).toEqual(2);
    expect(result.id).toBeDefined();
  });

  it('should save lesson to database', async () => {
    const testInput: CreateLessonInput = {
      course_id: testCourseId,
      title: 'Database Test Lesson',
      content: '<p>Testing database persistence</p>',
      order_index: 3
    };

    const result = await createLesson(testInput);

    // Query the database to verify the lesson was saved
    const lessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, result.id))
      .execute();

    expect(lessons).toHaveLength(1);
    expect(lessons[0].title).toEqual('Database Test Lesson');
    expect(lessons[0].content).toEqual('<p>Testing database persistence</p>');
    expect(lessons[0].course_id).toEqual(testCourseId);
    expect(lessons[0].order_index).toEqual(3);
    expect(lessons[0].created_at).toBeInstanceOf(Date);
    expect(lessons[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple lessons with different order indices', async () => {
    const lesson1Input: CreateLessonInput = {
      course_id: testCourseId,
      title: 'Lesson 1',
      content: 'First lesson content',
      order_index: 1
    };

    const lesson2Input: CreateLessonInput = {
      course_id: testCourseId,
      title: 'Lesson 2',
      content: 'Second lesson content',
      order_index: 2
    };

    const result1 = await createLesson(lesson1Input);
    const result2 = await createLesson(lesson2Input);

    expect(result1.order_index).toEqual(1);
    expect(result2.order_index).toEqual(2);
    expect(result1.id).not.toEqual(result2.id);

    // Verify both lessons exist in database
    const lessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.course_id, testCourseId))
      .execute();

    expect(lessons).toHaveLength(2);
  });

  it('should throw error when course does not exist', async () => {
    const testInput: CreateLessonInput = {
      course_id: 99999, // Non-existent course ID
      title: 'Invalid Course Lesson',
      content: 'This should fail',
      order_index: 1
    };

    await expect(createLesson(testInput))
      .rejects
      .toThrow(/course with id 99999 does not exist/i);
  });

  it('should handle rich text content properly', async () => {
    const richContent = `
      <h1>Advanced Programming Concepts</h1>
      <h2>Object-Oriented Programming</h2>
      <p>Object-oriented programming (OOP) is a programming paradigm that uses objects.</p>
      <ul>
        <li><strong>Encapsulation</strong>: Bundling data and methods</li>
        <li><strong>Inheritance</strong>: Creating new classes based on existing ones</li>
        <li><strong>Polymorphism</strong>: Objects taking multiple forms</li>
      </ul>
      <blockquote>
        "The best programs are written so that computing machines can perform them quickly 
        and so that human beings can understand them clearly." - Donald Knuth
      </blockquote>
    `.trim();

    const testInput: CreateLessonInput = {
      course_id: testCourseId,
      title: 'Advanced Programming',
      content: richContent,
      order_index: 5
    };

    const result = await createLesson(testInput);

    expect(result.content).toEqual(richContent);
    expect(result.title).toEqual('Advanced Programming');

    // Verify rich content is preserved in database
    const lessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, result.id))
      .execute();

    expect(lessons[0].content).toEqual(richContent);
  });
});