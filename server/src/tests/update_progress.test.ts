import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  contentTable, 
  courseEnrollmentsTable, 
  studentProgressTable 
} from '../db/schema';
import { type UpdateProgressInput } from '../schema';
import { updateProgress } from '../handlers/update_progress';
import { eq, and } from 'drizzle-orm';

describe('updateProgress', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let studentId: number;
  let teacherId: number;
  let courseId: number;
  let contentId: number;

  const setupTestData = async () => {
    // Create a teacher
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    teacherId = teacher[0].id;

    // Create a student
    const student = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();
    studentId = student[0].id;

    // Create a course
    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherId
      })
      .returning()
      .execute();
    courseId = course[0].id;

    // Create content
    const content = await db.insert(contentTable)
      .values({
        course_id: courseId,
        title: 'Test Lesson',
        description: 'A lesson for testing',
        content_type: 'text_lesson',
        content_data: 'Test lesson content',
        order_index: 1
      })
      .returning()
      .execute();
    contentId = content[0].id;

    // Enroll student in the course
    await db.insert(courseEnrollmentsTable)
      .values({
        course_id: courseId,
        student_id: studentId
      })
      .execute();
  };

  const testInput: UpdateProgressInput = {
    student_id: 0, // Will be set in tests
    content_id: 0, // Will be set in tests
    completed: true,
    time_spent_minutes: 30
  };

  it('should create new progress record when none exists', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      student_id: studentId,
      content_id: contentId
    };

    const result = await updateProgress(input);

    // Verify returned data
    expect(result.student_id).toEqual(studentId);
    expect(result.content_id).toEqual(contentId);
    expect(result.completed).toEqual(true);
    expect(result.time_spent_minutes).toEqual(30);
    expect(result.completion_date).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update existing progress record', async () => {
    await setupTestData();

    // Create initial progress record
    const initialProgress = await db.insert(studentProgressTable)
      .values({
        student_id: studentId,
        content_id: contentId,
        completed: false,
        completion_date: null,
        time_spent_minutes: 15
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      student_id: studentId,
      content_id: contentId,
      completed: true,
      time_spent_minutes: 45
    };

    const result = await updateProgress(input);

    // Should update the same record (same ID)
    expect(result.id).toEqual(initialProgress[0].id);
    expect(result.completed).toEqual(true);
    expect(result.time_spent_minutes).toEqual(45);
    expect(result.completion_date).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify only one record exists in database
    const allProgress = await db.select()
      .from(studentProgressTable)
      .where(and(
        eq(studentProgressTable.student_id, studentId),
        eq(studentProgressTable.content_id, contentId)
      ))
      .execute();

    expect(allProgress).toHaveLength(1);
    expect(allProgress[0].completed).toEqual(true);
  });

  it('should set completion_date when marking as completed', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      student_id: studentId,
      content_id: contentId,
      completed: true,
      time_spent_minutes: 25
    };

    const result = await updateProgress(input);

    expect(result.completed).toEqual(true);
    expect(result.completion_date).toBeInstanceOf(Date);
    expect(result.completion_date).not.toBeNull();
  });

  it('should clear completion_date when marking as not completed', async () => {
    await setupTestData();

    // First create a completed progress record
    await db.insert(studentProgressTable)
      .values({
        student_id: studentId,
        content_id: contentId,
        completed: true,
        completion_date: new Date(),
        time_spent_minutes: 30
      })
      .execute();

    const input = {
      ...testInput,
      student_id: studentId,
      content_id: contentId,
      completed: false,
      time_spent_minutes: 35
    };

    const result = await updateProgress(input);

    expect(result.completed).toEqual(false);
    expect(result.completion_date).toBeNull();
    expect(result.time_spent_minutes).toEqual(35);
  });

  it('should throw error when content does not exist', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      student_id: studentId,
      content_id: 99999, // Non-existent content
      completed: true,
      time_spent_minutes: 30
    };

    await expect(updateProgress(input)).rejects.toThrow(/Content not found/i);
  });

  it('should throw error when student is not enrolled in course', async () => {
    await setupTestData();

    // Create another student not enrolled in the course
    const unenrolledStudent = await db.insert(usersTable)
      .values({
        email: 'unenrolled@example.com',
        password_hash: 'hashed_password',
        first_name: 'Unenrolled',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      student_id: unenrolledStudent[0].id,
      content_id: contentId,
      completed: true,
      time_spent_minutes: 30
    };

    await expect(updateProgress(input)).rejects.toThrow(/not enrolled in this course/i);
  });

  it('should handle zero time spent minutes', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      student_id: studentId,
      content_id: contentId,
      completed: false,
      time_spent_minutes: 0
    };

    const result = await updateProgress(input);

    expect(result.time_spent_minutes).toEqual(0);
    expect(result.completed).toEqual(false);
    expect(result.completion_date).toBeNull();
  });

  it('should update time_spent_minutes correctly when updating existing record', async () => {
    await setupTestData();

    // Create initial progress with some time
    await db.insert(studentProgressTable)
      .values({
        student_id: studentId,
        content_id: contentId,
        completed: false,
        completion_date: null,
        time_spent_minutes: 20
      })
      .execute();

    const input = {
      ...testInput,
      student_id: studentId,
      content_id: contentId,
      completed: false,
      time_spent_minutes: 50 // Update to 50 minutes total
    };

    const result = await updateProgress(input);

    expect(result.time_spent_minutes).toEqual(50);
    expect(result.completed).toEqual(false);
  });

  it('should handle multiple progress updates for same content', async () => {
    await setupTestData();

    const baseInput = {
      student_id: studentId,
      content_id: contentId,
      completed: false,
      time_spent_minutes: 10
    };

    // First update - creates record
    const result1 = await updateProgress(baseInput);
    expect(result1.time_spent_minutes).toEqual(10);
    expect(result1.completed).toEqual(false);

    // Second update - updates existing record
    const result2 = await updateProgress({
      ...baseInput,
      time_spent_minutes: 25
    });
    expect(result2.id).toEqual(result1.id); // Same record
    expect(result2.time_spent_minutes).toEqual(25);

    // Third update - mark as completed
    const result3 = await updateProgress({
      ...baseInput,
      completed: true,
      time_spent_minutes: 40
    });
    expect(result3.id).toEqual(result1.id); // Same record
    expect(result3.completed).toEqual(true);
    expect(result3.completion_date).toBeInstanceOf(Date);
  });
});