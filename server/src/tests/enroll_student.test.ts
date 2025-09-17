import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, courseEnrollmentsTable } from '../db/schema';
import { type EnrollStudentInput } from '../schema';
import { enrollStudent } from '../handlers/enroll_student';
import { eq, and } from 'drizzle-orm';

describe('enrollStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let studentUser: any;
  let teacherUser: any;
  let course: any;

  beforeEach(async () => {
    // Create test users
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      })
      .returning()
      .execute();
    studentUser = studentResult[0];

    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'teacher'
      })
      .returning()
      .execute();
    teacherUser = teacherResult[0];

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherUser.id
      })
      .returning()
      .execute();
    course = courseResult[0];
  });

  it('should enroll a student in a course', async () => {
    const input: EnrollStudentInput = {
      course_id: course.id,
      student_id: studentUser.id
    };

    const result = await enrollStudent(input);

    // Verify enrollment properties
    expect(result.course_id).toBe(course.id);
    expect(result.student_id).toBe(studentUser.id);
    expect(result.id).toBeDefined();
    expect(result.enrolled_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
  });

  it('should save enrollment to database', async () => {
    const input: EnrollStudentInput = {
      course_id: course.id,
      student_id: studentUser.id
    };

    const result = await enrollStudent(input);

    // Verify enrollment was saved to database
    const enrollments = await db.select()
      .from(courseEnrollmentsTable)
      .where(eq(courseEnrollmentsTable.id, result.id))
      .execute();

    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].course_id).toBe(course.id);
    expect(enrollments[0].student_id).toBe(studentUser.id);
    expect(enrollments[0].enrolled_at).toBeInstanceOf(Date);
    expect(enrollments[0].completed_at).toBeNull();
  });

  it('should throw error when student does not exist', async () => {
    const input: EnrollStudentInput = {
      course_id: course.id,
      student_id: 99999 // Non-existent student ID
    };

    await expect(enrollStudent(input)).rejects.toThrow(/student not found/i);
  });

  it('should throw error when course does not exist', async () => {
    const input: EnrollStudentInput = {
      course_id: 99999, // Non-existent course ID
      student_id: studentUser.id
    };

    await expect(enrollStudent(input)).rejects.toThrow(/course not found/i);
  });

  it('should throw error when user is not a student', async () => {
    const input: EnrollStudentInput = {
      course_id: course.id,
      student_id: teacherUser.id // Teacher trying to enroll as student
    };

    await expect(enrollStudent(input)).rejects.toThrow(/user is not a student/i);
  });

  it('should throw error when student is already enrolled', async () => {
    const input: EnrollStudentInput = {
      course_id: course.id,
      student_id: studentUser.id
    };

    // First enrollment should succeed
    await enrollStudent(input);

    // Second enrollment should fail
    await expect(enrollStudent(input)).rejects.toThrow(/already enrolled/i);
  });

  it('should allow different students to enroll in same course', async () => {
    // Create another student
    const anotherStudentResult = await db.insert(usersTable)
      .values({
        email: 'student2@test.com',
        password_hash: 'hashed_password',
        first_name: 'Alice',
        last_name: 'Johnson',
        role: 'student'
      })
      .returning()
      .execute();
    const anotherStudent = anotherStudentResult[0];

    const input1: EnrollStudentInput = {
      course_id: course.id,
      student_id: studentUser.id
    };

    const input2: EnrollStudentInput = {
      course_id: course.id,
      student_id: anotherStudent.id
    };

    // Both enrollments should succeed
    const enrollment1 = await enrollStudent(input1);
    const enrollment2 = await enrollStudent(input2);

    expect(enrollment1.student_id).toBe(studentUser.id);
    expect(enrollment2.student_id).toBe(anotherStudent.id);
    expect(enrollment1.course_id).toBe(course.id);
    expect(enrollment2.course_id).toBe(course.id);

    // Verify both enrollments exist in database
    const enrollments = await db.select()
      .from(courseEnrollmentsTable)
      .where(eq(courseEnrollmentsTable.course_id, course.id))
      .execute();

    expect(enrollments).toHaveLength(2);
  });

  it('should allow same student to enroll in different courses', async () => {
    // Create another course
    const anotherCourseResult = await db.insert(coursesTable)
      .values({
        title: 'Another Test Course',
        description: 'Another test course',
        teacher_id: teacherUser.id
      })
      .returning()
      .execute();
    const anotherCourse = anotherCourseResult[0];

    const input1: EnrollStudentInput = {
      course_id: course.id,
      student_id: studentUser.id
    };

    const input2: EnrollStudentInput = {
      course_id: anotherCourse.id,
      student_id: studentUser.id
    };

    // Both enrollments should succeed
    const enrollment1 = await enrollStudent(input1);
    const enrollment2 = await enrollStudent(input2);

    expect(enrollment1.course_id).toBe(course.id);
    expect(enrollment2.course_id).toBe(anotherCourse.id);
    expect(enrollment1.student_id).toBe(studentUser.id);
    expect(enrollment2.student_id).toBe(studentUser.id);

    // Verify both enrollments exist in database
    const enrollments = await db.select()
      .from(courseEnrollmentsTable)
      .where(eq(courseEnrollmentsTable.student_id, studentUser.id))
      .execute();

    expect(enrollments).toHaveLength(2);
  });
});