import type { DifficultyCode, DifficultyLabel, AlgorithmicPattern } from '../../types.js';
import type { CodeParserResult } from './codeParser.js';

export interface PatternClassificationResult {
  detected_pattern: AlgorithmicPattern;
  difficulty: DifficultyCode;
  difficulty_label: DifficultyLabel;
  rule_applied: string;
  rationale: string;
  matched_signals: string[];
}

/**
 * Pattern Classification Tool
 * Explicit User Rule:
 * - Loop / Iterative -> Easy (Grade 'a')
 * - Backtracking / Branching Recursion -> Medium (Grade 'b')
 * - Dynamic Programming (Memoization / Tabulation) -> Hard (Grade 'c')
 */
export function classifyAlgorithmicPattern(
  code: string,
  parserResult: CodeParserResult
): PatternClassificationResult {
  const matched_signals: string[] = [];
  const lowerCode = code.toLowerCase();

  // 1. Check for Dynamic Programming (DP) -> Hard ('c')
  // Rule: Dynamic programming table, memoization, state transitions
  if (
    parserResult.has_dp ||
    lowerCode.includes('memo') ||
    lowerCode.includes('dp[') ||
    lowerCode.includes('tabulation') ||
    lowerCode.includes('dynamic programming') ||
    /dp\[\w+\]\s*=/.test(code)
  ) {
    if (parserResult.dp_indicators.length > 0) {
      matched_signals.push(...parserResult.dp_indicators);
    } else {
      matched_signals.push('Dynamic programming state structure detected');
    }
    return {
      detected_pattern: 'dp',
      difficulty: 'c',
      difficulty_label: 'Hard',
      rule_applied: 'Dynamic Programming (DP) Pattern Rule -> Classified as Hard (Grade c)',
      rationale: 'Algorithm uses dynamic programming (tabulation or memoization) with explicit state storage and subproblem recurrence relations.',
      matched_signals,
    };
  }

  // 2. Check for Backtracking / Branching Recursion -> Medium ('b')
  // Rule: Recursive calls exploring choices, tree branches, or backtracking state
  if (
    parserResult.has_backtracking ||
    parserResult.has_recursion ||
    lowerCode.includes('backtrack') ||
    lowerCode.includes('dfs') ||
    /fib\([^)]*-\s*1\)\s*\+\s*fib\([^)]*-\s*2\)/.test(code) ||
    /\w+\(n\s*-\s*1\)\s*\+\s*\w+\(n\s*-\s*2\)/.test(code)
  ) {
    matched_signals.push('Recursive self-invocations or branching exploration');
    if (parserResult.has_backtracking) {
      matched_signals.push('Backtracking / choice-branch state exploration');
    }
    return {
      detected_pattern: 'backtrack',
      difficulty: 'b',
      difficulty_label: 'Medium',
      rule_applied: 'Backtracking / Branching Recursion Pattern Rule -> Classified as Medium (Grade b)',
      rationale: 'Algorithm relies on recursion/backtracking to traverse decision branches or state trees.',
      matched_signals,
    };
  }

  // 3. Check for Iterative Loops -> Easy ('a')
  // Rule: Iterative loops (for, while) without recursion or DP tables
  if (parserResult.has_loops) {
    matched_signals.push(`Iterative loop construct (${parserResult.loop_types.join(', ')}) with ${parserResult.loop_count} loop(s)`);
    return {
      detected_pattern: 'loop',
      difficulty: 'a',
      difficulty_label: 'Easy',
      rule_applied: 'Iterative Loop Pattern Rule -> Classified as Easy (Grade a)',
      rationale: 'Algorithm operates via standard sequential or bounded iteration (for / while loop) without recursion or DP state overhead.',
      matched_signals,
    };
  }

  // 4. Default / Other heuristics
  if (lowerCode.includes('hash') || lowerCode.includes('lookup') || lowerCode.includes('map')) {
    matched_signals.push('Hash map auxiliary lookup');
    return {
      detected_pattern: 'hash_map',
      difficulty: 'a',
      difficulty_label: 'Easy',
      rule_applied: 'Hash Map Lookup Rule -> Classified as Easy (Grade a)',
      rationale: 'Single-pass or direct key-value associative lookup with linear time bound.',
      matched_signals,
    };
  }

  return {
    detected_pattern: 'other',
    difficulty: 'b',
    difficulty_label: 'Medium',
    rule_applied: 'Standard Algorithmic Classification Rule',
    rationale: 'Direct algorithmic procedure with scalar computation.',
    matched_signals: ['Standard computation'],
  };
}
