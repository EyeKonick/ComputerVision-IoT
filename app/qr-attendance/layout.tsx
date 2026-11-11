import type { Metadata } from "next";
import "./qr-attendance.css";
import { ChainRail } from "./components/ChainRail";

export const metadata: Metadata = {
  title: "QR Attendance Guide — ITE 3",
  description: "Interactive step-by-step guide for the QR Attendance classroom activity.",
};

export default function QrAttendanceLayout({ children }: LayoutProps<"/qr-attendance">) {
  return (
    <div className="qr-scope">
      <div className="qr-void-field" />
      <div className="qr-page-shell">
        <ChainRail />
        <div className="qr-main-col">{children}</div>
      </div>
    </div>
  );
}
