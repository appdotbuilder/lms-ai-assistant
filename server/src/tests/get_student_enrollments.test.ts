import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, courseEnrollmentsTable } from '../db/schema';
import { getStudentEnrollments } from '../handlers/get_student_enrollments';

describe('getStudentEnrollments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when student has no enrollments', async () => {
    // Create a student but no enrollments
    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      })
      .returning()
      .execute();

    const result = await getStudentEnrollments(student.id);

    expect(result).toEqual([]);
  });

  it('should return all enrollments for a student', async () => {
    // Create teacher
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create student
    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      })
      .returning()
      .execute();

    // Create courses
    const [course1, course2] = await db.insert(coursesTable)
      .values([
        {
          title: 'Math 101',
          description: 'Basic Mathematics',
          teacher_id: teacher.id
        },
        {
          title: 'Physics 101',
          description: 'Basic Physics',
          teacher_id: teacher.id
        }
      ])
      .returning()
      .execute();

    // Create enrollments
    const [enrollment1, enrollment2] = await db.insert(courseEnrollmentsTable)
      .values([
        {
          course_id: course1.id,
          student_id: student.id
        },
        {
          course_id: course2.id,
          student_id: student.id
        }
      ])
      .returning()
      .execute();

    const result = await getStudentEnrollments(student.id);

    expect(result).toHaveLength(2);
    
    // Check first enrollment
    const mathEnrollment = result.find(e => e.course_id === course1.id);
    expect(mathEnrollment).toBeDefined();
    expect(mathEnrollment?.id).toEqual(enrollment1.id);
    expect(mathEnrollment?.student_id).toEqual(student.id);
    expect(mathEnrollment?.enrolled_at).toBeInstanceOf(Date);
    expect(mathEnrollment?.completed_at).toBeNull();
    expect((mathEnrollment as any)?.course_title).toEqual('Math 101');
    expect((mathEnrollment as any)?.course_description).toEqual('Basic Mathematics');
    expect((mathEnrollment as any)?.teacher_name).toEqual('Jane Smith');
    expect((mathEnrollment as any)?.teacher_email).toEqual('teacher@test.com');

    // Check second enrollment
    const physicsEnrollment = result.find(e => e.course_id === course2.id);
    expect(physicsEnrollment).toBeDefined();
    expect(physicsEnrollment?.id).toEqual(enrollment2.id);
    expect(physicsEnrollment?.student_id).toEqual(student.id);
    expect((physicsEnrollment as any)?.course_title).toEqual('Physics 101');
    expect((physicsEnrollment as any)?.course_description).toEqual('Basic Physics');
  });

  it('should return only enrollments for the specified student', async () => {
    // Create teacher
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create two students
    const [student1, student2] = await db.insert(usersTable)
      .values([
        {
          email: 'student1@test.com',
          password_hash: 'hashed_password',
          first_name: 'John',
          last_name: 'Doe',
          role: 'student'
        },
        {
          email: 'student2@test.com',
          password_hash: 'hashed_password',
          first_name: 'Alice',
          last_name: 'Johnson',
          role: 'student'
        }
      ])
      .returning()
      .execute();

    // Create courses
    const [course1, course2] = await db.insert(coursesTable)
      .values([
        {
          title: 'Math 101',
          description: 'Basic Mathematics',
          teacher_id: teacher.id
        },
        {
          title: 'Physics 101',
          description: 'Basic Physics',
          teacher_id: teacher.id
        }
      ])
      .returning()
      .execute();

    // Create enrollments for both students
    await db.insert(courseEnrollmentsTable)
      .values([
        {
          course_id: course1.id,
          student_id: student1.id
        },
        {
          course_id: course2.id,
          student_id: student1.id
        },
        {
          course_id: course1.id,
          student_id: student2.id
        }
      ])
      .execute();

    const result = await getStudentEnrollments(student1.id);

    expect(result).toHaveLength(2);
    result.forEach(enrollment => {
      expect(enrollment.student_id).toEqual(student1.id);
    });
  });

  it('should handle completed enrollments correctly', async () => {
    // Create teacher
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create student
    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      })
      .returning()
      .execute();

    // Create course
    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Math 101',
        description: 'Basic Mathematics',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    // Create completed enrollment
    const completionDate = new Date();
    const [enrollment] = await db.insert(courseEnrollmentsTable)
      .values({
        course_id: course.id,
        student_id: student.id,
        completed_at: completionDate
      })
      .returning()
      .execute();

    const result = await getStudentEnrollments(student.id);

    expect(result).toHaveLength(1);
    expect(result[0].completed_at).toBeInstanceOf(Date);
    expect(result[0].completed_at?.getTime()).toEqual(completionDate.getTime());
  });

  it('should return empty array for non-existent student', async () => {
    const result = await getStudentEnrollments(999999);

    expect(result).toEqual([]);
  });

  it('should handle courses with null descriptions', async () => {
    // Create teacher
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create student
    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      })
      .returning()
      .execute();

    // Create course with null description
    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Advanced Topics',
        description: null,
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    // Create enrollment
    await db.insert(courseEnrollmentsTable)
      .values({
        course_id: course.id,
        student_id: student.id
      })
      .execute();

    const result = await getStudentEnrollments(student.id);

    expect(result).toHaveLength(1);
    expect((result[0] as any).course_description).toBeNull();
    expect((result[0] as any).course_title).toEqual('Advanced Topics');
  });
});