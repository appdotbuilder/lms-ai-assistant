import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  contentTable, 
  assignmentsTable, 
  courseEnrollmentsTable, 
  assignmentSubmissionsTable 
} from '../db/schema';
import { type SubmitAssignmentInput } from '../schema';
import { submitAssignment } from '../handlers/submit_assignment';
import { eq } from 'drizzle-orm';

// Test data
let testTeacher: any;
let testStudent: any;
let testCourse: any;
let testContent: any;
let testAssignment: any;

const validSubmissionInput: SubmitAssignmentInput = {
  student_id: 0, // Will be set in beforeEach
  assignment_id: 0, // Will be set in beforeEach
  submission_text: 'This is my assignment submission text.',
  file_url: null
};

describe('submitAssignment', () => {
  beforeEach(async () => {
    await createDB();

    // Create test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Teacher',
        last_name: 'User',
        role: 'teacher'
      })
      .returning()
      .execute();
    testTeacher = teacherResult[0];

    // Create test student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Student',
        last_name: 'User',
        role: 'student'
      })
      .returning()
      .execute();
    testStudent = studentResult[0];

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        teacher_id: testTeacher.id
      })
      .returning()
      .execute();
    testCourse = courseResult[0];

    // Create test content
    const contentResult = await db.insert(contentTable)
      .values({
        course_id: testCourse.id,
        title: 'Test Content',
        description: 'Content for testing',
        content_type: 'assignment',
        content_data: '{}',
        order_index: 1
      })
      .returning()
      .execute();
    testContent = contentResult[0];

    // Create test assignment
    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        content_id: testContent.id,
        title: 'Test Assignment',
        description: 'An assignment for testing',
        instructions: 'Complete this assignment',
        due_date: new Date(Date.now() + 86400000), // Tomorrow
        max_points: '100',
        status: 'published'
      })
      .returning()
      .execute();
    testAssignment = assignmentResult[0];

    // Enroll student in course
    await db.insert(courseEnrollmentsTable)
      .values({
        course_id: testCourse.id,
        student_id: testStudent.id
      })
      .execute();

    // Update test input with actual IDs
    validSubmissionInput.student_id = testStudent.id;
    validSubmissionInput.assignment_id = testAssignment.id;
  });

  afterEach(resetDB);

  it('should successfully submit assignment with text', async () => {
    const result = await submitAssignment(validSubmissionInput);

    // Verify returned submission
    expect(result.student_id).toEqual(testStudent.id);
    expect(result.assignment_id).toEqual(testAssignment.id);
    expect(result.submission_text).toEqual('This is my assignment submission text.');
    expect(result.file_url).toBeNull();
    expect(result.score).toBeNull();
    expect(result.feedback).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.submitted_at).toBeInstanceOf(Date);
    expect(result.graded_at).toBeNull();
  });

  it('should successfully submit assignment with file URL', async () => {
    const inputWithFile: SubmitAssignmentInput = {
      student_id: testStudent.id,
      assignment_id: testAssignment.id,
      submission_text: null,
      file_url: 'https://example.com/assignment.pdf'
    };

    const result = await submitAssignment(inputWithFile);

    expect(result.submission_text).toBeNull();
    expect(result.file_url).toEqual('https://example.com/assignment.pdf');
    expect(result.student_id).toEqual(testStudent.id);
    expect(result.assignment_id).toEqual(testAssignment.id);
  });

  it('should successfully submit assignment with both text and file', async () => {
    const inputWithBoth: SubmitAssignmentInput = {
      student_id: testStudent.id,
      assignment_id: testAssignment.id,
      submission_text: 'Assignment text content',
      file_url: 'https://example.com/assignment.pdf'
    };

    const result = await submitAssignment(inputWithBoth);

    expect(result.submission_text).toEqual('Assignment text content');
    expect(result.file_url).toEqual('https://example.com/assignment.pdf');
  });

  it('should save submission to database', async () => {
    const result = await submitAssignment(validSubmissionInput);

    // Query database to verify submission was saved
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, result.id))
      .execute();

    expect(submissions).toHaveLength(1);
    expect(submissions[0].student_id).toEqual(testStudent.id);
    expect(submissions[0].assignment_id).toEqual(testAssignment.id);
    expect(submissions[0].submission_text).toEqual('This is my assignment submission text.');
    expect(submissions[0].submitted_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent assignment', async () => {
    const invalidInput: SubmitAssignmentInput = {
      student_id: testStudent.id,
      assignment_id: 99999, // Non-existent ID
      submission_text: 'Test submission',
      file_url: null
    };

    await expect(submitAssignment(invalidInput)).rejects.toThrow(/assignment not found/i);
  });

  it('should throw error for non-existent student', async () => {
    const invalidInput: SubmitAssignmentInput = {
      student_id: 99999, // Non-existent ID
      assignment_id: testAssignment.id,
      submission_text: 'Test submission',
      file_url: null
    };

    await expect(submitAssignment(invalidInput)).rejects.toThrow(/student not found/i);
  });

  it('should throw error when student is not enrolled in course', async () => {
    // Create another student not enrolled in the course
    const unenrolledStudentResult = await db.insert(usersTable)
      .values({
        email: 'unenrolled@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Unenrolled',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const invalidInput: SubmitAssignmentInput = {
      student_id: unenrolledStudentResult[0].id,
      assignment_id: testAssignment.id,
      submission_text: 'Test submission',
      file_url: null
    };

    await expect(submitAssignment(invalidInput)).rejects.toThrow(/student is not enrolled/i);
  });

  it('should throw error for draft assignment', async () => {
    // Create draft assignment
    const draftAssignmentResult = await db.insert(assignmentsTable)
      .values({
        content_id: testContent.id,
        title: 'Draft Assignment',
        description: 'A draft assignment',
        instructions: 'Complete this assignment',
        due_date: new Date(Date.now() + 86400000),
        max_points: '100',
        status: 'draft'
      })
      .returning()
      .execute();

    const invalidInput: SubmitAssignmentInput = {
      student_id: testStudent.id,
      assignment_id: draftAssignmentResult[0].id,
      submission_text: 'Test submission',
      file_url: null
    };

    await expect(submitAssignment(invalidInput)).rejects.toThrow(/assignment is not available for submission/i);
  });

  it('should throw error for assignment past due date', async () => {
    // Create assignment with past due date
    const pastDueAssignmentResult = await db.insert(assignmentsTable)
      .values({
        content_id: testContent.id,
        title: 'Past Due Assignment',
        description: 'An assignment past due',
        instructions: 'Complete this assignment',
        due_date: new Date(Date.now() - 86400000), // Yesterday
        max_points: '100',
        status: 'published'
      })
      .returning()
      .execute();

    const invalidInput: SubmitAssignmentInput = {
      student_id: testStudent.id,
      assignment_id: pastDueAssignmentResult[0].id,
      submission_text: 'Test submission',
      file_url: null
    };

    await expect(submitAssignment(invalidInput)).rejects.toThrow(/assignment submission deadline has passed/i);
  });

  it('should throw error when neither text nor file is provided', async () => {
    const invalidInput: SubmitAssignmentInput = {
      student_id: testStudent.id,
      assignment_id: testAssignment.id,
      submission_text: null,
      file_url: null
    };

    await expect(submitAssignment(invalidInput)).rejects.toThrow(/submission must include either text or file/i);
  });

  it('should throw error when user is not a student', async () => {
    // Try to submit as teacher
    const invalidInput: SubmitAssignmentInput = {
      student_id: testTeacher.id,
      assignment_id: testAssignment.id,
      submission_text: 'Test submission',
      file_url: null
    };

    await expect(submitAssignment(invalidInput)).rejects.toThrow(/student not found/i);
  });

  it('should allow submission for assignment without due date', async () => {
    // Create assignment without due date
    const noDueDateAssignmentResult = await db.insert(assignmentsTable)
      .values({
        content_id: testContent.id,
        title: 'No Due Date Assignment',
        description: 'An assignment without due date',
        instructions: 'Complete this assignment',
        due_date: null,
        max_points: '100',
        status: 'published'
      })
      .returning()
      .execute();

    const validInput: SubmitAssignmentInput = {
      student_id: testStudent.id,
      assignment_id: noDueDateAssignmentResult[0].id,
      submission_text: 'Test submission',
      file_url: null
    };

    const result = await submitAssignment(validInput);
    expect(result.submission_text).toEqual('Test submission');
    expect(result.student_id).toEqual(testStudent.id);
  });
});