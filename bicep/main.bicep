param siteName string = 'simpleragchat-app'
param hostingPlanName string = 'simpleragchat-plan'
param location string = resourceGroup().location
param skuName string = 'B1'

resource hostingPlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: hostingPlanName
  location: location
  sku: {
    name: skuName
    tier: 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2022-03-01' = {
  name: siteName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: hostingPlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appSettings: [
        {
          name: 'AZURE_OPENAI_DEPLOYMENT_NAME'
          value: 'gpt-4o'
        }
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: 'https://<your-openai>.openai.azure.com'
        }
        {
          name: 'AZURE_OPENAI_API_KEY'
          value: '<azure-openai-key>'
        }
        {
          name: 'AZURE_OPENAI_CHATGPT_MODEL_CAPACITY'
          value: '200000'
        }
        {
          name: 'AZURE_EMBEDDING_MODEL'
          value: 'text-embedding-ada-002'
        }
        {
          name: 'AZURE_OPENAI_EMBEDDINGS_MODEL_CAPACITY'
          value: '400000'
        }
        {
          name: 'AZURE_SEARCH_ENDPOINT'
          value: 'https://<your-search>.search.windows.net'
        }
        {
          name: 'AZURE_SEARCH_KEY'
          value: '<search-key>'
        }
        {
          name: 'AZURE_SEARCH_INDEX_NAME'
          value: '<index-name>'
        }
        {
          name: 'AZURE_SEMANTIC_CONFIGURATION'
          value: '<your-semantic-config-name>'
        }
        {
          name: 'USE_VECTOR_SEARCH'
          value: 'true'
        }
        {
          name: 'AZURE_VECTOR_PROFILE'
          value: '<your-vector-profile-name>'
        }
        {
          name: 'MAX_SOURCE_CHARACTERS'
          value: '1500'
        }
        {
          name: 'ENABLE_SPEECH'
          value: 'true'
        }
        {
          name: 'AZURE_SPEECH_KEY'
          value: '<speech-key>'
        }
        {
          name: 'AZURE_SPEECH_REGION'
          value: '<your-region>'
        }
        {
          name: 'AZURE_OPENAI_INSTRUCTIONS'
          value: 'You are a state agency assistant whose sole source of information is the content indexed in Azure AI Search. You must base your answers exclusively on this indexed content. Do not incorporate any general knowledge, external references, or internet sources. If the answer cannot be found within the provided legal texts, respond exactly with: "I\'m sorry, but I couldn\'t find the answer to that question in the sourced content." You may also suggest that the user rephrase their query or suggest a follow-up question. Format all responses in simple HTML to enhance readability, using bold headings, bullet points for lists, and clear line breaks.'
        }
        {
          name: 'MAX_TURNS'
          value: '3'
        }
        {
          name: 'TOP_K'
          value: '5'
        }
        {
          name: 'OPENAI_MAX_TOKENS'
          value: '1000'
        }
        {
          name: 'OPENAI_TEMPERATURE'
          value: '0.7'
        }
      ]
    }
  }
}

output siteUrl string = 'https://${webApp.name}.azurewebsites.net'
