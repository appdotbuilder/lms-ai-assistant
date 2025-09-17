import { db } from '../db';
import { coursesTable, lessonsTable, quizzesTable, assignmentsTable, quizQuestionsTable, quizSubmissionsTable, assignmentSubmissionsTable, fileAttachmentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteCourse(courseId: number): Promise<void> {
  try {
    // First, verify the course exists
    const course = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();
    
    if (course.length === 0) {
      throw new Error(`Course with id ${courseId} not found`);
    }

    // Get all lessons for this course
    const lessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.course_id, courseId))
      .execute();

    const lessonIds = lessons.map(lesson => lesson.id);

    if (lessonIds.length > 0) {
      // Get all quizzes for these lessons
      const quizzes = await db.select()
        .from(quizzesTable)
        .where(eq(quizzesTable.lesson_id, lessonIds[0])) // We'll need to handle multiple lesson IDs
        .execute();

      // For multiple lesson IDs, we need to get quizzes for each lesson
      let allQuizzes: any[] = [];
      for (const lessonId of lessonIds) {
        const lessonQuizzes = await db.select()
          .from(quizzesTable)
          .where(eq(quizzesTable.lesson_id, lessonId))
          .execute();
        allQuizzes = [...allQuizzes, ...lessonQuizzes];
      }

      const quizIds = allQuizzes.map(quiz => quiz.id);

      // Delete in correct order to maintain referential integrity
      // 1. Delete quiz submissions
      if (quizIds.length > 0) {
        for (const quizId of quizIds) {
          await db.delete(quizSubmissionsTable)
            .where(eq(quizSubmissionsTable.quiz_id, quizId))
            .execute();
        }

        // 2. Delete quiz questions
        for (const quizId of quizIds) {
          await db.delete(quizQuestionsTable)
            .where(eq(quizQuestionsTable.quiz_id, quizId))
            .execute();
        }
      }

      // 3. Delete assignment submissions for all assignments in these lessons
      for (const lessonId of lessonIds) {
        const assignments = await db.select()
          .from(assignmentsTable)
          .where(eq(assignmentsTable.lesson_id, lessonId))
          .execute();

        for (const assignment of assignments) {
          await db.delete(assignmentSubmissionsTable)
            .where(eq(assignmentSubmissionsTable.assignment_id, assignment.id))
            .execute();
        }
      }

      // 4. Delete file attachments
      for (const lessonId of lessonIds) {
        await db.delete(fileAttachmentsTable)
          .where(eq(fileAttachmentsTable.lesson_id, lessonId))
          .execute();
      }

      // 5. Delete quizzes
      for (const lessonId of lessonIds) {
        await db.delete(quizzesTable)
          .where(eq(quizzesTable.lesson_id, lessonId))
          .execute();
      }

      // 6. Delete assignments
      for (const lessonId of lessonIds) {
        await db.delete(assignmentsTable)
          .where(eq(assignmentsTable.lesson_id, lessonId))
          .execute();
      }

      // 7. Delete lessons
      await db.delete(lessonsTable)
        .where(eq(lessonsTable.course_id, courseId))
        .execute();
    }

    // 8. Finally, delete the course
    await db.delete(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();
  } catch (error) {
    console.error('Course deletion failed:', error);
    throw error;
  }
}