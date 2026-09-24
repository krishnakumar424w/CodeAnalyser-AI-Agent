import { GoogleGenAI, Type } from '@google/genai';
import type {
  CodeAnalysisOutput,
  DifficultyCode,
  DifficultyLabel,
  AlgorithmicPattern,
  ToolExecutionRecord,
} from '../types.js';
import { parseCode, type CodeParserResult } from './tools/codeParser.js';
import { classifyAlgorithmicPattern, type PatternClassificationResult } from './tools/patternClassifier.js';
import { buildSystemPrompt, buildUserPrompt } from './tools/promptBuilder.js';
import { executeGroqAnalysis } from './tools/groqClient.js';

export function detectLanguage(code: string, explicitLang?: string, filename?: string): string {
  if (explicitLang && explicitLang !== 'Auto-Detect') {
    return explicitLang;
  }
  if (filename) {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    const map: Record<string, string> = {
      '.py': 'Python',
      '.cpp': 'C++',
      '.cc': 'C++',
      '.cxx': 'C++',
      '.hpp': 'C++',
      '.h': 'C++',
      '.java': 'Java',
      '.go': 'Go',
      '.rs': 'Rust',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
    };
    if (map[ext]) return map[ext];
  }

  // Heuristics
  if (/#include\s*<|std::|cout\s*<<|vector\s*</.test(code)) return 'C++';
  if (/public\s+class\s+|System\.out\.print|int\[\]|String\[\]/.test(code)) return 'Java';
  if (/def\s+\w+\s*\(|import\s+\w+|elif\s+|print\(/.test(code)) return 'Python';
  if (/fn\s+main|let\s+mut|impl\s+/.test(code)) return 'Rust';
  if (/func\s+\w+\(|package\s+main/.test(code)) return 'Go';
  if (/interface\s+\w+|:\s*string|:\s*number/.test(code)) return 'TypeScript';
  return 'Python';
}

/**
 * Normalizes raw LLM output and enforces user classification rules:
 * - Loop -> Easy (a)
 * - Backtrack / Branching recursion -> Medium (b)
 * - Dynamic Programming -> Hard (c)
 */
export function normalizeAnalysis(
  raw: any,
  fallbackLanguage: string,
  patternResult: PatternClassificationResult,
  parserResult?: CodeParserResult
): CodeAnalysisOutput {
  // Respect pattern detection if LLM drifted, or prioritize user rules
  let diff = String(raw?.difficulty || '').trim().toLowerCase();
  if (diff === 'easy' || diff === 'e' || diff === '1') diff = 'a';
  else if (diff === 'medium' || diff === 'med' || diff === 'm' || diff === '2') diff = 'b';
  else if (diff === 'hard' || diff === 'h' || diff === '3') diff = 'c';

  // If the user's explicit patterns (loop, backtrack, dp) are detected, enforce them
  if (patternResult.detected_pattern === 'loop') {
    diff = 'a';
  } else if (patternResult.detected_pattern === 'backtrack') {
    diff = 'b';
  } else if (patternResult.detected_pattern === 'dp') {
    diff = 'c';
  } else if (diff !== 'a' && diff !== 'b' && diff !== 'c') {
    diff = patternResult.difficulty;
  }

  const diffMap: Record<DifficultyCode, DifficultyLabel> = {
    a: 'Easy',
    b: 'Medium',
    c: 'Hard',
  };

  const difficulty = diff as DifficultyCode;
  const difficultyLabel = diffMap[difficulty];

  const keyObservations = Array.isArray(raw?.key_observations)
    ? raw.key_observations.map(String)
    : raw?.key_observations
    ? [String(raw.key_observations)]
    : [];

  const potentialOptimizations = Array.isArray(raw?.potential_optimizations)
    ? raw.potential_optimizations.map(String)
    : raw?.potential_optimizations
    ? [String(raw.potential_optimizations)]
    : [];

  const pattern: AlgorithmicPattern =
    raw?.detected_pattern && ['loop', 'backtrack', 'dp', 'hash_map', 'two_pointers', 'binary_search', 'other'].includes(raw.detected_pattern)
      ? raw.detected_pattern
      : patternResult.detected_pattern;

  const question = raw?.question || parserResult?.inferred_question || 'Algorithmic Problem';

  return {
    question,
    language: raw?.language || fallbackLanguage || 'Python',
    approach: raw?.approach || (
      pattern === 'loop'
        ? 'Iterative Loop Implementation'
        : pattern === 'backtrack'
        ? 'Backtracking / Recursive Branch Exploration'
        : pattern === 'dp'
        ? 'Dynamic Programming (Tabulation / Memoization)'
        : 'Algorithmic implementation'
    ),
    detected_pattern: pattern,
    classification_rule: raw?.classification_rule || patternResult.rule_applied,
    time_complexity: raw?.time_complexity || (
      pattern === 'loop' ? 'O(N)' : pattern === 'backtrack' ? 'O(2^N)' : pattern === 'dp' ? 'O(N)' : 'O(N)'
    ),
    space_complexity: raw?.space_complexity || (
      pattern === 'loop' ? 'O(1)' : pattern === 'backtrack' ? 'O(N)' : pattern === 'dp' ? 'O(N)' : 'O(1)'
    ),
    complexity_breakdown: raw?.complexity_breakdown || patternResult.rationale,
    difficulty,
    difficulty_label: difficultyLabel,
    key_observations: keyObservations.length > 0 ? keyObservations : [
      `Implementation utilizes the ${pattern} algorithmic strategy.`,
      `Classified as ${difficultyLabel} (Grade ${difficulty}) in accordance with the pattern complexity taxonomy.`,
    ],
    potential_optimizations: potentialOptimizations.length > 0 ? potentialOptimizations : [
      pattern === 'backtrack'
        ? 'Apply memoization or convert to iterative DP to eliminate exponential recursion overhead.'
        : pattern === 'dp'
        ? 'Optimize auxiliary space by storing only the previous two states instead of a full array.'
        : 'Loop execution is space-optimal; evaluate compiler vectorization flags for large inputs.',
    ],
  };
}

/**
 * Deterministic Mock Generator for offline/zero-quota scenarios
 */
export function getDeterministicMock(
  code: string,
  language: string,
  parserResult: CodeParserResult,
  patternResult: PatternClassificationResult
): CodeAnalysisOutput {
  const lower = code.toLowerCase();
  const question = parserResult?.inferred_question || 'Algorithmic Problem';

  // Fibonacci Cases
  if (lower.includes('fib')) {
    if (patternResult.detected_pattern === 'loop') {
      return {
        question: 'Fibonacci Series',
        language,
        approach: 'Iterative Loop Fibonacci (Sequential Accumulation)',
        detected_pattern: 'loop',
        classification_rule: 'Iterative Loop Rule -> Classified as Easy (Grade a)',
        time_complexity: 'O(N)',
        space_complexity: 'O(1)',
        complexity_breakdown: 'A single loop iterates from 2 up to N, maintaining only two scalar variables for the preceding terms (a and b). Time is linear in N, and auxiliary space is constant O(1).',
        difficulty: 'a',
        difficulty_label: 'Easy',
        key_observations: [
          'Computes the N-th Fibonacci number sequentially without function call stack overhead.',
          'Consumes strictly constant auxiliary memory O(1) by updating two running registers.',
        ],
        potential_optimizations: [
          'Matrix exponentiation achieves O(log N) time complexity for astronomical values of N.',
        ],
        provider_used: 'Mock Provider (Offline Deterministic)',
        is_mock: true,
      };
    }

    if (patternResult.detected_pattern === 'backtrack') {
      return {
        question: 'Fibonacci Series',
        language,
        approach: 'Recursive Backtracking Fibonacci (Branching Decision Tree)',
        detected_pattern: 'backtrack',
        classification_rule: 'Backtracking / Branching Recursion Rule -> Classified as Medium (Grade b)',
        time_complexity: 'O(2^N)',
        space_complexity: 'O(N)',
        complexity_breakdown: 'Each function call branches into two sub-calls (fib(n-1) + fib(n-2)), forming a binary recursion tree of depth N with ~2^N operations. Recursion call stack requires O(N) auxiliary space.',
        difficulty: 'b',
        difficulty_label: 'Medium',
        key_observations: [
          'Exponential time complexity O(2^N) due to overlapping repeated recalculation of identical subproblems.',
          'Call stack memory depth scales linearly O(N) with input value N.',
        ],
        potential_optimizations: [
          'Add a memoization dictionary/array to eliminate repeated evaluations and reduce time to O(N).',
          'Convert to iterative loop to achieve O(1) space.',
        ],
        provider_used: 'Mock Provider (Offline Deterministic)',
        is_mock: true,
      };
    }

    if (patternResult.detected_pattern === 'dp') {
      return {
        question: 'Fibonacci Series',
        language,
        approach: 'Dynamic Programming Fibonacci (Tabulation / Memoization)',
        detected_pattern: 'dp',
        classification_rule: 'Dynamic Programming (DP) Rule -> Classified as Hard (Grade c)',
        time_complexity: 'O(N)',
        space_complexity: 'O(N)',
        complexity_breakdown: 'Constructs an explicit DP table/array of size N+1. Solves overlapping subproblems systematically using state transition dp[i] = dp[i-1] + dp[i-2], evaluating each state exactly once.',
        difficulty: 'c',
        difficulty_label: 'Hard',
        key_observations: [
          'Eliminates exponential call tree by caching subproblem solutions in an indexed DP array.',
          'Trades O(N) memory table space for deterministic linear execution time.',
        ],
        potential_optimizations: [
          'State compression: only the previous two DP states dp[i-1] and dp[i-2] are needed, reducing space from O(N) to O(1).',
        ],
        provider_used: 'Mock Provider (Offline Deterministic)',
        is_mock: true,
      };
    }
  }

  // Two Sum
  if (lower.includes('two_sum') || (lower.includes('lookup') && lower.includes('target -'))) {
    return {
      question: 'Two Sum',
      language,
      approach: 'Hash Map Lookup (Single-Pass Complement Search)',
      detected_pattern: 'hash_map',
      classification_rule: 'Hash Map Auxiliary Lookup Rule -> Classified as Easy (Grade a)',
      time_complexity: 'O(N)',
      space_complexity: 'O(N)',
      complexity_breakdown: 'A single linear scan through the array performs O(1) average hash table lookups for each element\'s target complement.',
      difficulty: 'a',
      difficulty_label: 'Easy',
      key_observations: [
        'Trades linear auxiliary space O(N) to reduce search complexity from quadratic O(N^2) to linear time O(N).',
        'Correctly avoids using the same element index twice by storing elements only as they are visited.',
      ],
      potential_optimizations: [
        'If the input array is pre-sorted, a two-pointer approach achieves O(1) space complexity without hash table overhead.',
      ],
      provider_used: 'Mock Provider (Offline Deterministic)',
      is_mock: true,
    };
  }

  // LRU Cache
  if (lower.includes('lrucache') || lower.includes('lru_cache') || lower.includes('splice')) {
    return {
      question: 'LRU Cache',
      language,
      approach: 'Doubly Linked List + Hash Map (Constant-Time Eviction Policy)',
      detected_pattern: 'hash_map',
      classification_rule: 'Complex Data Structure Coordination Rule -> Classified as Medium (Grade b)',
      time_complexity: 'O(1) for both get() and put()',
      space_complexity: 'O(Capacity)',
      complexity_breakdown: 'Hash map provides O(1) pointer lookup into the doubly linked list, while linked list node splicing enables O(1) deletion and insertion at the MRU head.',
      difficulty: 'b',
      difficulty_label: 'Medium',
      key_observations: [
        'Maintains strict LRU ordering by promoting accessed items to the head on both cache hit and update operations.',
        'Evicts the tail element in O(1) when capacity is exceeded.',
      ],
      potential_optimizations: [
        'Thread safety can be introduced with read-write locks or concurrent skip lists.',
      ],
      provider_used: 'Mock Provider (Offline Deterministic)',
      is_mock: true,
    };
  }

  // Trapping Rain Water
  if (lower.includes('trappingrainwater') || lower.includes('trap(') || lower.includes('leftmax')) {
    return {
      question: 'Trapping Rain Water',
      language,
      approach: 'Two-Pointer Converging Boundary Scan',
      detected_pattern: 'two_pointers',
      classification_rule: 'Inward Boundary Convergence Rule -> Classified as Hard (Grade c)',
      time_complexity: 'O(N)',
      space_complexity: 'O(1)',
      complexity_breakdown: 'Left and right pointers advance inward in a single pass O(N) with constant auxiliary variables tracking running boundary heights.',
      difficulty: 'c',
      difficulty_label: 'Hard',
      key_observations: [
        'Water trapped at any column depends strictly on min(leftMax, rightMax) - currentHeight.',
        'By always advancing the pointer with the smaller boundary height, the algorithm guarantees the opposing boundary is sufficient to trap water.',
      ],
      potential_optimizations: [
        'Already space-optimal at O(1).',
      ],
      provider_used: 'Mock Provider (Offline Deterministic)',
      is_mock: true,
    };
  }

  // Fallback using patternResult
  return {
    question,
    language,
    approach: patternResult.rationale,
    detected_pattern: patternResult.detected_pattern,
    classification_rule: patternResult.rule_applied,
    time_complexity: patternResult.detected_pattern === 'loop' ? 'O(N)' : patternResult.detected_pattern === 'backtrack' ? 'O(2^N)' : 'O(N)',
    space_complexity: patternResult.detected_pattern === 'loop' ? 'O(1)' : 'O(N)',
    complexity_breakdown: patternResult.rationale,
    difficulty: patternResult.difficulty,
    difficulty_label: patternResult.difficulty_label,
    key_observations: [
      `Pattern detected as ${patternResult.detected_pattern}.`,
      `Classified into grade ${patternResult.difficulty} (${patternResult.difficulty_label}) per algorithmic pattern rule.`,
    ],
    potential_optimizations: [
      'Evaluate state compression or iterative loop constructs for optimal time-space trade-off.',
    ],
    provider_used: 'Mock Provider (Offline Deterministic)',
    is_mock: true,
  };
}

/**
 * Main Agent Orchestrator:
 * Executes Tool 1: CodeParserTool
 * Executes Tool 2: PatternClassifierTool
 * Executes Tool 3: PromptBuilderTool
 * Executes Tool 4: GroqLLMTool (or Gemini fallback)
 * Executes Tool 5: Result Normalizer and Rule Enforcer
 */
export async function runCodeAnalysisAgent(params: {
  code: string;
  question?: string;
  language?: string;
  provider?: 'auto' | 'groq' | 'gemini' | 'mock';
  apiKey?: string;
  model?: string;
}): Promise<CodeAnalysisOutput> {
  const { code, question: explicitQuestion, language: rawLang, provider = 'auto', apiKey, model } = params;
  const detectedLang = detectLanguage(code, rawLang);
  const toolsExecuted: ToolExecutionRecord[] = [];

  // --- Step 1: CodeParserTool ---
  const parserResult: CodeParserResult = parseCode(code, detectedLang, explicitQuestion);
  toolsExecuted.push({
    tool_name: 'CodeParserTool',
    action: 'syntax_and_ast_parsing',
    summary: `Identified question: "${parserResult.inferred_question}". Parsed ${parserResult.total_lines} lines of ${detectedLang}. Detected ${parserResult.loop_count} loop(s), recursion: ${parserResult.has_recursion ? 'yes' : 'no'}, backtracking: ${parserResult.has_backtracking ? 'yes' : 'no'}, DP: ${parserResult.has_dp ? 'yes' : 'no'}.`,
    details: parserResult,
  });

  // --- Step 2: PatternClassifierTool ---
  const patternResult: PatternClassificationResult = classifyAlgorithmicPattern(code, parserResult);
  toolsExecuted.push({
    tool_name: 'PatternClassifierTool',
    action: 'pattern_and_difficulty_classification',
    summary: `Classified pattern as '${patternResult.detected_pattern}' -> ${patternResult.difficulty_label} (Grade ${patternResult.difficulty}) based on user rule: ${patternResult.rule_applied}.`,
    details: patternResult,
  });

  // --- Step 3: PromptBuilderTool ---
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(code, detectedLang, parserResult, patternResult);
  toolsExecuted.push({
    tool_name: 'PromptBuilderTool',
    action: 'structured_prompt_synthesis',
    summary: `Synthesized system and user prompts with explicit classification taxonomy (loop=easy, backtrack=medium, dp=hard) and static tool findings.`,
    details: {
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
    },
  });

  const useMock = provider === 'mock';
  if (useMock) {
    const mockOutput = getDeterministicMock(code, detectedLang, parserResult, patternResult);
    mockOutput.tools_executed = toolsExecuted;
    return mockOutput;
  }

  // --- Step 4: LLM Inference via Groq (Primary) or Gemini ---
  const hasGroqKey = Boolean(apiKey || process.env.GROQ_API_KEY);
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

  // If Groq is explicitly requested or Auto with Groq key available
  if ((provider === 'groq' || provider === 'auto') && hasGroqKey) {
    try {
      const groqRaw = await executeGroqAnalysis({
        code,
        language: detectedLang,
        systemPrompt,
        userPrompt,
        apiKey,
        model,
      });

      toolsExecuted.push({
        tool_name: 'GroqLLMTool',
        action: 'groq_chat_completion',
        summary: `Successfully executed Groq model ${model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'} with structured JSON output.`,
        details: {
          model: model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          question: groqRaw?.question || parserResult.inferred_question,
          approach: groqRaw?.approach,
          difficulty: groqRaw?.difficulty,
        },
      });

      const normalized = normalizeAnalysis(groqRaw, detectedLang, patternResult, parserResult);
      normalized.provider_used = `Groq (${model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'})`;
      normalized.is_mock = false;
      normalized.tools_executed = toolsExecuted;
      return normalized;
    } catch (groqError: any) {
      console.warn('Groq execution failed:', groqError.message);
      toolsExecuted.push({
        tool_name: 'GroqLLMTool',
        action: 'groq_chat_completion_error',
        summary: `Groq error: ${groqError.message}. Triggering fallback handler.`,
        details: { error: groqError.message },
      });

      if (hasGeminiKey) {
        try {
          return await callGeminiFallback(code, detectedLang, systemPrompt, userPrompt, patternResult, parserResult, toolsExecuted);
        } catch (geminiError: any) {
          console.warn('Gemini fallback failed:', geminiError.message);
        }
      }

      const mock = getDeterministicMock(code, detectedLang, parserResult, patternResult);
      mock.provider_used = `Deterministic Engine (Groq error: ${groqError.message})`;
      mock.tools_executed = toolsExecuted;
      return mock;
    }
  }

  // Gemini if selected
  if (provider === 'gemini' && hasGeminiKey) {
    try {
      return await callGeminiFallback(code, detectedLang, systemPrompt, userPrompt, patternResult, parserResult, toolsExecuted);
    } catch (err: any) {
      console.warn('Gemini execution failed:', err.message);
      const mock = getDeterministicMock(code, detectedLang, parserResult, patternResult);
      mock.provider_used = `Deterministic Engine (Gemini error: ${err.message})`;
      mock.tools_executed = toolsExecuted;
      return mock;
    }
  }

  // Offline / Zero-quota Deterministic Fallback
  const fallbackMock = getDeterministicMock(code, detectedLang, parserResult, patternResult);
  fallbackMock.tools_executed = toolsExecuted;
  return fallbackMock;
}

async function callGeminiFallback(
  code: string,
  detectedLang: string,
  systemPrompt: string,
  userPrompt: string,
  patternResult: PatternClassificationResult,
  parserResult: CodeParserResult,
  toolsExecuted: ToolExecutionRecord[]
): Promise<CodeAnalysisOutput> {
  const ai = new GoogleGenAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          language: { type: Type.STRING },
          approach: { type: Type.STRING },
          detected_pattern: { type: Type.STRING },
          classification_rule: { type: Type.STRING },
          time_complexity: { type: Type.STRING },
          space_complexity: { type: Type.STRING },
          complexity_breakdown: { type: Type.STRING },
          difficulty: { type: Type.STRING, enum: ['a', 'b', 'c'] },
          difficulty_label: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
          key_observations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          potential_optimizations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'question',
          'language',
          'approach',
          'detected_pattern',
          'classification_rule',
          'time_complexity',
          'space_complexity',
          'complexity_breakdown',
          'difficulty',
          'difficulty_label',
        ],
      },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  const parsed = JSON.parse(text);
  toolsExecuted.push({
    tool_name: 'GeminiLLMTool',
    action: 'gemini_generate_content',
    summary: 'Successfully executed Gemini 2.5 Flash with structured schema output.',
    details: { model: 'gemini-2.5-flash', approach: parsed.approach },
  });

  const normalized = normalizeAnalysis(parsed, detectedLang, patternResult, parserResult);
  normalized.provider_used = 'Gemini 2.5 Flash';
  normalized.is_mock = false;
  normalized.tools_executed = toolsExecuted;
  return normalized;
}
