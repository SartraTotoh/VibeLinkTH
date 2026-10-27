"use client";

import { useState } from "react";
import { SupportChat } from "@/components/support/support-chat";
import { SupportChatModule } from "@/components/dev/support-chat";
import type { Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  isAdminUser: boolean;
};

export function AdminSupportWrapper({ lang, isAdminUser }: Props) {
  const [activeTab, setActiveTab] = useState<"admin" | "member">(isAdminUser ? "admin" : "member");

  if (!isAdminUser) {
    return <SupportChat lang={lang} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Admin Mode Switcher */}
      <div
        style={{
          display: "inline-flex",
          alignSelf: "flex-start",
          padding: 4,
          borderRadius: 999,
          background: "rgba(255, 255, 255, 0.05)",
          boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.1)",
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("admin")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
            background: activeTab === "admin" ? "radial-gradient(120% 120% at 30% 20%, #d4ff6b, var(--primary, #b9ff2c))" : "transparent",
            color: activeTab === "admin" ? "#080a0f" : "#94a3b8",
            boxShadow: activeTab === "admin" ? "0 0 20px rgba(185, 255, 44, 0.35)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          <span className="ms" style={{ fontSize: 18 }}>support_agent</span>
          {lang === "th" ? "จัดการคำถาม Support (Admin Desk)" : "Support Admin Desk"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("member")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
            background: activeTab === "member" ? "radial-gradient(120% 120% at 30% 20%, #d4ff6b, var(--primary, #b9ff2c))" : "transparent",
            color: activeTab === "member" ? "#080a0f" : "#94a3b8",
            boxShadow: activeTab === "member" ? "0 0 20px rgba(185, 255, 44, 0.35)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          <span className="ms" style={{ fontSize: 18 }}>chat</span>
          {lang === "th" ? "มุมมองผู้ใช้งาน (Member Chat)" : "Member Chat View"}
        </button>
      </div>

      {/* Render Active View */}
      {activeTab === "admin" ? (
        <div style={{ width: "100%" }}>
          <SupportChatModule initialUnread={0} />
        </div>
      ) : (
        <SupportChat lang={lang} />
      )}
    </div>
  );
}
