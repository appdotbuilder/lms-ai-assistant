import { db } from '../db';
import { assignmentSubmissionsTable, assignmentsTable, usersTable, coursesTable, courseEnrollmentsTable, contentTable } from '../db/schema';
import { type SubmitAssignmentInput, type AssignmentSubmission } from '../schema';
import { eq, and } from 'drizzle-orm';

export const submitAssignment = async (input: SubmitAssignmentInput): Promise<AssignmentSubmission> => {
  try {
    // Verify that the assignment exists and get its details
    const assignmentResults = await db.select()
      .from(assignmentsTable)
      .innerJoin(contentTable, eq(assignmentsTable.content_id, contentTable.id))
      .innerJoin(coursesTable, eq(contentTable.course_id, coursesTable.id))
      .where(eq(assignmentsTable.id, input.assignment_id))
      .execute();

    if (assignmentResults.length === 0) {
      throw new Error('Assignment not found');
    }

    const assignmentData = assignmentResults[0];
    const assignment = assignmentData.assignments;
    const course = assignmentData.courses;

    // Check if assignment is published and accepting submissions
    if (assignment.status !== 'published') {
      throw new Error('Assignment is not available for submission');
    }

    // Check if assignment is past due date (if due_date is set)
    if (assignment.due_date && new Date() > assignment.due_date) {
      throw new Error('Assignment submission deadline has passed');
    }

    // Verify that the student exists and is a student
    const studentResults = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.id, input.student_id),
        eq(usersTable.role, 'student')
      ))
      .execute();

    if (studentResults.length === 0) {
      throw new Error('Student not found');
    }

    // Verify that the student is enrolled in the course
    const enrollmentResults = await db.select()
      .from(courseEnrollmentsTable)
      .where(and(
        eq(courseEnrollmentsTable.student_id, input.student_id),
        eq(courseEnrollmentsTable.course_id, course.id)
      ))
      .execute();

    if (enrollmentResults.length === 0) {
      throw new Error('Student is not enrolled in this course');
    }

    // Validate submission content - at least one of submission_text or file_url must be provided
    if (!input.submission_text && !input.file_url) {
      throw new Error('Submission must include either text or file');
    }

    // Insert the assignment submission
    const result = await db.insert(assignmentSubmissionsTable)
      .values({
        student_id: input.student_id,
        assignment_id: input.assignment_id,
        submission_text: input.submission_text,
        file_url: input.file_url,
        score: null,
        feedback: null,
        graded_at: null
      })
      .returning()
      .execute();

    const submission = result[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...submission,
      score: submission.score ? parseFloat(submission.score) : null
    };
  } catch (error) {
    console.error('Assignment submission failed:', error);
    throw error;
  }
};