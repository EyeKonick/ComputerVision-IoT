"use client";

import { useEffect, useState } from "react";
import type { FileSnapshot } from "../data/types";
import { applyCameraPath, cameraPathLabel, hasCameraPathSubstitution } from "../lib/camSource";
import { describeNewLines, newLineGroupsWithContext } from "../lib/code";
import { loadCameraChoice, subscribeToProgress } from "../lib/progress";
import { NoCopyWrapper } from "./NoCopyWrapper";

export function FileCodePanel({ file }: { file: FileSnapshot }) {
  const [expanded, setExpanded] = useState(false);
  const [cameraPath, setCameraPath] = useState<"A" | "B" | null>(null);

  useEffect(() => {
    // QR's own Session 0 camera choice, pre-selected from Hand Tracking's
    // Setup choice if the student hasn't picked one here (see
    // loadCameraChoice). Re-synced whenever QR progress changes.
    const sync = () => setCameraPath(loadCameraChoice());
    sync();
    return subscribeToProgress(sync);
  }, []);

  const code = applyCameraPath(file.code, cameraPath);
  const groups = newLineGroupsWithContext(code, file.newLineIndices);
  const lines = code.split("\n");
  const newSet = new Set(file.newLineIndices);
  const isPersonalized = cameraPath && hasCameraPathSubstitution(file.code);

  return (
    <>
      {file.newFileNote && (
        <div className="qr-new-file-note">
          <span className="qr-new-file-icon" aria-hidden="true">
            📄
          </span>
          <span>{file.newFileNote}</span>
        </div>
      )}

      <div className="qr-snippet-panel">
        <div className="qr-detail-block-label">Type this</div>
        {isPersonalized && (
          <p className="qr-snippet-personalized">
            Showing the <code>CAM_SOURCE</code> line for your camera source:{" "}
            {cameraPathLabel(cameraPath)}. Chose wrong? Switch it on Session 0&apos;s camera step.
          </p>
        )}
        <NoCopyWrapper>
          {groups.length === 0 ? (
            <p className="qr-snippet-empty">
              Nothing new to type this step — you&apos;re running or checking what already exists.
            </p>
          ) : (
            groups.map((group, i) => (
              <div key={i} className="qr-snippet-group">
                <div className="qr-snippet-linelabel">
                  {group.startLine === group.endLine
                    ? `Line ${group.startLine}`
                    : `Lines ${group.startLine}–${group.endLine}`}
                </div>
                <pre className="qr-snippet-code">{group.text}</pre>
                {group.trailingContext !== null ? (
                  <div className="qr-snippet-context">
                    <span className="qr-snippet-context-arrow">↳</span> goes right before:{" "}
                    <code>{group.trailingContext.trim() || "(a blank line)"}</code>
                  </div>
                ) : (
                  <div className="qr-snippet-context qr-eof">
                    <span className="qr-snippet-context-arrow">↳</span> goes at the very end of the
                    file
                  </div>
                )}
                {i < groups.length - 1 && <div className="qr-snippet-gap">⋮</div>}
              </div>
            ))
          )}
        </NoCopyWrapper>
      </div>

      <div className="qr-full-file-panel">
        <button
          type="button"
          className="qr-full-file-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="qr-chevron">{expanded ? "▾" : "▸"}</span>
          <span>
            Show the full file so far ({lines.length} lines) — to compare against yours
          </span>
        </button>
        {expanded && (
          <div className="qr-full-file-body">
            <p className="qr-full-file-note">
              {describeNewLines(file.newLineIndices)}. Numbers here are for comparing structure
              against your own file — if yours has an extra blank line somewhere, the numbers may
              drift, that&apos;s normal.
            </p>
            <NoCopyWrapper>
              <div className="qr-code-lines">
                {lines.map((line, i) => {
                  const isNew = newSet.has(i);
                  return (
                    <div key={i} className={`qr-code-line${isNew ? " qr-new" : ""}`}>
                      <span className="qr-line-no">{i + 1}</span>
                      <span className="qr-line-text">{line || " "}</span>
                    </div>
                  );
                })}
              </div>
            </NoCopyWrapper>
          </div>
        )}
      </div>
    </>
  );
}
