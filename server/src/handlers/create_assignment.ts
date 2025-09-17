import { db } from '../db';
import { assignmentsTable } from '../db/schema';
import { type CreateAssignmentInput, type Assignment } from '../schema';

export const createAssignment = async (input: CreateAssignmentInput): Promise<Assignment> => {
  try {
    // Insert assignment record
    const result = await db.insert(assignmentsTable)
      .values({
        lesson_id: input.lesson_id,
        title: input.title,
        description: input.description,
        due_date: input.due_date,
        max_points: input.max_points
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Assignment creation failed:', error);
    throw error;
  }
};