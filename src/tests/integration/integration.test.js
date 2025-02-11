const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const axios = require('axios');

const ssmClient = new SSMClient({ region: 'us-west-2' });

async function getApiEndpoint() {
  const command = new GetParameterCommand({
    Name: '/canary/dev/api-gateway-url'
  });
  const response = await ssmClient.send(command);
  return response.Parameter.Value;
}

describe('API Integration Tests', () => {
  let apiEndpoint;

  beforeAll(async () => {
    apiEndpoint = await getApiEndpoint();
  });

  test('API should return correct response', async () => {
    const response = await axios.get(apiEndpoint);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('message');
  });
});