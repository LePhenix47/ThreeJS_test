import "./Header.scss";

function Header() {
  return (
    <header className="header" data-element="header">
      <svg className="hide header__svg-filters"></svg>
      <h1 className="header__title" title="Title">
        THREE.js Test
      </h1>
    </header>
  );
}

export default Header;
