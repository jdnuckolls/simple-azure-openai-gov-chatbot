# Simple Azure OpenAI + AI Search Chatbot

This is a Node.js web chatbot that uses:
- Azure OpenAI (GPT-4o)
- Azure Cognitive Search
- Azure Speech-to-Text (via a microphone icon)
- Static HTML/CSS/JS frontend

## 🔧 How to Run Locally

1. Copy `.env.example` to `.env` and fill in your Azure keys.
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

4. Visit `http://localhost:3000` in your browser.

## ☁️ How to Deploy to Azure App Service

1. Push this code to a GitHub repo
2. In Azure Portal:
   - Create a Node.js 18 Web App
   - Go to **Deployment Center** and connect GitHub
   - Go to **Configuration > Application settings** and add everything from `.env`
3. Click **Sync** to deploy

## 🧠 Environment Variables

These are required:

| Variable | Description |
|----------|-------------|
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Name of your deployed model (e.g., `gpt-4o`) |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key |
| `AZURE_SEARCH_ENDPOINT` | Azure AI Search endpoint |
| `AZURE_SEARCH_KEY` | Azure AI Search key |
| `AZURE_SEARCH_INDEX_NAME` | Index name |
| `AZURE_SPEECH_KEY` | Azure Speech API key |
| `AZURE_SPEECH_REGION` | Speech region (e.g., `eastus`) |
| `ENABLE_SPEECH` | Enable mic (true/false) |
| `AZURE_OPENAI_INSTRUCTIONS` | Chatbot grounding prompt |
| `MAX_TURNS` | Conversation memory depth |
| `TOP_K` | Number of docs to retrieve from search |
| `OPENAI_MAX_TOKENS` | Max GPT tokens per reply |
| `OPENAI_TEMPERATURE` | GPT response randomness |

## 🚀 Optional: Deploy with Bicep

You can deploy to Azure with:

```bash
az deployment sub create --location eastus --template-file bicep/main.bicep --parameters appName=your-app-name
```

Ensure you update the `main.bicep` file with your resource group, keys, and names.
