import { db } from '../db';
import { assignmentSubmissionsTable, assignmentsTable, usersTable } from '../db/schema';
import { type SubmitAssignmentInput, type AssignmentSubmission } from '../schema';
import { eq, and } from 'drizzle-orm';

export const submitAssignment = async (input: SubmitAssignmentInput): Promise<AssignmentSubmission> => {
  try {
    // Verify the assignment exists
    const assignment = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, input.assignment_id))
      .execute();

    if (assignment.length === 0) {
      throw new Error(`Assignment with id ${input.assignment_id} not found`);
    }

    // Verify the student exists and has student role
    const student = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.id, input.student_id),
        eq(usersTable.role, 'student')
      ))
      .execute();

    if (student.length === 0) {
      throw new Error(`Student with id ${input.student_id} not found`);
    }

    // Check if student has already submitted this assignment
    const existingSubmission = await db.select()
      .from(assignmentSubmissionsTable)
      .where(and(
        eq(assignmentSubmissionsTable.assignment_id, input.assignment_id),
        eq(assignmentSubmissionsTable.student_id, input.student_id)
      ))
      .execute();

    if (existingSubmission.length > 0) {
      throw new Error(`Student ${input.student_id} has already submitted assignment ${input.assignment_id}`);
    }

    // Insert assignment submission record
    const result = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: input.assignment_id,
        student_id: input.student_id,
        content: input.content,
        file_path: input.file_path
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Assignment submission failed:', error);
    throw error;
  }
};