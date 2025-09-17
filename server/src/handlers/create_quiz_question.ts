import { db } from '../db';
import { quizQuestionsTable } from '../db/schema';
import { type CreateQuizQuestionInput, type QuizQuestion } from '../schema';

export const createQuizQuestion = async (input: CreateQuizQuestionInput): Promise<QuizQuestion> => {
  try {
    // Insert quiz question record
    const result = await db.insert(quizQuestionsTable)
      .values({
        quiz_id: input.quiz_id,
        question_text: input.question_text,
        question_type: input.question_type,
        options: input.options,
        correct_answer: input.correct_answer,
        points: input.points,
        order_index: input.order_index
      })
      .returning()
      .execute();

    // Ensure proper typing for the question_type field
    const question = result[0];
    return {
      ...question,
      question_type: question.question_type as 'multiple_choice' | 'true_false'
    };
  } catch (error) {
    console.error('Quiz question creation failed:', error);
    throw error;
  }
};