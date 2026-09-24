import type { CodeParserResult } from './codeParser.js';
import type { PatternClassificationResult } from './patternClassifier.js';

export function buildSystemPrompt(): string {
  return `You are an expert Principal Software Engineer and Algorithmic Complexity Specialist.
Your task is to analyze source code in Python, Java, C++, or related programming languages with mathematical rigor.

CRITICAL CLASSIFICATION RULE (MANDATORY):
You MUST classify the algorithmic difficulty into exactly one of three grades according to the architectural implementation pattern:
1. "a" (Easy): Iterative Loop approach (e.g. for loop, while loop, simple iteration, sequential scan).
   Example: Fibonacci series solved with a loop is STRICTLY classified as "a" (Easy).
2. "b" (Medium): Backtracking or Branching Recursion approach (e.g. recursive calls, decision tree exploration, DFS with backtracks).
   Example: Fibonacci series solved with recursion / backtracking is STRICTLY classified as "b" (Medium).
3. "c" (Hard): Dynamic Programming (DP) approach (e.g. memoization table, 1D/2D DP array, tabulation, state transitions).
   Example: Fibonacci series solved with Dynamic Programming (tabulation or memoization) is STRICTLY classified as "c" (Hard).

For other algorithms, follow the same pattern-based rule:
- Simple loop / two pointers / hash map -> "a" (Easy)
- Backtracking / recursion / tree traversal -> "b" (Medium)
- Dynamic Programming / state spaces / complex graphs -> "c" (Hard)

FIELDS TO PRODUCE:
1. "question": the specific algorithmic question/problem being solved (e.g., "Fibonacci Series", "Two Sum", "LRU Cache", "Trapping Rain Water")
2. "language": exact programming language name (e.g., "Python", "Java", "C++")
3. "approach": concise title and summary of the approach (e.g., "Iterative Loop Fibonacci", "Recursive Backtracking Fibonacci", "Dynamic Programming (Tabulation) Fibonacci")
4. "detected_pattern": must be one of "loop", "backtrack", "dp", "hash_map", "two_pointers", "binary_search", "other"
5. "classification_rule": exact explanation of why this difficulty was assigned according to the rule (e.g. "Iterative loop approach -> Easy", "Backtracking / recursion -> Medium", "Dynamic Programming approach -> Hard")
6. "time_complexity": exact Big-O notation (e.g., "O(N)", "O(2^N)", "O(N^2)")
7. "space_complexity": exact auxiliary Big-O notation (e.g., "O(1)", "O(N)")
8. "complexity_breakdown": detailed mathematical explanation of how time and space complexities were derived
9. "difficulty": strictly one character: "a" or "b" or "c"
10. "difficulty_label": strictly "Easy" if "a", "Medium" if "b", "Hard" if "c"
11. "key_observations": array of 2-4 bullet observations about the code
12. "potential_optimizations": array of 1-3 actionable algorithmic improvements

OUTPUT REQUIREMENT:
Output pure valid JSON adhering to the schema. No markdown formatting outside of JSON, no chat preambles.`;
}

export function buildUserPrompt(
  code: string,
  language: string,
  parserResult: CodeParserResult,
  patternResult: PatternClassificationResult
): string {
  return `Please analyze the following ${language} source code.

Static Tool Analysis Pre-check:
- Identified Question: ${parserResult.inferred_question}
- Total Lines: ${parserResult.total_lines}
- Functions Found: ${parserResult.functions.join(', ') || 'None (script level)'}
- Loop Count: ${parserResult.loop_count} (${parserResult.loop_types.join(', ') || 'none'})
- Recursion Detected: ${parserResult.has_recursion ? 'Yes' : 'No'}
- Backtracking Detected: ${parserResult.has_backtracking ? 'Yes' : 'No'}
- DP Detected: ${parserResult.has_dp ? 'Yes' : 'No'}
- Suggested Pattern: ${patternResult.detected_pattern}
- Suggested Rule: ${patternResult.rule_applied}

Source Code:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Produce pure JSON matching this exact structure:
{
  "question": "${parserResult.inferred_question}",
  "language": "${language}",
  "approach": "string",
  "detected_pattern": "${patternResult.detected_pattern}",
  "classification_rule": "string",
  "time_complexity": "string",
  "space_complexity": "string",
  "complexity_breakdown": "string",
  "difficulty": "${patternResult.difficulty}",
  "difficulty_label": "${patternResult.difficulty_label}",
  "key_observations": ["string"],
  "potential_optimizations": ["string"]
}`;
}
