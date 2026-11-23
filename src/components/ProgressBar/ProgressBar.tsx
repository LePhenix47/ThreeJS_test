import React from "react";

import "./ProgressBar.scss";

type ProgressBarProps = {
  progressValue: number;
  showPercentage?: boolean;
};

function ProgressBar({
  progressValue,
  showPercentage = false,
}: ProgressBarProps) {
  return (
    <label className={"progress-bar__container"}>
      {showPercentage && (
        <span className={"progress-bar__percentage"}>{progressValue}%</span>
      )}
      <progress
        className={"progress-bar__element"}
        value={progressValue}
        max="100"
      ></progress>
    </label>
  );
}
export default ProgressBar;
