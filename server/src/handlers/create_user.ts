import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { createHash, randomBytes } from 'crypto';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Create a salt and hash the password using crypto
    const salt = randomBytes(16).toString('hex');
    const password_hash = createHash('sha256').update(input.password + salt).digest('hex') + ':' + salt;

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash,
        first_name: input.first_name,
        last_name: input.last_name,
        role: input.role
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};