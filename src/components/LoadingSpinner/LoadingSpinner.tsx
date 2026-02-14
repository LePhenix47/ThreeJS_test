import { useEffect, useRef } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useIsLoading } from "@/stores/useLoadingStore";

import "./LoadingSpinner.scss";

gsap.registerPlugin(DrawSVGPlugin);

function LoadingSpinner() {
  const isLoading = useIsLoading();
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!circleRef.current || !isLoading) return;

    const circle = circleRef.current;
    const tl = gsap.timeline({ repeat: -1 });

    gsap.set(circle, {
      drawSVG: "0.05% 0%",
      transformOrigin: "50% 50%",
    });

    tl.to(circle, { drawSVG: true, duration: 1 })
      .to(circle, {
        drawSVG: "99.85% 99.85%",
        duration: 1,
      })
      .to(
        circle,
        {
          rotation: "720deg",
          duration: tl.duration(),
          ease: "linear",
        },
        0
      );

    return () => {
      tl.kill();
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="loading-spinner">
      <div className="loading-spinner__backdrop" />
      <svg
        className="loading-spinner__icon"
        width="80"
        height="80"
        viewBox="0 0 80 80"
      >
        <circle
          ref={circleRef}
          cx="40"
          cy="40"
          r="30"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray="94.2 94.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default LoadingSpinner;
