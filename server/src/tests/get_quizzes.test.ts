import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, quizzesTable } from '../db/schema';
import { getQuizzesByLesson, getQuiz } from '../handlers/get_quizzes';

describe('getQuizzes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getQuizzesByLesson', () => {
    it('should return all quizzes for a specific lesson', async () => {
      // Create prerequisite data
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

      const courseResult = await db.insert(coursesTable)
        .values({
          title: 'Test Course',
          description: 'A course for testing',
          teacher_id: teacherResult[0].id
        })
        .returning()
        .execute();

      const lessonResult = await db.insert(lessonsTable)
        .values({
          course_id: courseResult[0].id,
          title: 'Test Lesson',
          content: 'Lesson content',
          order_index: 1
        })
        .returning()
        .execute();

      // Create multiple quizzes for the lesson
      const quiz1Result = await db.insert(quizzesTable)
        .values({
          lesson_id: lessonResult[0].id,
          title: 'Quiz 1',
          description: 'First quiz',
          time_limit: 30
        })
        .returning()
        .execute();

      const quiz2Result = await db.insert(quizzesTable)
        .values({
          lesson_id: lessonResult[0].id,
          title: 'Quiz 2',
          description: 'Second quiz',
          time_limit: null
        })
        .returning()
        .execute();

      // Create a quiz for a different lesson to ensure filtering works
      const otherLessonResult = await db.insert(lessonsTable)
        .values({
          course_id: courseResult[0].id,
          title: 'Other Lesson',
          content: 'Other lesson content',
          order_index: 2
        })
        .returning()
        .execute();

      await db.insert(quizzesTable)
        .values({
          lesson_id: otherLessonResult[0].id,
          title: 'Other Quiz',
          description: 'Quiz for other lesson',
          time_limit: 45
        })
        .execute();

      const result = await getQuizzesByLesson(lessonResult[0].id);

      expect(result).toHaveLength(2);
      expect(result[0].title).toEqual('Quiz 1');
      expect(result[0].description).toEqual('First quiz');
      expect(result[0].lesson_id).toEqual(lessonResult[0].id);
      expect(result[0].time_limit).toEqual(30);
      expect(result[0].id).toEqual(quiz1Result[0].id);
      expect(result[0].created_at).toBeInstanceOf(Date);
      expect(result[0].updated_at).toBeInstanceOf(Date);

      expect(result[1].title).toEqual('Quiz 2');
      expect(result[1].description).toEqual('Second quiz');
      expect(result[1].lesson_id).toEqual(lessonResult[0].id);
      expect(result[1].time_limit).toBeNull();
      expect(result[1].id).toEqual(quiz2Result[0].id);
    });

    it('should return empty array when lesson has no quizzes', async () => {
      // Create prerequisite data
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

      const courseResult = await db.insert(coursesTable)
        .values({
          title: 'Test Course',
          description: 'A course for testing',
          teacher_id: teacherResult[0].id
        })
        .returning()
        .execute();

      const lessonResult = await db.insert(lessonsTable)
        .values({
          course_id: courseResult[0].id,
          title: 'Test Lesson',
          content: 'Lesson content',
          order_index: 1
        })
        .returning()
        .execute();

      const result = await getQuizzesByLesson(lessonResult[0].id);

      expect(result).toHaveLength(0);
    });

    it('should return empty array for non-existent lesson', async () => {
      const result = await getQuizzesByLesson(999);
      expect(result).toHaveLength(0);
    });
  });

  describe('getQuiz', () => {
    it('should return specific quiz by id', async () => {
      // Create prerequisite data
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

      const courseResult = await db.insert(coursesTable)
        .values({
          title: 'Test Course',
          description: 'A course for testing',
          teacher_id: teacherResult[0].id
        })
        .returning()
        .execute();

      const lessonResult = await db.insert(lessonsTable)
        .values({
          course_id: courseResult[0].id,
          title: 'Test Lesson',
          content: 'Lesson content',
          order_index: 1
        })
        .returning()
        .execute();

      const quizResult = await db.insert(quizzesTable)
        .values({
          lesson_id: lessonResult[0].id,
          title: 'Test Quiz',
          description: 'A quiz for testing',
          time_limit: 60
        })
        .returning()
        .execute();

      const result = await getQuiz(quizResult[0].id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(quizResult[0].id);
      expect(result!.title).toEqual('Test Quiz');
      expect(result!.description).toEqual('A quiz for testing');
      expect(result!.lesson_id).toEqual(lessonResult[0].id);
      expect(result!.time_limit).toEqual(60);
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should return quiz with null description and time_limit', async () => {
      // Create prerequisite data
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

      const courseResult = await db.insert(coursesTable)
        .values({
          title: 'Test Course',
          description: 'A course for testing',
          teacher_id: teacherResult[0].id
        })
        .returning()
        .execute();

      const lessonResult = await db.insert(lessonsTable)
        .values({
          course_id: courseResult[0].id,
          title: 'Test Lesson',
          content: 'Lesson content',
          order_index: 1
        })
        .returning()
        .execute();

      const quizResult = await db.insert(quizzesTable)
        .values({
          lesson_id: lessonResult[0].id,
          title: 'Minimal Quiz',
          description: null,
          time_limit: null
        })
        .returning()
        .execute();

      const result = await getQuiz(quizResult[0].id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(quizResult[0].id);
      expect(result!.title).toEqual('Minimal Quiz');
      expect(result!.description).toBeNull();
      expect(result!.time_limit).toBeNull();
      expect(result!.lesson_id).toEqual(lessonResult[0].id);
    });

    it('should return null for non-existent quiz', async () => {
      const result = await getQuiz(999);
      expect(result).toBeNull();
    });

    it('should handle multiple quizzes and return correct one', async () => {
      // Create prerequisite data
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

      const courseResult = await db.insert(coursesTable)
        .values({
          title: 'Test Course',
          description: 'A course for testing',
          teacher_id: teacherResult[0].id
        })
        .returning()
        .execute();

      const lessonResult = await db.insert(lessonsTable)
        .values({
          course_id: courseResult[0].id,
          title: 'Test Lesson',
          content: 'Lesson content',
          order_index: 1
        })
        .returning()
        .execute();

      // Create multiple quizzes
      await db.insert(quizzesTable)
        .values({
          lesson_id: lessonResult[0].id,
          title: 'Quiz 1',
          description: 'First quiz',
          time_limit: 30
        })
        .execute();

      const targetQuizResult = await db.insert(quizzesTable)
        .values({
          lesson_id: lessonResult[0].id,
          title: 'Target Quiz',
          description: 'The quiz we want',
          time_limit: 45
        })
        .returning()
        .execute();

      await db.insert(quizzesTable)
        .values({
          lesson_id: lessonResult[0].id,
          title: 'Quiz 3',
          description: 'Third quiz',
          time_limit: 60
        })
        .execute();

      const result = await getQuiz(targetQuizResult[0].id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(targetQuizResult[0].id);
      expect(result!.title).toEqual('Target Quiz');
      expect(result!.description).toEqual('The quiz we want');
      expect(result!.time_limit).toEqual(45);
    });
  });
});