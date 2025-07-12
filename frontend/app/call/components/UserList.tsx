"use client";
import React from "react";

interface UserListProps {
  users: string[];
}

export const UserList: React.FC<UserListProps> = ({ users }) => {
  if (users.length === 0) return null;

  return (
    <div className="mt-10 bg-gray-800 p-4 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-xl font-semibold mb-2">接続中のユーザー:</h2>
      <ul className="list-disc pl-6 space-y-1">
        {users.map((user) => (
          <li key={user}>{user}</li>
        ))}
      </ul>
    </div>
  );
};
