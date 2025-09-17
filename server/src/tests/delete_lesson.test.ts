import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  lessonsTable, 
  fileAttachmentsTable, 
  quizzesTable, 
  quizQuestionsTable, 
  quizSubmissionsTable, 
  assignmentsTable, 
  assignmentSubmissionsTable 
} from '../db/schema';
import { deleteLesson } from '../handlers/delete_lesson';
import { eq } from 'drizzle-orm';

describe('deleteLesson', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  async function createTestData() {
    // Create a teacher user
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create a student user
    const student = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'student'
      })
      .returning()
      .execute();

    // Create a course
    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacher[0].id
      })
      .returning()
      .execute();

    // Create a lesson
    const lesson = await db.insert(lessonsTable)
      .values({
        course_id: course[0].id,
        title: 'Test Lesson',
        content: 'Test lesson content',
        order_index: 1
      })
      .returning()
      .execute();

    return {
      teacher: teacher[0],
      student: student[0],
      course: course[0],
      lesson: lesson[0]
    };
  }

  it('should delete lesson with no associated data', async () => {
    const { lesson } = await createTestData();

    await deleteLesson(lesson.id);

    // Verify lesson is deleted
    const deletedLesson = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lesson.id))
      .execute();

    expect(deletedLesson).toHaveLength(0);
  });

  it('should delete lesson with file attachments', async () => {
    const { lesson } = await createTestData();

    // Create file attachments
    const fileAttachments = await db.insert(fileAttachmentsTable)
      .values([
        {
          lesson_id: lesson.id,
          filename: 'test1.pdf',
          file_path: '/uploads/test1.pdf',
          file_type: 'application/pdf',
          file_size: 1024
        },
        {
          lesson_id: lesson.id,
          filename: 'test2.docx',
          file_path: '/uploads/test2.docx',
          file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          file_size: 2048
        }
      ])
      .returning()
      .execute();

    await deleteLesson(lesson.id);

    // Verify lesson is deleted
    const deletedLesson = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lesson.id))
      .execute();
    expect(deletedLesson).toHaveLength(0);

    // Verify file attachments are deleted
    const remainingAttachments = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.lesson_id, lesson.id))
      .execute();
    expect(remainingAttachments).toHaveLength(0);
  });

  it('should delete lesson with quizzes and quiz questions', async () => {
    const { lesson } = await createTestData();

    // Create a quiz
    const quiz = await db.insert(quizzesTable)
      .values({
        lesson_id: lesson.id,
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit: 30
      })
      .returning()
      .execute();

    // Create quiz questions
    const questions = await db.insert(quizQuestionsTable)
      .values([
        {
          quiz_id: quiz[0].id,
          question_text: 'What is 2+2?',
          question_type: 'multiple_choice',
          options: ['2', '3', '4', '5'],
          correct_answer: '4',
          points: 10,
          order_index: 1
        },
        {
          quiz_id: quiz[0].id,
          question_text: 'True or False: The sky is blue',
          question_type: 'true_false',
          options: ['True', 'False'],
          correct_answer: 'True',
          points: 5,
          order_index: 2
        }
      ])
      .returning()
      .execute();

    await deleteLesson(lesson.id);

    // Verify lesson is deleted
    const deletedLesson = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lesson.id))
      .execute();
    expect(deletedLesson).toHaveLength(0);

    // Verify quiz is deleted
    const remainingQuizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.lesson_id, lesson.id))
      .execute();
    expect(remainingQuizzes).toHaveLength(0);

    // Verify quiz questions are deleted
    const remainingQuestions = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, quiz[0].id))
      .execute();
    expect(remainingQuestions).toHaveLength(0);
  });

  it('should delete lesson with assignments and assignment submissions', async () => {
    const { lesson, student } = await createTestData();

    // Create an assignment
    const assignment = await db.insert(assignmentsTable)
      .values({
        lesson_id: lesson.id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31'),
        max_points: 100
      })
      .returning()
      .execute();

    // Create assignment submission
    const submission = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment[0].id,
        student_id: student.id,
        content: 'My assignment submission',
        file_path: '/uploads/submission.pdf'
      })
      .returning()
      .execute();

    await deleteLesson(lesson.id);

    // Verify lesson is deleted
    const deletedLesson = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lesson.id))
      .execute();
    expect(deletedLesson).toHaveLength(0);

    // Verify assignment is deleted
    const remainingAssignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.lesson_id, lesson.id))
      .execute();
    expect(remainingAssignments).toHaveLength(0);

    // Verify assignment submission is deleted
    const remainingSubmissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignment[0].id))
      .execute();
    expect(remainingSubmissions).toHaveLength(0);
  });

  it('should delete lesson with complete quiz workflow (questions and submissions)', async () => {
    const { lesson, student } = await createTestData();

    // Create a quiz
    const quiz = await db.insert(quizzesTable)
      .values({
        lesson_id: lesson.id,
        title: 'Complete Test Quiz',
        description: 'A complete quiz with submissions',
        time_limit: 60
      })
      .returning()
      .execute();

    // Create quiz questions
    const questions = await db.insert(quizQuestionsTable)
      .values([
        {
          quiz_id: quiz[0].id,
          question_text: 'Question 1',
          question_type: 'multiple_choice',
          options: ['A', 'B', 'C'],
          correct_answer: 'A',
          points: 10,
          order_index: 1
        }
      ])
      .returning()
      .execute();

    // Create quiz submission
    const submission = await db.insert(quizSubmissionsTable)
      .values({
        quiz_id: quiz[0].id,
        student_id: student.id,
        answers: { [questions[0].id.toString()]: 'A' },
        score: 10
      })
      .returning()
      .execute();

    await deleteLesson(lesson.id);

    // Verify all related data is deleted
    const deletedLesson = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lesson.id))
      .execute();
    expect(deletedLesson).toHaveLength(0);

    const remainingQuizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.lesson_id, lesson.id))
      .execute();
    expect(remainingQuizzes).toHaveLength(0);

    const remainingQuestions = await db.select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, quiz[0].id))
      .execute();
    expect(remainingQuestions).toHaveLength(0);

    const remainingSubmissions = await db.select()
      .from(quizSubmissionsTable)
      .where(eq(quizSubmissionsTable.quiz_id, quiz[0].id))
      .execute();
    expect(remainingSubmissions).toHaveLength(0);
  });

  it('should delete lesson with all types of associated data', async () => {
    const { lesson, student } = await createTestData();

    // Create file attachment
    await db.insert(fileAttachmentsTable)
      .values({
        lesson_id: lesson.id,
        filename: 'comprehensive.pdf',
        file_path: '/uploads/comprehensive.pdf',
        file_type: 'application/pdf',
        file_size: 1024
      })
      .execute();

    // Create quiz with questions and submissions
    const quiz = await db.insert(quizzesTable)
      .values({
        lesson_id: lesson.id,
        title: 'Comprehensive Quiz',
        description: 'Quiz with everything',
        time_limit: 45
      })
      .returning()
      .execute();

    const question = await db.insert(quizQuestionsTable)
      .values({
        quiz_id: quiz[0].id,
        question_text: 'Test question',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        points: 5,
        order_index: 1
      })
      .returning()
      .execute();

    await db.insert(quizSubmissionsTable)
      .values({
        quiz_id: quiz[0].id,
        student_id: student.id,
        answers: { [question[0].id.toString()]: 'True' },
        score: 5
      })
      .execute();

    // Create assignment with submission
    const assignment = await db.insert(assignmentsTable)
      .values({
        lesson_id: lesson.id,
        title: 'Comprehensive Assignment',
        description: 'Assignment with submission',
        due_date: new Date('2024-12-31'),
        max_points: 50
      })
      .returning()
      .execute();

    await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment[0].id,
        student_id: student.id,
        content: 'Comprehensive submission',
        file_path: '/uploads/assignment.pdf',
        grade: 45,
        feedback: 'Great work!'
      })
      .execute();

    await deleteLesson(lesson.id);

    // Verify everything is deleted
    const deletedLesson = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lesson.id))
      .execute();
    expect(deletedLesson).toHaveLength(0);

    // Verify all related tables are clean
    const remainingAttachments = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.lesson_id, lesson.id))
      .execute();
    expect(remainingAttachments).toHaveLength(0);

    const remainingQuizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.lesson_id, lesson.id))
      .execute();
    expect(remainingQuizzes).toHaveLength(0);

    const remainingAssignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.lesson_id, lesson.id))
      .execute();
    expect(remainingAssignments).toHaveLength(0);
  });

  it('should throw error when lesson does not exist', async () => {
    const nonExistentId = 99999;

    await expect(deleteLesson(nonExistentId)).rejects.toThrow(/Lesson with ID 99999 not found/i);
  });

  it('should not affect other lessons or their data', async () => {
    const { course, teacher, student } = await createTestData();

    // Create two lessons
    const lesson1 = await db.insert(lessonsTable)
      .values({
        course_id: course.id,
        title: 'Lesson 1',
        content: 'Content 1',
        order_index: 1
      })
      .returning()
      .execute();

    const lesson2 = await db.insert(lessonsTable)
      .values({
        course_id: course.id,
        title: 'Lesson 2',
        content: 'Content 2',
        order_index: 2
      })
      .returning()
      .execute();

    // Add data to both lessons
    await db.insert(fileAttachmentsTable)
      .values([
        {
          lesson_id: lesson1[0].id,
          filename: 'file1.pdf',
          file_path: '/uploads/file1.pdf',
          file_type: 'application/pdf',
          file_size: 1024
        },
        {
          lesson_id: lesson2[0].id,
          filename: 'file2.pdf',
          file_path: '/uploads/file2.pdf',
          file_type: 'application/pdf',
          file_size: 2048
        }
      ])
      .execute();

    // Delete only lesson1
    await deleteLesson(lesson1[0].id);

    // Verify lesson1 is deleted
    const deletedLesson = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lesson1[0].id))
      .execute();
    expect(deletedLesson).toHaveLength(0);

    // Verify lesson2 still exists
    const remainingLesson = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lesson2[0].id))
      .execute();
    expect(remainingLesson).toHaveLength(1);
    expect(remainingLesson[0].title).toBe('Lesson 2');

    // Verify lesson2's file attachment still exists
    const remainingAttachments = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.lesson_id, lesson2[0].id))
      .execute();
    expect(remainingAttachments).toHaveLength(1);
    expect(remainingAttachments[0].filename).toBe('file2.pdf');
  });
});