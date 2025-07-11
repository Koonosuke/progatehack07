import { CognitoUserPool } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '', // ← あなたのユーザープールID
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '', // ← あなたのクライアントID
};

export const userPool = new CognitoUserPool(poolData);