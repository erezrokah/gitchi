const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
require('dotenv').config();

const getStackOutputs = async provider => {
  const yamlContent = await fs.readFile(`serverless.yml`);
  const serviceName = yaml.safeLoad(yamlContent).service;
  const { stage, region } = provider.options;
  const stackName = `${serviceName}-${stage}`;
  const result = await provider.request(
    'CloudFormation',
    'describeStacks',
    { StackName: stackName },
    stage,
    region,
  );

  const outputsArray = result.Stacks[0].Outputs;

  const outputs = {};
  for (let i = 0; i < outputsArray.length; i++) {
    outputs[outputsArray[i].OutputKey] = outputsArray[i].OutputValue;
  }

  return outputs;
};

const updateSSM = async (provider, endpoint) => {
  const { authSsmParameters } = serverless.variables.service.custom;
  const { stage, region } = provider.options;

  const stageUpperCase = stage.toUpperCase();

  const envs = {
    REDIRECT_URL: `${endpoint}/callback`,
    GIT_HOSTNAME: 'https://github.com',
    OAUTH_TOKEN_PATH: '/login/oauth/access_token',
    OAUTH_AUTHORIZE_PATH: '/login/oauth/authorize',
    OAUTH_CLIENT_ID: process.env[`${stageUpperCase}_OAUTH_CLIENT_ID`],
    OAUTH_CLIENT_SECRET: process.env[`${stageUpperCase}_OAUTH_CLIENT_SECRET`],
    OAUTH_SCOPES: 'repo',
  };

  const params = Object.keys(authSsmParameters).map(key => ({
    Name: authSsmParameters[key],
    Value: envs[key],
    Type: 'SecureString',
    Overwrite: true,
  }));

  await Promise.all(
    params.map(p => provider.request('SSM', 'putParameter', p, stage, region)),
  );
};

const generateEnvFile = async (provider, endpoint) => {
  const { stage } = provider.options;

  const stageUpperCase = stage.toUpperCase();

  const content = [
    `REACT_APP_OAUTH_CLIENT_ID=${process.env[
      `${stageUpperCase}_OAUTH_CLIENT_ID`
    ] || ''}`,
    `REACT_APP_AUTH_ENDPOINT=${endpoint || ''}`,
  ].join(os.EOL);

  await fs.writeFile(
    path.join(__dirname, '..', '..', 'frontend', '.env'),
    content,
  );
};

const setupFrontendEnvFile = async () => {
  try {
    const provider = serverless.getProvider('aws');
    const { ServiceEndpoint: endpoint } = await getStackOutputs(provider);
    await updateSSM(provider, endpoint);
    await generateEnvFile(provider, endpoint);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};

setupFrontendEnvFile();
