import { createFileRoute } from "@tanstack/react-router";

import ThreeScene from "@/components/ThreeScene/ThreeScene";
import LoadingSpinner from "@/components/LoadingSpinner/LoadingSpinner";
import "./index.scss";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home - three-js-test" },
      {
        name: "description",
        content: "Project to learn a thing or two about THREE.js",
      },
      { property: "og:title", content: "Home - three-js-test" },
      {
        property: "og:description",
        content: "Project to learn a thing or two about THREE.js",
      },
      {
        property: "og:url",
        content: "https://younes-portfolio-dev.vercel.app/",
      },
      { name: "twitter:title", content: "Home - three-js-test" },
      {
        name: "twitter:description",
        content: "Project to learn a thing or two about THREE.js",
      },
    ],
  }),
  component: IndexComponent,
});

function IndexComponent() {
  return (
    <div className="index-page">
      <div className="index-page__scene-container">
        <ThreeScene />
        <LoadingSpinner />
      </div>
    </div>
  );
}
