import { db } from '../db';
import { quizQuestionsTable, quizzesTable } from '../db/schema';
import { type CreateQuizQuestionInput, type QuizQuestion } from '../schema';
import { eq } from 'drizzle-orm';

export const createQuizQuestion = async (input: CreateQuizQuestionInput): Promise<QuizQuestion> => {
  try {
    // Verify that the quiz exists
    const quiz = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, input.quiz_id))
      .execute();

    if (quiz.length === 0) {
      throw new Error(`Quiz with id ${input.quiz_id} not found`);
    }

    // Validate options JSON for multiple choice questions
    if (input.question_type === 'multiple_choice') {
      if (!input.options) {
        throw new Error('Options are required for multiple choice questions');
      }
      try {
        JSON.parse(input.options);
      } catch (error) {
        throw new Error('Options must be valid JSON for multiple choice questions');
      }
    }

    // Insert quiz question record
    const result = await db.insert(quizQuestionsTable)
      .values({
        quiz_id: input.quiz_id,
        question_text: input.question_text,
        question_type: input.question_type,
        correct_answer: input.correct_answer,
        options: input.options,
        points: input.points.toString(), // Convert number to string for numeric column
        order_index: input.order_index
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const quizQuestion = result[0];
    return {
      ...quizQuestion,
      points: parseFloat(quizQuestion.points) // Convert string back to number
    };
  } catch (error) {
    console.error('Quiz question creation failed:', error);
    throw error;
  }
};