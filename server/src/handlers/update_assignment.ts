import { db } from '../db';
import { assignmentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateAssignmentInput, type Assignment } from '../schema';

export const updateAssignment = async (input: UpdateAssignmentInput): Promise<Assignment> => {
  try {
    // Build the update values object, only including fields that are provided
    const updateValues: any = {};
    
    if (input.title !== undefined) {
      updateValues.title = input.title;
    }
    
    if (input.description !== undefined) {
      updateValues.description = input.description;
    }
    
    if (input.due_date !== undefined) {
      updateValues.due_date = input.due_date;
    }
    
    if (input.max_points !== undefined) {
      updateValues.max_points = input.max_points;
    }
    
    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();

    // Update the assignment and return the updated record
    const result = await db.update(assignmentsTable)
      .set(updateValues)
      .where(eq(assignmentsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Assignment with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Assignment update failed:', error);
    throw error;
  }
};