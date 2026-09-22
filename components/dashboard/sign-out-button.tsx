"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ label = "ออกจากระบบ" }: { label?: string }) {
  return (
    <button
      type="button"
      className="button ghost"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      <span className="ms">logout</span>
      {label}
    </button>
  );
}
