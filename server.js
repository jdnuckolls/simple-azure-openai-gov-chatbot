import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'simple-chatbot', 'public')));

// --------------------
// Azure AI Search
// --------------------
async function searchAzureAISearch(query, topK) {
  const searchEndpoint = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${process.env.AZURE_SEARCH_INDEX_NAME}/docs/search?api-version=2023-07-01-preview`;

  const response = await axios.post(
    searchEndpoint,
    { search: query, top: topK },
    {
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.AZURE_SEARCH_KEY,
      },
    }
  );

  return response.data.value || [];
}

// --------------------
// Main Chat Endpoint
// --------------------
app.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  const maxTurns = parseInt(process.env.MAX_TURNS) || 3;
  const topK = parseInt(process.env.TOP_K) || 3;
  const temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.5;
  const max_tokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 500;

  try {
    const searchResults = await searchAzureAISearch(message, topK);
    const sources = searchResults.map(doc => `Source: ${doc.url}\n${doc.content}`).join("\n\n");
    // Deduplicate URLs before sending to frontend
    const seen = new Set();
    const citations = [];

    searchResults.forEach(doc => {
      if (doc.url && !seen.has(doc.url)) {
        seen.add(doc.url);
        citations.push({ url: doc.url });
      }
    });


    const prompt = `${process.env.AZURE_OPENAI_INSTRUCTIONS}\n\nUse only the information from the sources below to answer. If no answer is found, say you don’t know.\n\n${sources}`;

    const trimmedHistory = history.slice(-maxTurns * 2);
    const messages = [
      { role: "system", content: prompt },
      ...trimmedHistory,
      { role: "user", content: message }
    ];

    const response = await axios.post(
      `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=2023-05-15`,
      {
        messages,
        temperature,
        max_tokens
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_API_KEY
        }
      }
    );

    const reply = response.data.choices[0].message.content;

    res.json({
      reply,
      assistantMessage: { role: "assistant", content: reply },
      data_points: citations
    });

  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message;

    if (status === 429) {
      console.warn("⚠️ Rate limit hit:", message);
      return res.status(429).json({
        error: true,
        reply: "⏳ We're getting a lot of requests right now. Please wait a moment and try again."
      });
    }

    console.error("❌ Chat error:", message || error.message);
    return res.status(500).json({
      error: true,
      reply: "⚠️ Something went wrong while generating a response."
    });
  }
});

// --------------------
// Speech Token Endpoint
// --------------------
app.get('/speech-token', async (req, res) => {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region || process.env.ENABLE_SPEECH !== 'true') {
    return res.status(403).json({ error: 'Speech service is disabled or missing credentials.' });
  }

  try {
    const response = await axios.post(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      null,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json({ token: response.data, region });

  } catch (err) {
    console.error("Speech token error:", err.response?.data || err.message);
    res.status(500).send('Failed to retrieve speech token');
  }
});

// --------------------
app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});
