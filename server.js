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

// Logging model capacities and vector profile for debugging.
console.log(`ChatGPT Capacity: ${process.env.AZURE_OPENAI_CHATGPT_MODEL_CAPACITY} tokens`);
console.log(`Embeddings Capacity: ${process.env.AZURE_OPENAI_EMBEDDINGS_MODEL_CAPACITY} tokens`);
console.log(`Semantic Configuration: ${process.env.AZURE_SEMANTIC_CONFIGURATION}`);
console.log(`Vector Profile: ${process.env.AZURE_VECTOR_PROFILE}`);
console.log(`Use Vector Search: ${process.env.USE_VECTOR_SEARCH}`);

// --------------------
// Azure OpenAI Embedding API Call
// --------------------
async function getQueryEmbedding(query) {
  const embeddingEndpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_EMBEDDING_MODEL}/embeddings?api-version=2023-06-01-preview`;
  
  try {
    const response = await axios.post(
      embeddingEndpoint,
      { input: query },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_API_KEY
        }
      }
    );
    const embedding = response.data.data[0].embedding;
    console.log("Computed embedding (first 5 values):", embedding.slice(0, 5));
    return embedding;
  } catch (error) {
    console.error("Embedding API error:", error.response?.data || error.message);
    throw error;
  }
}

// --------------------
// Azure AI Search
// --------------------
async function searchAzureAISearch(query, topK) {
  const searchEndpoint = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${process.env.AZURE_SEARCH_INDEX_NAME}/docs/search?api-version=2023-07-01-preview`;

  // Base request body always uses semantic search.
  const requestBody = {
    queryType: "semantic",
    queryLanguage: "en-us",
    semanticConfiguration: process.env.AZURE_SEMANTIC_CONFIGURATION,
    search: query,
    top: topK
  };

  // If vector search is enabled, compute the embedding and add the vector parameter.
  if (process.env.USE_VECTOR_SEARCH === "true") {
    try {
      const embedding = await getQueryEmbedding(query);
      console.log("Using vector search with embedding: yes");
      requestBody.vector = {
        value: embedding,
        fields: "embedding", // Must match your index's vector field.
        k: topK
      };
      // Optionally, you might later want to leverage the vector profile information within your index.
      // However, the vector profile is configured at the index level and does not need to be passed in the request.
    } catch (error) {
      console.error("Failed to compute query embedding, proceeding with semantic search only.");
    }
  }

  const response = await axios.post(
    searchEndpoint,
    requestBody,
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
  // Maximum characters per document source to avoid oversized prompts.
  const MAX_SOURCE_CHARACTERS = parseInt(process.env.MAX_SOURCE_CHARACTERS) || 1500;

  try {
    const searchResults = await searchAzureAISearch(message, topK);
    
    // Construct source string with trimmed content.
    const sources = searchResults.map(doc => {
      let content = doc.content;
      if (content.length > MAX_SOURCE_CHARACTERS) {
        content = content.substring(0, MAX_SOURCE_CHARACTERS) + '...';
      }
      return `Source: ${doc.url}\n${content}`;
    }).join("\n\n---\n\n");

    // Deduplicate citations based on URL.
    const seen = new Set();
    const citations = [];
    searchResults.forEach(doc => {
      if (doc.url && !seen.has(doc.url)) {
        seen.add(doc.url);
        citations.push({ url: doc.url });
      }
    });
    
    // Build the base prompt with your assistant instructions.
    const systemInstructions = process.env.AZURE_OPENAI_INSTRUCTIONS;
    const basePrompt = `${systemInstructions}\n\nUse only the information from the sources below to answer. If no answer is found, say you don’t know.\n\n`;
    
    // Estimate token usage (roughly 1 token ≈ 4 characters) and trim if necessary.
    let combinedSources = sources;
    const estimatedTokens = (basePrompt.length + combinedSources.length) / 4;
    const maxInputTokens = 3000; // Safe threshold.
    if (estimatedTokens > maxInputTokens) {
      const allowedCharLength = maxInputTokens * 4 - basePrompt.length;
      combinedSources = combinedSources.substring(0, allowedCharLength) + '...';
    }
    
    const prompt = basePrompt + combinedSources;

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
    const errorMessage = error.response?.data?.error?.message;

    if (status === 429) {
      console.warn("⚠️ Rate limit hit:", errorMessage);
      return res.status(429).json({
        error: true,
        reply: "⏳ We're getting a lot of requests right now. Please wait a moment and try again."
      });
    }

    console.error("❌ Chat error:", errorMessage || error.message);
    return res.status(500).json({
      error: true,
      reply: "⚠️ Something went wrong while generating a response."
    });
  }
});

// --------------------
// Speech Token Endpoint
// --------------------
app.get("/speech-enabled", (req, res) => {
  res.json({ enabled: process.env.ENABLE_SPEECH === "true" });
});

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
