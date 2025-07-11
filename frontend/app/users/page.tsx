'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// DynamoDBのユーザーアイテムの型定義
interface User {
  userId: string;
  displayName: string;
  userType: string;
  email: string;
  createdAt: string;
}

// CognitoのIDトークンのペイロードの型定義
interface DecodedToken {
  sub: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// 招待ボタン用のアイコンコンポーネント
const VideoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 001.553.832l3-2a1 1 0 000-1.664l-3-2z" />
  </svg>
);

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      let userSub = '';

      // 1. localStorageからログインユーザー情報を取得
      try {
        // localStorageからIDトークンを取得
        const idToken = localStorage.getItem(Object.keys(localStorage).find(key => key.endsWith('.idToken')) || '');
        if (!idToken) throw new Error('ID token not found.');

        // JWTをデコードしてdisplayNameを取得
        const payloadBase64 = idToken.split('.')[1];
        const decodedPayload: DecodedToken = JSON.parse(atob(payloadBase64));
        userSub = decodedPayload.sub;
        
        if (!userSub) throw new Error('User sub not found in token.');

      } catch (e) {
        console.error("Authentication Error:", e);
        router.push('/auth/login'); // 無効ならログインページへ
        return; 
      }

      // 2. ユーザーのリストを取得
      try {
        // 自分のユーザ名を取得する
        const nameResponse = await fetch(`${API_BASE_URL}/getCurrentUserName?sub=${userSub}`)
        if (!nameResponse.ok) throw new Error('現在のユーザー名の取得に失敗しました');

        const nameData = await nameResponse.json();
        const loggedInUserName = nameData.displayName;
        setCurrentUser(loggedInUserName);

        //全ユーザを取得
        const usersResponse = await fetch(`${API_BASE_URL}/users`);
        if (!usersResponse.ok) throw new Error('ユーザーリストの取得に失敗しました');
        
        const data: User[] = await usersResponse.json();
        // 自分自身をリストから除外してセット
        setUsers(data.filter(user => user.displayName !== loggedInUserName));

      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーです');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleInvite = (targetUser: string) => {
    if (!currentUser) {
      alert('ユーザー情報の取得に失敗しました。');
      return;
    }
    // roomIDが一意になるように名前をソートしてから結合
    const roomId = [currentUser, targetUser].sort().join('_');
    const url = `/call?room=${roomId}&user=${currentUser}`;
    router.push(url);
  };

  if (isLoading) return <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">読み込み中...</div>;
  if (error) return <div className="flex justify-center items-center min-h-screen bg-gray-900 text-red-500">エラー: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight">オンラインユーザー</h1>
          <p className="text-gray-400 mt-2">通話したい相手を招待しましょう</p>
        </header>

        <ul className="space-y-4">
          {users.map((user) => (
            <li
              key={user.userId}
              className="flex items-center bg-gray-800 p-4 rounded-xl shadow-lg transition-all duration-300 hover:bg-gray-700 hover:scale-105"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-xl mr-4">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-grow">
                <div className="text-lg font-semibold">{user.displayName}</div>
                <div className="text-sm text-gray-400">{user.userType}</div>
              </div>
              <button
                onClick={() => handleInvite(user.displayName)}
                className="flex items-center justify-center bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-bold px-5 py-2 rounded-full transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <VideoIcon />
                <span>招待</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}