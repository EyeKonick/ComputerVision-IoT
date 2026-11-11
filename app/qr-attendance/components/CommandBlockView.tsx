import type { CommandBlock } from "../data/types";
import { NoCopyWrapper } from "./NoCopyWrapper";

export function CommandBlockView({ block }: { block: CommandBlock }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {block.label && <p className="qr-snippet-label">{block.label}</p>}
      <NoCopyWrapper>
        <pre className="qr-snippet-code">{block.code}</pre>
      </NoCopyWrapper>
    </div>
  );
}
