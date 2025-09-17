import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  lessonsTable, 
  quizzesTable, 
  assignmentsTable,
  quizQuestionsTable,
  quizSubmissionsTable,
  assignmentSubmissionsTable,
  fileAttachmentsTable
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteCourse } from '../handlers/delete_course';

describe('deleteCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a course with no associated data', async () => {
    // Create a teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Delete the course
    await deleteCourse(courseId);

    // Verify course is deleted
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    expect(courses).toHaveLength(0);
  });

  it('should delete a course with lessons, quizzes, and assignments', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Jane',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

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
        content: 'Lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    const quizResult = await db.insert(quizzesTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit: 30
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Assignment',
        description: 'A test assignment',
        max_points: 100,
        due_date: new Date('2024-12-31')
      })
      .returning()
      .execute();

    // Create quiz question
    await db.insert(quizQuestionsTable)
      .values({
        quiz_id: quizResult[0].id,
        question_text: 'What is 2+2?',
        question_type: 'multiple_choice',
        options: ['2', '3', '4', '5'],
        correct_answer: '4',
        points: 10,
        order_index: 1
      })
      .execute();

    // Create quiz submission
    await db.insert(quizSubmissionsTable)
      .values({
        quiz_id: quizResult[0].id,
        student_id: studentResult[0].id,
        answers: { '1': '4' },
        score: 10
      })
      .execute();

    // Create assignment submission
    await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignmentResult[0].id,
        student_id: studentResult[0].id,
        content: 'My assignment submission',
        grade: 85,
        feedback: 'Good work!'
      })
      .execute();

    // Create file attachment
    await db.insert(fileAttachmentsTable)
      .values({
        lesson_id: lessonResult[0].id,
        filename: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_type: 'application/pdf',
        file_size: 1024
      })
      .execute();

    const courseId = courseResult[0].id;

    // Delete the course
    await deleteCourse(courseId);

    // Verify everything is deleted
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    const lessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.course_id, courseId))
      .execute();

    const quizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.lesson_id, lessonResult[0].id))
      .execute();

    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.lesson_id, lessonResult[0].id))
      .execute();

    expect(courses).toHaveLength(0);
    expect(lessons).toHaveLength(0);
    expect(quizzes).toHaveLength(0);
    expect(assignments).toHaveLength(0);
  });

  it('should delete course with multiple lessons and their associated data', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Jane',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    // Create multiple lessons
    const lesson1Result = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Lesson 1',
        content: 'Content 1',
        order_index: 1
      })
      .returning()
      .execute();

    const lesson2Result = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Lesson 2',
        content: 'Content 2',
        order_index: 2
      })
      .returning()
      .execute();

    // Create quizzes for each lesson
    const quiz1Result = await db.insert(quizzesTable)
      .values({
        lesson_id: lesson1Result[0].id,
        title: 'Quiz 1',
        description: 'First quiz',
        time_limit: 30
      })
      .returning()
      .execute();

    const quiz2Result = await db.insert(quizzesTable)
      .values({
        lesson_id: lesson2Result[0].id,
        title: 'Quiz 2',
        description: 'Second quiz',
        time_limit: 45
      })
      .returning()
      .execute();

    // Create quiz questions
    await db.insert(quizQuestionsTable)
      .values({
        quiz_id: quiz1Result[0].id,
        question_text: 'Question 1',
        question_type: 'multiple_choice',
        options: ['A', 'B', 'C', 'D'],
        correct_answer: 'A',
        points: 10,
        order_index: 1
      })
      .execute();

    await db.insert(quizQuestionsTable)
      .values({
        quiz_id: quiz2Result[0].id,
        question_text: 'Question 2',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        points: 5,
        order_index: 1
      })
      .execute();

    // Create quiz submissions
    await db.insert(quizSubmissionsTable)
      .values({
        quiz_id: quiz1Result[0].id,
        student_id: studentResult[0].id,
        answers: { '1': 'A' },
        score: 10
      })
      .execute();

    await db.insert(quizSubmissionsTable)
      .values({
        quiz_id: quiz2Result[0].id,
        student_id: studentResult[0].id,
        answers: { '2': 'True' },
        score: 5
      })
      .execute();

    const courseId = courseResult[0].id;

    // Delete the course
    await deleteCourse(courseId);

    // Verify everything is deleted
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    const lessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.course_id, courseId))
      .execute();

    const quizSubmissions = await db.select()
      .from(quizSubmissionsTable)
      .where(eq(quizSubmissionsTable.student_id, studentResult[0].id))
      .execute();

    expect(courses).toHaveLength(0);
    expect(lessons).toHaveLength(0);
    expect(quizSubmissions).toHaveLength(0);
  });

  it('should throw error when trying to delete non-existent course', async () => {
    const nonExistentCourseId = 999;

    await expect(deleteCourse(nonExistentCourseId))
      .rejects.toThrow(/Course with id 999 not found/i);
  });

  it('should not affect other courses when deleting one course', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create two courses
    const course1Result = await db.insert(coursesTable)
      .values({
        title: 'Course 1',
        description: 'First course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const course2Result = await db.insert(coursesTable)
      .values({
        title: 'Course 2',
        description: 'Second course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    // Create lessons for both courses
    await db.insert(lessonsTable)
      .values({
        course_id: course1Result[0].id,
        title: 'Lesson 1-1',
        content: 'Content for course 1',
        order_index: 1
      })
      .execute();

    await db.insert(lessonsTable)
      .values({
        course_id: course2Result[0].id,
        title: 'Lesson 2-1',
        content: 'Content for course 2',
        order_index: 1
      })
      .execute();

    // Delete only course 1
    await deleteCourse(course1Result[0].id);

    // Verify course 1 is deleted but course 2 remains
    const course1 = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, course1Result[0].id))
      .execute();

    const course2 = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, course2Result[0].id))
      .execute();

    const course2Lessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.course_id, course2Result[0].id))
      .execute();

    expect(course1).toHaveLength(0);
    expect(course2).toHaveLength(1);
    expect(course2Lessons).toHaveLength(1);
    expect(course2[0].title).toEqual('Course 2');
  });
});