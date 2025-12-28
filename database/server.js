import express from 'express';
import { addResult, showResults } from './database.js';
import cors from 'cors';
const PORT = 3000;
const app = express();
app.use(express.json());

app.use(cors());
app.use(express.json());

app.post('/api/save-score', async (req, res) => {
  const { name, score, id } = req.body;
  try {
    const result = await addResult(name, score, id);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/load-scores', async (req, res) => {
  try {
    const { type } = req.query;

    const result = await showResults(type);

    res.set('Cache-Control', 'no-store');
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Start the server and log a message
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
