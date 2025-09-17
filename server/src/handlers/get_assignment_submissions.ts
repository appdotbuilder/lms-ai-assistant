import { db } from '../db';
import { assignmentSubmissionsTable, assignmentsTable, usersTable, contentTable, coursesTable } from '../db/schema';
import { type AssignmentSubmission } from '../schema';
import { eq } from 'drizzle-orm';

export const getAssignmentSubmissions = async (assignmentId: number): Promise<AssignmentSubmission[]> => {
  try {
    // Verify assignment exists first
    const assignment = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .limit(1)
      .execute();

    if (assignment.length === 0) {
      throw new Error(`Assignment with id ${assignmentId} not found`);
    }

    // Get all submissions for the assignment with student details
    const results = await db.select()
      .from(assignmentSubmissionsTable)
      .innerJoin(usersTable, eq(assignmentSubmissionsTable.student_id, usersTable.id))
      .where(eq(assignmentSubmissionsTable.assignment_id, assignmentId))
      .execute();

    // Transform the results to match the AssignmentSubmission schema
    return results.map(result => ({
      id: result.assignment_submissions.id,
      student_id: result.assignment_submissions.student_id,
      assignment_id: result.assignment_submissions.assignment_id,
      submission_text: result.assignment_submissions.submission_text,
      file_url: result.assignment_submissions.file_url,
      score: result.assignment_submissions.score ? parseFloat(result.assignment_submissions.score) : null,
      feedback: result.assignment_submissions.feedback,
      submitted_at: result.assignment_submissions.submitted_at,
      graded_at: result.assignment_submissions.graded_at
    }));
  } catch (error) {
    console.error('Failed to get assignment submissions:', error);
    throw error;
  }
};