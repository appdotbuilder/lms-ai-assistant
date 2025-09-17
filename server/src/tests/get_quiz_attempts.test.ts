import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, contentTable, quizzesTable, quizAttemptsTable } from '../db/schema';
import { getQuizAttempts } from '../handlers/get_quiz_attempts';

describe('getQuizAttempts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all attempts for a quiz when no student filter is applied', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      password_hash: 'hashedpass',
      first_name: 'Teacher',
      last_name: 'User',
      role: 'teacher'
    }).returning().execute();

    const student1Result = await db.insert(usersTable).values({
      email: 'student1@test.com',
      password_hash: 'hashedpass',
      first_name: 'Student',
      last_name: 'One',
      role: 'student'
    }).returning().execute();

    const student2Result = await db.insert(usersTable).values({
      email: 'student2@test.com',
      password_hash: 'hashedpass',
      first_name: 'Student',
      last_name: 'Two',
      role: 'student'
    }).returning().execute();

    const courseResult = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A course for testing',
      teacher_id: teacherResult[0].id
    }).returning().execute();

    const contentResult = await db.insert(contentTable).values({
      course_id: courseResult[0].id,
      title: 'Test Content',
      description: 'Test content description',
      content_type: 'quiz',
      content_data: '{"type": "quiz"}',
      order_index: 1
    }).returning().execute();

    const quizResult = await db.insert(quizzesTable).values({
      content_id: contentResult[0].id,
      title: 'Test Quiz',
      description: 'A quiz for testing',
      time_limit_minutes: 30,
      max_attempts: 3
    }).returning().execute();

    // Create quiz attempts for both students
    await db.insert(quizAttemptsTable).values({
      student_id: student1Result[0].id,
      quiz_id: quizResult[0].id,
      score: '85.50',
      max_score: '100.00',
      completed: true
    }).execute();

    await db.insert(quizAttemptsTable).values({
      student_id: student2Result[0].id,
      quiz_id: quizResult[0].id,
      score: '92.00',
      max_score: '100.00',
      completed: true
    }).execute();

    await db.insert(quizAttemptsTable).values({
      student_id: student1Result[0].id,
      quiz_id: quizResult[0].id,
      score: null,
      max_score: '100.00',
      completed: false
    }).execute();

    // Test getting all attempts for the quiz
    const attempts = await getQuizAttempts(quizResult[0].id);

    expect(attempts).toHaveLength(3);
    
    // Verify numeric conversions
    expect(typeof attempts[0].score).toBe('number');
    expect(typeof attempts[0].max_score).toBe('number');
    
    // Check that we get attempts from both students
    const studentIds = attempts.map(a => a.student_id).sort();
    expect(studentIds).toContain(student1Result[0].id);
    expect(studentIds).toContain(student2Result[0].id);
    
    // Verify scores are properly converted
    const completedAttempts = attempts.filter(a => a.completed);
    expect(completedAttempts.some(a => a.score === 85.5)).toBe(true);
    expect(completedAttempts.some(a => a.score === 92)).toBe(true);
    
    // Verify incomplete attempt has null score
    const incompleteAttempts = attempts.filter(a => !a.completed);
    expect(incompleteAttempts).toHaveLength(1);
    expect(incompleteAttempts[0].score).toBeNull();
  });

  it('should filter attempts by student when studentId is provided', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      password_hash: 'hashedpass',
      first_name: 'Teacher',
      last_name: 'User',
      role: 'teacher'
    }).returning().execute();

    const student1Result = await db.insert(usersTable).values({
      email: 'student1@test.com',
      password_hash: 'hashedpass',
      first_name: 'Student',
      last_name: 'One',
      role: 'student'
    }).returning().execute();

    const student2Result = await db.insert(usersTable).values({
      email: 'student2@test.com',
      password_hash: 'hashedpass',
      first_name: 'Student',
      last_name: 'Two',
      role: 'student'
    }).returning().execute();

    const courseResult = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A course for testing',
      teacher_id: teacherResult[0].id
    }).returning().execute();

    const contentResult = await db.insert(contentTable).values({
      course_id: courseResult[0].id,
      title: 'Test Content',
      description: 'Test content description',
      content_type: 'quiz',
      content_data: '{"type": "quiz"}',
      order_index: 1
    }).returning().execute();

    const quizResult = await db.insert(quizzesTable).values({
      content_id: contentResult[0].id,
      title: 'Test Quiz',
      description: 'A quiz for testing',
      time_limit_minutes: 30,
      max_attempts: 3
    }).returning().execute();

    // Create attempts for both students
    await db.insert(quizAttemptsTable).values({
      student_id: student1Result[0].id,
      quiz_id: quizResult[0].id,
      score: '75.25',
      max_score: '100.00',
      completed: true
    }).execute();

    await db.insert(quizAttemptsTable).values({
      student_id: student1Result[0].id,
      quiz_id: quizResult[0].id,
      score: '88.75',
      max_score: '100.00',
      completed: true
    }).execute();

    await db.insert(quizAttemptsTable).values({
      student_id: student2Result[0].id,
      quiz_id: quizResult[0].id,
      score: '95.00',
      max_score: '100.00',
      completed: true
    }).execute();

    // Test filtering by student
    const student1Attempts = await getQuizAttempts(quizResult[0].id, student1Result[0].id);
    
    expect(student1Attempts).toHaveLength(2);
    expect(student1Attempts.every(a => a.student_id === student1Result[0].id)).toBe(true);
    
    // Verify scores are correctly converted
    const scores = student1Attempts.map(a => a.score).sort();
    expect(scores).toEqual([75.25, 88.75]);

    // Test filtering by different student
    const student2Attempts = await getQuizAttempts(quizResult[0].id, student2Result[0].id);
    
    expect(student2Attempts).toHaveLength(1);
    expect(student2Attempts[0].student_id).toEqual(student2Result[0].id);
    expect(student2Attempts[0].score).toEqual(95);
  });

  it('should return empty array when quiz has no attempts', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      password_hash: 'hashedpass',
      first_name: 'Teacher',
      last_name: 'User',
      role: 'teacher'
    }).returning().execute();

    const courseResult = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A course for testing',
      teacher_id: teacherResult[0].id
    }).returning().execute();

    const contentResult = await db.insert(contentTable).values({
      course_id: courseResult[0].id,
      title: 'Test Content',
      description: 'Test content description',
      content_type: 'quiz',
      content_data: '{"type": "quiz"}',
      order_index: 1
    }).returning().execute();

    const quizResult = await db.insert(quizzesTable).values({
      content_id: contentResult[0].id,
      title: 'Test Quiz',
      description: 'A quiz for testing',
      time_limit_minutes: 30,
      max_attempts: 3
    }).returning().execute();

    // Test with quiz that has no attempts
    const attempts = await getQuizAttempts(quizResult[0].id);
    
    expect(attempts).toHaveLength(0);
    expect(attempts).toEqual([]);
  });

  it('should return empty array when filtering by student with no attempts', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      password_hash: 'hashedpass',
      first_name: 'Teacher',
      last_name: 'User',
      role: 'teacher'
    }).returning().execute();

    const student1Result = await db.insert(usersTable).values({
      email: 'student1@test.com',
      password_hash: 'hashedpass',
      first_name: 'Student',
      last_name: 'One',
      role: 'student'
    }).returning().execute();

    const student2Result = await db.insert(usersTable).values({
      email: 'student2@test.com',
      password_hash: 'hashedpass',
      first_name: 'Student',
      last_name: 'Two',
      role: 'student'
    }).returning().execute();

    const courseResult = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A course for testing',
      teacher_id: teacherResult[0].id
    }).returning().execute();

    const contentResult = await db.insert(contentTable).values({
      course_id: courseResult[0].id,
      title: 'Test Content',
      description: 'Test content description',
      content_type: 'quiz',
      content_data: '{"type": "quiz"}',
      order_index: 1
    }).returning().execute();

    const quizResult = await db.insert(quizzesTable).values({
      content_id: contentResult[0].id,
      title: 'Test Quiz',
      description: 'A quiz for testing',
      time_limit_minutes: 30,
      max_attempts: 3
    }).returning().execute();

    // Create attempt for only one student
    await db.insert(quizAttemptsTable).values({
      student_id: student1Result[0].id,
      quiz_id: quizResult[0].id,
      score: '80.00',
      max_score: '100.00',
      completed: true
    }).execute();

    // Test filtering by student who has no attempts
    const attempts = await getQuizAttempts(quizResult[0].id, student2Result[0].id);
    
    expect(attempts).toHaveLength(0);
    expect(attempts).toEqual([]);
  });

  it('should handle mixed completed and incomplete attempts correctly', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      password_hash: 'hashedpass',
      first_name: 'Teacher',
      last_name: 'User',
      role: 'teacher'
    }).returning().execute();

    const studentResult = await db.insert(usersTable).values({
      email: 'student@test.com',
      password_hash: 'hashedpass',
      first_name: 'Student',
      last_name: 'User',
      role: 'student'
    }).returning().execute();

    const courseResult = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'A course for testing',
      teacher_id: teacherResult[0].id
    }).returning().execute();

    const contentResult = await db.insert(contentTable).values({
      course_id: courseResult[0].id,
      title: 'Test Content',
      description: 'Test content description',
      content_type: 'quiz',
      content_data: '{"type": "quiz"}',
      order_index: 1
    }).returning().execute();

    const quizResult = await db.insert(quizzesTable).values({
      content_id: contentResult[0].id,
      title: 'Test Quiz',
      description: 'A quiz for testing',
      time_limit_minutes: 30,
      max_attempts: 3
    }).returning().execute();

    // Create completed attempt
    await db.insert(quizAttemptsTable).values({
      student_id: studentResult[0].id,
      quiz_id: quizResult[0].id,
      score: '82.50',
      max_score: '100.00',
      completed: true
    }).execute();

    // Create incomplete attempt
    await db.insert(quizAttemptsTable).values({
      student_id: studentResult[0].id,
      quiz_id: quizResult[0].id,
      score: null,
      max_score: '100.00',
      completed: false
    }).execute();

    const attempts = await getQuizAttempts(quizResult[0].id, studentResult[0].id);

    expect(attempts).toHaveLength(2);
    
    const completedAttempt = attempts.find(a => a.completed);
    const incompleteAttempt = attempts.find(a => !a.completed);

    expect(completedAttempt).toBeDefined();
    expect(completedAttempt!.score).toEqual(82.5);
    expect(typeof completedAttempt!.score).toBe('number');
    expect(completedAttempt!.max_score).toEqual(100);

    expect(incompleteAttempt).toBeDefined();
    expect(incompleteAttempt!.score).toBeNull();
    expect(incompleteAttempt!.max_score).toEqual(100);
    expect(typeof incompleteAttempt!.max_score).toBe('number');
  });
});