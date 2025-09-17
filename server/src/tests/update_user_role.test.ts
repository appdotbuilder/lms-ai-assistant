import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserRoleInput } from '../schema';
import { updateUserRole } from '../handlers/update_user_role';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  first_name: 'John',
  last_name: 'Doe',
  role: 'student' as const
};

describe('updateUserRole', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user role from student to teacher', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];

    const updateInput: UpdateUserRoleInput = {
      user_id: createdUser.id,
      role: 'teacher'
    };

    const result = await updateUserRole(updateInput);

    // Verify the returned user has updated role
    expect(result.id).toEqual(createdUser.id);
    expect(result.email).toEqual(testUser.email);
    expect(result.first_name).toEqual(testUser.first_name);
    expect(result.last_name).toEqual(testUser.last_name);
    expect(result.role).toEqual('teacher');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should update user role from teacher to admin', async () => {
    // Create test user with teacher role
    const teacherUser = {
      ...testUser,
      email: 'teacher@example.com',
      role: 'teacher' as const
    };

    const insertResult = await db.insert(usersTable)
      .values(teacherUser)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];

    const updateInput: UpdateUserRoleInput = {
      user_id: createdUser.id,
      role: 'admin'
    };

    const result = await updateUserRole(updateInput);

    // Verify role update
    expect(result.role).toEqual('admin');
    expect(result.id).toEqual(createdUser.id);
  });

  it('should persist role change in database', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];

    const updateInput: UpdateUserRoleInput = {
      user_id: createdUser.id,
      role: 'admin'
    };

    await updateUserRole(updateInput);

    // Query database to verify persistence
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(updatedUsers[0].role).toEqual('admin');
    expect(updatedUsers[0].updated_at).toBeInstanceOf(Date);
    expect(updatedUsers[0].updated_at > createdUser.updated_at).toBe(true);
  });

  it('should update updated_at timestamp', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];
    const originalUpdatedAt = createdUser.updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateUserRoleInput = {
      user_id: createdUser.id,
      role: 'teacher'
    };

    const result = await updateUserRole(updateInput);

    // Verify timestamp was updated
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateUserRoleInput = {
      user_id: 999999, // Non-existent user ID
      role: 'admin'
    };

    await expect(updateUserRole(updateInput)).rejects.toThrow(/User with id 999999 not found/i);
  });

  it('should handle all valid role transitions', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];

    // Test student -> teacher
    await updateUserRole({
      user_id: createdUser.id,
      role: 'teacher'
    });

    let dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();
    expect(dbUser[0].role).toEqual('teacher');

    // Test teacher -> admin
    await updateUserRole({
      user_id: createdUser.id,
      role: 'admin'
    });

    dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();
    expect(dbUser[0].role).toEqual('admin');

    // Test admin -> student
    await updateUserRole({
      user_id: createdUser.id,
      role: 'student'
    });

    dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();
    expect(dbUser[0].role).toEqual('student');
  });
});