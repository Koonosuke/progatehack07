"use client";

import RippleBackground from "@/components/hamon";
import SignChatHeader from "@/components/SignChatHeader"; // ← 追加
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen text-white flex items-center justify-center">
      <RippleBackground />
      <div className="min-h-screen  text-white p-6 sm:p-12 relative">
        <SignChatHeader /> {/* ← ここで表示 */}
        {/* メインカード */}
        <div className="max-w-2xl mx-auto bg-gray-850 rounded-2xl shadow-2xl p-10 space-y-8 border border-gray-700 mt-48">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">🎉 ようこそ！</h2>
            <p className="text-gray-300 text-lg">
              このページは認証済みユーザー専用です。
            </p>
          </div>

          <div className="space-y-6">
            {/* ユーザー一覧 */}
            <div className="text-center">
              <p className="mb-2 text-sm text-gray-400">通話をするなら</p>
              <button
                onClick={() => router.push("/users")}
                className="flex justify-center items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-full shadow-md transition duration-200 mx-auto"
              >
                <Users className="w-5 h-5" />
                ユーザ一覧へ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
