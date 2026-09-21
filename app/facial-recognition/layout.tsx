import type { Metadata } from "next";
import "./facial-recognition.css";
import { ChainRail } from "./components/ChainRail";

export const metadata: Metadata = {
  title: "Facial Recognition Guide — ITE 3",
  description: "Interactive step-by-step guide for the Face Tracking classroom activity.",
};

export default function FacialRecognitionLayout({ children }: LayoutProps<"/facial-recognition">) {
  return (
    <div className="fr-scope">
      <div className="fr-void-field" />
      <div className="fr-page-shell">
        <ChainRail />
        <div className="fr-main-col">{children}</div>
      </div>
    </div>
  );
}
