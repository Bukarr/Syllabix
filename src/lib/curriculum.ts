// Nigerian curriculum data - NERDC Basic Education & Senior Secondary
export const SCHOOL_LEVELS = ['Primary', 'Junior Secondary', 'Senior Secondary'] as const;

export const CLASSES: Record<string, string[]> = {
  'Primary': ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'],
  'Junior Secondary': ['JSS 1', 'JSS 2', 'JSS 3'],
  'Senior Secondary': ['SS 1', 'SS 2', 'SS 3'],
};

export const SUBJECTS: Record<string, string[]> = {
  'Primary': [
    'English Language', 'Mathematics', 'Basic Science', 'Basic Technology',
    'Social Studies', 'Civic Education', 'Cultural & Creative Arts',
    'Agricultural Science', 'Computer Studies', 'Christian Religious Studies',
    'Islamic Religious Studies', 'Physical & Health Education', 'Yoruba', 'Igbo', 'Hausa',
  ],
  'Junior Secondary': [
    'English Language', 'Mathematics', 'Basic Science', 'Basic Technology',
    'Social Studies', 'Civic Education', 'Cultural & Creative Arts',
    'Agricultural Science', 'Business Studies', 'Computer Studies',
    'Christian Religious Studies', 'Islamic Religious Studies',
    'Physical & Health Education', 'French', 'Home Economics',
  ],
  'Senior Secondary': [
    'English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
    'Further Mathematics', 'Economics', 'Government', 'Literature in English',
    'Commerce', 'Accounting', 'Geography', 'Agricultural Science',
    'Computer Science', 'Civic Education', 'Christian Religious Studies',
    'Islamic Religious Studies', 'Technical Drawing', 'Food & Nutrition',
  ],
};

export const TERMS = [1, 2, 3] as const;
export const WEEKS = Array.from({ length: 13 }, (_, i) => i + 1);

export const GEOPOLITICAL_ZONES = [
  'North-Central', 'North-East', 'North-West',
  'South-East', 'South-South', 'South-West',
] as const;

export const STATES: Record<string, string[]> = {
  'North-Central': ['Benue', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Plateau', 'FCT Abuja'],
  'North-East': ['Adamawa', 'Bauchi', 'Borno', 'Gombe', 'Taraba', 'Yobe'],
  'North-West': ['Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Sokoto', 'Zamfara'],
  'South-East': ['Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo'],
  'South-South': ['Akwa Ibom', 'Bayelsa', 'Cross River', 'Delta', 'Edo', 'Rivers'],
  'South-West': ['Ekiti', 'Lagos', 'Ogun', 'Ondo', 'Osun', 'Oyo'],
};

export const CLASSROOM_RESOURCES = [
  'Chalkboard only',
  'Whiteboard & markers',
  'Projector available',
  'Printed textbooks',
  'Exercise books provided',
  'Charts & posters',
  'Science lab access',
  'Computer lab access',
  'Limited electricity',
  'No electricity',
  'Internet access',
  'Library access',
] as const;

// Sample curriculum topics for demonstration
export const SAMPLE_TOPICS: Record<string, Record<string, { topic: string; subTopic: string }[]>> = {
  'Mathematics': {
    'Primary 1': [
      { topic: 'Whole Numbers', subTopic: 'Counting 1-20' },
      { topic: 'Whole Numbers', subTopic: 'Number recognition 1-50' },
      { topic: 'Addition', subTopic: 'Addition of 1-digit numbers' },
      { topic: 'Subtraction', subTopic: 'Subtraction within 20' },
      { topic: 'Shapes', subTopic: 'Identifying basic shapes' },
      { topic: 'Measurement', subTopic: 'Comparing lengths' },
      { topic: 'Money', subTopic: 'Identifying Nigerian coins' },
      { topic: 'Fractions', subTopic: 'Half and quarter' },
      { topic: 'Patterns', subTopic: 'Simple number patterns' },
      { topic: 'Time', subTopic: 'Days of the week' },
      { topic: 'Data', subTopic: 'Simple picture graphs' },
      { topic: 'Revision', subTopic: 'Term revision' },
      { topic: 'Examination', subTopic: 'End of term assessment' },
    ],
  },
  'English Language': {
    'Primary 1': [
      { topic: 'Phonics', subTopic: 'Letter sounds a-m' },
      { topic: 'Phonics', subTopic: 'Letter sounds n-z' },
      { topic: 'Reading', subTopic: 'Simple three-letter words' },
      { topic: 'Writing', subTopic: 'Letter formation' },
      { topic: 'Oral English', subTopic: 'Greetings and introductions' },
      { topic: 'Comprehension', subTopic: 'Listening comprehension' },
      { topic: 'Grammar', subTopic: 'Naming words (nouns)' },
      { topic: 'Vocabulary', subTopic: 'Words about family' },
      { topic: 'Composition', subTopic: 'Picture description' },
      { topic: 'Poetry', subTopic: 'Simple rhymes and poems' },
      { topic: 'Reading', subTopic: 'Reading simple sentences' },
      { topic: 'Revision', subTopic: 'Term revision' },
      { topic: 'Examination', subTopic: 'End of term assessment' },
    ],
  },
};
