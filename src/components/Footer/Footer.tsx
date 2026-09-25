import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";

import "./Footer.scss";

function Footer() {
  return (
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
  );
}

export default Footer;
