import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable } from '../db/schema';
import { type CreateUserInput, type CreateCourseInput, type CreateLessonInput } from '../schema';
import { getLessonsByCourse, getLesson } from '../handlers/get_lessons';

// Test data
const testTeacher: CreateUserInput = {
  email: 'teacher@test.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Teacher',
  role: 'teacher'
};

const testCourse: CreateCourseInput = {
  title: 'Test Course',
  description: 'A course for testing',
  teacher_id: 1 // Will be updated after creating teacher
};

const testLessons: CreateLessonInput[] = [
  {
    course_id: 1, // Will be updated after creating course
    title: 'Lesson 1: Introduction',
    content: 'This is the first lesson content',
    order_index: 1
  },
  {
    course_id: 1,
    title: 'Lesson 2: Basics',
    content: 'This is the second lesson content',
    order_index: 2
  },
  {
    course_id: 1,
    title: 'Lesson 3: Advanced',
    content: null,
    order_index: 3
  }
];

describe('getLessons handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getLessonsByCourse', () => {
    it('should return lessons ordered by order_index', async () => {
      // Create teacher
      const teacherResult = await db.insert(usersTable)
        .values({
          email: testTeacher.email,
          password_hash: 'hashed_password',
          first_name: testTeacher.first_name,
          last_name: testTeacher.last_name,
          role: testTeacher.role
        })
        .returning()
        .execute();

      // Create course
      const courseResult = await db.insert(coursesTable)
        .values({
          title: testCourse.title,
          description: testCourse.description,
          teacher_id: teacherResult[0].id
        })
        .returning()
        .execute();

      // Create lessons with different order
      const lessonsToCreate = testLessons.map(lesson => ({
        ...lesson,
        course_id: courseResult[0].id
      }));

      await db.insert(lessonsTable)
        .values(lessonsToCreate)
        .execute();

      const result = await getLessonsByCourse(courseResult[0].id);

      expect(result).toHaveLength(3);
      expect(result[0].title).toEqual('Lesson 1: Introduction');
      expect(result[0].order_index).toEqual(1);
      expect(result[0].content).toEqual('This is the first lesson content');
      expect(result[1].title).toEqual('Lesson 2: Basics');
      expect(result[1].order_index).toEqual(2);
      expect(result[2].title).toEqual('Lesson 3: Advanced');
      expect(result[2].order_index).toEqual(3);
      expect(result[2].content).toBeNull();

      // Verify all lessons have required fields
      result.forEach(lesson => {
        expect(lesson.id).toBeDefined();
        expect(lesson.course_id).toEqual(courseResult[0].id);
        expect(lesson.created_at).toBeInstanceOf(Date);
        expect(lesson.updated_at).toBeInstanceOf(Date);
      });
    });

    it('should return empty array for course with no lessons', async () => {
      // Create teacher
      const teacherResult = await db.insert(usersTable)
        .values({
          email: testTeacher.email,
          password_hash: 'hashed_password',
          first_name: testTeacher.first_name,
          last_name: testTeacher.last_name,
          role: testTeacher.role
        })
        .returning()
        .execute();

      // Create course
      const courseResult = await db.insert(coursesTable)
        .values({
          title: testCourse.title,
          description: testCourse.description,
          teacher_id: teacherResult[0].id
        })
        .returning()
        .execute();

      const result = await getLessonsByCourse(courseResult[0].id);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should return empty array for non-existent course', async () => {
      const result = await getLessonsByCourse(999);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle lessons with same order_index correctly', async () => {
      // Create teacher
      const teacherResult = await db.insert(usersTable)
        .values({
          email: testTeacher.email,
          password_hash: 'hashed_password',
          first_name: testTeacher.first_name,
          last_name: testTeacher.last_name,
          role: testTeacher.role
        })
        .returning()
        .execute();

      // Create course
      const courseResult = await db.insert(coursesTable)
        .values({
          title: testCourse.title,
          description: testCourse.description,
          teacher_id: teacherResult[0].id
        })
        .returning()
        .execute();

      // Create lessons with same order_index
      await db.insert(lessonsTable)
        .values([
          {
            course_id: courseResult[0].id,
            title: 'First lesson',
            content: 'Content 1',
            order_index: 1
          },
          {
            course_id: courseResult[0].id,
            title: 'Second lesson',
            content: 'Content 2',
            order_index: 1
          }
        ])
        .execute();

      const result = await getLessonsByCourse(courseResult[0].id);

      expect(result).toHaveLength(2);
      expect(result[0].order_index).toEqual(1);
      expect(result[1].order_index).toEqual(1);
    });
  });

  describe('getLesson', () => {
    it('should return specific lesson by id', async () => {
      // Create teacher
      const teacherResult = await db.insert(usersTable)
        .values({
          email: testTeacher.email,
          password_hash: 'hashed_password',
          first_name: testTeacher.first_name,
          last_name: testTeacher.last_name,
          role: testTeacher.role
        })
        .returning()
        .execute();

      // Create course
      const courseResult = await db.insert(coursesTable)
        .values({
          title: testCourse.title,
          description: testCourse.description,
          teacher_id: teacherResult[0].id
        })
        .returning()
        .execute();

      // Create lesson
      const lessonResult = await db.insert(lessonsTable)
        .values({
          course_id: courseResult[0].id,
          title: testLessons[0].title,
          content: testLessons[0].content,
          order_index: testLessons[0].order_index
        })
        .returning()
        .execute();

      const result = await getLesson(lessonResult[0].id);

      expect(result).not.toBeNull();
      expect(result?.id).toEqual(lessonResult[0].id);
      expect(result?.course_id).toEqual(courseResult[0].id);
      expect(result?.title).toEqual('Lesson 1: Introduction');
      expect(result?.content).toEqual('This is the first lesson content');
      expect(result?.order_index).toEqual(1);
      expect(result?.created_at).toBeInstanceOf(Date);
      expect(result?.updated_at).toBeInstanceOf(Date);
    });

    it('should return lesson with null content', async () => {
      // Create teacher
      const teacherResult = await db.insert(usersTable)
        .values({
          email: testTeacher.email,
          password_hash: 'hashed_password',
          first_name: testTeacher.first_name,
          last_name: testTeacher.last_name,
          role: testTeacher.role
        })
        .returning()
        .execute();

      // Create course
      const courseResult = await db.insert(coursesTable)
        .values({
          title: testCourse.title,
          description: testCourse.description,
          teacher_id: teacherResult[0].id
        })
        .returning()
        .execute();

      // Create lesson with null content
      const lessonResult = await db.insert(lessonsTable)
        .values({
          course_id: courseResult[0].id,
          title: 'Empty Lesson',
          content: null,
          order_index: 1
        })
        .returning()
        .execute();

      const result = await getLesson(lessonResult[0].id);

      expect(result).not.toBeNull();
      expect(result?.content).toBeNull();
      expect(result?.title).toEqual('Empty Lesson');
    });

    it('should return null for non-existent lesson', async () => {
      const result = await getLesson(999);

      expect(result).toBeNull();
    });

    it('should return null for invalid lesson id', async () => {
      const result = await getLesson(-1);

      expect(result).toBeNull();
    });
  });
});