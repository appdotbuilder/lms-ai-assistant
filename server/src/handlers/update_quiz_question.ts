import { db } from '../db';
import { quizQuestionsTable } from '../db/schema';
import { type QuizQuestion } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateQuizQuestion(
    questionId: number,
    updates: {
        question_text?: string;
        question_type?: 'multiple_choice' | 'true_false';
        options?: string[];
        correct_answer?: string;
        points?: number;
        order_index?: number;
    }
): Promise<QuizQuestion> {
    try {
        // Check if question exists
        const existingQuestion = await db.select()
            .from(quizQuestionsTable)
            .where(eq(quizQuestionsTable.id, questionId))
            .execute();

        if (existingQuestion.length === 0) {
            throw new Error(`Quiz question with id ${questionId} not found`);
        }

        // Build update object with only provided fields
        const updateData: any = {};
        
        if (updates.question_text !== undefined) {
            updateData.question_text = updates.question_text;
        }
        if (updates.question_type !== undefined) {
            updateData.question_type = updates.question_type;
        }
        if (updates.options !== undefined) {
            updateData.options = updates.options;
        }
        if (updates.correct_answer !== undefined) {
            updateData.correct_answer = updates.correct_answer;
        }
        if (updates.points !== undefined) {
            updateData.points = updates.points;
        }
        if (updates.order_index !== undefined) {
            updateData.order_index = updates.order_index;
        }

        // Perform update if there are changes
        if (Object.keys(updateData).length === 0) {
            // No updates provided, return existing question
            return existingQuestion[0] as QuizQuestion;
        }

        const result = await db.update(quizQuestionsTable)
            .set(updateData)
            .where(eq(quizQuestionsTable.id, questionId))
            .returning()
            .execute();

        return result[0] as QuizQuestion;
    } catch (error) {
        console.error('Quiz question update failed:', error);
        throw error;
    }
}