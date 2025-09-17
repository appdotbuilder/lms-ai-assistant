import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

// Test input data
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'securePassword123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'student'
};

const teacherUserInput: CreateUserInput = {
  email: 'teacher@example.com',
  password: 'teacherPassword456',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'teacher'
};

const adminUserInput: CreateUserInput = {
  email: 'admin@university.edu',
  password: 'adminPassword789',
  first_name: 'Admin',
  last_name: 'User',
  role: 'administrator'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a student user successfully', async () => {
    const result = await createUser(testUserInput);

    // Verify returned user data
    expect(result.email).toEqual(testUserInput.email);
    expect(result.first_name).toEqual(testUserInput.first_name);
    expect(result.last_name).toEqual(testUserInput.last_name);
    expect(result.role).toEqual('student');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual(testUserInput.password);
  });

  it('should create a teacher user successfully', async () => {
    const result = await createUser(teacherUserInput);

    expect(result.email).toEqual(teacherUserInput.email);
    expect(result.first_name).toEqual(teacherUserInput.first_name);
    expect(result.last_name).toEqual(teacherUserInput.last_name);
    expect(result.role).toEqual('teacher');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an administrator user successfully', async () => {
    const result = await createUser(adminUserInput);

    expect(result.email).toEqual(adminUserInput.email);
    expect(result.first_name).toEqual(adminUserInput.first_name);
    expect(result.last_name).toEqual(adminUserInput.last_name);
    expect(result.role).toEqual('administrator');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password securely', async () => {
    const result = await createUser(testUserInput);

    // Password should be hashed, not stored in plain text
    expect(result.password_hash).not.toEqual(testUserInput.password);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash.length).toBeGreaterThan(20); // Hash + salt should be substantial length
    expect(result.password_hash).toContain(':'); // Should contain salt separator

    // Verify the password can be verified by reconstructing hash
    const [hash, salt] = result.password_hash.split(':');
    const expectedHash = createHash('sha256').update(testUserInput.password + salt).digest('hex');
    expect(hash).toEqual(expectedHash);

    // Verify wrong password fails
    const wrongHash = createHash('sha256').update('wrongpassword' + salt).digest('hex');
    expect(hash).not.toEqual(wrongHash);
  });

  it('should save user to database', async () => {
    const result = await createUser(testUserInput);

    // Query the database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual(testUserInput.email);
    expect(savedUser.first_name).toEqual(testUserInput.first_name);
    expect(savedUser.last_name).toEqual(testUserInput.last_name);
    expect(savedUser.role).toEqual('student');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testUserInput);

    // Attempt to create second user with same email
    const duplicateEmailInput = {
      ...testUserInput,
      first_name: 'Different',
      last_name: 'Person'
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/unique/i);
  });

  it('should create multiple users with different emails', async () => {
    const user1 = await createUser(testUserInput);
    const user2 = await createUser(teacherUserInput);
    const user3 = await createUser(adminUserInput);

    // All users should have different IDs
    expect(user1.id).not.toEqual(user2.id);
    expect(user1.id).not.toEqual(user3.id);
    expect(user2.id).not.toEqual(user3.id);

    // Verify all users are in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(3);

    const emails = allUsers.map(user => user.email);
    expect(emails).toContain(testUserInput.email);
    expect(emails).toContain(teacherUserInput.email);
    expect(emails).toContain(adminUserInput.email);
  });

  it('should handle different password complexities', async () => {
    const complexPasswordInput: CreateUserInput = {
      email: 'complex@example.com',
      password: 'VeryComplex!Password123@#$%^&*()',
      first_name: 'Complex',
      last_name: 'User',
      role: 'student'
    };

    const result = await createUser(complexPasswordInput);
    
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual(complexPasswordInput.password);
    
    // Verify password can be authenticated by reconstructing hash
    const [hash, salt] = result.password_hash.split(':');
    const expectedHash = createHash('sha256').update(complexPasswordInput.password + salt).digest('hex');
    expect(hash).toEqual(expectedHash);
  });

  it('should set correct timestamps', async () => {
    const beforeCreation = new Date();
    const result = await createUser(testUserInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});