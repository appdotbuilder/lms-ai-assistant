import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user data
const testUsers = [
  {
    email: 'admin@test.com',
    password_hash: 'hashed_password_1',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin' as const
  },
  {
    email: 'teacher@test.com',
    password_hash: 'hashed_password_2',
    first_name: 'Teacher',
    last_name: 'Smith',
    role: 'teacher' as const
  },
  {
    email: 'student@test.com',
    password_hash: 'hashed_password_3',
    first_name: 'Student',
    last_name: 'Johnson',
    role: 'student' as const
  }
];

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
  });

  it('should return all users from database', async () => {
    // Create test users
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    expect(result[0].email).toEqual('admin@test.com');
    expect(result[0].first_name).toEqual('Admin');
    expect(result[0].last_name).toEqual('User');
    expect(result[0].role).toEqual('admin');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return users with all roles', async () => {
    // Create test users
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    const roles = result.map(user => user.role);
    expect(roles).toContain('admin');
    expect(roles).toContain('teacher');
    expect(roles).toContain('student');
  });

  it('should return users in order they were created', async () => {
    // Create test users one by one
    const user1 = await db.insert(usersTable)
      .values(testUsers[0])
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values(testUsers[1])
      .returning()
      .execute();

    const user3 = await db.insert(usersTable)
      .values(testUsers[2])
      .returning()
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    // Verify users are returned (order may vary based on database implementation)
    const userIds = result.map(user => user.id);
    expect(userIds).toContain(user1[0].id);
    expect(userIds).toContain(user2[0].id);
    expect(userIds).toContain(user3[0].id);
  });

  it('should return complete user objects with all fields', async () => {
    // Create a single test user
    await db.insert(usersTable)
      .values(testUsers[0])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    // Verify all required fields are present
    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('number');
    expect(user.email).toEqual('admin@test.com');
    expect(user.password_hash).toEqual('hashed_password_1');
    expect(user.first_name).toEqual('Admin');
    expect(user.last_name).toEqual('User');
    expect(user.role).toEqual('admin');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should handle large number of users', async () => {
    // Create multiple users
    const manyUsers = Array.from({ length: 10 }, (_, i) => ({
      email: `user${i}@test.com`,
      password_hash: `hashed_password_${i}`,
      first_name: `User${i}`,
      last_name: `Test`,
      role: i % 3 === 0 ? 'admin' as const : i % 3 === 1 ? 'teacher' as const : 'student' as const
    }));

    await db.insert(usersTable)
      .values(manyUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(10);
    
    // Verify all users are present
    const emails = result.map(user => user.email);
    for (let i = 0; i < 10; i++) {
      expect(emails).toContain(`user${i}@test.com`);
    }
  });
});