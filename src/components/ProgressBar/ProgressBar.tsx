import React, { CSSProperties } from "react";

import "./ProgressBar.scss";

type ProgressBarProps = {
  progressValue: number;
  showPercentage?: boolean;
};

function ProgressBar({
  progressValue,
  showPercentage = false,
}: ProgressBarProps) {
  const style = {
    "--_progress-percent": `${progressValue}%`,
  } as CSSProperties;

  return (
    <label className={"progress-bar__container"} style={style}>
      {showPercentage && (
        <span className={"progress-bar__percentage"}>{progressValue}%</span>
      )}

      <span className="progress-bar__wrapper">
        <progress
          className={"progress-bar"}
          value={progressValue}
          max="100"
        ></progress>
      </span>
    </label>
  );
}
export default ProgressBar;
