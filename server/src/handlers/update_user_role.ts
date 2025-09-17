import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserRoleInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUserRole = async (input: UpdateUserRoleInput): Promise<User> => {
  try {
    // Update the user's role
    const result = await db.update(usersTable)
      .set({
        role: input.role,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.user_id))
      .returning()
      .execute();

    // Check if user was found and updated
    if (result.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('User role update failed:', error);
    throw error;
  }
};