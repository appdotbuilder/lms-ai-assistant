import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'student'
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user email', async () => {
    // Create test user
    const createdUser = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = createdUser[0].id;

    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'updated@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('updated@example.com');
    expect(result.first_name).toEqual(testUser.first_name); // Unchanged
    expect(result.last_name).toEqual(testUser.last_name); // Unchanged
    expect(result.role).toEqual(testUser.role); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user names', async () => {
    // Create test user
    const createdUser = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = createdUser[0].id;

    const updateInput: UpdateUserInput = {
      id: userId,
      first_name: 'Jane',
      last_name: 'Smith'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual(testUser.email); // Unchanged
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.role).toEqual(testUser.role); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user role', async () => {
    // Create test user
    const createdUser = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = createdUser[0].id;

    const updateInput: UpdateUserInput = {
      id: userId,
      role: 'teacher'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual(testUser.email); // Unchanged
    expect(result.first_name).toEqual(testUser.first_name); // Unchanged
    expect(result.last_name).toEqual(testUser.last_name); // Unchanged
    expect(result.role).toEqual('teacher');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    // Create test user
    const createdUser = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = createdUser[0].id;

    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'newemail@example.com',
      first_name: 'Updated',
      last_name: 'User',
      role: 'administrator'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('newemail@example.com');
    expect(result.first_name).toEqual('Updated');
    expect(result.last_name).toEqual('User');
    expect(result.role).toEqual('administrator');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated user to database', async () => {
    // Create test user
    const createdUser = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = createdUser[0].id;
    const originalUpdatedAt = createdUser[0].updated_at;

    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'verified@example.com',
      role: 'teacher'
    };

    const result = await updateUser(updateInput);

    // Query database to verify changes were persisted
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual('verified@example.com');
    expect(savedUser.role).toEqual('teacher');
    expect(savedUser.first_name).toEqual(testUser.first_name); // Unchanged
    expect(savedUser.last_name).toEqual(testUser.last_name); // Unchanged
    expect(savedUser.updated_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateUserInput = {
      id: 999999, // Non-existent user ID
      email: 'nonexistent@example.com'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 999999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Create test user
    const createdUser = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = createdUser[0].id;

    // Update only the email field
    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'onlyemail@example.com'
    };

    const result = await updateUser(updateInput);

    // Verify only email was updated, other fields remain the same
    expect(result.email).toEqual('onlyemail@example.com');
    expect(result.first_name).toEqual(testUser.first_name);
    expect(result.last_name).toEqual(testUser.last_name);
    expect(result.role).toEqual(testUser.role);
    expect(result.password_hash).toEqual('hashed_password');
  });

  it('should update the updated_at timestamp', async () => {
    // Create test user
    const createdUser = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = createdUser[0].id;
    const originalUpdatedAt = createdUser[0].updated_at;

    // Wait a small moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1));

    const updateInput: UpdateUserInput = {
      id: userId,
      first_name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});