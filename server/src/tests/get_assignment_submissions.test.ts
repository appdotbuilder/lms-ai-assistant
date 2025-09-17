import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, contentTable, assignmentsTable, assignmentSubmissionsTable } from '../db/schema';
import { getAssignmentSubmissions } from '../handlers/get_assignment_submissions';

describe('getAssignmentSubmissions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all submissions for a specific assignment', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      password_hash: 'hashed_password',
      first_name: 'John',
      last_name: 'Teacher',
      role: 'teacher'
    }).returning().execute();
    const teacher = teacherResult[0];

    const studentResult = await db.insert(usersTable).values({
      email: 'student@test.com',
      password_hash: 'hashed_password',
      first_name: 'Jane',
      last_name: 'Student',
      role: 'student'
    }).returning().execute();
    const student = studentResult[0];

    const courseResult = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A test course',
      teacher_id: teacher.id
    }).returning().execute();
    const course = courseResult[0];

    const contentResult = await db.insert(contentTable).values({
      course_id: course.id,
      title: 'Test Content',
      description: 'Test content description',
      content_type: 'assignment',
      content_data: '{"instructions": "Complete the assignment"}',
      order_index: 1
    }).returning().execute();
    const content = contentResult[0];

    const assignmentResult = await db.insert(assignmentsTable).values({
      content_id: content.id,
      title: 'Test Assignment',
      description: 'Assignment description',
      instructions: 'Complete this assignment',
      due_date: new Date('2024-12-31'),
      max_points: '100.00',
      status: 'published'
    }).returning().execute();
    const assignment = assignmentResult[0];

    const submissionResult = await db.insert(assignmentSubmissionsTable).values({
      student_id: student.id,
      assignment_id: assignment.id,
      submission_text: 'My submission text',
      file_url: 'https://example.com/file.pdf',
      score: '85.50',
      feedback: 'Good work!',
      graded_at: new Date()
    }).returning().execute();
    const submission = submissionResult[0];

    // Test the handler
    const result = await getAssignmentSubmissions(assignment.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(submission.id);
    expect(result[0].student_id).toEqual(student.id);
    expect(result[0].assignment_id).toEqual(assignment.id);
    expect(result[0].submission_text).toEqual('My submission text');
    expect(result[0].file_url).toEqual('https://example.com/file.pdf');
    expect(result[0].score).toEqual(85.5);
    expect(typeof result[0].score).toBe('number');
    expect(result[0].feedback).toEqual('Good work!');
    expect(result[0].submitted_at).toBeInstanceOf(Date);
    expect(result[0].graded_at).toBeInstanceOf(Date);
  });

  it('should return multiple submissions for an assignment', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      password_hash: 'hashed_password',
      first_name: 'John',
      last_name: 'Teacher',
      role: 'teacher'
    }).returning().execute();
    const teacher = teacherResult[0];

    // Create two students
    const student1Result = await db.insert(usersTable).values({
      email: 'student1@test.com',
      password_hash: 'hashed_password',
      first_name: 'Jane',
      last_name: 'Student1',
      role: 'student'
    }).returning().execute();
    const student1 = student1Result[0];

    const student2Result = await db.insert(usersTable).values({
      email: 'student2@test.com',
      password_hash: 'hashed_password',
      first_name: 'Bob',
      last_name: 'Student2',
      role: 'student'
    }).returning().execute();
    const student2 = student2Result[0];

    const courseResult = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A test course',
      teacher_id: teacher.id
    }).returning().execute();
    const course = courseResult[0];

    const contentResult = await db.insert(contentTable).values({
      course_id: course.id,
      title: 'Test Content',
      description: 'Test content description',
      content_type: 'assignment',
      content_data: '{"instructions": "Complete the assignment"}',
      order_index: 1
    }).returning().execute();
    const content = contentResult[0];

    const assignmentResult = await db.insert(assignmentsTable).values({
      content_id: content.id,
      title: 'Test Assignment',
      description: 'Assignment description',
      instructions: 'Complete this assignment',
      due_date: new Date('2024-12-31'),
      max_points: '100.00',
      status: 'published'
    }).returning().execute();
    const assignment = assignmentResult[0];

    // Create submissions from both students
    await db.insert(assignmentSubmissionsTable).values({
      student_id: student1.id,
      assignment_id: assignment.id,
      submission_text: 'Student 1 submission',
      file_url: null,
      score: '90.00',
      feedback: 'Excellent work!',
      graded_at: new Date()
    }).execute();

    await db.insert(assignmentSubmissionsTable).values({
      student_id: student2.id,
      assignment_id: assignment.id,
      submission_text: 'Student 2 submission',
      file_url: 'https://example.com/student2.pdf',
      score: null, // Not yet graded
      feedback: null
    }).execute();

    // Test the handler
    const result = await getAssignmentSubmissions(assignment.id);

    expect(result).toHaveLength(2);
    
    // Check that both submissions are included
    const studentIds = result.map(sub => sub.student_id).sort();
    expect(studentIds).toEqual([student1.id, student2.id].sort());

    // Check graded submission
    const gradedSubmission = result.find(sub => sub.score !== null);
    expect(gradedSubmission).toBeDefined();
    expect(gradedSubmission!.score).toEqual(90);
    expect(gradedSubmission!.feedback).toEqual('Excellent work!');

    // Check ungraded submission
    const ungradedSubmission = result.find(sub => sub.score === null);
    expect(ungradedSubmission).toBeDefined();
    expect(ungradedSubmission!.score).toBeNull();
    expect(ungradedSubmission!.feedback).toBeNull();
  });

  it('should return empty array when assignment has no submissions', async () => {
    // Create prerequisite data without submissions
    const teacherResult = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      password_hash: 'hashed_password',
      first_name: 'John',
      last_name: 'Teacher',
      role: 'teacher'
    }).returning().execute();
    const teacher = teacherResult[0];

    const courseResult = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A test course',
      teacher_id: teacher.id
    }).returning().execute();
    const course = courseResult[0];

    const contentResult = await db.insert(contentTable).values({
      course_id: course.id,
      title: 'Test Content',
      description: 'Test content description',
      content_type: 'assignment',
      content_data: '{"instructions": "Complete the assignment"}',
      order_index: 1
    }).returning().execute();
    const content = contentResult[0];

    const assignmentResult = await db.insert(assignmentsTable).values({
      content_id: content.id,
      title: 'Test Assignment',
      description: 'Assignment description',
      instructions: 'Complete this assignment',
      due_date: new Date('2024-12-31'),
      max_points: '100.00',
      status: 'published'
    }).returning().execute();
    const assignment = assignmentResult[0];

    // Test the handler
    const result = await getAssignmentSubmissions(assignment.id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should throw error when assignment does not exist', async () => {
    const nonExistentAssignmentId = 999;

    await expect(getAssignmentSubmissions(nonExistentAssignmentId))
      .rejects
      .toThrow(/Assignment with id 999 not found/i);
  });

  it('should handle submissions with null values correctly', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      password_hash: 'hashed_password',
      first_name: 'John',
      last_name: 'Teacher',
      role: 'teacher'
    }).returning().execute();
    const teacher = teacherResult[0];

    const studentResult = await db.insert(usersTable).values({
      email: 'student@test.com',
      password_hash: 'hashed_password',
      first_name: 'Jane',
      last_name: 'Student',
      role: 'student'
    }).returning().execute();
    const student = studentResult[0];

    const courseResult = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A test course',
      teacher_id: teacher.id
    }).returning().execute();
    const course = courseResult[0];

    const contentResult = await db.insert(contentTable).values({
      course_id: course.id,
      title: 'Test Content',
      description: 'Test content description',
      content_type: 'assignment',
      content_data: '{"instructions": "Complete the assignment"}',
      order_index: 1
    }).returning().execute();
    const content = contentResult[0];

    const assignmentResult = await db.insert(assignmentsTable).values({
      content_id: content.id,
      title: 'Test Assignment',
      description: 'Assignment description',
      instructions: 'Complete this assignment',
      due_date: new Date('2024-12-31'),
      max_points: '100.00',
      status: 'published'
    }).returning().execute();
    const assignment = assignmentResult[0];

    // Create submission with minimal data (nulls for optional fields)
    await db.insert(assignmentSubmissionsTable).values({
      student_id: student.id,
      assignment_id: assignment.id,
      submission_text: null,
      file_url: null,
      score: null,
      feedback: null
    }).execute();

    // Test the handler
    const result = await getAssignmentSubmissions(assignment.id);

    expect(result).toHaveLength(1);
    expect(result[0].submission_text).toBeNull();
    expect(result[0].file_url).toBeNull();
    expect(result[0].score).toBeNull();
    expect(result[0].feedback).toBeNull();
    expect(result[0].graded_at).toBeNull();
    expect(result[0].submitted_at).toBeInstanceOf(Date);
  });

  it('should properly convert numeric score values', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      password_hash: 'hashed_password',
      first_name: 'John',
      last_name: 'Teacher',
      role: 'teacher'
    }).returning().execute();
    const teacher = teacherResult[0];

    const studentResult = await db.insert(usersTable).values({
      email: 'student@test.com',
      password_hash: 'hashed_password',
      first_name: 'Jane',
      last_name: 'Student',
      role: 'student'
    }).returning().execute();
    const student = studentResult[0];

    const courseResult = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A test course',
      teacher_id: teacher.id
    }).returning().execute();
    const course = courseResult[0];

    const contentResult = await db.insert(contentTable).values({
      course_id: course.id,
      title: 'Test Content',
      description: 'Test content description',
      content_type: 'assignment',
      content_data: '{"instructions": "Complete the assignment"}',
      order_index: 1
    }).returning().execute();
    const content = contentResult[0];

    const assignmentResult = await db.insert(assignmentsTable).values({
      content_id: content.id,
      title: 'Test Assignment',
      description: 'Assignment description',
      instructions: 'Complete this assignment',
      due_date: new Date('2024-12-31'),
      max_points: '100.00',
      status: 'published'
    }).returning().execute();
    const assignment = assignmentResult[0];

    // Test different score formats
    await db.insert(assignmentSubmissionsTable).values({
      student_id: student.id,
      assignment_id: assignment.id,
      submission_text: 'Test submission',
      file_url: null,
      score: '75.25', // Decimal score
      feedback: 'Good work',
      graded_at: new Date()
    }).execute();

    // Test the handler
    const result = await getAssignmentSubmissions(assignment.id);

    expect(result).toHaveLength(1);
    expect(result[0].score).toEqual(75.25);
    expect(typeof result[0].score).toBe('number');
  });
});