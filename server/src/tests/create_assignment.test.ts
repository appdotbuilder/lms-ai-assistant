import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assignmentsTable, contentTable, coursesTable, usersTable } from '../db/schema';
import { type CreateAssignmentInput } from '../schema';
import { createAssignment } from '../handlers/create_assignment';
import { eq } from 'drizzle-orm';

describe('createAssignment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testContentId: number;

  beforeEach(async () => {
    // Create prerequisite data: teacher -> course -> content
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacher[0].id
      })
      .returning()
      .execute();

    const content = await db.insert(contentTable)
      .values({
        course_id: course[0].id,
        title: 'Test Content',
        description: 'Content for testing',
        content_type: 'assignment',
        content_data: '{}',
        order_index: 1
      })
      .returning()
      .execute();

    testContentId = content[0].id;
  });

  const testInput: CreateAssignmentInput = {
    content_id: 0, // Will be set dynamically
    title: 'Test Assignment',
    description: 'An assignment for testing',
    instructions: 'Complete this test assignment carefully',
    due_date: new Date('2024-12-31T23:59:59Z'),
    max_points: 100,
    status: 'published'
  };

  it('should create an assignment', async () => {
    const input = { ...testInput, content_id: testContentId };
    const result = await createAssignment(input);

    // Basic field validation
    expect(result.content_id).toEqual(testContentId);
    expect(result.title).toEqual('Test Assignment');
    expect(result.description).toEqual('An assignment for testing');
    expect(result.instructions).toEqual('Complete this test assignment carefully');
    expect(result.due_date).toEqual(new Date('2024-12-31T23:59:59Z'));
    expect(result.max_points).toEqual(100);
    expect(typeof result.max_points).toBe('number');
    expect(result.status).toEqual('published');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save assignment to database', async () => {
    const input = { ...testInput, content_id: testContentId };
    const result = await createAssignment(input);

    // Query using proper drizzle syntax
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, result.id))
      .execute();

    expect(assignments).toHaveLength(1);
    expect(assignments[0].content_id).toEqual(testContentId);
    expect(assignments[0].title).toEqual('Test Assignment');
    expect(assignments[0].description).toEqual('An assignment for testing');
    expect(assignments[0].instructions).toEqual('Complete this test assignment carefully');
    expect(assignments[0].due_date).toEqual(new Date('2024-12-31T23:59:59Z'));
    expect(parseFloat(assignments[0].max_points)).toEqual(100);
    expect(assignments[0].status).toEqual('published');
    expect(assignments[0].created_at).toBeInstanceOf(Date);
    expect(assignments[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle assignment with null description and due_date', async () => {
    const input: CreateAssignmentInput = {
      content_id: testContentId,
      title: 'Minimal Assignment',
      description: null,
      instructions: 'Basic instructions',
      due_date: null,
      max_points: 50,
      status: 'draft'
    };

    const result = await createAssignment(input);

    expect(result.content_id).toEqual(testContentId);
    expect(result.title).toEqual('Minimal Assignment');
    expect(result.description).toBeNull();
    expect(result.instructions).toEqual('Basic instructions');
    expect(result.due_date).toBeNull();
    expect(result.max_points).toEqual(50);
    expect(result.status).toEqual('draft');
  });

  it('should handle different assignment statuses', async () => {
    const statuses = ['draft', 'published', 'archived'] as const;

    for (const status of statuses) {
      const input = {
        ...testInput,
        content_id: testContentId,
        title: `Assignment ${status}`,
        status
      };

      const result = await createAssignment(input);
      expect(result.status).toEqual(status);
    }
  });

  it('should handle decimal max_points correctly', async () => {
    const input = {
      ...testInput,
      content_id: testContentId,
      max_points: 85.5
    };

    const result = await createAssignment(input);
    expect(result.max_points).toEqual(85.5);
    expect(typeof result.max_points).toBe('number');

    // Verify in database
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, result.id))
      .execute();

    expect(parseFloat(assignments[0].max_points)).toEqual(85.5);
  });

  it('should throw error when content does not exist', async () => {
    const input = { ...testInput, content_id: 99999 };

    await expect(createAssignment(input)).rejects.toThrow(/Content with id 99999 not found/i);
  });

  it('should handle future due dates correctly', async () => {
    const futureDate = new Date('2025-06-15T14:30:00Z');
    const input = {
      ...testInput,
      content_id: testContentId,
      due_date: futureDate
    };

    const result = await createAssignment(input);
    expect(result.due_date).toEqual(futureDate);

    // Verify in database
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, result.id))
      .execute();

    expect(assignments[0].due_date).toEqual(futureDate);
  });
});