import { CognitoUserPool } from 'amazon-cognito-identity-js';

export const userPool = new CognitoUserPool({
  UserPoolId: 'us-west-2_ePLjLXZ6s', // ← あなたのユーザープールID
  ClientId: '107ks9i80v0trd5e6m76co435f', // ← あなたのクライアントID
});
