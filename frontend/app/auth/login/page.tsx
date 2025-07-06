'use client';

import { CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { userPool } from '../userPool';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = () => {
    const user = new CognitoUser({ Username: username, Pool: userPool });
    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: (result) => {
        console.log('ログイン成功', result);
        sessionStorage.setItem('username', username); // 簡易保持
        router.push('/users');
      },
      onFailure: (err) => {
        alert('ログイン失敗: ' + err.message);
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">ログイン</h1>
      <input
        className="bg-gray-800 px-4 py-2 mb-4 w-full"
        placeholder="ユーザー名またはメール"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        className="bg-gray-800 px-4 py-2 mb-4 w-full"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin} className="bg-blue-600 px-4 py-2 rounded">
        ログイン
      </button>
    </div>
  );
}
