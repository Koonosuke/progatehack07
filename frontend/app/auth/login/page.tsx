"use client";

import RippleBackground from "@/components/hamon";
import { AuthenticationDetails, CognitoUser } from "amazon-cognito-identity-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { userPool } from "../userPool";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewPasswordRequired, setIsNewPasswordRequired] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const cognitoUserRef = useRef<CognitoUser | null>(null);
  const router = useRouter();

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
        try {
          const response = await fetch("/web/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: idToken }),
          });
          if (!response.ok) throw new Error("APIでの認証設定に失敗");
          router.push("/home");
        } catch (apiError: any) {
          setError(apiError.message);
          setIsLoading(false);
        }
      },
      onFailure: (err) => {
        setError(err.message || "ログインに失敗しました。");
        setIsLoading(false);
      },
      newPasswordRequired: () => {
        setIsNewPasswordRequired(true);
        setIsLoading(false);
      },
    });
  };

  const handleNewPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!cognitoUserRef.current) {
      setError("ユーザー情報が見つかりません。");
      setIsLoading(false);
      return;
    }

    cognitoUserRef.current.completeNewPasswordChallenge(newPassword, null, {
      onSuccess: async (result) => {
        const idToken = result.getIdToken().getJwtToken();
        try {
          const response = await fetch("/web/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: idToken }),
          });
          if (!response.ok) throw new Error("APIでの認証設定に失敗");
          router.push("/home");
        } catch (apiError: any) {
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

  // 新しいパスワード入力フォーム
  if (isNewPasswordRequired) {
    return (
      <div>
        <div className="relative min-h-screen text-white flex items-center justify-center">
          <RippleBackground />

          <h1 className="absolute top-10 w-full text-center text-4xl font-bold text-white">
            Sign Chat
          </h1>

          <div className="bg-gray-800/80 backdrop-blur-md p-10 rounded-lg shadow-lg w-full max-w-md">
            <h1 className="text-2xl font-bold mb-6 text-center">
              新しいパスワードを設定
            </h1>
            <form onSubmit={handleNewPasswordSubmit}>
              <input
                type="password"
                className="bg-gray-700 px-4 py-2 mb-4 w-full rounded outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="新しいパスワード"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition px-4 py-2 w-full rounded font-semibold"
              >
                {isLoading ? "設定中..." : "パスワードを設定"}
              </button>
              {error && (
                <p className="text-red-400 mt-4 text-center">{error}</p>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 通常ログインフォーム
  return (
    <div>
      <div className="relative min-h-screen  text-white flex items-center justify-center">
        <RippleBackground />
        <h1 className="absolute top-10 w-full text-center text-4xl font-bold text-white">
          Sign Chat
        </h1>
        <div className="bg-gray-800/70 backdrop-blur-md p-10 rounded-2xl shadow-2xl w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center">ログイン</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-5">
              <label className="block mb-2 text-sm font-medium">
                ユーザー名
              </label>
              <input
                className="bg-gray-700 px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="ユーザー名またはメール"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="mb-5">
              <label className="block mb-2 text-sm font-medium">
                パスワード
              </label>
              <input
                type="password"
                className="bg-gray-700 px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold px-4 py-2 rounded w-full transition-colors"
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            アカウントをお持ちでないですか？{" "}
            <Link
              href="/auth/register"
              className="text-blue-400 hover:underline"
            >
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
