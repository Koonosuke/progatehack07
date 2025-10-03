"use client";

import { LogOut, Users } from "lucide-react"; // ← アイコン（lucideなら軽量）
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await fetch("/web/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 sm:p-12">
      <div className="max-w-2xl mx-auto bg-gray-850 rounded-2xl shadow-2xl p-10 space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold mb-2">🎉 ようこそ！</h1>
          <p className="text-gray-300 text-lg">
            このページは認証済みユーザー専用です。
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm text-gray-400">通話をするなら</p>
            <button
              onClick={() => router.push("/users")}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow transition duration-200"
            >
              <Users className="w-5 h-5" />
              ユーザ一覧へ
            </button>
          </div>

          <div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg shadow transition duration-200"
            >
              <LogOut className="w-5 h-5" />
              サインアウト
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
