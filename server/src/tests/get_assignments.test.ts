import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, assignmentsTable } from '../db/schema';
import { type CreateAssignmentInput } from '../schema';
import { getAssignmentsByLesson, getAssignment } from '../handlers/get_assignments';

describe('getAssignments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  async function createTestData() {
    // Create teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Teacher',
        last_name: 'User',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Create lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: course.id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const lesson = lessonResult[0];

    return { teacher, course, lesson };
  }

  describe('getAssignmentsByLesson', () => {
    it('should return assignments for a specific lesson', async () => {
      const { lesson } = await createTestData();

      // Create assignments for the lesson
      const assignment1Input: CreateAssignmentInput = {
        lesson_id: lesson.id,
        title: 'Assignment 1',
        description: 'First assignment',
        due_date: new Date('2024-12-31'),
        max_points: 100
      };

      const assignment2Input: CreateAssignmentInput = {
        lesson_id: lesson.id,
        title: 'Assignment 2',
        description: 'Second assignment',
        due_date: new Date('2024-12-15'),
        max_points: 50
      };

      await db.insert(assignmentsTable)
        .values([assignment1Input, assignment2Input])
        .execute();

      // Test the handler
      const results = await getAssignmentsByLesson(lesson.id);

      expect(results).toHaveLength(2);
      expect(results[0].title).toEqual('Assignment 1');
      expect(results[0].lesson_id).toEqual(lesson.id);
      expect(results[0].max_points).toEqual(100);
      expect(results[0].due_date).toBeInstanceOf(Date);
      expect(results[0].created_at).toBeInstanceOf(Date);
      expect(results[0].updated_at).toBeInstanceOf(Date);

      expect(results[1].title).toEqual('Assignment 2');
      expect(results[1].lesson_id).toEqual(lesson.id);
      expect(results[1].max_points).toEqual(50);
    });

    it('should return empty array when lesson has no assignments', async () => {
      const { lesson } = await createTestData();

      const results = await getAssignmentsByLesson(lesson.id);

      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array for non-existent lesson', async () => {
      const results = await getAssignmentsByLesson(99999);

      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should only return assignments for the specified lesson', async () => {
      const { lesson } = await createTestData();

      // Create another lesson
      const lesson2Result = await db.insert(lessonsTable)
        .values({
          course_id: lesson.course_id,
          title: 'Another Lesson',
          content: 'Another lesson content',
          order_index: 2
        })
        .returning()
        .execute();

      const lesson2 = lesson2Result[0];

      // Create assignment for first lesson
      await db.insert(assignmentsTable)
        .values({
          lesson_id: lesson.id,
          title: 'Lesson 1 Assignment',
          description: 'Assignment for lesson 1',
          due_date: new Date('2024-12-31'),
          max_points: 100
        })
        .execute();

      // Create assignment for second lesson
      await db.insert(assignmentsTable)
        .values({
          lesson_id: lesson2.id,
          title: 'Lesson 2 Assignment',
          description: 'Assignment for lesson 2',
          due_date: new Date('2024-12-31'),
          max_points: 100
        })
        .execute();

      // Test that we only get assignments for the specified lesson
      const results = await getAssignmentsByLesson(lesson.id);

      expect(results).toHaveLength(1);
      expect(results[0].title).toEqual('Lesson 1 Assignment');
      expect(results[0].lesson_id).toEqual(lesson.id);
    });
  });

  describe('getAssignment', () => {
    it('should return a specific assignment by id', async () => {
      const { lesson } = await createTestData();

      // Create assignment
      const assignmentInput: CreateAssignmentInput = {
        lesson_id: lesson.id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31'),
        max_points: 100
      };

      const createdResult = await db.insert(assignmentsTable)
        .values(assignmentInput)
        .returning()
        .execute();

      const createdAssignment = createdResult[0];

      // Test the handler
      const result = await getAssignment(createdAssignment.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdAssignment.id);
      expect(result!.title).toEqual('Test Assignment');
      expect(result!.description).toEqual('A test assignment');
      expect(result!.lesson_id).toEqual(lesson.id);
      expect(result!.max_points).toEqual(100);
      expect(result!.due_date).toBeInstanceOf(Date);
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should return null for non-existent assignment', async () => {
      const result = await getAssignment(99999);

      expect(result).toBeNull();
    });

    it('should handle assignment with nullable fields', async () => {
      const { lesson } = await createTestData();

      // Create assignment with minimal required fields
      const assignmentInput: CreateAssignmentInput = {
        lesson_id: lesson.id,
        title: 'Minimal Assignment',
        description: null,
        due_date: null,
        max_points: 50
      };

      const createdResult = await db.insert(assignmentsTable)
        .values(assignmentInput)
        .returning()
        .execute();

      const createdAssignment = createdResult[0];

      // Test the handler
      const result = await getAssignment(createdAssignment.id);

      expect(result).not.toBeNull();
      expect(result!.title).toEqual('Minimal Assignment');
      expect(result!.description).toBeNull();
      expect(result!.due_date).toBeNull();
      expect(result!.max_points).toEqual(50);
    });
  });
});