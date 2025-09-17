import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function login(input: LoginInput): Promise<User | null> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Verify password using Bun's built-in password verification
    const isValidPassword = await Bun.password.verify(input.password, user.password_hash);
    
    if (!isValidPassword) {
      return null;
    }

    // Return user without password hash
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}