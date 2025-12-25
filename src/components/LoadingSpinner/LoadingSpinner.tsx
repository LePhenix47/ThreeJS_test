import { useEffect, useRef } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useLoadingStore } from "@/stores/useLoadingStore";

import "./LoadingSpinner.scss";

gsap.registerPlugin(DrawSVGPlugin);

function LoadingSpinner() {
  const isLoading = useLoadingStore((state) => state.isLoading);
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!circleRef.current || !isLoading) return;

    const tl = gsap.timeline({ repeat: -1 });

    // Animate drawing the circle with DrawSVG
    tl.fromTo(
      circleRef.current,
      { drawSVG: "0% 30%" },
      { drawSVG: "70% 100%", duration: 1, ease: "power2.inOut" }
    ).to(circleRef.current, {
      rotation: 360,
      duration: 1.5,
      ease: "linear",
      transformOrigin: "50% 50%",
    }, 0);

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
