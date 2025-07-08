'use client';

import { AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { userPool } from '../userPool';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [isNewPasswordRequired, setIsNewPasswordRequired] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const cognitoUserRef = useRef<CognitoUser | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const user = new CognitoUser({ Username: username, Pool: userPool });

    cognitoUserRef.current = user;
    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: async (result) => {
        const idToken = result.getIdToken().getJwtToken();
        try{
          const response = await fetch('/web/api/auth/login', {
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
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        delete userAttributes.email_verified;
        delete userAttributes.phone_number_verified;

        setIsNewPasswordRequired(true);
        setIsLoading(false);
      },
    });
  };

  //新しいパスワード送信処理
  const handleNewPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!cognitoUserRef.current){
      setError("ユーザー情報が見つかりません．");
      setIsLoading(false);
      return ;
    }
    
    cognitoUserRef.current.completeNewPasswordChallenge(newPassword, null, {
      onSuccess: async (result) => {
        const idToken = result.getIdToken().getJwtToken();
        try{
          const response = await fetch('/web/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken }),
          });
          if (!response.ok) throw new Error('APIでの認証設定に失敗');
          router.push('/home');
        } catch (apiError: any){
          setError(apiError.message);
          setIsLoading(false);
        }
      },
      onFailure: (err) => {
        setError(err.message || "新しいパスワードの設定に失敗しました。");
        setIsLoading(false);
      },
    });
  };
//新しいパスワード設定用のフォーム
if (isNewPasswordRequired) {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className='text-3xl font-bold mb-6'>新しいパスワードを設定</h1>
      <form onSubmit={handleNewPasswordSubmit}>
        <input
        type="password"
        className="bg-gray-800 px-4 py-2 mb-4 w-full"
        placeholder="新しいパスワード"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        />
        <button type="submit" disabled={isLoading} className="bg-blue-600 px-4 py-2 rounded">
          {isLoading ? '設定中...' : 'パスワードを設定'}
        </button>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </form>
    </div>
  )
}
//通常
return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">ログイン</h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold">メールアドレス</label>
            <input
              className="bg-gray-700 px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ユーザー名またはメール"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold">パスワード</label>
            <input
              type="password"
              className="bg-gray-700 px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded w-full transition-colors disabled:opacity-50"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        {/* ▼▼▼ 2. ここに新規登録へのリンクを追加 ▼▼▼ */}
        <p className="text-center text-sm text-gray-400 mt-6">
          アカウントをお持ちでないですか？{' '}
          <Link href="/web/auth/register" className="text-blue-400 hover:underline">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  )
};
