import { db } from '../db';
import { quizzesTable, quizQuestionsTable, quizSubmissionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteQuiz = async (quizId: number): Promise<void> => {
  try {
    // Delete in proper order to respect foreign key constraints:
    // 1. First delete quiz submissions
    // 2. Then delete quiz questions  
    // 3. Finally delete the quiz itself
    
    await db.delete(quizSubmissionsTable)
      .where(eq(quizSubmissionsTable.quiz_id, quizId))
      .execute();
    
    await db.delete(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, quizId))
      .execute();
    
    await db.delete(quizzesTable)
      .where(eq(quizzesTable.id, quizId))
      .execute();
  } catch (error) {
    console.error('Quiz deletion failed:', error);
    throw error;
  }
};