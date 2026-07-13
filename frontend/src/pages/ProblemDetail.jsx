import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import Editor from '@monaco-editor/react';

const ProblemDetail = () => {
  const { slug } = useParams();
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('// Write your solution here');
  const [language, setLanguage] = useState('cpp');
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get(`/problems/${slug}`)
      .then(res => setProblem(res.data.problem))
      .catch(console.error);
  }, [slug]);

  const handleRun = async () => {
    try {
      const res = await api.post(`/problems/${problem._id}/run`, { language, code });
      setResult(res.data);
    } catch (err) {
      alert('Run failed');
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await api.post('/submissions', { problemId: problem._id, language, code });
      alert('Submission verdict: ' + res.data.submission.status);
    } catch (err) {
      alert('Submission failed');
    }
  };

  if (!problem) return <div className="text-center p-8">Loading problem...</div>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{problem.title}</h1>
      <div className="bg-white p-4 rounded shadow">
        <p className="whitespace-pre-wrap">{problem.description}</p>
        <h3 className="font-bold mt-2">Sample Test Cases</h3>
        {problem.sampleTestCases.map((tc, i) => (
          <div key={i} className="bg-gray-100 p-2 my-1 rounded">
            <p><strong>Input:</strong> {tc.input}</p>
            <p><strong>Output:</strong> {tc.output}</p>
            {tc.explanation && <p><strong>Explanation:</strong> {tc.explanation}</p>}
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded shadow">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border p-1 rounded mb-2"
        >
          <option value="cpp">C++</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="java">Java</option>
        </select>
        <Editor
          height="300px"
          language={language === 'cpp' ? 'cpp' : language === 'python' ? 'python' : 'javascript'}
          value={code}
          onChange={(val) => setCode(val)}
          theme="vs-dark"
        />
        <div className="mt-2 flex gap-2">
          <button onClick={handleRun} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Run
          </button>
          <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Submit
          </button>
        </div>
        {result && (
          <div className="mt-4">
            <p><strong>Overall:</strong> {result.overallStatus}</p>
            <p>Passed {result.passed} / {result.total}</p>
            {result.results.map((r, idx) => (
              <div key={idx} className={`p-2 my-1 rounded ${r.passed ? 'bg-green-100' : 'bg-red-100'}`}>
                <p>Test {idx+1}: {r.passed ? '✅' : '❌'} {r.status}</p>
                <p>Input: {r.input}</p>
                <p>Expected: {r.expectedOutput}</p>
                <p>Actual: {r.actualOutput}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemDetail;