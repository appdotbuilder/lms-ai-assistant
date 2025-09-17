import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, assignmentsTable, assignmentSubmissionsTable } from '../db/schema';
import { type GradeAssignmentInput } from '../schema';
import { gradeAssignment } from '../handlers/grade_assignment';
import { eq } from 'drizzle-orm';

describe('gradeAssignment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should grade an assignment submission', async () => {
    // Create prerequisite data
    // Create teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create student user
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Math 101',
        description: 'Basic Mathematics',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    // Create lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Algebra Basics',
        content: 'Introduction to algebra',
        order_index: 1
      })
      .returning()
      .execute();

    // Create assignment
    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Homework 1',
        description: 'Solve algebra problems',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();

    // Create assignment submission
    const submissionResult = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignmentResult[0].id,
        student_id: studentResult[0].id,
        content: 'Student answers here',
        file_path: null
      })
      .returning()
      .execute();

    const testInput: GradeAssignmentInput = {
      submission_id: submissionResult[0].id,
      grade: 85,
      feedback: 'Good work, but needs improvement in problem 3'
    };

    const result = await gradeAssignment(testInput);

    // Basic field validation
    expect(result.id).toEqual(submissionResult[0].id);
    expect(result.assignment_id).toEqual(assignmentResult[0].id);
    expect(result.student_id).toEqual(studentResult[0].id);
    expect(result.grade).toEqual(85);
    expect(result.feedback).toEqual('Good work, but needs improvement in problem 3');
    expect(result.graded_at).toBeInstanceOf(Date);
    expect(result.content).toEqual('Student answers here');
  });

  it('should save grading to database', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Math 101',
        description: 'Basic Mathematics',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Algebra Basics',
        content: 'Introduction to algebra',
        order_index: 1
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Homework 1',
        description: 'Solve algebra problems',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();

    const submissionResult = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignmentResult[0].id,
        student_id: studentResult[0].id,
        content: 'Student answers here',
        file_path: null
      })
      .returning()
      .execute();

    const testInput: GradeAssignmentInput = {
      submission_id: submissionResult[0].id,
      grade: 92,
      feedback: 'Excellent work!'
    };

    const result = await gradeAssignment(testInput);

    // Query database to verify the update
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, result.id))
      .execute();

    expect(submissions).toHaveLength(1);
    expect(submissions[0].grade).toEqual(92);
    expect(submissions[0].feedback).toEqual('Excellent work!');
    expect(submissions[0].graded_at).toBeInstanceOf(Date);
    expect(submissions[0].assignment_id).toEqual(assignmentResult[0].id);
    expect(submissions[0].student_id).toEqual(studentResult[0].id);
  });

  it('should grade with null feedback', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Math 101',
        description: 'Basic Mathematics',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Algebra Basics',
        content: 'Introduction to algebra',
        order_index: 1
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Homework 1',
        description: 'Solve algebra problems',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();

    const submissionResult = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignmentResult[0].id,
        student_id: studentResult[0].id,
        content: 'Student answers here',
        file_path: null
      })
      .returning()
      .execute();

    const testInput: GradeAssignmentInput = {
      submission_id: submissionResult[0].id,
      grade: 75,
      feedback: null
    };

    const result = await gradeAssignment(testInput);

    expect(result.grade).toEqual(75);
    expect(result.feedback).toBeNull();
    expect(result.graded_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent submission', async () => {
    const testInput: GradeAssignmentInput = {
      submission_id: 9999, // Non-existent ID
      grade: 85,
      feedback: 'Good work'
    };

    expect(gradeAssignment(testInput)).rejects.toThrow(/not found/i);
  });

  it('should update previously graded submission', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Math 101',
        description: 'Basic Mathematics',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Algebra Basics',
        content: 'Introduction to algebra',
        order_index: 1
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Homework 1',
        description: 'Solve algebra problems',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();

    // Create submission with existing grade
    const submissionResult = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignmentResult[0].id,
        student_id: studentResult[0].id,
        content: 'Student answers here',
        file_path: null,
        grade: 70,
        feedback: 'Initial feedback',
        graded_at: new Date('2024-01-01')
      })
      .returning()
      .execute();

    const testInput: GradeAssignmentInput = {
      submission_id: submissionResult[0].id,
      grade: 88,
      feedback: 'Updated feedback after review'
    };

    const result = await gradeAssignment(testInput);

    // Verify the grade was updated
    expect(result.grade).toEqual(88);
    expect(result.feedback).toEqual('Updated feedback after review');
    expect(result.graded_at).toBeInstanceOf(Date);
    expect(result.graded_at!.getTime()).toBeGreaterThan(new Date('2024-01-01').getTime());
  });
});