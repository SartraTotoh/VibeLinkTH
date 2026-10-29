import { PitchStudio } from "@/components/pitch/pitch-studio";

export const metadata = {
  title: "Pitch Studio",
  description: "เตรียมร่างอีเมลธุรกิจ ตรวจข้อความ และคัดลอกไปใช้ด้วยตัวคุณเอง",
  alternates: { canonical: "/pitch" },
};

export default function PitchPage() {
  return <PitchStudio />;
}
