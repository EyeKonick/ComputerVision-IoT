import type { Metadata } from "next";
import "./hand-tracking.css";
import { ChainRail } from "./components/ChainRail";

export const metadata: Metadata = {
  title: "Hand Tracking Guide — ITE 3",
  description: "Interactive step-by-step guide for the Hand Tracking classroom activity.",
};

export default function HandTrackingLayout({ children }: LayoutProps<"/hand-tracking">) {
  return (
    <div className="ht-scope">
      <div className="ht-void-field" />
      <div className="ht-page-shell">
        <ChainRail />
        <div className="ht-main-col">{children}</div>
      </div>
    </div>
  );
}
