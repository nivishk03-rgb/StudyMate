import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
    console.log('Gemini AI client initialized with GEMINI_API_KEY.');
  } catch (err) {
    console.error('Failed to initialize Google GenAI:', err);
  }
} else {
  console.warn('GEMINI_API_KEY not found in environment.');
}

/**
 * 1. Ask My Notes endpoint
 */
app.post('/api/ai/ask', async (req: Request, res: Response) => {
  try {
    const { query, notesContext, style = 'exam', subjectName = '' } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!aiClient) {
      return res.status(503).json({ error: 'AI Client not initialized' });
    }

    const prompt = `You are StudyMate AI, an elite university academic tutor for college students.
Subject: ${subjectName || 'Current Course'}
Preferred Explanation Style: ${style.toUpperCase()} (options: SIMPLE = clear analogies and plain English; EXAM = structured bullet points, mark rubrics, bold keywords; ACADEMIC = rigorous theory and mathematical precision; DEEP = deep architectural and conceptual walkthrough).

Student's Uploaded Notes Context:
"""
${(notesContext || 'No direct notes text provided').slice(0, 20000)}
"""

Student's Question: "${query}"

INSTRUCTIONS:
1. Ground your response firmly in the student's uploaded notes if the context is provided.
2. If the answer comes from their notes, start with "### 📌 Based on your uploaded notes:" and cite key sections/topics.
3. If their notes only partially cover the question, answer what is present, then augment with accurate university-level knowledge clearly labeled "### 💡 Key Curriculum Context:".
4. Format with clean, readable Markdown: bold critical definitions, use bullet points, format code/math expressions clearly, and include an "Exam Tip" or "Expected Mark Weightage" if relevant.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({
      answer: response.text || 'Unable to generate response.',
      sources: ['Uploaded Study Materials', 'Curriculum Syllabus Reference'],
    });
  } catch (error: any) {
    console.error('Error in /api/ai/ask:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * 2. Generate Summary endpoint
 */
app.post('/api/ai/summary', async (req: Request, res: Response) => {
  try {
    const { content, mode = 'standard', title = '' } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!aiClient) {
      return res.status(503).json({ error: 'AI Client not initialized' });
    }

    const prompt = `You are StudyMate AI. Create a high-yield academic summary of the student's uploaded study material.
Document Title: "${title}"
Summary Mode: ${mode.toUpperCase()}
- QUICK: Ultra-fast 3-minute executive revision summary for the night before an exam.
- STANDARD: Balanced conceptual breakdown with definitions, key principles, and exam points.
- DETAILED: Comprehensive university review covering theoretical foundations, algorithms/theorems, formulas, and common exam questions.

Material Text:
"""
${content.slice(0, 20000)}
"""

Return ONLY a valid JSON object matching this schema:
{
  "overview": "Clear 2-3 paragraph summary of the material",
  "keyConcepts": ["Concept 1", "Concept 2", "Concept 3", "Concept 4"],
  "importantPoints": ["Crucial exam point 1", "Crucial exam point 2", "Crucial exam point 3"],
  "formulasOrDiagrams": ["Formula 1 or essential diagram description", "Formula 2"],
  "quickRevisionNotes": ["High-yield takeaway 1", "High-yield takeaway 2"]
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/summary:', error);
    res.status(500).json({ error: error.message || 'Failed to generate summary' });
  }
});

/**
 * 3. Analyze Exam Priority endpoint
 */
app.post('/api/ai/priority', async (req: Request, res: Response) => {
  try {
    const { notesContent, subjectName = 'Subject' } = req.body;
    if (!notesContent) {
      return res.status(400).json({ error: 'Notes content is required' });
    }

    if (!aiClient) {
      return res.status(503).json({ error: 'AI Client not initialized' });
    }

    const prompt = `You are StudyMate AI's Exam Probability Engine. Analyze the student's uploaded study notes/syllabus for "${subjectName}".
Identify the most critical examination topics, their likelihood in end-semester university exams, expected mark allocation (10-mark, 5-mark, or 2-mark), priority ranking, and potential questions.

Uploaded Material:
"""
${notesContent.slice(0, 20000)}
"""

Return ONLY a valid JSON object with key "topics":
{
  "topics": [
    {
      "topic": "Name of topic extracted from material",
      "unit": "Unit/Module name or Chapter",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "expectedMarks": 10,
      "frequency": "Asked in 85% of previous university exams",
      "rationale": "Why this is a favorite exam topic (e.g. requires state diagram, proof, or numerical)",
      "potentialQuestions": [
        "Explain X with a neat diagram and step-by-step mechanism (10 marks)",
        "State differences between A and B (5 marks)"
      ]
    }
  ]
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{"topics": []}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/priority:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze exam priority' });
  }
});

/**
 * 4. Generate Questions endpoint
 */
app.post('/api/ai/questions', async (req: Request, res: Response) => {
  try {
    const { notesContent, topic = 'General', count = 5, type = 'mcq', difficulty = 'medium' } = req.body;

    if (!aiClient) {
      return res.status(503).json({ error: 'AI Client not initialized' });
    }

    const prompt = `You are StudyMate AI. Generate university-level exam practice questions strictly based on the student's uploaded material.
Topic: "${topic}"
Question Type: "${type}" (mcq = multiple choice, 2mark = short answer, 5mark = medium explanatory, 10mark = comprehensive descriptive with rubrics, case_study = scenario based).
Difficulty: "${difficulty}"
Number of questions: ${count}

Uploaded Material Reference:
"""
${(notesContent || '').slice(0, 20000)}
"""

Return ONLY a valid JSON array of question objects:
[
  {
    "id": "q1",
    "question": "The question text",
    "type": "${type}",
    "marks": ${type === '10mark' ? 10 : type === '5mark' ? 5 : type === '2mark' ? 2 : 1},
    "options": ["Option A", "Option B", "Option C", "Option D"], // required if mcq, omit if not mcq
    "correctAnswer": "The correct option or expected model answer",
    "explanation": "Why this is correct, referencing the uploaded principles",
    "markingCriteria": ["1 mark for definition", "2 marks for diagram", "2 marks for working"] // optional rubrics
  }
]`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '[]');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/questions:', error);
    res.status(500).json({ error: error.message || 'Failed to generate questions' });
  }
});

/**
 * 5. Generate Flashcards endpoint
 */
app.post('/api/ai/flashcards', async (req: Request, res: Response) => {
  try {
    const { notesContent, subjectName = 'General', count = 6 } = req.body;

    if (!aiClient) {
      return res.status(503).json({ error: 'AI Client not initialized' });
    }

    const prompt = `You are StudyMate AI. Create ${count} high-yield active recall flashcards from the student's uploaded study material for "${subjectName}".
Front of card should be a crisp concept, question, or theorem name.
Back of card should be an accurate, memorable definition, formula, or breakdown (under 50 words).

Material:
"""
${(notesContent || '').slice(0, 20000)}
"""

Return ONLY a valid JSON array:
[
  {
    "front": "What is ...?",
    "back": "Clear, concise definition and key rule.",
    "topic": "Topic Name",
    "difficulty": "medium"
  }
]`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '[]');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/flashcards:', error);
    res.status(500).json({ error: error.message || 'Failed to generate flashcards' });
  }
});

/**
 * 6. Generate Exam Answer endpoint
 */
app.post('/api/ai/exam-answer', async (req: Request, res: Response) => {
  try {
    const { question, marks = 10, notesContent = '', style = 'exam' } = req.body;

    if (!aiClient) {
      return res.status(503).json({ error: 'AI Client not initialized' });
    }

    const prompt = `You are StudyMate AI's Exam Answer Architect.
Write an authentic, university-standard model answer designed to secure full marks in an end-semester exam.
Question: "${question}"
Allocated Marks: ${marks} Marks
Style: ${style.toUpperCase()}

Uploaded Notes Context:
"""
${notesContent.slice(0, 20000)}
"""

STRUCTURE YOUR ANSWER AS FOLLOWS:
1. **Header**: State the Question and Marks Allocation.
2. **1. Definition & Core Thesis** (Crisp 2-3 lines).
3. **2. Architectural / System Diagram Description** (Include ASCII block diagram or clear structural breakdown).
4. **3. Key Working Mechanism & Step-by-Step Points** (Numbered with bold keywords).
5. **4. Mathematical Formulation / Invariants / Proofs** (Formulas, equations, or edge cases).
6. **5. Advantages & Trade-Offs / Comparison Table** (If applicable).
7. **6. Summary / Conclusion & Evaluator Marking Rubric Breakdown** (Show where the ${marks} marks are awarded).`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({ answer: response.text || 'Unable to generate answer.' });
  } catch (error: any) {
    console.error('Error in /api/ai/exam-answer:', error);
    res.status(500).json({ error: error.message || 'Failed to generate exam answer' });
  }
});

/**
 * 7. AI Material Analyzer (Extracts rich topics, concepts, summary)
 */
app.post('/api/ai/analyze-material', async (req: Request, res: Response) => {
  try {
    const { text, fileName } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!aiClient) {
      return res.status(503).json({ error: 'AI Client not initialized' });
    }

    const prompt = `Analyze this uploaded college study material document: "${fileName}".
Extract:
1. suggestedSubject: Name of the academic subject/course (e.g. "Operating Systems", "Microbiology", "Macroeconomics", "Machine Learning", etc.)
2. extractedTopics: Array of 4 to 8 major syllabus topics found in the material.
3. keyConcepts: Array of 6 to 10 crucial terminology, algorithms, formulas, or acronyms.
4. summary: A high quality 2-paragraph executive overview of what this material teaches and what exams will test.

Material Sample:
"""
${text.slice(0, 15000)}
"""

Return ONLY a valid JSON object:
{
  "suggestedSubject": "Subject Name",
  "extractedTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "keyConcepts": ["Concept 1", "Concept 2", "Concept 3"],
  "summary": "Executive summary..."
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/analyze-material:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze material' });
  }
});

// Vite middleware in dev / Static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`StudyMate AI Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start StudyMate server:', err);
});
