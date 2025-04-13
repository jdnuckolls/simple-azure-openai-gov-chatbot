# 🎙️ Azure OpenAI + AI Search Chatbot with Speech-to-Text

This is a production-ready chatbot using:
- [Azure OpenAI Service (GPT-4o)](https://learn.microsoft.com/en-us/azure/cognitive-services/openai/)
- [Azure Cognitive Search](https://learn.microsoft.com/en-us/azure/search/)
- [Azure Speech Service](https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/)
- Node.js backend (Express)
- HTML/CSS/JS frontend with microphone input

---

## 🚀 Features

✅ Ask natural questions  
✅ Pulls real answers from your AI Search index  
✅ Mic icon to speak your question (Azure Speech-to-Text)  
✅ Only shows citations when it finds valid answers  
✅ Easily deployable to Azure App Service or any container

---

## 📦 Folder Structure

```
simpleragchat-deployable/
├── server.js               # Node.js API (chat + speech-token)
├── package.json            # Includes start script
├── .env.example            # Sample environment file
├── .gitignore              # Ignore secrets and node_modules
├── README.md               # You’re reading this
├── bicep/main.bicep        # (optional) deploys App Service infra
└── simple-chatbot/
    └── public/
        ├── index.html
        ├── styles.css
        ├── script.js
        ├── mic.png
        └── gov-ai-logo.png
```

---

## 🧪 Local Development

1. Copy `.env.example` to `.env` and update with your Azure values.
2. Install dependencies:

```bash
npm install
```

3. Run the app:

```bash
npm start
```

4. Open your browser to `http://localhost:3000`

---

## ☁️ Deploy to Azure (Manual or GitHub)

### 📘 Manual via Azure Portal

1. Create an Azure Web App (Node.js 18)
2. Go to **Deployment Center** → Connect GitHub → Your Repo
3. Go to **Configuration** → Add `.env` values as App Settings
4. Sync and you're live 🎉

### 🔁 Deploy via Bicep

If you want to automate:

```bash
az deployment sub create   --location eastus   --template-file bicep/main.bicep   --parameters appName=my-chatbot-app
```

---

## ⚙️ Required Environment Variables

These are required in `.env` (or Azure App Settings):

| Name | Description |
|------|-------------|
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Your GPT deployment name |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key |
| `AZURE_SEARCH_ENDPOINT` | Azure AI Search endpoint |
| `AZURE_SEARCH_KEY` | AI Search key |
| `AZURE_SEARCH_INDEX_NAME` | Index name |
| `AZURE_SPEECH_KEY` | Speech key |
| `AZURE_SPEECH_REGION` | Region (e.g., eastus) |
| `ENABLE_SPEECH` | Enable mic (true/false) |
| `AZURE_OPENAI_INSTRUCTIONS` | System prompt grounding |
| `OPENAI_MAX_TOKENS` | Max token count per reply |
| `OPENAI_TEMPERATURE` | Creativity/variation of GPT |
| `TOP_K` | How many search results to use |
| `MAX_TURNS` | Chat memory turns to retain |
| `PORT` | Used by Azure |

---

## 📎 License

MIT — feel free to fork, extend, and rebrand.
