import { db } from '../db';
import { contentTable } from '../db/schema';
import { type Content } from '../schema';
import { eq } from 'drizzle-orm';

export const getContentById = async (id: number): Promise<Content | null> => {
  try {
    // Query content by ID
    const results = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, id))
      .execute();

    // Return null if content not found
    if (results.length === 0) {
      return null;
    }

    const content = results[0];

    // Return content with proper type conversion
    return {
      ...content,
      // No numeric conversions needed - all fields are already correct types
    };
  } catch (error) {
    console.error('Content fetch failed:', error);
    throw error;
  }
};