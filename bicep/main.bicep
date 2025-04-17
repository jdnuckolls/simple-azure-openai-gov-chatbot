@description('Prefix to be applied to all resource names, e.g., agency1')
param namePrefix string

@description('Location for all resources')
param location string = resourceGroup().location

@description('Azure OpenAI Model deployment name (e.g., gpt-4o)')
param openAiDeploymentName string = 'gpt-4o'

@description('Azure OpenAI Model Embedding (e.g., text-embedding-ada-002)')
param openAiEmbeddingModel string = 'text-embedding-ada-002'

@description('Azure OpenAI endpoint URL')
param openAiEndpoint string

@secure()
@description('Azure OpenAI API key')
param openAiApiKey string

@description('Azure Search endpoint URL')
param searchEndpoint string

@secure()
@description('Azure Search key')
param searchKey string

@description('Azure Search index name')
param searchIndexName string

@description('Azure semantic configuration name')
param semanticConfigName string

@description('Azure vector profile name')
param vectorProfileName string

@description('Azure Speech key')
param speechKey string

@description('Azure Speech region')
param speechRegion string

var appServicePlanName = 'appservice-${namePrefix}'
var webAppName = 'webapp-${namePrefix}'
var storageAccountName = toLower('storage${uniqueString(resourceGroup().id, namePrefix)}')
var speechServiceName = 'speech-${namePrefix}'
var aiSearchName = 'search-${namePrefix}'

resource hostingPlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
}

resource webApp 'Microsoft.Web/sites@2022-03-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: hostingPlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appSettings: [
        {name: 'AZURE_OPENAI_DEPLOYMENT_NAME', value: openAiDeploymentName}
        {name: 'AZURE_OPENAI_ENDPOINT', value: openAiEndpoint}
        {name: 'AZURE_OPENAI_API_KEY', value: openAiApiKey}
        {name: 'AZURE_OPENAI_CHATGPT_MODEL_CAPACITY', value: '200000'}
        {name: 'AZURE_EMBEDDING_MODEL', value: openAiEmbeddingModel}
        {name: 'AZURE_OPENAI_EMBEDDINGS_MODEL_CAPACITY', value: '400000'}
        {name: 'AZURE_SEARCH_ENDPOINT', value: searchEndpoint}
        {name: 'AZURE_SEARCH_KEY', value: searchKey}
        {name: 'AZURE_SEARCH_INDEX_NAME', value: searchIndexName}
        {name: 'AZURE_SEMANTIC_CONFIGURATION', value: semanticConfigName}
        {name: 'USE_VECTOR_SEARCH', value: 'true'}
        {name: 'AZURE_VECTOR_PROFILE', value: vectorProfileName}
        {name: 'MAX_SOURCE_CHARACTERS', value: '1500'}
        {name: 'ENABLE_SPEECH', value: 'true'}
        {name: 'AZURE_SPEECH_KEY', value: speechKey}
        {name: 'AZURE_SPEECH_REGION', value: speechRegion}
        {name: 'AZURE_OPENAI_INSTRUCTIONS', value: 'You are a state agency assistant whose sole source of information is the content indexed in Azure AI Search. You must base your answers exclusively on this indexed content. Do not incorporate any general knowledge, external references, or internet sources. If the answer cannot be found within the provided legal texts, respond exactly with: "I\'m sorry, but I couldn\'t find the answer to that question in the sourced content." You may also suggest that the user rephrase their query or suggest a follow-up question. Format all responses in simple HTML to enhance readability, using bold headings, bullet points for lists, and clear line breaks.'}
        {name: 'MAX_TURNS', value: '3'}
        {name: 'TOP_K', value: '5'}
        {name: 'OPENAI_MAX_TOKENS', value: '1000'}
        {name: 'OPENAI_TEMPERATURE', value: '0.7'}
      ]
    }
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

resource speechService 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: speechServiceName
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'SpeechServices'
  properties: {}
}

resource aiSearch 'Microsoft.Search/searchServices@2023-11-01' = {
  name: aiSearchName
  location: location
  sku: {
    name: 'standard'
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
  }
}

output webAppEndpoint string = 'https://${webApp.properties.defaultHostName}'
