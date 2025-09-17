import { db } from '../db';
import { assignmentSubmissionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type AssignmentSubmission } from '../schema';

export async function getAssignmentSubmissionsByAssignment(assignmentId: number): Promise<AssignmentSubmission[]> {
  try {
    const results = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignmentId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get assignment submissions by assignment:', error);
    throw error;
  }
}

export async function getAssignmentSubmissionsByStudent(studentId: number): Promise<AssignmentSubmission[]> {
  try {
    const results = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.student_id, studentId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get assignment submissions by student:', error);
    throw error;
  }
}