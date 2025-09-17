import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, assignmentsTable, assignmentSubmissionsTable } from '../db/schema';
import { type SubmitAssignmentInput } from '../schema';
import { submitAssignment } from '../handlers/submit_assignment';
import { eq, and } from 'drizzle-orm';

// Test data
const testTeacher = {
  email: 'teacher@test.com',
  password_hash: 'hashed_password',
  first_name: 'John',
  last_name: 'Teacher',
  role: 'teacher' as const
};

const testStudent = {
  email: 'student@test.com',
  password_hash: 'hashed_password',
  first_name: 'Jane',
  last_name: 'Student',
  role: 'student' as const
};

const testAdmin = {
  email: 'admin@test.com',
  password_hash: 'hashed_password',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin' as const
};

describe('submitAssignment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should submit assignment successfully with content only', async () => {
    // Create test data
    const teacherResult = await db.insert(usersTable).values(testTeacher).returning().execute();
    const studentResult = await db.insert(usersTable).values(testStudent).returning().execute();
    
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();

    const input: SubmitAssignmentInput = {
      assignment_id: assignmentResult[0].id,
      student_id: studentResult[0].id,
      content: 'This is my assignment submission content',
      file_path: null
    };

    const result = await submitAssignment(input);

    // Verify return values
    expect(result.id).toBeDefined();
    expect(result.assignment_id).toEqual(assignmentResult[0].id);
    expect(result.student_id).toEqual(studentResult[0].id);
    expect(result.content).toEqual('This is my assignment submission content');
    expect(result.file_path).toBeNull();
    expect(result.submitted_at).toBeInstanceOf(Date);
    expect(result.grade).toBeNull();
    expect(result.feedback).toBeNull();
    expect(result.graded_at).toBeNull();
  });

  it('should submit assignment successfully with file path only', async () => {
    // Create test data
    const teacherResult = await db.insert(usersTable).values(testTeacher).returning().execute();
    const studentResult = await db.insert(usersTable).values(testStudent).returning().execute();
    
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();

    const input: SubmitAssignmentInput = {
      assignment_id: assignmentResult[0].id,
      student_id: studentResult[0].id,
      content: null,
      file_path: '/uploads/assignments/assignment_file.pdf'
    };

    const result = await submitAssignment(input);

    // Verify return values
    expect(result.id).toBeDefined();
    expect(result.assignment_id).toEqual(assignmentResult[0].id);
    expect(result.student_id).toEqual(studentResult[0].id);
    expect(result.content).toBeNull();
    expect(result.file_path).toEqual('/uploads/assignments/assignment_file.pdf');
    expect(result.submitted_at).toBeInstanceOf(Date);
    expect(result.grade).toBeNull();
    expect(result.feedback).toBeNull();
    expect(result.graded_at).toBeNull();
  });

  it('should submit assignment successfully with both content and file path', async () => {
    // Create test data
    const teacherResult = await db.insert(usersTable).values(testTeacher).returning().execute();
    const studentResult = await db.insert(usersTable).values(testStudent).returning().execute();
    
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();

    const input: SubmitAssignmentInput = {
      assignment_id: assignmentResult[0].id,
      student_id: studentResult[0].id,
      content: 'Here is my written response along with the attached file',
      file_path: '/uploads/assignments/assignment_with_attachment.docx'
    };

    const result = await submitAssignment(input);

    // Verify return values
    expect(result.assignment_id).toEqual(assignmentResult[0].id);
    expect(result.student_id).toEqual(studentResult[0].id);
    expect(result.content).toEqual('Here is my written response along with the attached file');
    expect(result.file_path).toEqual('/uploads/assignments/assignment_with_attachment.docx');
  });

  it('should save submission to database', async () => {
    // Create test data
    const teacherResult = await db.insert(usersTable).values(testTeacher).returning().execute();
    const studentResult = await db.insert(usersTable).values(testStudent).returning().execute();
    
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();

    const input: SubmitAssignmentInput = {
      assignment_id: assignmentResult[0].id,
      student_id: studentResult[0].id,
      content: 'Database test submission',
      file_path: null
    };

    const result = await submitAssignment(input);

    // Verify data was saved to database
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, result.id))
      .execute();

    expect(submissions).toHaveLength(1);
    expect(submissions[0].assignment_id).toEqual(assignmentResult[0].id);
    expect(submissions[0].student_id).toEqual(studentResult[0].id);
    expect(submissions[0].content).toEqual('Database test submission');
    expect(submissions[0].file_path).toBeNull();
    expect(submissions[0].submitted_at).toBeInstanceOf(Date);
  });

  it('should throw error when assignment does not exist', async () => {
    // Create student but no assignment
    const studentResult = await db.insert(usersTable).values(testStudent).returning().execute();

    const input: SubmitAssignmentInput = {
      assignment_id: 99999, // Non-existent assignment
      student_id: studentResult[0].id,
      content: 'Test submission',
      file_path: null
    };

    await expect(submitAssignment(input)).rejects.toThrow(/Assignment with id 99999 not found/i);
  });

  it('should throw error when student does not exist', async () => {
    // Create assignment but no student
    const teacherResult = await db.insert(usersTable).values(testTeacher).returning().execute();
    
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();

    const input: SubmitAssignmentInput = {
      assignment_id: assignmentResult[0].id,
      student_id: 99999, // Non-existent student
      content: 'Test submission',
      file_path: null
    };

    await expect(submitAssignment(input)).rejects.toThrow(/Student with id 99999 not found/i);
  });

  it('should throw error when user is not a student', async () => {
    // Create assignment and admin user (not student)
    const adminResult = await db.insert(usersTable).values(testAdmin).returning().execute();
    const teacherResult = await db.insert(usersTable).values(testTeacher).returning().execute();
    
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();

    const input: SubmitAssignmentInput = {
      assignment_id: assignmentResult[0].id,
      student_id: adminResult[0].id, // Admin user, not student
      content: 'Test submission',
      file_path: null
    };

    await expect(submitAssignment(input)).rejects.toThrow(/Student with id .* not found/i);
  });

  it('should throw error when student has already submitted the assignment', async () => {
    // Create test data
    const teacherResult = await db.insert(usersTable).values(testTeacher).returning().execute();
    const studentResult = await db.insert(usersTable).values(testStudent).returning().execute();
    
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();

    const input: SubmitAssignmentInput = {
      assignment_id: assignmentResult[0].id,
      student_id: studentResult[0].id,
      content: 'First submission',
      file_path: null
    };

    // First submission should succeed
    await submitAssignment(input);

    // Second submission should fail
    const secondInput: SubmitAssignmentInput = {
      assignment_id: assignmentResult[0].id,
      student_id: studentResult[0].id,
      content: 'Second submission attempt',
      file_path: null
    };

    await expect(submitAssignment(secondInput)).rejects.toThrow(/Student .* has already submitted assignment/i);
  });
});