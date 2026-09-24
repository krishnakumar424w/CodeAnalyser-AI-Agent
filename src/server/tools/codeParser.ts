export interface CodeParserResult {
  language: string;
  inferred_question: string;
  total_lines: number;
  functions: string[];
  has_loops: boolean;
  loop_types: string[];
  loop_count: number;
  has_recursion: boolean;
  has_backtracking: boolean;
  has_dp: boolean;
  dp_indicators: string[];
  data_structures: string[];
}

export function parseCode(code: string, language: string, explicitQuestion?: string): CodeParserResult {
  const lines = code.split('\n').map(l => l.trim());
  const total_lines = lines.length;

  const functions: string[] = [];
  const loop_types: string[] = [];
  let loop_count = 0;
  const dp_indicators: string[] = [];
  const data_structures: string[] = [];

  // Question inference
  let inferred_question = explicitQuestion?.trim() || '';
  if (!inferred_question) {
    const lower = code.toLowerCase();
    if (lower.includes('fib')) {
      inferred_question = 'Fibonacci Series';
    } else if (lower.includes('two_sum') || lower.includes('twosum')) {
      inferred_question = 'Two Sum';
    } else if (lower.includes('lru') || lower.includes('lrucache')) {
      inferred_question = 'LRU Cache';
    } else if (lower.includes('trapping') || lower.includes('trap')) {
      inferred_question = 'Trapping Rain Water';
    } else if (lower.includes('binary_search') || lower.includes('binarysearch')) {
      inferred_question = 'Binary Search';
    } else if (lower.includes('climb_stairs') || lower.includes('climbingstairs')) {
      inferred_question = 'Climbing Stairs';
    } else if (lower.includes('coin_change') || lower.includes('coinchange')) {
      inferred_question = 'Coin Change';
    } else if (lower.includes('knapsack')) {
      inferred_question = '0/1 Knapsack Problem';
    }
  }

  // Function name detection
  // Python: def func_name(...)
  // Java/C++: <return_type> func_name(...)
  const pyFuncRegex = /def\s+([a-zA-Z_]\w*)\s*\(/g;
  let match;
  while ((match = pyFuncRegex.exec(code)) !== null) {
    functions.push(match[1]);
  }

  const cppJavaFuncRegex = /(?:public|private|protected|static|\s)*[\w<>[\]]+\s+([a-zA-Z_]\w*)\s*\([^)]*\)\s*\{/g;
  while ((match = cppJavaFuncRegex.exec(code)) !== null) {
    const fnName = match[1];
    if (!['if', 'for', 'while', 'switch', 'catch', 'main'].includes(fnName)) {
      if (!functions.includes(fnName)) functions.push(fnName);
    }
  }

  // Loop detection
  const hasFor = /\bfor\b|\bfor\s*\(/.test(code);
  const hasWhile = /\bwhile\b|\bwhile\s*\(/.test(code);
  const hasDoWhile = /\bdo\s*\{/.test(code);

  if (hasFor) {
    loop_types.push('for');
    const forMatches = code.match(/\bfor\b/g);
    loop_count += forMatches ? forMatches.length : 1;
  }
  if (hasWhile) {
    loop_types.push('while');
    const whileMatches = code.match(/\bwhile\b/g);
    loop_count += whileMatches ? whileMatches.length : 1;
  }
  if (hasDoWhile) {
    loop_types.push('do-while');
    loop_count += 1;
  }

  const has_loops = loop_count > 0;

  // Recursion detection
  let has_recursion = false;
  for (const fn of functions) {
    // Check if the function calls itself
    const callRegex = new RegExp(`\\b${fn}\\s*\\(`, 'g');
    const matches = code.match(callRegex);
    if (matches && matches.length > 1) {
      has_recursion = true;
      break;
    }
  }

  // If function names couldn't be parsed, check common recursion patterns (e.g. fib(n-1) or return ... self)
  if (!has_recursion) {
    if (/\breturn\s+\w+\s*\([^)]*-\s*1\)/.test(code) || /\w+\([^)]*-\s*1\)\s*\+\s*\w+\([^)]*-\s*2\)/.test(code)) {
      has_recursion = true;
    }
  }

  // Backtracking detection (branching recursion, swap-and-revert, push-recurse-pop, path backtracking)
  const has_backtracking =
    (has_recursion && (
      code.includes('pop()') ||
      code.includes('remove(') ||
      code.includes('backtrack') ||
      code.includes('dfs(') ||
      code.includes('solve(') ||
      /fib\([^)]*\)\s*\+\s*fib\([^)]*\)/.test(code) ||
      /\w+\(n\s*-\s*1\)\s*\+\s*\w+\(n\s*-\s*2\)/.test(code)
    )) ||
    code.toLowerCase().includes('backtrack');

  // Dynamic Programming detection (memoization cache, tabulation dp array/vector/matrix)
  if (/\bdp\s*=\s*\[|\bdp\[|\bmemo\b|\bcache\b|\btable\b/i.test(code)) {
    dp_indicators.push('DP array/table access (dp[i] or memo)');
  }
  if (/vector<int>\s+dp|int\[\]\s+dp|vector<vector<int>>/i.test(code)) {
    dp_indicators.push('Explicit DP state container');
  }
  if (/@cache|@lru_cache|HashMap<.*>.*memo|unordered_map<.*>.*memo/i.test(code)) {
    dp_indicators.push('Memoization lookup cache');
  }
  if (/dp\[i\]\s*=\s*dp\[i\s*-\s*1\]\s*\+\s*dp\[i\s*-\s*2\]/i.test(code)) {
    dp_indicators.push('Fibonacci state transition formula dp[i] = dp[i-1] + dp[i-2]');
  }

  const has_dp = dp_indicators.length > 0;

  // Data structures
  if (/unordered_map|HashMap|dict|\{\}/.test(code)) data_structures.push('Hash Map / Dictionary');
  if (/vector|ArrayList|list\b|\[\]/.test(code)) data_structures.push('Array / Vector');
  if (/list<pair|LinkedList/.test(code)) data_structures.push('Doubly Linked List');
  if (/stack<|Stack</.test(code)) data_structures.push('Stack');
  if (/queue<|Queue<|deque/.test(code)) data_structures.push('Queue / Deque');

  return {
    language,
    inferred_question: inferred_question || (functions[0] ? functions[0].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Algorithmic Problem'),
    total_lines,
    functions,
    has_loops,
    loop_types,
    loop_count,
    has_recursion,
    has_backtracking,
    has_dp,
    dp_indicators,
    data_structures,
  };
}
