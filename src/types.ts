export type DifficultyCode = 'a' | 'b' | 'c';
export type DifficultyLabel = 'Easy' | 'Medium' | 'Hard';
export type AlgorithmicPattern = 'loop' | 'backtrack' | 'dp' | 'hash_map' | 'two_pointers' | 'binary_search' | 'other';

export interface ToolExecutionRecord {
  tool_name: string;
  action: string;
  summary: string;
  details: Record<string, any>;
}

export interface CodeAnalysisOutput {
  question: string;
  language: string;
  approach: string;
  detected_pattern: AlgorithmicPattern;
  classification_rule: string;
  time_complexity: string;
  space_complexity: string;
  complexity_breakdown: string;
  difficulty: DifficultyCode;
  difficulty_label: DifficultyLabel;
  key_observations: string[];
  potential_optimizations: string[];
  tools_executed?: ToolExecutionRecord[];
  provider_used?: string;
  is_mock?: boolean;
}

export interface CodeAnalysisRequest {
  code: string;
  question?: string;
  language?: string;
  file_path?: string;
  mock?: boolean;
  model?: string;
  provider?: 'auto' | 'groq' | 'gemini' | 'mock';
  apiKey?: string;
}

export interface SampleItem {
  filename: string;
  path: string;
  language: string;
  difficulty: string;
  pattern: AlgorithmicPattern;
  content: string;
  description: string;
}

export interface HealthStatus {
  status: string;
  groq_api_key_configured: boolean;
  gemini_api_key_configured: boolean;
  default_model: string;
  providers_available: string[];
}
