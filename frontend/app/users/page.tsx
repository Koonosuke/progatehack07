'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

//アイテム型定義
interface User{
  userId: string;
  displayName: string;
  userType: string;
  email: string;
  createdAt: string;
}

const API_ENDPOINT = `${process.env.NEXT_PUBLIC_API_BASE_URL}/users`;

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading,setIsLoading] = useState(true);
  const [error, setError] = useState<String | null>(null);

  const [currentUser, setCurrentUser] = useState('自分の名前を入力');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok){
          throw new Error('データの取得に失敗しました');
        }
        const data: User[] = await response.json();
        setUsers(data);
      } catch (err){
        setError(err instanceof Error ? err.message : '不明なエラー');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  },[]);

  const handleInvite = (targetUser: string) => {
    const roomId = `${currentUser}_${targetUser}`;
    const url = `/call?room=${roomId}&user=${currentUser}`;
    router.push(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">ユーザー一覧</h1>

      <div className="mb-4">
        <label className="block mb-1 text-sm">あなたのユーザー名</label>
        <input
          type="text"
          value={currentUser}
          onChange={(e) => setCurrentUser(e.target.value)}
          className="px-4 py-2 rounded bg-gray-800 border border-gray-600 w-full max-w-md"
        />
      </div>

      <ul className="space-y-4">
        {users.map((user) => (
          <li
            key={user.userId}
            className="flex items-center justify-between bg-gray-800 p-4 rounded-lg shadow-md"
          >
            <div>
              <div className="text-lg font-semibold">{user.displayName}</div>
              <div className="text-sm text-gray-400">{user.userType}</div>
            </div>
            <button
              onClick={() => handleInvite(user.displayName)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              招待
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
