import { supabase } from '@/integrations/supabase/client';

export interface GeneratedLesson {
  objectives: string[];
  entryBehaviour: string;
  materials: string[];
  references: string;
  steps: { teacherActivity: string; studentActivity: string }[];
  evaluation: string;
  assignment: string;
}

export async function generateLessonContent(params: {
  subject: string;
  classLevel: string;
  topic: string;
  subTopic?: string;
  term?: number;
  week?: number;
  resources?: string[];
}): Promise<GeneratedLesson> {
  const { data, error } = await supabase.functions.invoke('generate-lesson', {
    body: params,
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate lesson content');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as GeneratedLesson;
}
