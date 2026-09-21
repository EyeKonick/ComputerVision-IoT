"use client";

import { useEffect, useState } from "react";
import type { FileSnapshot } from "../data/types";
import { applyCameraPath, hasCameraPathSubstitution } from "../lib/camSource";
import { describeNewLines, newLineGroupsWithContext } from "../lib/code";
import { loadSharedCameraPath, subscribeToProgress } from "../lib/progress";
import { NoCopyWrapper } from "./NoCopyWrapper";

export function FileCodePanel({ file }: { file: FileSnapshot }) {
  const [expanded, setExpanded] = useState(false);
  const [cameraPath, setCameraPath] = useState<"A" | "B" | null>(null);

  useEffect(() => {
    // Reads the choice made once during Hand Tracking's shared Setup
    // session (see loadSharedCameraPath) — Face Tracking has no camera
    // fork of its own. Re-synced on the same progress event Hand Tracking
    // fires, since both tracks share one browser/origin.
    const sync = () => setCameraPath(loadSharedCameraPath());
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
        <div className="fr-new-file-note">
          <span className="fr-new-file-icon" aria-hidden="true">
            📄
          </span>
          <span>{file.newFileNote}</span>
        </div>
      )}

      <div className="fr-snippet-panel">
        <div className="fr-detail-block-label">Type this</div>
        {isPersonalized && (
          <p className="fr-snippet-personalized">
            Showing the <code>CAM_SOURCE</code> line for your Path {cameraPath} setup.
          </p>
        )}
        <NoCopyWrapper>
          {groups.length === 0 ? (
            <p className="fr-snippet-empty">
              Nothing new to type this step — you&apos;re running or checking what already exists.
            </p>
          ) : (
            groups.map((group, i) => (
              <div key={i} className="fr-snippet-group">
                <div className="fr-snippet-linelabel">
                  {group.startLine === group.endLine
                    ? `Line ${group.startLine}`
                    : `Lines ${group.startLine}–${group.endLine}`}
                </div>
                <pre className="fr-snippet-code">{group.text}</pre>
                {group.trailingContext !== null ? (
                  <div className="fr-snippet-context">
                    <span className="fr-snippet-context-arrow">↳</span> goes right before:{" "}
                    <code>{group.trailingContext.trim() || "(a blank line)"}</code>
                  </div>
                ) : (
                  <div className="fr-snippet-context fr-eof">
                    <span className="fr-snippet-context-arrow">↳</span> goes at the very end of the
                    file
                  </div>
                )}
                {i < groups.length - 1 && <div className="fr-snippet-gap">⋮</div>}
              </div>
            ))
          )}
        </NoCopyWrapper>
      </div>

      <div className="fr-full-file-panel">
        <button
          type="button"
          className="fr-full-file-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="fr-chevron">{expanded ? "▾" : "▸"}</span>
          <span>
            Show the full file so far ({lines.length} lines) — to compare against yours
          </span>
        </button>
        {expanded && (
          <div className="fr-full-file-body">
            <p className="fr-full-file-note">
              {describeNewLines(file.newLineIndices)}. Numbers here are for comparing structure
              against your own file — if yours has an extra blank line somewhere, the numbers may
              drift, that&apos;s normal.
            </p>
            <NoCopyWrapper>
              <div className="fr-code-lines">
                {lines.map((line, i) => {
                  const isNew = newSet.has(i);
                  return (
                    <div key={i} className={`fr-code-line${isNew ? " fr-new" : ""}`}>
                      <span className="fr-line-no">{i + 1}</span>
                      <span className="fr-line-text">{line || " "}</span>
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
