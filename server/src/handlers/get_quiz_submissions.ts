import { db } from '../db';
import { quizSubmissionsTable, quizzesTable, usersTable } from '../db/schema';
import { type QuizSubmission } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getQuizSubmissionsByQuiz(quizId: number): Promise<QuizSubmission[]> {
  try {
    const results = await db.select()
      .from(quizSubmissionsTable)
      .innerJoin(usersTable, eq(quizSubmissionsTable.student_id, usersTable.id))
      .innerJoin(quizzesTable, eq(quizSubmissionsTable.quiz_id, quizzesTable.id))
      .where(eq(quizSubmissionsTable.quiz_id, quizId))
      .orderBy(desc(quizSubmissionsTable.submitted_at))
      .execute();

    return results.map(result => ({
      id: result.quiz_submissions.id,
      quiz_id: result.quiz_submissions.quiz_id,
      student_id: result.quiz_submissions.student_id,
      answers: result.quiz_submissions.answers,
      score: result.quiz_submissions.score,
      submitted_at: result.quiz_submissions.submitted_at
    }));
  } catch (error) {
    console.error('Failed to get quiz submissions by quiz:', error);
    throw error;
  }
}

export async function getQuizSubmissionsByStudent(studentId: number): Promise<QuizSubmission[]> {
  try {
    const results = await db.select()
      .from(quizSubmissionsTable)
      .innerJoin(quizzesTable, eq(quizSubmissionsTable.quiz_id, quizzesTable.id))
      .where(eq(quizSubmissionsTable.student_id, studentId))
      .orderBy(desc(quizSubmissionsTable.submitted_at))
      .execute();

    return results.map(result => ({
      id: result.quiz_submissions.id,
      quiz_id: result.quiz_submissions.quiz_id,
      student_id: result.quiz_submissions.student_id,
      answers: result.quiz_submissions.answers,
      score: result.quiz_submissions.score,
      submitted_at: result.quiz_submissions.submitted_at
    }));
  } catch (error) {
    console.error('Failed to get quiz submissions by student:', error);
    throw error;
  }
}