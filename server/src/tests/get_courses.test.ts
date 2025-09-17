import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, courseEnrollmentsTable } from '../db/schema';
import { getCoursesFiltered, type GetCoursesInput } from '../handlers/get_courses';

describe('getCoursesFiltered', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all courses for administrators', async () => {
    // Create admin user
    const adminUsers = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();
    
    const adminId = adminUsers[0].id;

    // Create teacher user
    const teacherUsers = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'Teacher',
        last_name: 'User',
        role: 'teacher'
      })
      .returning()
      .execute();
    
    const teacherId = teacherUsers[0].id;

    // Create courses
    await db.insert(coursesTable)
      .values([
        {
          title: 'Course 1',
          description: 'First course',
          teacher_id: teacherId
        },
        {
          title: 'Course 2',
          description: 'Second course',
          teacher_id: teacherId
        }
      ])
      .execute();

    const input: GetCoursesInput = {
      user_id: adminId,
      user_role: 'administrator'
    };

    const result = await getCoursesFiltered(input);

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Course 1');
    expect(result[1].title).toEqual('Course 2');
    expect(result[0].teacher_id).toEqual(teacherId);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return only courses taught by teacher', async () => {
    // Create two teachers
    const teacher1Users = await db.insert(usersTable)
      .values({
        email: 'teacher1@example.com',
        password_hash: 'hashed_password',
        first_name: 'Teacher',
        last_name: 'One',
        role: 'teacher'
      })
      .returning()
      .execute();
    
    const teacher1Id = teacher1Users[0].id;

    const teacher2Users = await db.insert(usersTable)
      .values({
        email: 'teacher2@example.com',
        password_hash: 'hashed_password',
        first_name: 'Teacher',
        last_name: 'Two',
        role: 'teacher'
      })
      .returning()
      .execute();
    
    const teacher2Id = teacher2Users[0].id;

    // Create courses for both teachers
    await db.insert(coursesTable)
      .values([
        {
          title: 'Teacher 1 Course',
          description: 'Course by teacher 1',
          teacher_id: teacher1Id
        },
        {
          title: 'Teacher 2 Course',
          description: 'Course by teacher 2',
          teacher_id: teacher2Id
        }
      ])
      .execute();

    const input: GetCoursesInput = {
      user_id: teacher1Id,
      user_role: 'teacher'
    };

    const result = await getCoursesFiltered(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Teacher 1 Course');
    expect(result[0].teacher_id).toEqual(teacher1Id);
    expect(result[0].description).toEqual('Course by teacher 1');
  });

  it('should return only enrolled courses for students', async () => {
    // Create teacher and student
    const teacherUsers = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'Teacher',
        last_name: 'User',
        role: 'teacher'
      })
      .returning()
      .execute();
    
    const teacherId = teacherUsers[0].id;

    const studentUsers = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        password_hash: 'hashed_password',
        first_name: 'Student',
        last_name: 'User',
        role: 'student'
      })
      .returning()
      .execute();
    
    const studentId = studentUsers[0].id;

    // Create courses
    const courses = await db.insert(coursesTable)
      .values([
        {
          title: 'Enrolled Course',
          description: 'Course student is enrolled in',
          teacher_id: teacherId
        },
        {
          title: 'Not Enrolled Course',
          description: 'Course student is not enrolled in',
          teacher_id: teacherId
        }
      ])
      .returning()
      .execute();

    const enrolledCourseId = courses[0].id;

    // Enroll student in first course only
    await db.insert(courseEnrollmentsTable)
      .values({
        course_id: enrolledCourseId,
        student_id: studentId
      })
      .execute();

    const input: GetCoursesInput = {
      user_id: studentId,
      user_role: 'student'
    };

    const result = await getCoursesFiltered(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Enrolled Course');
    expect(result[0].description).toEqual('Course student is enrolled in');
    expect(result[0].teacher_id).toEqual(teacherId);
    expect(result[0].id).toEqual(enrolledCourseId);
  });

  it('should return empty array for student with no enrollments', async () => {
    // Create teacher and student
    const teacherUsers = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'Teacher',
        last_name: 'User',
        role: 'teacher'
      })
      .returning()
      .execute();
    
    const teacherId = teacherUsers[0].id;

    const studentUsers = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        password_hash: 'hashed_password',
        first_name: 'Student',
        last_name: 'User',
        role: 'student'
      })
      .returning()
      .execute();
    
    const studentId = studentUsers[0].id;

    // Create course but don't enroll student
    await db.insert(coursesTable)
      .values({
        title: 'Unenrolled Course',
        description: 'Course student is not enrolled in',
        teacher_id: teacherId
      })
      .execute();

    const input: GetCoursesInput = {
      user_id: studentId,
      user_role: 'student'
    };

    const result = await getCoursesFiltered(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for teacher with no courses', async () => {
    // Create teacher with no courses
    const teacherUsers = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'Teacher',
        last_name: 'User',
        role: 'teacher'
      })
      .returning()
      .execute();
    
    const teacherId = teacherUsers[0].id;

    const input: GetCoursesInput = {
      user_id: teacherId,
      user_role: 'teacher'
    };

    const result = await getCoursesFiltered(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for invalid role', async () => {
    // Create user
    const users = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'Test',
        role: 'student'
      })
      .returning()
      .execute();
    
    const userId = users[0].id;

    const input: GetCoursesInput = {
      user_id: userId,
      user_role: 'invalid_role' as any
    };

    const result = await getCoursesFiltered(input);

    expect(result).toHaveLength(0);
  });

  it('should handle multiple enrollments for students correctly', async () => {
    // Create teacher and student
    const teacherUsers = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'Teacher',
        last_name: 'User',
        role: 'teacher'
      })
      .returning()
      .execute();
    
    const teacherId = teacherUsers[0].id;

    const studentUsers = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        password_hash: 'hashed_password',
        first_name: 'Student',
        last_name: 'User',
        role: 'student'
      })
      .returning()
      .execute();
    
    const studentId = studentUsers[0].id;

    // Create multiple courses
    const courses = await db.insert(coursesTable)
      .values([
        {
          title: 'Math Course',
          description: 'Mathematics course',
          teacher_id: teacherId
        },
        {
          title: 'Science Course',
          description: 'Science course',
          teacher_id: teacherId
        },
        {
          title: 'History Course',
          description: 'History course',
          teacher_id: teacherId
        }
      ])
      .returning()
      .execute();

    // Enroll student in first two courses
    await db.insert(courseEnrollmentsTable)
      .values([
        {
          course_id: courses[0].id,
          student_id: studentId
        },
        {
          course_id: courses[1].id,
          student_id: studentId
        }
      ])
      .execute();

    const input: GetCoursesInput = {
      user_id: studentId,
      user_role: 'student'
    };

    const result = await getCoursesFiltered(input);

    expect(result).toHaveLength(2);
    
    const titles = result.map(course => course.title).sort();
    expect(titles).toEqual(['Math Course', 'Science Course']);
    
    // Verify all returned courses have proper structure
    result.forEach(course => {
      expect(course.id).toBeDefined();
      expect(course.teacher_id).toEqual(teacherId);
      expect(course.created_at).toBeInstanceOf(Date);
      expect(course.updated_at).toBeInstanceOf(Date);
    });
  });
});