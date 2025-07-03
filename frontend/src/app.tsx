import { useState } from 'react';
import { ThumbsUp, ThumbsDown, AlertTriangle, Search, Loader2 } from 'lucide-react';

interface Source {
  title: string;
  url: string;
}

interface ApiResponse {
  result: 'REAL' | 'FAKE' | 'UNCERTAIN';
  confidence: number;
  explanation: string;
  sources: Source[];
}

function App() {
  const [statement, setStatement] = useState('');
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) {
      setError('Please enter a news headline or statement.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/check-news`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ statement }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'An unknown error occurred.');
      }

      const data: ApiResponse = await response.json();
      setResult(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to get a response: ${err.message}`);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getResultPill = () => {
    if (!result) return null;
    const commonClasses = 'text-sm font-bold px-4 py-1 rounded-full flex items-center gap-2';
    switch (result.result) {
      case 'REAL':
        return (
          <span className={`bg-green-200 text-green-800 ${commonClasses}`}>
            <ThumbsUp size={16} /> REAL
          </span>
        );
      case 'FAKE':
        return (
          <span className={`bg-red-200 text-red-800 ${commonClasses}`}>
            <ThumbsDown size={16} /> FAKE
          </span>
        );
      case 'UNCERTAIN':
        return (
          <span className={`bg-yellow-200 text-yellow-800 ${commonClasses}`}>
            <AlertTriangle size={16} /> UNCERTAIN
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl">
        <header className="text-center mb-8">
          <h1 className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
            RAG News Verifier
          </h1>
          <p className="text-gray-400 mt-3">
            Verify news using AI + Web Search. Powered by Perplexity.
          </p>
        </header>

        <main>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="news-statement" className="block text-sm font-medium text-gray-300">
              Enter a news headline or statement to verify
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                id="news-statement"
                type="text"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="e.g., NASA confirms aliens on Mars"
                className="flex-grow bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                <span>{isLoading ? 'Verifying...' : 'Check News'}</span>
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-6 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-8 bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-2xl animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-100">Verification Result</h2>
                <div className="mt-2 sm:mt-0">{getResultPill()}</div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-400 mb-1">Confidence</h3>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full"
                    style={{ width: `${result.confidence}%` }}
                  ></div>
                </div>
                <p className="text-right text-sm text-gray-300 mt-1">
                  {result.confidence}% Confident
                </p>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-400 mb-2">Explanation</h3>
                <p className="text-gray-300 leading-relaxed">{result.explanation}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-400 mb-2">Sources Used</h3>
                <ul className="space-y-2">
                  {result.sources.map((source, index) => (
                    <li
                      key={index}
                      className="bg-gray-700/50 p-3 rounded-md hover:bg-gray-700 transition"
                    >
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {source.title}
                        <span className="text-gray-500 text-xs block truncate">{source.url}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const styles = `
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.5s ease-out forwards;
}
`;
const styleSheet = document.createElement('style');
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default App;
