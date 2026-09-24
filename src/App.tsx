import React, { useState, useEffect } from 'react';
import {
  Code2,
  Cpu,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Terminal,
  BookOpen,
  ArrowRight,
  Layers,
  FileCode,
  Key,
  HelpCircle,
  Wrench,
  Activity,
  CheckSquare
} from 'lucide-react';
import type { CodeAnalysisOutput, SampleItem, HealthStatus, ToolExecutionRecord } from './types.js';

const DEFAULT_CODE = `def fibonacci_loop(n: int) -> int:
    """
    Compute the n-th Fibonacci number using an iterative loop.
    Classification Rule: Loop -> Easy (Grade a)
    Time Complexity: O(N)
    Space Complexity: O(1)
    """
    if n <= 0:
        return 0
    if n == 1:
        return 1

    a, b = 0, 1
    for _ in range(2, n + 1):
        c = a + b
        a = b
        b = c
    return b

if __name__ == "__main__":
    print("Fibonacci(10) =", fibonacci_loop(10))`;

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState('Auto-Detect');
  const [provider, setProvider] = useState<'auto' | 'groq' | 'gemini' | 'mock'>('groq');
  const [userApiKey, setUserApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CodeAnalysisOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'tools' | 'json'>('visual');
  const [showApiModal, setShowApiModal] = useState(false);
  const [showKeyDrawer, setShowKeyDrawer] = useState(false);

  // Fetch samples and health on load
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data: HealthStatus) => setHealth(data))
      .catch((err) => console.warn('Health check error:', err));

    fetch('/api/samples')
      .then((res) => res.json())
      .then((data: { samples: SampleItem[] }) => {
        if (data.samples && data.samples.length > 0) {
          setSamples(data.samples);
        }
      })
      .catch((err) => console.warn('Error loading samples:', err));
  }, []);

  const handleAnalyze = async () => {
    if (!code.trim()) {
      setError('Please provide source code to analyze.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          provider,
          apiKey: userApiKey.trim() || undefined,
          mock: provider === 'mock',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Server responded with HTTP ${response.status}`);
      }

      const data: CodeAnalysisOutput = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadSample = (sample: SampleItem) => {
    setCode(sample.content);
    if (sample.language && sample.language !== 'Unknown' && sample.language !== 'JSON') {
      setLanguage(sample.language);
    }
    setResult(null);
    setError(null);
  };

  // Keyboard shortcut Ctrl/Cmd + Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const getDifficultyBadge = (codeGrade: string) => {
    switch (codeGrade) {
      case 'a':
        return {
          grade: 'a',
          label: 'Easy',
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          desc: 'Classified as Easy: Iterative loop / sequential iteration construct.',
        };
      case 'b':
        return {
          grade: 'b',
          label: 'Medium',
          color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          desc: 'Classified as Medium: Backtracking / branching recursive decision exploration.',
        };
      case 'c':
        return {
          grade: 'c',
          label: 'Hard',
          color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400',
          desc: 'Classified as Hard: Dynamic Programming (tabulation or memoization table).',
        };
      default:
        return {
          grade: codeGrade,
          label: 'Classified',
          color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          dot: 'bg-blue-400',
          desc: 'Algorithmic classification',
        };
    }
  };

  const diffInfo = result ? getDifficultyBadge(result.difficulty) : null;

  const fibSamples = samples.filter((s) => s.filename.includes('fibonacci'));
  const otherSamples = samples.filter((s) => !s.filename.includes('fibonacci'));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500/30 selection:text-orange-200">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-bold">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-white tracking-tight">
                  Groq Code Analysis Agent
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  Agent with Tools
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Powered by Groq • Modular Tools • Loop = Easy, Backtrack = Medium, DP = Hard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {health && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-300 font-medium">Groq Ready</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 font-mono text-[11px]">llama-3.3-70b-versatile</span>
              </div>
            )}

            <button
              onClick={() => setShowKeyDrawer(!showKeyDrawer)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition flex items-center gap-1.5"
              title="Groq API Key Configuration"
            >
              <Key className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">API Key</span>
            </button>

            <button
              onClick={() => setShowApiModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5 text-orange-400" />
              <span>API</span>
            </button>
          </div>
        </div>
      </header>

      {/* API Key Banner / Drawer if toggled */}
      {showKeyDrawer && (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-orange-400" />
              <span className="text-slate-300 font-semibold">Groq API Key:</span>
              <span className="text-slate-400">
                {health?.groq_api_key_configured ? '(Active on server via GROQ_API_KEY env var)' : '(Not set on server)'}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="password"
                placeholder="Paste custom gsk_... key to override"
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500 w-full sm:w-72 font-mono"
              />
              {userApiKey && (
                <button
                  onClick={() => setUserApiKey('')}
                  className="px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rule Taxonomy Banner */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 lg:px-8 py-2.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-orange-400" /> Algorithmic Classification Taxonomy:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Loop (Iterative)</span>
              <ArrowRight className="w-3 h-3 text-emerald-500" />
              <span className="font-bold">Easy (a)</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Backtrack (Recursion)</span>
              <ArrowRight className="w-3 h-3 text-amber-500" />
              <span className="font-bold">Medium (b)</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span>Dynamic Programming (DP)</span>
              <ArrowRight className="w-3 h-3 text-rose-500" />
              <span className="font-bold">Hard (c)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 flex-1 flex flex-col gap-5">
        {/* Fibonacci Quick Test Section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              Fibonacci Benchmark Suite (Python • Java • C++):
            </span>
            <span className="text-[11px] text-slate-400">Click any preset to test the agent</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {fibSamples.map((sample) => {
              const isLoop = sample.filename.includes('loop');
              const isBacktrack = sample.filename.includes('backtrack');
              const isDp = sample.filename.includes('dp');
              const badgeColor = isLoop
                ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40'
                : isBacktrack
                ? 'border-amber-500/40 text-amber-300 bg-amber-950/40'
                : 'border-rose-500/40 text-rose-300 bg-rose-950/40';

              return (
                <button
                  key={sample.filename}
                  onClick={() => loadSample(sample)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-2 hover:brightness-125 ${badgeColor}`}
                >
                  <span className="font-mono font-semibold">{sample.filename}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-bold">
                    {sample.difficulty}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Other Samples */}
          {otherSamples.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-xs">
              <span className="text-slate-400 text-[11px]">Other Classical Algorithms:</span>
              {otherSamples.map((sample) => (
                <button
                  key={sample.filename}
                  onClick={() => loadSample(sample)}
                  className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-mono text-[11px] transition"
                >
                  {sample.filename} ({sample.difficulty})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2-Column Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          {/* Left Column: Source Code Editor & Controls (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-4 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-orange-400" />
                <span className="font-semibold text-sm text-slate-200">Input Source Code</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-slate-800 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                >
                  <option value="Auto-Detect">Auto-Detect Language</option>
                  <option value="Python">Python</option>
                  <option value="Java">Java</option>
                  <option value="C++">C++</option>
                  <option value="TypeScript">TypeScript</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="Rust">Rust</option>
                  <option value="Go">Go</option>
                </select>

                <button
                  onClick={() => {
                    setCode('');
                    setResult(null);
                    setError(null);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                  title="Clear Code"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Code Input */}
            <div className="relative rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden focus-within:border-orange-500/50 transition">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste Python, Java, or C++ source code here..."
                rows={18}
                spellCheck={false}
                className="w-full bg-transparent p-4 font-mono text-xs sm:text-sm text-slate-200 resize-y focus:outline-none leading-relaxed selection:bg-orange-500/20"
              />
            </div>

            {/* Execution settings & Analyze trigger */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Agent Inference:</span>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                >
                  <option value="groq">Groq (llama-3.3-70b-versatile)</option>
                  <option value="auto">Auto (Groq with fallback)</option>
                  <option value="gemini">Gemini (gemini-2.5-flash)</option>
                  <option value="mock">Offline Zero-Quota Mode</option>
                </select>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading || !code.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Running Agent & Tools...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Analyze Code & Classify</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Analysis Failed</p>
                  <p className="text-rose-300/90 mt-0.5">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Output & Agent Tools (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {result ? (
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
                {/* Header with View Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="font-bold text-sm text-white">{result.question}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {result.language}
                    </span>
                  </div>

                  <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setActiveTab('visual')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                        activeTab === 'visual'
                          ? 'bg-slate-800 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Report
                    </button>
                    <button
                      onClick={() => setActiveTab('tools')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
                        activeTab === 'tools'
                          ? 'bg-slate-800 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Wrench className="w-3 h-3 text-orange-400" />
                      <span>Tools ({result.tools_executed?.length || 0})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('json')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                        activeTab === 'json'
                          ? 'bg-slate-800 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      JSON
                    </button>
                  </div>
                </div>

                {/* Tab 1: Visual Report */}
                {activeTab === 'visual' && (
                  <div className="flex flex-col gap-4">
                    {/* Difficulty Badge Banner */}
                    {diffInfo && (
                      <div className={`p-4 rounded-xl border ${diffInfo.color} flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-950/60 border border-white/10 flex flex-col items-center justify-center">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Grade</span>
                            <span className="text-xl font-black">{diffInfo.grade}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold tracking-tight">
                                Difficulty: {diffInfo.label}
                              </span>
                              <span className={`w-2 h-2 rounded-full ${diffInfo.dot}`}></span>
                            </div>
                            <p className="text-xs opacity-90 mt-0.5">{diffInfo.desc}</p>
                          </div>
                        </div>

                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                            Pattern Rule
                          </span>
                          <p className="font-mono text-xs font-semibold">{result.detected_pattern}</p>
                        </div>
                      </div>
                    )}

                    {/* Complexity Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-orange-400" /> Time Complexity
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            Big-O
                          </span>
                        </div>
                        <div className="font-mono text-xl font-bold text-white tracking-wide">
                          {result.time_complexity}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                            <HardDrive className="w-3.5 h-3.5 text-blue-400" /> Space Complexity
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Auxiliary
                          </span>
                        </div>
                        <div className="font-mono text-xl font-bold text-white tracking-wide">
                          {result.space_complexity}
                        </div>
                      </div>
                    </div>

                    {/* Algorithmic Approach Card */}
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-400" /> Approach & Strategy
                      </div>
                      <p className="text-sm font-semibold text-slate-100 leading-relaxed">
                        {result.approach}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Rule Applied: <span className="text-slate-300 font-medium">{result.classification_rule}</span>
                      </p>
                    </div>

                    {/* Complexity Breakdown */}
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Mathematical Complexity Derivation
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {result.complexity_breakdown}
                      </p>
                    </div>

                    {/* Observations */}
                    {result.key_observations && result.key_observations.length > 0 && (
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Key Observations
                        </div>
                        <ul className="space-y-1.5">
                          {result.key_observations.map((item, idx) => (
                            <li key={idx} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Optimizations */}
                    {result.potential_optimizations && result.potential_optimizations.length > 0 && (
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Optimizations & Alternative Forms
                        </div>
                        <ul className="space-y-1.5">
                          {result.potential_optimizations.map((item, idx) => (
                            <li key={idx} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Provider attribution banner */}
                    {result.provider_used && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 py-1">
                        <span className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-orange-400" />
                          <span>Generated by: {result.provider_used}</span>
                        </span>
                        {result.is_mock && (
                          <span className="text-amber-400/90 font-medium">Deterministic zero-quota mode</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Agent Tools Execution Trace */}
                {activeTab === 'tools' && (
                  <div className="flex flex-col gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                      <span className="font-semibold text-white">Agent Multi-Tool Execution Pipeline</span>
                      <span className="text-[11px] text-orange-400 font-mono">
                        {result.tools_executed?.length || 0} Tools Run
                      </span>
                    </div>

                    {result.tools_executed && result.tools_executed.length > 0 ? (
                      <div className="space-y-3">
                        {result.tools_executed.map((tool, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-orange-500/20 text-orange-400 flex items-center justify-center font-mono font-bold text-xs">
                                  {idx + 1}
                                </span>
                                <span className="font-mono text-xs font-bold text-white">{tool.tool_name}</span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                {tool.action}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">{tool.summary}</p>

                            {tool.details && (
                              <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-400 overflow-x-auto max-h-40">
                                {JSON.stringify(tool.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 p-4 text-center">No tool execution logs available.</p>
                    )}
                  </div>
                )}

                {/* Tab 3: Raw JSON */}
                {activeTab === 'json' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-end">
                      <button
                        onClick={handleCopyJson}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition flex items-center gap-1.5"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied to clipboard</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-[500px]">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State */
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center text-center gap-4 min-h-[460px]">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-orange-400 shadow-inner">
                  <Zap className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-200">Ready to Analyze Code</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Select a Fibonacci series preset above or paste custom source code to compute time & space complexity, approach, and strict difficulty grade.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-md mt-2 text-left">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Loop Rule</span>
                    <p className="text-xs font-semibold text-slate-200">Easy (Grade a)</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Sequential iterative loop (for / while)</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Backtrack Rule</span>
                    <p className="text-xs font-semibold text-slate-200">Medium (Grade b)</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Branching recursion / tree traversal</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] font-bold text-rose-400 uppercase">DP Rule</span>
                    <p className="text-xs font-semibold text-slate-200">Hard (Grade c)</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Dynamic Programming state tables</p>
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
                >
                  <span>Analyze current code</span>
                  <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* REST API Explorer Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-base text-white">Backend REST API Reference</h3>
              </div>
              <button
                onClick={() => setShowApiModal(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-mono text-emerald-400 font-bold">GET /api/health</span>
                <p className="text-slate-400 mt-1">Check status and configured providers:</p>
                <pre className="mt-2 p-2 rounded bg-slate-900 text-slate-300 font-mono text-[11px] overflow-x-auto">
                  curl http://localhost:3000/api/health
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-mono text-emerald-400 font-bold">GET /api/samples</span>
                <p className="text-slate-400 mt-1">List bundled algorithmic samples with pattern metadata:</p>
                <pre className="mt-2 p-2 rounded bg-slate-900 text-slate-300 font-mono text-[11px] overflow-x-auto">
                  curl http://localhost:3000/api/samples
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-mono text-orange-400 font-bold">POST /api/analyze</span>
                <p className="text-slate-400 mt-1">Analyze source code payload with the agent and tools:</p>
                <pre className="mt-2 p-2 rounded bg-slate-900 text-slate-300 font-mono text-[11px] overflow-x-auto">
{`curl -X POST http://localhost:3000/api/analyze \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "def fib(n):\\n    if n <= 1: return n\\n    return fib(n-1) + fib(n-2)",
    "language": "Python",
    "provider": "groq"
  }'`}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowApiModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-3.5 px-4 lg:px-8 text-center text-xs text-slate-500">
        <p>
          Groq Code Analysis Agent • Enforced Rules: Loop = Easy (a), Backtrack = Medium (b), DP = Hard (c) • Node.js Port 3000
        </p>
      </footer>
    </div>
  );
}
