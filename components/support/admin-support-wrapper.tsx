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
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
      {/* Admin Mode Switcher — Apple Segmented Frosted Glass Track */}
      <div
        style={{
          display: "inline-flex",
          alignSelf: "flex-start",
          padding: 5,
          borderRadius: 999,
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.12)",
          border: "none",
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
            padding: "9px 18px",
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
            background:
              activeTab === "admin"
                ? "radial-gradient(120% 120% at 30% 20%, #d4ff6b, var(--primary, #b9ff2c))"
                : "transparent",
            color: activeTab === "admin" ? "#080a0f" : "#94a3b8",
            boxShadow:
              activeTab === "admin"
                ? "0 0 20px rgba(185, 255, 44, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)"
                : "none",
            transition: "all 0.2s ease",
            fontFamily: "inherit",
          }}
        >
          <span className="ms" style={{ fontSize: 18 }}>support_agent</span>
          <span>{lang === "th" ? "จัดการคำถาม Support (Admin Desk)" : "Support Admin Desk"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("member")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
            background:
              activeTab === "member"
                ? "radial-gradient(120% 120% at 30% 20%, #d4ff6b, var(--primary, #b9ff2c))"
                : "transparent",
            color: activeTab === "member" ? "#080a0f" : "#94a3b8",
            boxShadow:
              activeTab === "member"
                ? "0 0 20px rgba(185, 255, 44, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)"
                : "none",
            transition: "all 0.2s ease",
            fontFamily: "inherit",
          }}
        >
          <span className="ms" style={{ fontSize: 18 }}>chat</span>
          <span>{lang === "th" ? "มุมมองผู้ใช้งาน (Member Chat)" : "Member Chat View"}</span>
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
