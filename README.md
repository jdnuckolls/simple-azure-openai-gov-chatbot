# Simple Azure OpenAI Government Chatbot

A standalone Azure OpenAI RAG reference application for government and public-sector website content. It uses Azure AI Search for grounding, Azure OpenAI for response generation, and optional Azure Speech for microphone input.

This repo is intended to pair with [`azurefunction_webcrawler_to_blobstorage`](https://github.com/jdnuckolls/azurefunction_webcrawler_to_blobstorage):

```text
Website(s)
  -> azurefunction_webcrawler_to_blobstorage
  -> Azure Blob Storage normalized JSON
  -> Azure AI Search integrated vectorization
  -> this standalone chatbot
```

## Features

- Standalone full-page chatbot UI
- Express + Node.js backend
- Azure AI Search semantic + vector retrieval
- Modern `vectorQueries` support
- Azure AI Search integrated query-time vectorization by default
- Optional legacy app-side query embeddings
- Crawler metadata-aware citations
- Optional managed identity authentication
- Optional Azure Speech microphone input
- Bicep starter for Azure App Service deployment

## Related repositories

| Repository | Role |
| --- | --- |
| `azurefunction_webcrawler_to_blobstorage` | Crawls websites and writes normalized JSON source documents to Blob Storage. |
| `simple-azure-openai-gov-chatbot` | Standalone RAG reference app. |
| `azurewebapp_popup_openai_chatbot` | Embeddable popup chatbot widget for existing websites. |

## Expected Azure AI Search index

The app defaults to the chunk index created by the crawler repo's `infra/azure-search` templates:

| Field | Purpose |
| --- | --- |
| `content` | Chunk text used as grounding context. |
| `content_vector` | Vector field populated by Azure AI Search integrated vectorization. |
| `title` | Citation label and semantic title. |
| `url` | Citation link. |
| `canonical_url` | Normalized source URL fallback. |
| `site`, `path`, `content_type`, `source_engine` | Metadata for filters and context. |
| `crawl_timestamp`, `last_modified` | Freshness metadata. |

See [Crawler integration](docs/crawler-integration.md) for details.

## Local setup

```bash
git clone https://github.com/jdnuckolls/simple-azure-openai-gov-chatbot.git
cd simple-azure-openai-gov-chatbot
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`.

## Required settings

```dotenv
AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o"
AZURE_OPENAI_ENDPOINT="https://your-openai-endpoint.openai.azure.com"
AZURE_OPENAI_API_KEY="your-azure-openai-api-key"
AZURE_OPENAI_API_VERSION="2024-02-15-preview"

AZURE_SEARCH_ENDPOINT="https://your-search-endpoint.search.windows.net"
AZURE_SEARCH_KEY="your-azure-search-key"
AZURE_SEARCH_INDEX_NAME="website-knowledge-chunks"
AZURE_SEARCH_API_VERSION="2024-07-01"
AZURE_SEMANTIC_CONFIGURATION="semantic-config"

USE_VECTOR_SEARCH="true"
USE_SEARCH_INTEGRATED_VECTORIZATION="true"
AZURE_VECTOR_FIELD="content_vector"
AZURE_CONTENT_FIELD="content"
AZURE_TITLE_FIELD="title"
AZURE_URL_FIELD="url"
```

Use `AZURE_SEARCH_FILTER` to scope an app instance to one site or section:

```dotenv
AZURE_SEARCH_FILTER="site eq 'example.com' and startswith(path, '/agency')"
```

## Authentication modes

For local demos:

```dotenv
AUTH_MODE="api_key"
```

For Azure App Service, prefer managed identity:

```dotenv
AUTH_MODE="managed_identity"
```

When using managed identity, assign the web app identity appropriate Azure AI Search and Azure OpenAI RBAC permissions. API keys can remain available for local development and simple demos.

## Deployment

You can deploy to Azure App Service through Azure Deployment Center, GitHub Actions, or the included Bicep starter in `bicep/main.bicep`.

For the full end-to-end content pipeline:

1. Deploy the crawler repo and write normalized JSON to Blob Storage.
2. Deploy the crawler repo's Azure AI Search templates to create `website-knowledge-chunks`.
3. Configure this app with the Search endpoint, index name, semantic configuration, and Azure OpenAI deployment.
4. Start the web app and test grounded answers with citations.

## Security

- Never commit `.env`, real app settings, keys, tokens, or connection strings.
- Do not put secrets in browser-accessible files.
- Prefer managed identity and RBAC for production or government deployments.
- Use Key Vault references for App Service settings when possible.
