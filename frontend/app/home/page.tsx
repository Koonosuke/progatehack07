'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // ログアウトAPIを呼び出してCookieを削除
      await fetch('/web/api/auth/logout', { method: 'POST' });
      // basePathを考慮し、/auth/loginへ遷移
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>ようこそ！</h1>
      <p>ここは認証されたユーザーのみが見ることができます。</p>
      <button onClick={handleSignOut} style={{ marginTop: '1rem' }}>
        サインアウト
      </button>
    </div>
  );
}