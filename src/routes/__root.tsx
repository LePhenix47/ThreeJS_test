import { useEffect } from "react";
import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useAppStore } from "@/stores/useAppStore";
import env from "@env";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";

function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{ fontSize: "6rem", margin: "0", color: "var(--color-primary)" }}
      >
        404
      </h1>
      <h2
        style={{
          fontSize: "2rem",
          margin: "1rem 0",
          color: "var(--color-secondary)",
        }}
      >
        Page Not Found
      </h2>
      <p
        style={{
          fontSize: "1.2rem",
          marginBottom: "2rem",
          color: "var(--color-secondary)",
        }}
      >
        The page you're looking for doesn't exist or has been moved.
      </p>

      <Link
        to="/"
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          backgroundColor: "var(--color-blue-500)",
          color: "white",
          border: "none",
          borderRadius: "4px",
          textDecoration: "none",
          display: "inline-block",
          transition: "background-color 0.2s",
        }}
      >
        Go to Home →
      </Link>
    </div>
  );
}

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { httpEquiv: "X-UA-Compatible", content: "ie=edge" },
      { name: "robots", content: "index, follow" },
      // Default meta tags (will be overridden by child routes)
      { title: "THREE.js Test" },
      {
        name: "description",
        content: "Project to learn a thing or two about THREE.js",
      },
      // Default Open Graph tags
      { property: "og:type", content: "website" },
      { property: "og:title", content: "THREE.js Test" },
      {
        property: "og:description",
        content: "Project to learn a thing or two about THREE.js",
      },
      { property: "og:image", content: "/img/ico/threejs_white.ico" },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      {
        property: "og:url",
        content: "https://younes-portfolio-dev.vercel.app/",
      },
      // Default Twitter Card tags
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "THREE.js Test" },
      {
        name: "twitter:description",
        content: "Project to learn a thing or two about THREE.js",
      },
      { name: "twitter:image", content: "/img/ico/threejs_white.ico" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/x-icon",
        media: "(prefers-color-scheme: light)",
        href: "/img/ico/threejs_black.ico",
      },
      {
        rel: "icon",
        type: "image/x-icon",
        media: "(prefers-color-scheme: dark)",
        href: "/img/ico/threejs_white.ico",
      },
    ],
    scripts: [
      {
        src: "https://kit.fontawesome.com/904e9ee361.js",
        crossOrigin: "anonymous",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  // Theme logic - ONLY place where theme class is applied
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const abortController = new AbortController();

    const applyTheme = (currentTheme: "light" | "dark" | "system") => {
      const isDark =
        currentTheme === "dark" ||
        (currentTheme === "system" && mediaQuery.matches);
      root.classList.toggle("dark", isDark);
      root.classList.toggle("light", !isDark);
    };

    // Apply theme immediately
    applyTheme(theme);

    // Listen for OS theme changes when in system mode
    const handleChange = () => {
      if (theme !== "system") {
        return;
      }
      applyTheme(theme);
    };

    mediaQuery.addEventListener("change", handleChange, {
      signal: abortController.signal,
    });

    return () => {
      abortController.abort();
    };
  }, [theme]);

  return (
    <>
      {/* Portal HeadContent into the document head */}
      {createPortal(<HeadContent />, document.querySelector("head")!)}

      <header className="header" data-element="header">
        <svg className="hide header__svg-filters"></svg>
        <h1 className="header__title" title="Title">
          THREE.js Test
        </h1>
      </header>

      <main className="index" data-element="index">
        <Outlet />
      </main>

      <footer className="footer" data-element="footer">
        <p className="footer__paragraph">
          Made by:{" "}
          <a
            href="https://younes-portfolio-dev.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Younes Lahouiti
          </a>
        </p>
        <ThemeToggle />
      </footer>

      <Scripts />
      {/* {env.DEV && <TanStackRouterDevtools position="bottom-right" />} */}
    </>
  );
}
