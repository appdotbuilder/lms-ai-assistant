import { db } from '../db';
import { assignmentSubmissionsTable } from '../db/schema';
import { type GradeAssignmentInput, type AssignmentSubmission } from '../schema';
import { eq } from 'drizzle-orm';

export const gradeAssignment = async (input: GradeAssignmentInput): Promise<AssignmentSubmission> => {
  try {
    // Update the assignment submission with grade and feedback
    const result = await db.update(assignmentSubmissionsTable)
      .set({
        grade: input.grade,
        feedback: input.feedback,
        graded_at: new Date()
      })
      .where(eq(assignmentSubmissionsTable.id, input.submission_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Assignment submission with ID ${input.submission_id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Assignment grading failed:', error);
    throw error;
  }
};