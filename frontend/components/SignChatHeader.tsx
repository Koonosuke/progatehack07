import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

const SignChatHeader = () => {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await fetch("/web/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleLogoClick = () => {
    router.push("/home");
  };

  return (
    <header
      className="fixed top-0 left-0 w-full z-50
             px-6 py-4 flex items-center justify-between
             border-b border-white"
      style={{ backgroundColor: "rgba(0, 0, 30, 1)" }}
      onClick={handleLogoClick}
    >
      <img
        src="/web/images/signchat-logo.png" // ← 画像パスを適宜変更
        alt="Sign Chat Logo"
        className="h-20 object-contain"
      />
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full shadow-md transition duration-200"
      >
        <LogOut className="w-5 h-5" />
        サインアウト
      </button>
    </header>
  );
};

export default SignChatHeader;
