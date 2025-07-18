/**
 * Script to deploy the backend to AWS Lambda
 * 
 * Usage:
 * node scripts/deploy.js [environment]
 * 
 * Environment: dev (default), staging, prod
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { AWS } = require('aws-sdk');

// Get environment from command line args
const environment = process.argv[2] || 'dev';
const validEnvironments = ['dev', 'staging', 'prod'];

if (!validEnvironments.includes(environment)) {
  console.error(`Invalid environment: ${environment}. Must be one of: ${validEnvironments.join(', ')}`);
  process.exit(1);
}

console.log(`Deploying backend to ${environment} environment...`);

// Build the NestJS application
console.log('Building NestJS application...');
execSync('npm run build', { stdio: 'inherit' });

// Create a deployment package
console.log('Creating deployment package...');
const deployDir = path.join(__dirname, '../deploy');
const zipFile = path.join(deployDir, 'function.zip');

// Create deploy directory if it doesn't exist
if (!fs.existsSync(deployDir)) {
  fs.mkdirSync(deployDir);
}

// Zip the dist folder and node_modules
execSync(`zip -r ${zipFile} dist node_modules package.json`, { stdio: 'inherit' });

// Get stack outputs to find the Lambda function name
console.log('Getting CloudFormation stack outputs...');
const stackName = `bingo-web-app-${environment}`;
const cfOutputs = JSON.parse(
  execSync(`aws cloudformation describe-stacks --stack-name ${stackName} --query 'Stacks[0].Outputs' --output json`, 
  { encoding: 'utf-8' })
);

// Find Lambda function name
const lambdaFunctionName = `bingo-backend-${environment}`;

// Update Lambda function code
console.log(`Updating Lambda function: ${lambdaFunctionName}...`);
execSync(`aws lambda update-function-code --function-name ${lambdaFunctionName} --zip-file fileb://${zipFile}`, 
  { stdio: 'inherit' });

console.log('Deployment complete!');

// Clean up
console.log('Cleaning up...');
fs.unlinkSync(zipFile);
console.log('Done!');