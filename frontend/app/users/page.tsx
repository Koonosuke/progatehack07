'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const dummyUsers = [
  { name: 'kishi', role: '聴者' },
  { name: 'taa', role: 'ろう者' },
  { name: 'suzu', role: 'ろう者' },
  { name: 'yuki', role: '聴者' },
];

export default function UsersPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState('自分の名前を入力'); // 後でCognito連携時に自動化予定

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
        {dummyUsers.map((user) => (
          <li
            key={user.name}
            className="flex items-center justify-between bg-gray-800 p-4 rounded-lg shadow-md"
          >
            <div>
              <div className="text-lg font-semibold">{user.name}</div>
              <div className="text-sm text-gray-400">{user.role}</div>
            </div>
            <button
              onClick={() => handleInvite(user.name)}
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
