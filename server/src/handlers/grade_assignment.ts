import { db } from '../db';
import { assignmentSubmissionsTable } from '../db/schema';
import { type GradeAssignmentInput, type AssignmentSubmission } from '../schema';
import { eq } from 'drizzle-orm';

export const gradeAssignment = async (input: GradeAssignmentInput): Promise<AssignmentSubmission> => {
  try {
    // Check if submission exists
    const existingSubmissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, input.submission_id))
      .execute();

    if (existingSubmissions.length === 0) {
      throw new Error(`Assignment submission with ID ${input.submission_id} not found`);
    }

    // Update the submission with grade and feedback
    const result = await db.update(assignmentSubmissionsTable)
      .set({
        score: input.score.toString(), // Convert number to string for numeric column
        feedback: input.feedback,
        graded_at: new Date()
      })
      .where(eq(assignmentSubmissionsTable.id, input.submission_id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const submission = result[0];
    return {
      ...submission,
      score: submission.score ? parseFloat(submission.score) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Assignment grading failed:', error);
    throw error;
  }
};