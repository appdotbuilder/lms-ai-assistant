import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, contentTable, assignmentsTable, assignmentSubmissionsTable } from '../db/schema';
import { type GradeAssignmentInput } from '../schema';
import { gradeAssignment } from '../handlers/grade_assignment';
import { eq } from 'drizzle-orm';

describe('gradeAssignment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let studentId: number;
  let teacherId: number;
  let courseId: number;
  let contentId: number;
  let assignmentId: number;
  let submissionId: number;

  beforeEach(async () => {
    // Create test teacher
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
    teacherId = teacherResult[0].id;

    // Create test student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Jane',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();
    studentId = studentResult[0].id;

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherId
      })
      .returning()
      .execute();
    courseId = courseResult[0].id;

    // Create test content
    const contentResult = await db.insert(contentTable)
      .values({
        course_id: courseId,
        title: 'Test Assignment Content',
        description: 'Content for assignment',
        content_type: 'assignment',
        content_data: '{"type": "assignment"}',
        order_index: 1
      })
      .returning()
      .execute();
    contentId = contentResult[0].id;

    // Create test assignment
    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        content_id: contentId,
        title: 'Test Assignment',
        description: 'An assignment for testing',
        instructions: 'Complete this assignment',
        due_date: new Date('2024-12-31'),
        max_points: '100',
        status: 'published'
      })
      .returning()
      .execute();
    assignmentId = assignmentResult[0].id;

    // Create test submission
    const submissionResult = await db.insert(assignmentSubmissionsTable)
      .values({
        student_id: studentId,
        assignment_id: assignmentId,
        submission_text: 'This is my assignment submission',
        file_url: 'https://example.com/submission.pdf',
        score: null,
        feedback: null
      })
      .returning()
      .execute();
    submissionId = submissionResult[0].id;
  });

  it('should grade an assignment submission successfully', async () => {
    const testInput: GradeAssignmentInput = {
      submission_id: submissionId,
      score: 85.5,
      feedback: 'Good work! Well organized and clear.'
    };

    const result = await gradeAssignment(testInput);

    // Verify the returned submission
    expect(result.id).toEqual(submissionId);
    expect(result.student_id).toEqual(studentId);
    expect(result.assignment_id).toEqual(assignmentId);
    expect(result.score).toEqual(85.5);
    expect(result.feedback).toEqual('Good work! Well organized and clear.');
    expect(result.graded_at).toBeInstanceOf(Date);
    expect(result.submitted_at).toBeInstanceOf(Date);
    expect(result.submission_text).toEqual('This is my assignment submission');
    expect(result.file_url).toEqual('https://example.com/submission.pdf');

    // Verify numeric conversion
    expect(typeof result.score).toBe('number');
  });

  it('should save graded submission to database', async () => {
    const testInput: GradeAssignmentInput = {
      submission_id: submissionId,
      score: 92.0,
      feedback: 'Excellent work!'
    };

    await gradeAssignment(testInput);

    // Query the database to verify the update
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, submissionId))
      .execute();

    expect(submissions).toHaveLength(1);
    const submission = submissions[0];
    expect(parseFloat(submission.score!)).toEqual(92.0);
    expect(submission.feedback).toEqual('Excellent work!');
    expect(submission.graded_at).toBeInstanceOf(Date);
  });

  it('should grade with null feedback', async () => {
    const testInput: GradeAssignmentInput = {
      submission_id: submissionId,
      score: 75.0,
      feedback: null
    };

    const result = await gradeAssignment(testInput);

    expect(result.score).toEqual(75.0);
    expect(result.feedback).toBeNull();
    expect(result.graded_at).toBeInstanceOf(Date);
  });

  it('should grade with zero score', async () => {
    const testInput: GradeAssignmentInput = {
      submission_id: submissionId,
      score: 0,
      feedback: 'Please revise and resubmit'
    };

    const result = await gradeAssignment(testInput);

    expect(result.score).toEqual(0);
    expect(result.feedback).toEqual('Please revise and resubmit');
    expect(typeof result.score).toBe('number');
  });

  it('should update previously graded submission', async () => {
    // First grading
    const firstInput: GradeAssignmentInput = {
      submission_id: submissionId,
      score: 70.0,
      feedback: 'Needs improvement'
    };

    await gradeAssignment(firstInput);

    // Second grading (update)
    const secondInput: GradeAssignmentInput = {
      submission_id: submissionId,
      score: 85.0,
      feedback: 'Much better after revision!'
    };

    const result = await gradeAssignment(secondInput);

    expect(result.score).toEqual(85.0);
    expect(result.feedback).toEqual('Much better after revision!');

    // Verify in database
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, submissionId))
      .execute();

    expect(parseFloat(submissions[0].score!)).toEqual(85.0);
    expect(submissions[0].feedback).toEqual('Much better after revision!');
  });

  it('should throw error for non-existent submission', async () => {
    const testInput: GradeAssignmentInput = {
      submission_id: 99999,
      score: 80.0,
      feedback: 'Good work'
    };

    await expect(gradeAssignment(testInput)).rejects.toThrow(/submission.*not found/i);
  });

  it('should handle decimal scores correctly', async () => {
    const testInput: GradeAssignmentInput = {
      submission_id: submissionId,
      score: 87.75,
      feedback: 'Very good work'
    };

    const result = await gradeAssignment(testInput);

    expect(result.score).toEqual(87.75);
    expect(typeof result.score).toBe('number');

    // Verify precision is maintained in database
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, submissionId))
      .execute();

    expect(parseFloat(submissions[0].score!)).toEqual(87.75);
  });
});