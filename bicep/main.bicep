param siteName string = 'simpleragchat-app'
param hostingPlanName string = 'simpleragchat-plan'
param location string = resourceGroup().location
param skuName string = 'B1'
param repoUrl string = 'https://github.com/jdnuckolls/azure-openai-chatbot'
param branch string = 'main'

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
          value: 'https://your-openai-resource.openai.azure.com'
        }
        {
          name: 'AZURE_OPENAI_API_KEY'
          value: '<replace-with-your-key>'
        }
        {
          name: 'AZURE_SEARCH_ENDPOINT'
          value: 'https://your-search.search.windows.net'
        }
        {
          name: 'AZURE_SEARCH_KEY'
          value: '<replace-with-your-search-key>'
        }
        {
          name: 'AZURE_SEARCH_INDEX_NAME'
          value: 'your-index-name'
        }
        {
          name: 'AZURE_SPEECH_KEY'
          value: '<replace-with-your-speech-key>'
        }
        {
          name: 'AZURE_SPEECH_REGION'
          value: 'eastus'
        }
        {
          name: 'ENABLE_SPEECH'
          value: 'true'
        }
        {
          name: 'AZURE_OPENAI_INSTRUCTIONS'
          value: 'You are a helpful assistant...'
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
          value: '800'
        }
        {
          name: 'OPENAI_TEMPERATURE'
          value: '0.3'
        }
        {
          name: 'PORT'
          value: '3000'
        }
      ]
    }
  }
}

output siteUrl string = 'https://${webApp.name}.azurewebsites.net'
