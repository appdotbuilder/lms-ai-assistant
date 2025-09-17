import { db } from '../db';
import { assignmentsTable, contentTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateAssignmentInput, type Assignment } from '../schema';

export const createAssignment = async (input: CreateAssignmentInput): Promise<Assignment> => {
  try {
    // Verify that the content exists
    const content = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, input.content_id))
      .execute();

    if (content.length === 0) {
      throw new Error(`Content with id ${input.content_id} not found`);
    }

    // Insert assignment record
    const result = await db.insert(assignmentsTable)
      .values({
        content_id: input.content_id,
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        due_date: input.due_date,
        max_points: input.max_points.toString(), // Convert number to string for numeric column
        status: input.status
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const assignment = result[0];
    return {
      ...assignment,
      max_points: parseFloat(assignment.max_points) // Convert string back to number
    };
  } catch (error) {
    console.error('Assignment creation failed:', error);
    throw error;
  }
};