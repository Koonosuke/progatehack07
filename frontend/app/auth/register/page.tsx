'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_ENDPOINT = process.env.NEXT_PUBLIC_REGISTER_API_URL

export default function RegisterPage(){
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [displayName, setDisplayName] = useState('');
	const [userType, setUserType] = useState('listener');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		//エンドポイントチェック
		if (!API_ENDPOINT) {
			setError("APIエンドポイントが設定されていません．");
			setIsLoading(false);
			return;
		}

		try{
			const response = await fetch(`${API_ENDPOINT}/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					password,
					displayName,
					userType,
				}),
			});
			const data = await response.json();

			if (!response.ok){
				throw new Error(data.error || '不明なエラーが発生しました．');
			}

			router.push('/auth/login');
		} catch(error: any){
			setError(error.message);
		} finally{
			setIsLoading(false);
		}
	};

	return(
	<div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">新規登録</h1>
        <form onSubmit={handleSubmit}>
          {/* 表示名 */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold">表示名</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="bg-gray-700 px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* メールアドレス */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-700 px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* パスワード */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-gray-700 px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* ユーザータイプ */}
          <div className="mb-6">
            <label className="block mb-2 text-sm font-bold">ユーザータイプ</label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              className="bg-gray-700 px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="listener">listener（聴者）</option>
              <option value="deaf">deaf（ろう者）</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded w-full transition-colors disabled:opacity-50"
          >
            {isLoading ? '登録中...' : '登録する'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-6">
          すでにアカウントをお持ちですか？{' '}
          <Link href="/web/auth/login" className="text-blue-400 hover:underline">
            ログイン
          </Link>
        </p>
      </div>
	</div>
	);
}