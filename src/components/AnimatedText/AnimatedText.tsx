import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/all";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./AnimatedText.scss";

gsap.registerPlugin(DrawSVGPlugin);

type RGBA = [number, number, number, number?];

type AnimatedTextProps = {
  children: ReactNode;
  className?: string;
  outlineColor?: RGBA;
};

const DEFAULT_COLOR: RGBA = [51, 26, 230];

function buildColorMatrix([r, g, b, a = 255]: RGBA): string {
  const colorMatrix = [
    [0, 0, 0, 0, r / 255],
    [0, 0, 0, 0, g / 255],
    [0, 0, 0, 0, b / 255],
    [0, 0, 0, a / 255, 0],
  ];

  const matrixString = colorMatrix.map((row) => row.join(" ")).join(" ");

  return matrixString;
}

function AnimatedText({
  children,
  className = "",
  outlineColor = DEFAULT_COLOR,
}: AnimatedTextProps) {
  const [viewBox, setViewBox] = useState("0 0 300 180");
  const textEl = useRef<SVGTextElement>(null);

  useLayoutEffect(() => {
    if (!textEl.current) return;
    const { x, y, width, height } = textEl.current.getBBox();
    const padding = 10;
    setViewBox(
      `${x - padding} ${y - padding} ${width + padding * 2} ${height + padding * 2}`,
    );
  }, [children]);

  useEffect(() => {
    if (!textEl.current) return;
    const tl: gsap.core.Timeline = gsap.timeline();

    tl.to(textEl.current, {
      strokeDashoffset: 40,
      duration: 0.75,
      repeat: -1,
      ease: "linear",
    });

    return () => {
      tl.kill();
    };
  }, []);

  const matrixString: string = buildColorMatrix(outlineColor);

  return (
    <span className={`animated-text ${className}`}>
      <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={viewBox}
        className="animated-text__svg"
      >
        <filter id="outText" colorInterpolationFilters="sRGB">
          <feMorphology
            in="SourceAlpha"
            operator="dilate"
            radius={3}
            result="e1"
          />
          <feMorphology
            in="SourceAlpha"
            operator="dilate"
            radius={1}
            result="e2"
          />
          <feComposite in="e1" in2="e2" operator="xor" result="outline" />
          <feColorMatrix in="outline" result="outline2" values={matrixString} />
          <feComposite
            in="outline2"
            in2="SourceGraphic"
            operator="out"
            result="output"
          />
        </filter>
        <text
          y={150}
          fill="black"
          stroke="#000"
          strokeDasharray={20}
          strokeWidth={4}
          data-svg="text"
          filter="url(#outText)"
          fontFamily="sans-serif"
          fontSize={150}
          ref={textEl}
        >
          {children}
        </text>
      </svg>
    </span>
  );
}

export default AnimatedText;
