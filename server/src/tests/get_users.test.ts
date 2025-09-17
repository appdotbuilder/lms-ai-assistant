import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';


// Test user inputs
const testUserInputs: CreateUserInput[] = [
  {
    email: 'teacher@example.com',
    password: 'password123',
    first_name: 'John',
    last_name: 'Teacher',
    role: 'teacher'
  },
  {
    email: 'student@example.com',
    password: 'password456',
    first_name: 'Jane',
    last_name: 'Student',
    role: 'student'
  },
  {
    email: 'admin@example.com',
    password: 'password789',
    first_name: 'Admin',
    last_name: 'User',
    role: 'administrator'
  }
];

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all users from database', async () => {
    // Create test users directly in database
    const hashedPassword = 'hashed_password_123';
    
    await db.insert(usersTable)
      .values([
        {
          email: testUserInputs[0].email,
          password_hash: hashedPassword,
          first_name: testUserInputs[0].first_name,
          last_name: testUserInputs[0].last_name,
          role: testUserInputs[0].role
        },
        {
          email: testUserInputs[1].email,
          password_hash: hashedPassword,
          first_name: testUserInputs[1].first_name,
          last_name: testUserInputs[1].last_name,
          role: testUserInputs[1].role
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Check first user
    expect(result[0].email).toEqual('teacher@example.com');
    expect(result[0].first_name).toEqual('John');
    expect(result[0].last_name).toEqual('Teacher');
    expect(result[0].role).toEqual('teacher');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    expect(result[0].password_hash).toBeDefined();

    // Check second user
    expect(result[1].email).toEqual('student@example.com');
    expect(result[1].first_name).toEqual('Jane');
    expect(result[1].last_name).toEqual('Student');
    expect(result[1].role).toEqual('student');
    expect(result[1].id).toBeDefined();
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[1].updated_at).toBeInstanceOf(Date);
    expect(result[1].password_hash).toBeDefined();
  });

  it('should return users with all different roles', async () => {
    // Create users with all possible roles
    const hashedPassword = 'hashed_password_123';
    
    await db.insert(usersTable)
      .values(testUserInputs.map(input => ({
        email: input.email,
        password_hash: hashedPassword,
        first_name: input.first_name,
        last_name: input.last_name,
        role: input.role
      })))
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Check that all roles are represented
    const roles = result.map(user => user.role);
    expect(roles).toContain('teacher');
    expect(roles).toContain('student');
    expect(roles).toContain('administrator');
  });

  it('should return users ordered by creation', async () => {
    const hashedPassword = 'hashed_password_123';
    
    // Insert users one by one to ensure different creation times
    await db.insert(usersTable)
      .values({
        email: 'first@example.com',
        password_hash: hashedPassword,
        first_name: 'First',
        last_name: 'User',
        role: 'student'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(usersTable)
      .values({
        email: 'second@example.com',
        password_hash: hashedPassword,
        first_name: 'Second',
        last_name: 'User',
        role: 'teacher'
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result[0].first_name).toEqual('First');
    expect(result[1].first_name).toEqual('Second');
    expect(result[0].created_at.getTime()).toBeLessThanOrEqual(result[1].created_at.getTime());
  });

  it('should handle large number of users', async () => {
    const hashedPassword = 'hashed_password_123';
    
    // Create 50 test users
    const manyUsers = Array.from({ length: 50 }, (_, index) => ({
      email: `user${index}@example.com`,
      password_hash: hashedPassword,
      first_name: `User${index}`,
      last_name: 'Test',
      role: index % 3 === 0 ? 'administrator' as const : 
            index % 3 === 1 ? 'teacher' as const : 'student' as const
    }));

    await db.insert(usersTable)
      .values(manyUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(50);
    expect(result.every(user => user.id !== undefined)).toBe(true);
    expect(result.every(user => user.created_at instanceof Date)).toBe(true);
    expect(result.every(user => user.updated_at instanceof Date)).toBe(true);
  });
});