// components/SignChatHeader.tsx

const SignChatHeader = () => {
  return (
    <h1
      className="absolute top-24 left-1/2 transform -translate-x-1/2 
                 text-cyan-300 font-fancy font-extrabold text-[80px]
                 drop-shadow-[0_0_15px_rgba(173,216,230,0.7)] 
                 flex justify-center gap-2"
    >
      {"Sign Chat".split("").map((char, i) => (
        <span
          key={i}
          className="inline-block animate-bounce-slow"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          {char}
        </span>
      ))}
    </h1>
  );
};

export default SignChatHeader;
