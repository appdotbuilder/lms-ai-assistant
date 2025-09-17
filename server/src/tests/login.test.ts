import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: '', // Will be set in beforeEach
  first_name: 'John',
  last_name: 'Doe',
  role: 'student' as const
};

const loginInput: LoginInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('login', () => {
  beforeEach(async () => {
    await createDB();
    
    // Hash the password and create test user
    testUser.password_hash = await Bun.password.hash(loginInput.password);
    
    await db.insert(usersTable)
      .values(testUser)
      .execute();
  });

  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    const result = await login(loginInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('test@example.com');
    expect(result!.first_name).toEqual('John');
    expect(result!.last_name).toEqual('Doe');
    expect(result!.role).toEqual('student');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent user', async () => {
    const invalidInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    const result = await login(invalidInput);
    expect(result).toBeNull();
  });

  it('should return null for incorrect password', async () => {
    const invalidInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    const result = await login(invalidInput);
    expect(result).toBeNull();
  });

  it('should authenticate admin user correctly', async () => {
    // Create admin user
    const adminUser = {
      email: 'admin@example.com',
      password_hash: await Bun.password.hash('admin123'),
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin' as const
    };

    await db.insert(usersTable)
      .values(adminUser)
      .execute();

    const adminLogin: LoginInput = {
      email: 'admin@example.com',
      password: 'admin123'
    };

    const result = await login(adminLogin);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('admin@example.com');
    expect(result!.role).toEqual('admin');
    expect(result!.first_name).toEqual('Admin');
    expect(result!.last_name).toEqual('User');
  });

  it('should authenticate teacher user correctly', async () => {
    // Create teacher user
    const teacherUser = {
      email: 'teacher@example.com',
      password_hash: await Bun.password.hash('teacher123'),
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'teacher' as const
    };

    await db.insert(usersTable)
      .values(teacherUser)
      .execute();

    const teacherLogin: LoginInput = {
      email: 'teacher@example.com',
      password: 'teacher123'
    };

    const result = await login(teacherLogin);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('teacher@example.com');
    expect(result!.role).toEqual('teacher');
    expect(result!.first_name).toEqual('Jane');
    expect(result!.last_name).toEqual('Smith');
  });

  it('should handle case-sensitive email correctly', async () => {
    const uppercaseEmailInput: LoginInput = {
      email: 'TEST@EXAMPLE.COM',
      password: 'password123'
    };

    const result = await login(uppercaseEmailInput);
    expect(result).toBeNull(); // Should not match due to case sensitivity
  });
});