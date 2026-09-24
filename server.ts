import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { runCodeAnalysisAgent, detectLanguage } from './src/server/agent.js';
import type { AlgorithmicPattern } from './src/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Service metadata
const serviceInfo = {
  service: 'Groq Code Analysis Agent',
  status: 'online',
  model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  rules: {
    loop: 'Easy (Grade a)',
    backtrack: 'Medium (Grade b)',
    dp: 'Hard (Grade c)',
  },
  tools: ['CodeParserTool', 'PatternClassifierTool', 'PromptBuilderTool', 'GroqLLMTool'],
  endpoints: {
    'GET /api/health': 'Health and configuration status',
    'GET /api/samples': 'List bundled algorithmic samples (Fibonacci, LRU, Two Sum, Trapping Rain Water)',
    'POST /api/analyze': 'Analyze code payload {code, language, provider, apiKey, model}',
  },
};

// API Info
app.get('/api', (req, res) => {
  res.json(serviceInfo);
});

app.get('/status', (req, res) => {
  res.json(serviceInfo);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const providersAvailable: string[] = ['mock'];
  if (hasGroq) providersAvailable.push('groq');
  if (hasGemini) providersAvailable.push('gemini');

  res.json({
    status: 'ok',
    groq_api_key_configured: hasGroq,
    gemini_api_key_configured: hasGemini,
    default_model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    providers_available: providersAvailable,
  });
});

// Algorithmic Samples endpoint
app.get('/api/samples', (req, res) => {
  try {
    const samplesDir = path.join(__dirname, 'samples');
    if (!fs.existsSync(samplesDir)) {
      return res.json({ samples: [] });
    }

    const files = fs.readdirSync(samplesDir);
    const samples = files
      .filter((file) => fs.statSync(path.join(samplesDir, file)).isFile())
      .map((file) => {
        const fullPath = path.join(samplesDir, file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        let language = 'Unknown';
        let difficulty = 'Unknown';
        let pattern: AlgorithmicPattern = 'other';
        let description = '';

        if (file.endsWith('.py')) language = 'Python';
        else if (file.endsWith('.cpp')) language = 'C++';
        else if (file.endsWith('.java')) language = 'Java';
        else if (file.endsWith('.json')) language = 'JSON';

        if (file.includes('fibonacci_loop')) {
          difficulty = 'Easy (a)';
          pattern = 'loop';
          description = 'Fibonacci series with iterative loop -> classified as Easy';
        } else if (file.includes('fibonacci_backtrack')) {
          difficulty = 'Medium (b)';
          pattern = 'backtrack';
          description = 'Fibonacci series with branching recursion/backtracking -> classified as Medium';
        } else if (file.includes('fibonacci_dp')) {
          difficulty = 'Hard (c)';
          pattern = 'dp';
          description = 'Fibonacci series with Dynamic Programming tabulation/memoization -> classified as Hard';
        } else if (file.includes('two_sum')) {
          difficulty = 'Easy (a)';
          pattern = 'hash_map';
          description = 'Two Sum with hash map auxiliary lookup';
        } else if (file.includes('lru_cache')) {
          difficulty = 'Medium (b)';
          pattern = 'hash_map';
          description = 'LRU Cache using hash map and doubly linked list';
        } else if (file.includes('trapping_rain_water')) {
          difficulty = 'Hard (c)';
          pattern = 'two_pointers';
          description = 'Trapping Rain Water with two-pointer boundary convergence';
        }

        return {
          filename: file,
          path: `samples/${file}`,
          language,
          difficulty,
          pattern,
          description,
          content,
        };
      })
      .filter((s) => s.language !== 'JSON');

    // Sort Fibonacci samples first for user visibility
    samples.sort((a, b) => {
      const aIsFib = a.filename.includes('fibonacci');
      const bIsFib = b.filename.includes('fibonacci');
      if (aIsFib && !bIsFib) return -1;
      if (!aIsFib && bIsFib) return 1;
      return a.filename.localeCompare(b.filename);
    });

    res.json({ samples });
  } catch (error: any) {
    res.status(500).json({ error: 'failed_reading_samples', message: error.message });
  }
});

// Analyze handler
const handleAnalyzeRequest = async (req: express.Request, res: express.Response) => {
  try {
    const {
      code: rawCode,
      source_code,
      question,
      language: rawLang,
      lang,
      mock,
      model,
      apiKey,
      provider = 'auto',
    } = req.body || {};

    const code = rawCode || source_code || '';
    if (!code || !code.trim()) {
      return res.status(400).json({
        error: 'missing_code',
        message: "Field 'code' or 'source_code' cannot be empty.",
      });
    }

    const detectedLang = detectLanguage(code, rawLang || lang);

    const result = await runCodeAnalysisAgent({
      code,
      question,
      language: detectedLang,
      provider: mock ? 'mock' : provider,
      apiKey,
      model,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Server error handling analyze:', error);
    res.status(500).json({
      error: 'internal_error',
      message: error.message || 'An unexpected error occurred during code analysis.',
    });
  }
};

app.post('/api/analyze', handleAnalyzeRequest);
app.post('/analyze', handleAnalyzeRequest);

// Vite middleware integration (dev) or static serving (prod)
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Server] Groq Code Analysis Agent running at http://${HOST}:${PORT}/`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup failure:', err);
  process.exit(1);
});
