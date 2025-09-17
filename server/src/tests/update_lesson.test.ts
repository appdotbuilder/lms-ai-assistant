import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable } from '../db/schema';
import { type UpdateLessonInput } from '../schema';
import { updateLesson } from '../handlers/update_lesson';
import { eq } from 'drizzle-orm';

describe('updateLesson', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create a teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Create a lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: course.id,
        title: 'Original Lesson Title',
        content: 'Original lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const lesson = lessonResult[0];

    return { teacher, course, lesson };
  };

  it('should update lesson title', async () => {
    const { lesson } = await createTestData();

    const input: UpdateLessonInput = {
      id: lesson.id,
      title: 'Updated Lesson Title'
    };

    const result = await updateLesson(input);

    expect(result.id).toEqual(lesson.id);
    expect(result.title).toEqual('Updated Lesson Title');
    expect(result.content).toEqual('Original lesson content'); // Should remain unchanged
    expect(result.order_index).toEqual(1); // Should remain unchanged
    expect(result.course_id).toEqual(lesson.course_id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > lesson.updated_at).toBe(true);
  });

  it('should update lesson content', async () => {
    const { lesson } = await createTestData();

    const input: UpdateLessonInput = {
      id: lesson.id,
      content: 'Updated lesson content with new information'
    };

    const result = await updateLesson(input);

    expect(result.id).toEqual(lesson.id);
    expect(result.title).toEqual('Original Lesson Title'); // Should remain unchanged
    expect(result.content).toEqual('Updated lesson content with new information');
    expect(result.order_index).toEqual(1); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > lesson.updated_at).toBe(true);
  });

  it('should update lesson order index', async () => {
    const { lesson } = await createTestData();

    const input: UpdateLessonInput = {
      id: lesson.id,
      order_index: 5
    };

    const result = await updateLesson(input);

    expect(result.id).toEqual(lesson.id);
    expect(result.title).toEqual('Original Lesson Title'); // Should remain unchanged
    expect(result.content).toEqual('Original lesson content'); // Should remain unchanged
    expect(result.order_index).toEqual(5);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > lesson.updated_at).toBe(true);
  });

  it('should update multiple fields simultaneously', async () => {
    const { lesson } = await createTestData();

    const input: UpdateLessonInput = {
      id: lesson.id,
      title: 'Completely New Title',
      content: 'Completely new content for this lesson',
      order_index: 10
    };

    const result = await updateLesson(input);

    expect(result.id).toEqual(lesson.id);
    expect(result.title).toEqual('Completely New Title');
    expect(result.content).toEqual('Completely new content for this lesson');
    expect(result.order_index).toEqual(10);
    expect(result.course_id).toEqual(lesson.course_id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > lesson.updated_at).toBe(true);
  });

  it('should set content to null when explicitly provided', async () => {
    const { lesson } = await createTestData();

    const input: UpdateLessonInput = {
      id: lesson.id,
      content: null
    };

    const result = await updateLesson(input);

    expect(result.id).toEqual(lesson.id);
    expect(result.title).toEqual('Original Lesson Title'); // Should remain unchanged
    expect(result.content).toBeNull();
    expect(result.order_index).toEqual(1); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > lesson.updated_at).toBe(true);
  });

  it('should persist changes to database', async () => {
    const { lesson } = await createTestData();

    const input: UpdateLessonInput = {
      id: lesson.id,
      title: 'Database Persistence Test',
      content: 'Testing if changes persist in the database'
    };

    await updateLesson(input);

    // Verify changes persisted in database
    const updatedLessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lesson.id))
      .execute();

    expect(updatedLessons).toHaveLength(1);
    expect(updatedLessons[0].title).toEqual('Database Persistence Test');
    expect(updatedLessons[0].content).toEqual('Testing if changes persist in the database');
    expect(updatedLessons[0].order_index).toEqual(1); // Should remain unchanged
    expect(updatedLessons[0].updated_at).toBeInstanceOf(Date);
    expect(updatedLessons[0].updated_at > lesson.updated_at).toBe(true);
  });

  it('should throw error when lesson does not exist', async () => {
    const input: UpdateLessonInput = {
      id: 999999, // Non-existent lesson ID
      title: 'This should fail'
    };

    await expect(updateLesson(input)).rejects.toThrow(/Lesson with ID 999999 not found/i);
  });

  it('should handle update with no optional fields provided', async () => {
    const { lesson } = await createTestData();

    const input: UpdateLessonInput = {
      id: lesson.id
      // No optional fields provided - only updated_at should change
    };

    const result = await updateLesson(input);

    expect(result.id).toEqual(lesson.id);
    expect(result.title).toEqual('Original Lesson Title'); // Should remain unchanged
    expect(result.content).toEqual('Original lesson content'); // Should remain unchanged
    expect(result.order_index).toEqual(1); // Should remain unchanged
    expect(result.course_id).toEqual(lesson.course_id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > lesson.updated_at).toBe(true); // Only updated_at should change
  });
});