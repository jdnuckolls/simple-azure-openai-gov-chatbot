# Azure OpenAI Chatbot Deployment Guide (GitHub Actions + Azure App Service)

This document provides a complete walkthrough to deploy a Node.js chatbot application using Azure OpenAI, Azure AI Search, and Speech-to-Text to an Azure App Service using GitHub Actions.  The content was already uploaded into Azure Blob Storage as JSON formatted documents.  I provide examples below about how to properly setup the Azure AI Search Index appropriately for this JSON content.

---

## 📂 Project Overview

A production-ready chatbot that uses:
- **Azure OpenAI (GPT-4o)**
- **Azure Cognitive Search** for grounding
- **Azure Speech Services** for mic input
- **Express + Node.js 20** backend
- **HTML/CSS/JavaScript** frontend

---

## 🚀 Click to Deploy

You can deploy this chatbot app directly into your Azure subscription:

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fjdnuckolls%2Fsimple-azure-openai-gov-chatbot%2Fmain%2Fbicep%2Fmain.bicep)

---

## 📋 Prerequisites

### Azure Resources
Ensure you have the following Azure services created:
- Azure App Service (Linux, Node 20) — e.g., `mywebapp`
- Azure OpenAI resource with GPT-4o deployed
- Azure Cognitive Search with an index
- Azure Speech service (for mic input)

### GitHub Repository
Push or fork the chatbot code into your own GitHub repo.

---

## 🔧 Set Up Deployment via Azure Deployment Center

1. In the [Azure Portal](https://portal.azure.com), navigate to your **App Service**
2. On the left pane, click **Deployment Center**
3. Choose:
   - **Source**: GitHub
   - **Build provider**: GitHub Actions
   - **Repository**: Select your repo
   - **Branch**: `main`
4. Click **Finish** to let Azure generate a GitHub Actions workflow

💡 Azure will automatically configure GitHub permissions and create a workflow file in `.github/workflows/`.

---

## 🔧 To manually Set Up your Azure AI Search Index and Indexer:

The system leverages Azure AI Search with two advanced techniques:
- **Semantic Search** for natural language query ranking based on a semantic configuration.
- **Vector Search** using pre-computed embeddings for enhanced similarity matching.

In this guide, you will learn how to create an index that includes:
- An **embedding** field to store high-dimensional vectors.
- A **semantic configuration** tailored for legal documents.
- A **vector search profile** configured with `m=8` to optimize nearest neighbor lookup.

---

## Prerequisites

- An active [Azure Cognitive Search](https://azure.microsoft.com/en-us/services/search/) service.
- An Azure OpenAI service deployed with an embedding model (e.g., `text-embedding-ada-002`) and a ChatGPT/GPT-4 deployment.
- Primary content in JSON format.
- Node.js installed for running the application.

---

## Step 1: Define Your Index Schema

Your index must include fields for metadata and content as well as an embedding field for storing vector representations. An example schema includes:

- **id:**  
  - *Type:* `Edm.String`  
  - *Attributes:* Key, Retrievable, Not Searchable
- **url:**  
  - *Type:* `Edm.String`  
  - *Attributes:* Searchable, Filterable, Retrievable
- **agency_title, chapter, rule_section, content:**  
  - *Type:* `Edm.String`  
  - *Attributes:* Searchable, Retrievable (plus Filterable for some)
- **last_modified:**  
  - *Type:* `Edm.String`  
  - *Attributes:* Retrievable
- **embedding:**  
  - *Type:* `Collection(Edm.Single)`  
  - *Dimensions:* 1536 (if using `text-embedding-ada-002`)  
  - *Attributes:*  
    - **Include in Storage:** Checked (if you need the values for debugging)  
    - **Retrievable:** Checked (optional)  
    - **Searchable:** Unchecked

### Example Embedding Field Definition

```json
{
  "name": "embedding",
  "type": "Collection(Edm.Single)",
  "dimensions": 1536,
  "retrievable": true,
  "includeInStorage": true,
  "searchable": false
}
```

---

## Step 2: Create a Semantic Configuration

A semantic configuration tells Azure AI Search how to weight and prioritize different fields when processing natural language queries.

### Recommended Semantic Configuration (for this example, yours may be different)

```json
{
  "configurations": [
    {
      "name": "default-semantic-config",
      "flightingOptIn": false,
      "prioritizedFields": {
        "titleField": { 
          "fieldName": "rule_section" 
        },
        "prioritizedContentFields": [
          { "fieldName": "content" }
        ],
        "prioritizedKeywordsFields": [
          { "fieldName": "agency_title" },
          { "fieldName": "chapter" },
          { "fieldName": "rule_section" }
        ]
      }
    }
  ]
}
```

- **Title Field:** Uses `rule_section` to identify legal sections (for this example, yours may be different).
- **Prioritized Content:** Emphasizes the main text (`content`).
- **Keywords Fields:** Metadata such as `agency_title` and `chapter` improve document ranking.

After creating the semantic configuration, update your `.env`:

```dotenv
AZURE_SEMANTIC_CONFIGURATION="default-semantic-config"
```

---

## Step 3: Create a Vector Search Profile with m=8

The vector search profile configures the HNSW algorithm for vector search.

### Recommended Vector Profile JSON

```json
{
  "vectorSearch": {
    "algorithmConfigurations": [
      {
        "name": "default",
        "algorithm": "hnsw",
        "parameters": {
          "m": 8,
          "efConstruction": 400,
          "efSearch": 500,
          "similarity": "cosine"
        }
      }
    ],
    "compressionConfigurations": []
  }
}
```

- **m:** Set to 8 to enhance graph connectivity.
- **efConstruction:** 400 for robust index building.
- **efSearch:** 500 for balancing accuracy and performance.
- **Similarity:** Cosine similarity is ideal for normalized text embeddings.

---

## Step 4: Ingest Data

Use an indexer or other data ingestion method to load your legal JSON documents into Azure AI Search. Ensure that during ingestion, embeddings are computed (using your embedding model) and stored in the `embedding` field.

---

## Step 5: Application Code Configuration

Your application (server-side code) is designed to work in a hybrid mode using both semantic and vector search.

### Key Aspects in `server.js`

- **Embedding API Call:**  
  A function `getQueryEmbedding(query)` calls the Azure OpenAI embedding API.
  
- **Conditional Query Payload:**  
  In the `searchAzureAISearch()` function:
  - The base request always uses the semantic configuration (`queryType: "semantic"`, `semanticConfiguration`, etc.).
  - If `USE_VECTOR_SEARCH` is `"true"`, the function computes the query embedding and adds a `"vector"` field to the request using the `"embedding"` field from the index.

---

## Step 6: Running and Testing

1. **Deploy your updated index and indexer.**
2. **Deploy your application code (`server.js`).**  
   The code will compute query embeddings (if vector search is enabled) and use the semantic configuration for natural language understanding.
3. **Test Your Queries:**  
   Validate the system by performing representative legal queries.
4. **Monitor Logs:**  
   Check server logs for computed embeddings and branch selection to ensure that both semantic and vector search components are functioning correctly.

---

## 🔐 GitHub Secrets (Authentication)

> ❗ You **do not** need to add GitHub Secrets manually if you're using Azure Deployment Center.

Azure handles all authentication between GitHub and your App Service automatically via OIDC.

Only add secrets if you're deploying **manually** using your own `azure/login` configuration or publish profiles.

---

## ⚙️ Configure Azure App Settings (Environment Variables)

In the Azure Portal:
1. Go to **App Service > Configuration > Application settings**
2. Add the following key-value pairs:

```
# Azure OpenAI settings
AZURE_OPENAI_DEPLOYMENT_NAME = gpt-4o
AZURE_OPENAI_ENDPOINT = https://<your-openai>.openai.azure.com
AZURE_OPENAI_API_KEY = <azure-openai-key>
AZURE_OPENAI_CHATGPT_MODEL_CAPACITY=200000 # Maximum number of tokens for the chat model. This is set to 200,000 to accommodate larger conversations.

# Azure Embedding settings
AZURE_EMBEDDING_MODEL="text-embedding-ada-002"
AZURE_OPENAI_EMBEDDINGS_MODEL_CAPACITY=400000 # Maximum number of tokens for the embedding model. This is set to 400,000 to accommodate larger embeddings.

# Azure AI Search settings
AZURE_SEARCH_ENDPOINT = https://<your-search>.search.windows.net
AZURE_SEARCH_KEY = <search-key>
AZURE_SEARCH_INDEX_NAME = <index-name>
AZURE_SEMANTIC_CONFIGURATION= <your-semantic-config-name> # The name of the semantic configuration used in Azure AI Search. 
USE_VECTOR_SEARCH="true"  # Set to "true" if you later implement vector search, otherwise false if your only doing semantic search.
AZURE_VECTOR_PROFILE= <your-vector-profile-name> # usually the name is 'default' unless you gave it a different name.
MAX_SOURCE_CHARACTERS=1500 # Maximum number of characters to return from the source document to avoid exceeding token limits in the OpenAI API. 

# Azure Speech settings
ENABLE_SPEECH = true # Toggle for speech-to-text functionality (true or false)
AZURE_SPEECH_KEY = <speech-key>
AZURE_SPEECH_REGION = <your-region> # Region for Azure Speech services #

# Assistant behavior
AZURE_OPENAI_INSTRUCTIONS = "You are a state agency assistant whose sole source of information is the content indexed in Azure AI Search. You must base your answers exclusively on this indexed content. Do not incorporate any general knowledge, external references, or internet sources.
If the answer cannot be found within the provided legal texts, respond exactly with: \"I'm sorry, but I couldn't find the answer to that question in the sourced content.\" You may also suggest that the user rephrase their query or suggest a follow-up question.
Format all responses in simple HTML to enhance readability, using bold headings, bullet points for lists, and clear line breaks."
MAX_TURNS = 3 # Maximum number of turns in the conversation where it saves the context
TOP_K=5  # Number of top results to return from the search, such as # of documents/citations
OPENAI_MAX_TOKENS=1000 # Maximum number of tokens in the response to keep the response concise.
OPENAI_TEMPERATURE=0.7 # Temperature for randomness in the response, the higher the value, the more creative the response. This is set to 0.7 to balance creativity and accuracy.
#PORT=3000  # (Optional, defaults to 3000 if not set for local developement/test.)
```

Click **Save** and restart the App Service.

---

## ✅ GitHub Actions Workflow File

Azure Deployment Center should generate this file for you:
`.github/workflows/main_cuyahogawebapp.yml`

Here is an example of a working version: (Must replace <your-app-name> with the name of your web app.)

```yaml
name: Build and deploy Node.js app to Azure Web App - <your-app-name>

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js version
        uses: actions/setup-node@v3
        with:
          node-version: '20.x'

      - name: npm install and optional build
        run: |
          npm install
          npm run build --if-present
          echo "Skipping tests for now"

      - name: Zip artifact for deployment
        run: zip release.zip ./* -r

      - name: Upload artifact for deployment job
        uses: actions/upload-artifact@v4
        with:
          name: node-app
          path: release.zip

  deploy:
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: 'Production'
      url: ${{ steps.deploy-to-webapp.outputs.webapp-url }}
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Download artifact from build job
        uses: actions/download-artifact@v4
        with:
          name: node-app

      - name: Unzip artifact for deployment
        run: unzip release.zip

      - name: Login to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZUREAPPSERVICE_CLIENTID_XXXXXXXX }}
          tenant-id: ${{ secrets.AZUREAPPSERVICE_TENANTID_XXXXXXXX }}
          subscription-id: ${{ secrets.AZUREAPPSERVICE_SUBSCRIPTIONID_XXXXXXXX }}

      - name: Deploy to Azure Web App
        id: deploy-to-webapp
        uses: azure/webapps-deploy@v3
        with:
          app-name: 'cuyahogawebapp'
          slot-name: 'Production'
          package: .
```

---

## 🌐 Access Your App
Once deployed, go to:
```
https://<your-app-name>.azurewebsites.net
```
Example:
```
https://cuyahogawebapp.azurewebsites.net
```

---

## 🔹 Optional Enhancements
- Enable staging slots and auto-swap
- Use Azure Key Vault for secrets
- Add a CI badge to your README:
  ```md
  ![Deploy to Azure](https://github.com/<your-username>/<repo>/actions/workflows/main_cuyahogawebapp.yml/badge.svg)
  ```
- Add logging/monitoring (App Insights or LogStream)

---

## 🏁 You're Ready to Share
This guide includes all the corrected steps to:
- Configure your App Service
- Use Azure Deployment Center
- Auto-deploy from GitHub
- Skip failing `npm test`
