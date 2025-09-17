import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs for different user roles
const adminInput: CreateUserInput = {
  email: 'admin@test.com',
  password: 'password123',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin'
};

const teacherInput: CreateUserInput = {
  email: 'teacher@test.com',
  password: 'password123',
  first_name: 'Teacher',
  last_name: 'Smith',
  role: 'teacher'
};

const studentInput: CreateUserInput = {
  email: 'student@test.com',
  password: 'password123',
  first_name: 'Student',
  last_name: 'Jones',
  role: 'student'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an admin user', async () => {
    const result = await createUser(adminInput);

    // Basic field validation
    expect(result.email).toEqual('admin@test.com');
    expect(result.first_name).toEqual('Admin');
    expect(result.last_name).toEqual('User');
    expect(result.role).toEqual('admin');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Password should be hashed, not plain text
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(20); // Hashed passwords are long
  });

  it('should create a teacher user', async () => {
    const result = await createUser(teacherInput);

    expect(result.email).toEqual('teacher@test.com');
    expect(result.first_name).toEqual('Teacher');
    expect(result.last_name).toEqual('Smith');
    expect(result.role).toEqual('teacher');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a student user', async () => {
    const result = await createUser(studentInput);

    expect(result.email).toEqual('student@test.com');
    expect(result.first_name).toEqual('Student');
    expect(result.last_name).toEqual('Jones');
    expect(result.role).toEqual('student');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(adminInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('admin@test.com');
    expect(users[0].first_name).toEqual('Admin');
    expect(users[0].last_name).toEqual('User');
    expect(users[0].role).toEqual('admin');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
    expect(users[0].password_hash).toBeDefined();
    expect(users[0].password_hash).not.toEqual('password123');
  });

  it('should hash passwords correctly', async () => {
    const result1 = await createUser(adminInput);
    
    // Create another user with same password to verify hashing creates different hashes
    const input2: CreateUserInput = {
      ...adminInput,
      email: 'admin2@test.com',
      first_name: 'Second',
      last_name: 'Admin'
    };
    const result2 = await createUser(input2);

    // Both should have hashed passwords but different hashes (due to salt)
    expect(result1.password_hash).toBeDefined();
    expect(result2.password_hash).toBeDefined();
    expect(result1.password_hash).not.toEqual(result2.password_hash);
    
    // Verify passwords can be verified
    const isValid1 = await Bun.password.verify('password123', result1.password_hash);
    const isValid2 = await Bun.password.verify('password123', result2.password_hash);
    expect(isValid1).toBe(true);
    expect(isValid2).toBe(true);
    
    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', result1.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(adminInput);

    // Try to create second user with same email
    const duplicateInput: CreateUserInput = {
      ...adminInput,
      first_name: 'Different',
      last_name: 'Name',
      role: 'student'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should create users with different roles successfully', async () => {
    // Create all three types of users
    const admin = await createUser(adminInput);
    const teacher = await createUser(teacherInput);
    const student = await createUser(studentInput);

    // Verify all users were created with correct roles
    expect(admin.role).toEqual('admin');
    expect(teacher.role).toEqual('teacher');
    expect(student.role).toEqual('student');

    // Verify all users exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(3);
    
    const roles = allUsers.map(u => u.role).sort();
    expect(roles).toEqual(['admin', 'student', 'teacher']);
  });

  it('should generate sequential IDs for multiple users', async () => {
    const user1 = await createUser(adminInput);
    const user2 = await createUser(teacherInput);
    const user3 = await createUser(studentInput);

    // IDs should be sequential
    expect(user1.id).toBeDefined();
    expect(user2.id).toBeDefined();
    expect(user3.id).toBeDefined();
    expect(user2.id).toBeGreaterThan(user1.id);
    expect(user3.id).toBeGreaterThan(user2.id);
  });
});