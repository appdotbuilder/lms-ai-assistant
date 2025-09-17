import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  lessonsTable, 
  assignmentsTable, 
  assignmentSubmissionsTable 
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteAssignment } from '../handlers/delete_assignment';

describe('deleteAssignment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete assignment and all submissions', async () => {
    // Create teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();
    const teacherId = teacherResult[0].id;

    // Create student users
    const studentResult1 = await db.insert(usersTable)
      .values({
        email: 'student1@test.com',
        password_hash: 'hashed',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'student'
      })
      .returning()
      .execute();

    const studentResult2 = await db.insert(usersTable)
      .values({
        email: 'student2@test.com',
        password_hash: 'hashed',
        first_name: 'Bob',
        last_name: 'Wilson',
        role: 'student'
      })
      .returning()
      .execute();

    const student1Id = studentResult1[0].id;
    const student2Id = studentResult2[0].id;

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'Course for testing',
        teacher_id: teacherId
      })
      .returning()
      .execute();
    const courseId = courseResult[0].id;

    // Create lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Test Lesson',
        content: 'Lesson content',
        order_index: 1
      })
      .returning()
      .execute();
    const lessonId = lessonResult[0].id;

    // Create assignment
    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonId,
        title: 'Test Assignment',
        description: 'Assignment for testing',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();
    const assignmentId = assignmentResult[0].id;

    // Create assignment submissions
    await db.insert(assignmentSubmissionsTable)
      .values([
        {
          assignment_id: assignmentId,
          student_id: student1Id,
          content: 'Student 1 submission',
          file_path: null,
          grade: 85,
          feedback: 'Good work',
          graded_at: new Date()
        },
        {
          assignment_id: assignmentId,
          student_id: student2Id,
          content: 'Student 2 submission',
          file_path: '/uploads/file.pdf',
          grade: null,
          feedback: null,
          graded_at: null
        }
      ])
      .execute();

    // Verify data exists before deletion
    const assignmentsBefore = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .execute();
    expect(assignmentsBefore).toHaveLength(1);

    const submissionsBefore = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignmentId))
      .execute();
    expect(submissionsBefore).toHaveLength(2);

    // Delete the assignment
    await deleteAssignment(assignmentId);

    // Verify assignment is deleted
    const assignmentsAfter = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .execute();
    expect(assignmentsAfter).toHaveLength(0);

    // Verify submissions are deleted
    const submissionsAfter = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignmentId))
      .execute();
    expect(submissionsAfter).toHaveLength(0);

    // Verify other data remains intact
    const users = await db.select().from(usersTable).execute();
    expect(users).toHaveLength(3);

    const courses = await db.select().from(coursesTable).execute();
    expect(courses).toHaveLength(1);

    const lessons = await db.select().from(lessonsTable).execute();
    expect(lessons).toHaveLength(1);
  });

  it('should delete assignment with no submissions', async () => {
    // Create teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();
    const teacherId = teacherResult[0].id;

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'Course for testing',
        teacher_id: teacherId
      })
      .returning()
      .execute();
    const courseId = courseResult[0].id;

    // Create lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Test Lesson',
        content: 'Lesson content',
        order_index: 1
      })
      .returning()
      .execute();
    const lessonId = lessonResult[0].id;

    // Create assignment without submissions
    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonId,
        title: 'Assignment Without Submissions',
        description: 'No submissions for this one',
        due_date: new Date('2024-12-31'),
        max_points: 50
      })
      .returning()
      .execute();
    const assignmentId = assignmentResult[0].id;

    // Delete the assignment
    await deleteAssignment(assignmentId);

    // Verify assignment is deleted
    const assignmentsAfter = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .execute();
    expect(assignmentsAfter).toHaveLength(0);

    // Verify no submissions exist (should be none anyway)
    const submissionsAfter = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignmentId))
      .execute();
    expect(submissionsAfter).toHaveLength(0);
  });

  it('should handle deletion of non-existent assignment gracefully', async () => {
    const nonExistentId = 999999;

    // Should not throw error when deleting non-existent assignment
    await expect(deleteAssignment(nonExistentId)).resolves.toBeUndefined();

    // Verify no data was affected
    const assignments = await db.select().from(assignmentsTable).execute();
    expect(assignments).toHaveLength(0);

    const submissions = await db.select().from(assignmentSubmissionsTable).execute();
    expect(submissions).toHaveLength(0);
  });

  it('should maintain referential integrity with multiple assignments', async () => {
    // Create teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();
    const teacherId = teacherResult[0].id;

    // Create student user
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'student'
      })
      .returning()
      .execute();
    const studentId = studentResult[0].id;

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'Course for testing',
        teacher_id: teacherId
      })
      .returning()
      .execute();
    const courseId = courseResult[0].id;

    // Create lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Test Lesson',
        content: 'Lesson content',
        order_index: 1
      })
      .returning()
      .execute();
    const lessonId = lessonResult[0].id;

    // Create multiple assignments
    const assignmentResults = await db.insert(assignmentsTable)
      .values([
        {
          lesson_id: lessonId,
          title: 'Assignment 1',
          description: 'First assignment',
          due_date: new Date('2024-12-31'),
          max_points: 100
        },
        {
          lesson_id: lessonId,
          title: 'Assignment 2',
          description: 'Second assignment',
          due_date: new Date('2024-12-31'),
          max_points: 100
        }
      ])
      .returning()
      .execute();

    const assignment1Id = assignmentResults[0].id;
    const assignment2Id = assignmentResults[1].id;

    // Create submissions for both assignments
    await db.insert(assignmentSubmissionsTable)
      .values([
        {
          assignment_id: assignment1Id,
          student_id: studentId,
          content: 'Submission for assignment 1',
          file_path: null
        },
        {
          assignment_id: assignment2Id,
          student_id: studentId,
          content: 'Submission for assignment 2',
          file_path: null
        }
      ])
      .execute();

    // Delete only the first assignment
    await deleteAssignment(assignment1Id);

    // Verify only first assignment and its submission are deleted
    const assignment1After = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignment1Id))
      .execute();
    expect(assignment1After).toHaveLength(0);

    const assignment2After = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignment2Id))
      .execute();
    expect(assignment2After).toHaveLength(1);

    // Verify only first assignment's submission is deleted
    const submissions1After = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignment1Id))
      .execute();
    expect(submissions1After).toHaveLength(0);

    const submissions2After = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignment2Id))
      .execute();
    expect(submissions2After).toHaveLength(1);
  });
});