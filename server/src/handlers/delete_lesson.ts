import { db } from '../db';
import { 
  lessonsTable, 
  fileAttachmentsTable, 
  quizzesTable, 
  quizQuestionsTable, 
  quizSubmissionsTable, 
  assignmentsTable, 
  assignmentSubmissionsTable 
} from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteLesson(lessonId: number): Promise<void> {
  try {
    // Check if lesson exists first
    const lesson = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lessonId))
      .execute();

    if (lesson.length === 0) {
      throw new Error(`Lesson with ID ${lessonId} not found`);
    }

    // Delete all related data in proper order (respecting foreign key constraints)
    
    // 1. Delete quiz submissions (depends on quizzes)
    const quizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.lesson_id, lessonId))
      .execute();

    for (const quiz of quizzes) {
      await db.delete(quizSubmissionsTable)
        .where(eq(quizSubmissionsTable.quiz_id, quiz.id))
        .execute();
    }

    // 2. Delete quiz questions (depends on quizzes)
    for (const quiz of quizzes) {
      await db.delete(quizQuestionsTable)
        .where(eq(quizQuestionsTable.quiz_id, quiz.id))
        .execute();
    }

    // 3. Delete quizzes
    await db.delete(quizzesTable)
      .where(eq(quizzesTable.lesson_id, lessonId))
      .execute();

    // 4. Delete assignment submissions (depends on assignments)
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.lesson_id, lessonId))
      .execute();

    for (const assignment of assignments) {
      await db.delete(assignmentSubmissionsTable)
        .where(eq(assignmentSubmissionsTable.assignment_id, assignment.id))
        .execute();
    }

    // 5. Delete assignments
    await db.delete(assignmentsTable)
      .where(eq(assignmentsTable.lesson_id, lessonId))
      .execute();

    // 6. Delete file attachments
    await db.delete(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.lesson_id, lessonId))
      .execute();

    // 7. Finally, delete the lesson itself
    await db.delete(lessonsTable)
      .where(eq(lessonsTable.id, lessonId))
      .execute();

  } catch (error) {
    console.error('Lesson deletion failed:', error);
    throw error;
  }
}