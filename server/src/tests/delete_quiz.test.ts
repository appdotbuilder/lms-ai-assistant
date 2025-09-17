import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  lessonsTable, 
  quizzesTable, 
  quizQuestionsTable, 
  quizSubmissionsTable 
} from '../db/schema';
import { deleteQuiz } from '../handlers/delete_quiz';
import { eq } from 'drizzle-orm';

describe('deleteQuiz', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a quiz with no questions or submissions', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: user.id
      })
      .returning()
      .execute();

    const [lesson] = await db.insert(lessonsTable)
      .values({
        course_id: course.id,
        title: 'Test Lesson',
        content: 'Test content',
        order_index: 1
      })
      .returning()
      .execute();

    const [quiz] = await db.insert(quizzesTable)
      .values({
        lesson_id: lesson.id,
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit: 30
      })
      .returning()
      .execute();

    // Delete the quiz
    await deleteQuiz(quiz.id);

    // Verify quiz was deleted
    const remainingQuizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, quiz.id))
      .execute();

    expect(remainingQuizzes).toHaveLength(0);
  });

  it('should delete a quiz with questions but no submissions', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: user.id
      })
      .returning()
      .execute();

    const [lesson] = await db.insert(lessonsTable)
      .values({
        course_id: course.id,
        title: 'Test Lesson',
        content: 'Test content',
        order_index: 1
      })
      .returning()
      .execute();

    const [quiz] = await db.insert(quizzesTable)
      .values({
        lesson_id: lesson.id,
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit: 30
      })
      .returning()
      .execute();

    // Create quiz questions
    const [question1] = await db.insert(quizQuestionsTable)
      .values({
        quiz_id: quiz.id,
        question_text: 'What is 2 + 2?',
        question_type: 'multiple_choice',
        options: ['3', '4', '5'],
        correct_answer: '4',
        points: 10,
        order_index: 1
      })
      .returning()
      .execute();

    const [question2] = await db.insert(quizQuestionsTable)
      .values({
        quiz_id: quiz.id,
        question_text: 'Is the sky blue?',
        question_type: 'true_false',
        options: ['true', 'false'],
        correct_answer: 'true',
        points: 5,
        order_index: 2
      })
      .returning()
      .execute();

    // Delete the quiz
    await deleteQuiz(quiz.id);

    // Verify quiz was deleted
    const remainingQuizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, quiz.id))
      .execute();

    expect(remainingQuizzes).toHaveLength(0);

    // Verify questions were deleted
    const remainingQuestions = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, quiz.id))
      .execute();

    expect(remainingQuestions).toHaveLength(0);
  });

  it('should delete a quiz with questions and submissions', async () => {
    // Create prerequisite data
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const [lesson] = await db.insert(lessonsTable)
      .values({
        course_id: course.id,
        title: 'Test Lesson',
        content: 'Test content',
        order_index: 1
      })
      .returning()
      .execute();

    const [quiz] = await db.insert(quizzesTable)
      .values({
        lesson_id: lesson.id,
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit: 30
      })
      .returning()
      .execute();

    // Create quiz questions
    await db.insert(quizQuestionsTable)
      .values([
        {
          quiz_id: quiz.id,
          question_text: 'What is 2 + 2?',
          question_type: 'multiple_choice',
          options: ['3', '4', '5'],
          correct_answer: '4',
          points: 10,
          order_index: 1
        },
        {
          quiz_id: quiz.id,
          question_text: 'Is the sky blue?',
          question_type: 'true_false',
          options: ['true', 'false'],
          correct_answer: 'true',
          points: 5,
          order_index: 2
        }
      ])
      .execute();

    // Create quiz submissions
    const [submission1] = await db.insert(quizSubmissionsTable)
      .values({
        quiz_id: quiz.id,
        student_id: student.id,
        answers: { '1': '4', '2': 'true' },
        score: 15
      })
      .returning()
      .execute();

    const [submission2] = await db.insert(quizSubmissionsTable)
      .values({
        quiz_id: quiz.id,
        student_id: student.id,
        answers: { '1': '3', '2': 'false' },
        score: 0
      })
      .returning()
      .execute();

    // Delete the quiz
    await deleteQuiz(quiz.id);

    // Verify quiz was deleted
    const remainingQuizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, quiz.id))
      .execute();

    expect(remainingQuizzes).toHaveLength(0);

    // Verify questions were deleted
    const remainingQuestions = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, quiz.id))
      .execute();

    expect(remainingQuestions).toHaveLength(0);

    // Verify submissions were deleted
    const remainingSubmissions = await db.select()
      .from(quizSubmissionsTable)
      .where(eq(quizSubmissionsTable.quiz_id, quiz.id))
      .execute();

    expect(remainingSubmissions).toHaveLength(0);
  });

  it('should handle deleting non-existent quiz gracefully', async () => {
    const nonExistentQuizId = 99999;
    
    // Should not throw an error when deleting non-existent quiz
    await expect(deleteQuiz(nonExistentQuizId)).resolves.toBeUndefined();
  });

  it('should not affect other quizzes when deleting a specific quiz', async () => {
    // Create prerequisite data
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const [lesson] = await db.insert(lessonsTable)
      .values({
        course_id: course.id,
        title: 'Test Lesson',
        content: 'Test content',
        order_index: 1
      })
      .returning()
      .execute();

    // Create two quizzes
    const [quiz1] = await db.insert(quizzesTable)
      .values({
        lesson_id: lesson.id,
        title: 'Quiz 1',
        description: 'First quiz',
        time_limit: 30
      })
      .returning()
      .execute();

    const [quiz2] = await db.insert(quizzesTable)
      .values({
        lesson_id: lesson.id,
        title: 'Quiz 2',
        description: 'Second quiz',
        time_limit: 45
      })
      .returning()
      .execute();

    // Add questions to both quizzes
    await db.insert(quizQuestionsTable)
      .values([
        {
          quiz_id: quiz1.id,
          question_text: 'Question for Quiz 1',
          question_type: 'multiple_choice',
          options: ['A', 'B', 'C'],
          correct_answer: 'A',
          points: 10,
          order_index: 1
        },
        {
          quiz_id: quiz2.id,
          question_text: 'Question for Quiz 2',
          question_type: 'true_false',
          options: ['true', 'false'],
          correct_answer: 'true',
          points: 5,
          order_index: 1
        }
      ])
      .execute();

    // Delete only the first quiz
    await deleteQuiz(quiz1.id);

    // Verify first quiz was deleted
    const remainingQuiz1 = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, quiz1.id))
      .execute();

    expect(remainingQuiz1).toHaveLength(0);

    // Verify first quiz's questions were deleted
    const remainingQuestions1 = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, quiz1.id))
      .execute();

    expect(remainingQuestions1).toHaveLength(0);

    // Verify second quiz still exists
    const remainingQuiz2 = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, quiz2.id))
      .execute();

    expect(remainingQuiz2).toHaveLength(1);
    expect(remainingQuiz2[0].title).toBe('Quiz 2');

    // Verify second quiz's questions still exist
    const remainingQuestions2 = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, quiz2.id))
      .execute();

    expect(remainingQuestions2).toHaveLength(1);
  });
});