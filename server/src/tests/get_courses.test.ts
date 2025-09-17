import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { getCourses, getCoursesByTeacher } from '../handlers/get_courses';

describe('getCourses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no courses exist', async () => {
    const result = await getCourses();
    expect(result).toEqual([]);
  });

  it('should return all courses when courses exist', async () => {
    // Create a teacher first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create test courses
    await db.insert(coursesTable)
      .values([
        {
          title: 'Math 101',
          description: 'Basic Mathematics',
          teacher_id: teacherId
        },
        {
          title: 'Science 101',
          description: 'Basic Science',
          teacher_id: teacherId
        }
      ])
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Math 101');
    expect(result[0].description).toEqual('Basic Mathematics');
    expect(result[0].teacher_id).toEqual(teacherId);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].title).toEqual('Science 101');
    expect(result[1].description).toEqual('Basic Science');
    expect(result[1].teacher_id).toEqual(teacherId);
  });

  it('should return courses from multiple teachers', async () => {
    // Create two teachers
    const teacher1Result = await db.insert(usersTable)
      .values({
        email: 'teacher1@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher2Result = await db.insert(usersTable)
      .values({
        email: 'teacher2@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Jane',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher1Id = teacher1Result[0].id;
    const teacher2Id = teacher2Result[0].id;

    // Create courses for both teachers
    await db.insert(coursesTable)
      .values([
        {
          title: 'Math 101',
          description: 'Basic Mathematics',
          teacher_id: teacher1Id
        },
        {
          title: 'Physics 101',
          description: 'Basic Physics',
          teacher_id: teacher2Id
        }
      ])
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(2);
    
    const mathCourse = result.find(c => c.title === 'Math 101');
    const physicsCourse = result.find(c => c.title === 'Physics 101');
    
    expect(mathCourse).toBeDefined();
    expect(mathCourse!.teacher_id).toEqual(teacher1Id);
    
    expect(physicsCourse).toBeDefined();
    expect(physicsCourse!.teacher_id).toEqual(teacher2Id);
  });
});

describe('getCoursesByTeacher', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when teacher has no courses', async () => {
    // Create a teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;
    const result = await getCoursesByTeacher(teacherId);
    
    expect(result).toEqual([]);
  });

  it('should return courses for specific teacher only', async () => {
    // Create two teachers
    const teacher1Result = await db.insert(usersTable)
      .values({
        email: 'teacher1@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher2Result = await db.insert(usersTable)
      .values({
        email: 'teacher2@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Jane',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher1Id = teacher1Result[0].id;
    const teacher2Id = teacher2Result[0].id;

    // Create courses for both teachers
    await db.insert(coursesTable)
      .values([
        {
          title: 'Math 101',
          description: 'Basic Mathematics',
          teacher_id: teacher1Id
        },
        {
          title: 'Math 201',
          description: 'Advanced Mathematics',
          teacher_id: teacher1Id
        },
        {
          title: 'Physics 101',
          description: 'Basic Physics',
          teacher_id: teacher2Id
        }
      ])
      .execute();

    // Test teacher1's courses
    const teacher1Courses = await getCoursesByTeacher(teacher1Id);
    expect(teacher1Courses).toHaveLength(2);
    
    const mathCourses = teacher1Courses.filter(c => c.title.startsWith('Math'));
    expect(mathCourses).toHaveLength(2);
    
    teacher1Courses.forEach(course => {
      expect(course.teacher_id).toEqual(teacher1Id);
      expect(course.id).toBeDefined();
      expect(course.created_at).toBeInstanceOf(Date);
      expect(course.updated_at).toBeInstanceOf(Date);
    });

    // Test teacher2's courses
    const teacher2Courses = await getCoursesByTeacher(teacher2Id);
    expect(teacher2Courses).toHaveLength(1);
    expect(teacher2Courses[0].title).toEqual('Physics 101');
    expect(teacher2Courses[0].teacher_id).toEqual(teacher2Id);
  });

  it('should return empty array for non-existent teacher', async () => {
    const nonExistentTeacherId = 99999;
    const result = await getCoursesByTeacher(nonExistentTeacherId);
    
    expect(result).toEqual([]);
  });

  it('should handle courses with null descriptions', async () => {
    // Create a teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create course with null description
    await db.insert(coursesTable)
      .values({
        title: 'Mystery Course',
        description: null,
        teacher_id: teacherId
      })
      .execute();

    const result = await getCoursesByTeacher(teacherId);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Mystery Course');
    expect(result[0].description).toBeNull();
    expect(result[0].teacher_id).toEqual(teacherId);
  });
});