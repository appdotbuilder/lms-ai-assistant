import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, assignmentsTable } from '../db/schema';
import { type UpdateAssignmentInput } from '../schema';
import { updateAssignment } from '../handlers/update_assignment';
import { eq } from 'drizzle-orm';

describe('updateAssignment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let courseId: number;
  let lessonId: number;
  let assignmentId: number;

  beforeEach(async () => {
    // Create prerequisite data
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    teacherId = teacher[0].id;

    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherId
      })
      .returning()
      .execute();
    courseId = course[0].id;

    const lesson = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Test Lesson',
        content: 'Lesson content',
        order_index: 1
      })
      .returning()
      .execute();
    lessonId = lesson[0].id;

    const assignment = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonId,
        title: 'Original Assignment',
        description: 'Original description',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();
    assignmentId = assignment[0].id;
  });

  it('should update all assignment fields', async () => {
    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      title: 'Updated Assignment Title',
      description: 'Updated description',
      due_date: new Date('2025-01-15'),
      max_points: 150
    };

    const result = await updateAssignment(updateInput);

    expect(result.id).toBe(assignmentId);
    expect(result.lesson_id).toBe(lessonId);
    expect(result.title).toBe('Updated Assignment Title');
    expect(result.description).toBe('Updated description');
    expect(result.due_date).toEqual(new Date('2025-01-15'));
    expect(result.max_points).toBe(150);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      title: 'Only Title Updated'
    };

    const result = await updateAssignment(updateInput);

    expect(result.title).toBe('Only Title Updated');
    expect(result.description).toBe('Original description'); // Should remain unchanged
    expect(result.due_date).toEqual(new Date('2024-12-31')); // Should remain unchanged
    expect(result.max_points).toBe(100); // Should remain unchanged
  });

  it('should update assignment in database', async () => {
    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      title: 'Database Updated Title',
      max_points: 200
    };

    await updateAssignment(updateInput);

    // Verify the update was persisted in the database
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .execute();

    expect(assignments).toHaveLength(1);
    expect(assignments[0].title).toBe('Database Updated Title');
    expect(assignments[0].max_points).toBe(200);
    expect(assignments[0].description).toBe('Original description'); // Unchanged
  });

  it('should set description to null when explicitly provided', async () => {
    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      description: null
    };

    const result = await updateAssignment(updateInput);

    expect(result.description).toBeNull();
    
    // Verify in database
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .execute();
    
    expect(assignments[0].description).toBeNull();
  });

  it('should set due_date to null when explicitly provided', async () => {
    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      due_date: null
    };

    const result = await updateAssignment(updateInput);

    expect(result.due_date).toBeNull();
    
    // Verify in database
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .execute();
    
    expect(assignments[0].due_date).toBeNull();
  });

  it('should update updated_at timestamp', async () => {
    // Get original timestamp
    const originalAssignment = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .execute();
    
    const originalUpdatedAt = originalAssignment[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      title: 'Updated to test timestamp'
    };

    const result = await updateAssignment(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent assignment', async () => {
    const updateInput: UpdateAssignmentInput = {
      id: 99999, // Non-existent ID
      title: 'This should fail'
    };

    await expect(updateAssignment(updateInput)).rejects.toThrow(/Assignment with id 99999 not found/);
  });

  it('should handle partial updates with multiple fields', async () => {
    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      title: 'New Title',
      max_points: 75
    };

    const result = await updateAssignment(updateInput);

    expect(result.title).toBe('New Title');
    expect(result.max_points).toBe(75);
    expect(result.description).toBe('Original description'); // Unchanged
    expect(result.due_date).toEqual(new Date('2024-12-31')); // Unchanged
  });
});