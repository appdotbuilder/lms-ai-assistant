import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';

// Test user data
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'testpassword123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'student'
};

const testTeacherInput: CreateUserInput = {
  email: 'teacher@example.com',
  password: 'teacherpassword123',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'teacher'
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when ID exists', async () => {
    // Create a test user
    const passwordHash = 'hashed_' + testUserInput.password;
    const insertResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: passwordHash,
        first_name: testUserInput.first_name,
        last_name: testUserInput.last_name,
        role: testUserInput.role
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];
    
    // Test the handler
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual(testUserInput.email);
    expect(result!.first_name).toEqual(testUserInput.first_name);
    expect(result!.last_name).toEqual(testUserInput.last_name);
    expect(result!.role).toEqual(testUserInput.role);
    expect(result!.password_hash).toEqual(passwordHash);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user ID does not exist', async () => {
    const result = await getUserById(999);

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    const passwordHash1 = 'hashed_' + testUserInput.password;
    const passwordHash2 = 'hashed_' + testTeacherInput.password;

    const user1Result = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: passwordHash1,
        first_name: testUserInput.first_name,
        last_name: testUserInput.last_name,
        role: testUserInput.role
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: testTeacherInput.email,
        password_hash: passwordHash2,
        first_name: testTeacherInput.first_name,
        last_name: testTeacherInput.last_name,
        role: testTeacherInput.role
      })
      .returning()
      .execute();

    const user1 = user1Result[0];
    const user2 = user2Result[0];

    // Test fetching first user
    const result1 = await getUserById(user1.id);
    expect(result1).not.toBeNull();
    expect(result1!.id).toEqual(user1.id);
    expect(result1!.email).toEqual(testUserInput.email);
    expect(result1!.role).toEqual('student');

    // Test fetching second user
    const result2 = await getUserById(user2.id);
    expect(result2).not.toBeNull();
    expect(result2!.id).toEqual(user2.id);
    expect(result2!.email).toEqual(testTeacherInput.email);
    expect(result2!.role).toEqual('teacher');
  });

  it('should handle different user roles correctly', async () => {
    // Create users with different roles
    const roles = ['student', 'teacher', 'administrator'] as const;
    const createdUsers = [];

    for (const role of roles) {
      const passwordHash = `hashed_password_${role}`;
      const userResult = await db.insert(usersTable)
        .values({
          email: `${role}@example.com`,
          password_hash: passwordHash,
          first_name: role.charAt(0).toUpperCase() + role.slice(1),
          last_name: 'User',
          role: role
        })
        .returning()
        .execute();

      createdUsers.push(userResult[0]);
    }

    // Verify each user can be retrieved correctly
    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i];
      const result = await getUserById(user.id);
      
      expect(result).not.toBeNull();
      expect(result!.id).toEqual(user.id);
      expect(result!.role).toEqual(roles[i]);
      expect(result!.email).toEqual(`${roles[i]}@example.com`);
    }
  });

  it('should return user with all timestamp fields', async () => {
    // Create a test user
    const passwordHash = 'hashed_' + testUserInput.password;
    const insertResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: passwordHash,
        first_name: testUserInput.first_name,
        last_name: testUserInput.last_name,
        role: testUserInput.role
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];
    
    // Test the handler
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.created_at.getTime()).toBeLessThanOrEqual(Date.now());
    expect(result!.updated_at.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should handle edge case with ID 0', async () => {
    const result = await getUserById(0);

    expect(result).toBeNull();
  });

  it('should handle negative user ID', async () => {
    const result = await getUserById(-1);

    expect(result).toBeNull();
  });
});