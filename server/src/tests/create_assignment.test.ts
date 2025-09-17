import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assignmentsTable, usersTable, coursesTable, lessonsTable } from '../db/schema';
import { type CreateAssignmentInput } from '../schema';
import { createAssignment } from '../handlers/create_assignment';
import { eq } from 'drizzle-orm';

describe('createAssignment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an assignment with all fields', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashedpassword',
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
        teacher_id: teacherResult[0].id
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

    const dueDate = new Date('2024-12-31T23:59:59Z');
    const testInput: CreateAssignmentInput = {
      lesson_id: lessonResult[0].id,
      title: 'Final Project',
      description: 'Complete the final project assignment',
      due_date: dueDate,
      max_points: 100
    };

    const result = await createAssignment(testInput);

    // Basic field validation
    expect(result.title).toEqual('Final Project');
    expect(result.description).toEqual('Complete the final project assignment');
    expect(result.lesson_id).toEqual(lessonResult[0].id);
    expect(result.due_date).toEqual(dueDate);
    expect(result.max_points).toEqual(100);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an assignment with minimal fields', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashedpassword',
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
        teacher_id: teacherResult[0].id
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

    const testInput: CreateAssignmentInput = {
      lesson_id: lessonResult[0].id,
      title: 'Simple Assignment',
      description: null,
      due_date: null,
      max_points: 50
    };

    const result = await createAssignment(testInput);

    // Verify minimal fields
    expect(result.title).toEqual('Simple Assignment');
    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.lesson_id).toEqual(lessonResult[0].id);
    expect(result.max_points).toEqual(50);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save assignment to database', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashedpassword',
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
        teacher_id: teacherResult[0].id
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

    const testInput: CreateAssignmentInput = {
      lesson_id: lessonResult[0].id,
      title: 'Database Test Assignment',
      description: 'Testing database persistence',
      due_date: new Date('2024-12-15T10:30:00Z'),
      max_points: 75
    };

    const result = await createAssignment(testInput);

    // Query using proper drizzle syntax
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, result.id))
      .execute();

    expect(assignments).toHaveLength(1);
    expect(assignments[0].title).toEqual('Database Test Assignment');
    expect(assignments[0].description).toEqual('Testing database persistence');
    expect(assignments[0].lesson_id).toEqual(lessonResult[0].id);
    expect(assignments[0].max_points).toEqual(75);
    expect(assignments[0].due_date).toEqual(new Date('2024-12-15T10:30:00Z'));
    expect(assignments[0].created_at).toBeInstanceOf(Date);
    expect(assignments[0].updated_at).toBeInstanceOf(Date);
  });

  it('should fail when lesson does not exist', async () => {
    const testInput: CreateAssignmentInput = {
      lesson_id: 999999, // Non-existent lesson ID
      title: 'Invalid Assignment',
      description: 'This should fail',
      due_date: null,
      max_points: 25
    };

    await expect(createAssignment(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});