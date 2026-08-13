"use client";

import { useEffect, useState } from "react";
import type { FileSnapshot } from "../data/types";
import { applyCameraPath, hasCameraPathSubstitution } from "../lib/camSource";
import { describeNewLines, newLineGroupsWithContext } from "../lib/code";
import { CAMERA_FORK_STEP_ID, loadProgress, subscribeToProgress } from "../lib/progress";
import { NoCopyWrapper } from "./NoCopyWrapper";

export function FileCodePanel({ file }: { file: FileSnapshot }) {
  const [expanded, setExpanded] = useState(false);
  const [cameraPath, setCameraPath] = useState<"A" | "B" | null>(null);

  useEffect(() => {
    const sync = () => setCameraPath(loadProgress()?.forkChoices[CAMERA_FORK_STEP_ID] ?? null);
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
        <div className="ht-new-file-note">
          <span className="ht-new-file-icon" aria-hidden="true">
            📄
          </span>
          <span>{file.newFileNote}</span>
        </div>
      )}

      <div className="ht-snippet-panel">
        <div className="ht-detail-block-label">Type this</div>
        {isPersonalized && (
          <p className="ht-snippet-personalized">
            Showing the <code>CAM_SOURCE</code> line for your Path {cameraPath} setup.
          </p>
        )}
        <NoCopyWrapper>
          {groups.length === 0 ? (
            <p className="ht-snippet-empty">
              Nothing new to type this step — you&apos;re running or checking what already exists.
            </p>
          ) : (
            groups.map((group, i) => (
              <div key={i} className="ht-snippet-group">
                <div className="ht-snippet-linelabel">
                  {group.startLine === group.endLine
                    ? `Line ${group.startLine}`
                    : `Lines ${group.startLine}–${group.endLine}`}
                </div>
                <pre className="ht-snippet-code">{group.text}</pre>
                {group.trailingContext !== null ? (
                  <div className="ht-snippet-context">
                    <span className="ht-snippet-context-arrow">↳</span> goes right before:{" "}
                    <code>{group.trailingContext.trim() || "(a blank line)"}</code>
                  </div>
                ) : (
                  <div className="ht-snippet-context ht-eof">
                    <span className="ht-snippet-context-arrow">↳</span> goes at the very end of the
                    file
                  </div>
                )}
                {i < groups.length - 1 && <div className="ht-snippet-gap">⋮</div>}
              </div>
            ))
          )}
        </NoCopyWrapper>
      </div>

      <div className="ht-full-file-panel">
        <button
          type="button"
          className="ht-full-file-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="ht-chevron">{expanded ? "▾" : "▸"}</span>
          <span>
            Show the full file so far ({lines.length} lines) — to compare against yours
          </span>
        </button>
        {expanded && (
          <div className="ht-full-file-body">
            <p className="ht-full-file-note">
              {describeNewLines(file.newLineIndices)}. Numbers here are for comparing structure
              against your own file — if yours has an extra blank line somewhere, the numbers may
              drift, that&apos;s normal.
            </p>
            <NoCopyWrapper>
              <div className="ht-code-lines">
                {lines.map((line, i) => {
                  const isNew = newSet.has(i);
                  return (
                    <div key={i} className={`ht-code-line${isNew ? " ht-new" : ""}`}>
                      <span className="ht-line-no">{i + 1}</span>
                      <span className="ht-line-text">{line || " "}</span>
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
