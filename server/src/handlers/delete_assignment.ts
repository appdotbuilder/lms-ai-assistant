import { db } from '../db';
import { assignmentsTable, assignmentSubmissionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteAssignment = async (assignmentId: number): Promise<void> => {
  try {
    // Delete all assignment submissions first (due to foreign key constraint)
    await db.delete(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignmentId))
      .execute();

    // Then delete the assignment
    await db.delete(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .execute();
  } catch (error) {
    console.error('Assignment deletion failed:', error);
    throw error;
  }
};