import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../schema';
import { register } from '../handlers/register';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: RegisterInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'student'
};

const teacherInput: RegisterInput = {
  email: 'teacher@example.com',
  password: 'teacherpass123',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'teacher'
};

const adminInput: RegisterInput = {
  email: 'admin@example.com',
  password: 'adminpass123',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin'
};

describe('register', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user with student role', async () => {
    const result = await register(testInput);

    // Validate returned user data
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('student');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify password is hashed (not the original password)
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(10);
  });

  it('should register a teacher user', async () => {
    const result = await register(teacherInput);

    expect(result.email).toEqual('teacher@example.com');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.role).toEqual('teacher');
    expect(result.id).toBeDefined();
    expect(result.password_hash).not.toEqual('teacherpass123');
  });

  it('should register an admin user', async () => {
    const result = await register(adminInput);

    expect(result.email).toEqual('admin@example.com');
    expect(result.first_name).toEqual('Admin');
    expect(result.last_name).toEqual('User');
    expect(result.role).toEqual('admin');
    expect(result.id).toBeDefined();
    expect(result.password_hash).not.toEqual('adminpass123');
  });

  it('should save user to database correctly', async () => {
    const result = await register(testInput);

    // Query database directly to verify persistence
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.first_name).toEqual('John');
    expect(savedUser.last_name).toEqual('Doe');
    expect(savedUser.role).toEqual('student');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should hash password properly', async () => {
    const result = await register(testInput);

    // Verify password can be verified with Bun's password verification
    const isValid = await Bun.password.verify('password123', result.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password doesn't verify
    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should prevent duplicate email registration', async () => {
    // Register first user
    await register(testInput);

    // Try to register another user with same email
    const duplicateInput: RegisterInput = {
      email: 'test@example.com', // Same email
      password: 'differentpass123',
      first_name: 'Different',
      last_name: 'Person',
      role: 'teacher'
    };

    await expect(register(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle multiple unique users with different emails', async () => {
    await register(testInput);

    // Register user with completely different email
    const differentEmailInput: RegisterInput = {
      email: 'different@example.com',
      password: 'password123',
      first_name: 'Different',
      last_name: 'User',
      role: 'student'
    };

    const result = await register(differentEmailInput);
    expect(result.email).toEqual('different@example.com');
    expect(result.id).toBeDefined();
  });

  it('should create users with sequential IDs', async () => {
    const user1 = await register(testInput);
    const user2 = await register(teacherInput);
    const user3 = await register(adminInput);

    expect(user2.id).toBeGreaterThan(user1.id);
    expect(user3.id).toBeGreaterThan(user2.id);
  });

  it('should set timestamps correctly', async () => {
    const beforeRegistration = new Date();
    const result = await register(testInput);
    const afterRegistration = new Date();

    // Verify timestamps are within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeRegistration.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterRegistration.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeRegistration.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterRegistration.getTime());
  });
});