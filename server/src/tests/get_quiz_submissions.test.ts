import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, quizzesTable, quizSubmissionsTable } from '../db/schema';
import { getQuizSubmissionsByQuiz, getQuizSubmissionsByStudent } from '../handlers/get_quiz_submissions';

describe('getQuizSubmissionsByQuiz', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all quiz submissions for a specific quiz', async () => {
    // Create test users (teacher and students)
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const student1Result = await db.insert(usersTable)
      .values({
        email: 'student1@test.com',
        password_hash: 'hash123',
        first_name: 'Alice',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const student2Result = await db.insert(usersTable)
      .values({
        email: 'student2@test.com',
        password_hash: 'hash123',
        first_name: 'Bob',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;
    const student1Id = student1Result[0].id;
    const student2Id = student2Result[0].id;

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Test Lesson',
        content: 'Test content',
        order_index: 1
      })
      .returning()
      .execute();

    const lessonId = lessonResult[0].id;

    // Create quiz
    const quizResult = await db.insert(quizzesTable)
      .values({
        lesson_id: lessonId,
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit: 60
      })
      .returning()
      .execute();

    const quizId = quizResult[0].id;

    // Create quiz submissions from both students
    await db.insert(quizSubmissionsTable)
      .values([
        {
          quiz_id: quizId,
          student_id: student1Id,
          answers: { '1': 'A', '2': 'B' },
          score: 85
        },
        {
          quiz_id: quizId,
          student_id: student2Id,
          answers: { '1': 'B', '2': 'A' },
          score: 75
        }
      ])
      .execute();

    // Test the handler
    const submissions = await getQuizSubmissionsByQuiz(quizId);

    expect(submissions).toHaveLength(2);
    
    // Verify structure of returned submissions
    submissions.forEach(submission => {
      expect(submission.id).toBeDefined();
      expect(submission.quiz_id).toEqual(quizId);
      expect([student1Id, student2Id]).toContain(submission.student_id);
      expect(submission.answers).toBeDefined();
      expect(typeof submission.answers).toBe('object');
      expect(submission.score).toBeDefined();
      expect(typeof submission.score).toBe('number');
      expect(submission.submitted_at).toBeInstanceOf(Date);
    });

    // Verify specific submission data
    const student1Submission = submissions.find(s => s.student_id === student1Id);
    const student2Submission = submissions.find(s => s.student_id === student2Id);

    expect(student1Submission).toBeDefined();
    expect(student1Submission!.score).toEqual(85);
    expect(student1Submission!.answers).toEqual({ '1': 'A', '2': 'B' });

    expect(student2Submission).toBeDefined();
    expect(student2Submission!.score).toEqual(75);
    expect(student2Submission!.answers).toEqual({ '1': 'B', '2': 'A' });
  });

  it('should return empty array when no submissions exist for quiz', async () => {
    // Create minimal data structure without submissions
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
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
        content: 'Test content',
        order_index: 1
      })
      .returning()
      .execute();

    const quizResult = await db.insert(quizzesTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit: 60
      })
      .returning()
      .execute();

    const submissions = await getQuizSubmissionsByQuiz(quizResult[0].id);

    expect(submissions).toHaveLength(0);
  });

  it('should return submissions ordered by submitted_at descending', async () => {
    // Create test data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hash123',
        first_name: 'Alice',
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
        content: 'Test content',
        order_index: 1
      })
      .returning()
      .execute();

    const quizResult = await db.insert(quizzesTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit: 60
      })
      .returning()
      .execute();

    const quizId = quizResult[0].id;
    const studentId = studentResult[0].id;

    // Create multiple submissions with different timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier

    await db.insert(quizSubmissionsTable)
      .values([
        {
          quiz_id: quizId,
          student_id: studentId,
          answers: { '1': 'A' },
          score: 100,
          submitted_at: earlier
        },
        {
          quiz_id: quizId,
          student_id: studentId,
          answers: { '1': 'B' },
          score: 90,
          submitted_at: now
        }
      ])
      .execute();

    const submissions = await getQuizSubmissionsByQuiz(quizId);

    expect(submissions).toHaveLength(2);
    // Most recent submission should be first
    expect(submissions[0].score).toEqual(90);
    expect(submissions[1].score).toEqual(100);
  });
});

describe('getQuizSubmissionsByStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all quiz submissions for a specific student', async () => {
    // Create test users
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hash123',
        first_name: 'Alice',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;
    const studentId = studentResult[0].id;

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create lessons
    const lesson1Result = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Test Lesson 1',
        content: 'Test content 1',
        order_index: 1
      })
      .returning()
      .execute();

    const lesson2Result = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Test Lesson 2',
        content: 'Test content 2',
        order_index: 2
      })
      .returning()
      .execute();

    // Create quizzes
    const quiz1Result = await db.insert(quizzesTable)
      .values({
        lesson_id: lesson1Result[0].id,
        title: 'Quiz 1',
        description: 'First quiz',
        time_limit: 60
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

    const quiz1Id = quiz1Result[0].id;
    const quiz2Id = quiz2Result[0].id;

    // Create quiz submissions for the student
    await db.insert(quizSubmissionsTable)
      .values([
        {
          quiz_id: quiz1Id,
          student_id: studentId,
          answers: { '1': 'A', '2': 'B' },
          score: 85
        },
        {
          quiz_id: quiz2Id,
          student_id: studentId,
          answers: { '1': 'C', '2': 'D' },
          score: 92
        }
      ])
      .execute();

    // Test the handler
    const submissions = await getQuizSubmissionsByStudent(studentId);

    expect(submissions).toHaveLength(2);
    
    // Verify structure of returned submissions
    submissions.forEach(submission => {
      expect(submission.id).toBeDefined();
      expect([quiz1Id, quiz2Id]).toContain(submission.quiz_id);
      expect(submission.student_id).toEqual(studentId);
      expect(submission.answers).toBeDefined();
      expect(typeof submission.answers).toBe('object');
      expect(submission.score).toBeDefined();
      expect(typeof submission.score).toBe('number');
      expect(submission.submitted_at).toBeInstanceOf(Date);
    });

    // Verify specific submission data
    const quiz1Submission = submissions.find(s => s.quiz_id === quiz1Id);
    const quiz2Submission = submissions.find(s => s.quiz_id === quiz2Id);

    expect(quiz1Submission).toBeDefined();
    expect(quiz1Submission!.score).toEqual(85);
    expect(quiz1Submission!.answers).toEqual({ '1': 'A', '2': 'B' });

    expect(quiz2Submission).toBeDefined();
    expect(quiz2Submission!.score).toEqual(92);
    expect(quiz2Submission!.answers).toEqual({ '1': 'C', '2': 'D' });
  });

  it('should return empty array when student has no submissions', async () => {
    // Create minimal data structure without submissions
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hash123',
        first_name: 'Alice',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const submissions = await getQuizSubmissionsByStudent(studentResult[0].id);

    expect(submissions).toHaveLength(0);
  });

  it('should handle submissions with null scores correctly', async () => {
    // Create test data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hash123',
        first_name: 'Alice',
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
        content: 'Test content',
        order_index: 1
      })
      .returning()
      .execute();

    const quizResult = await db.insert(quizzesTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit: 60
      })
      .returning()
      .execute();

    const quizId = quizResult[0].id;
    const studentId = studentResult[0].id;

    // Create submission with null score (ungraded)
    await db.insert(quizSubmissionsTable)
      .values({
        quiz_id: quizId,
        student_id: studentId,
        answers: { '1': 'A' },
        score: null
      })
      .execute();

    const submissions = await getQuizSubmissionsByStudent(studentId);

    expect(submissions).toHaveLength(1);
    expect(submissions[0].score).toBeNull();
    expect(submissions[0].answers).toEqual({ '1': 'A' });
  });

  it('should return submissions ordered by submitted_at descending', async () => {
    // Create test data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hash123',
        first_name: 'Alice',
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
        content: 'Test content',
        order_index: 1
      })
      .returning()
      .execute();

    const quizResult = await db.insert(quizzesTable)
      .values({
        lesson_id: lessonResult[0].id,
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit: 60
      })
      .returning()
      .execute();

    const quizId = quizResult[0].id;
    const studentId = studentResult[0].id;

    // Create multiple submissions with different timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier

    await db.insert(quizSubmissionsTable)
      .values([
        {
          quiz_id: quizId,
          student_id: studentId,
          answers: { '1': 'A' },
          score: 80,
          submitted_at: earlier
        },
        {
          quiz_id: quizId,
          student_id: studentId,
          answers: { '1': 'B' },
          score: 95,
          submitted_at: now
        }
      ])
      .execute();

    const submissions = await getQuizSubmissionsByStudent(studentId);

    expect(submissions).toHaveLength(2);
    // Most recent submission should be first
    expect(submissions[0].score).toEqual(95);
    expect(submissions[1].score).toEqual(80);
  });
});