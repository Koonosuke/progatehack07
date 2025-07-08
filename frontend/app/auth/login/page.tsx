'use client';

import { AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { userPool } from '../userPool';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const user = new CognitoUser({ Username: username, Pool: userPool });
    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: async (result) => {
        const idToken = result.getIdToken().getJwtToken();
        try{
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({ token: idToken })
          });
          if (!response.ok) throw new Error('APIでの認証設定に失敗');
          
          router.push('/home');
        } catch(apiError: any){
          setError(apiError.message);
          setIsLoading(false);
        }
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
