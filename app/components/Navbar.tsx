import { useEffect, useState } from "react";
import { Link } from "react-router";
import logoLight from "/logo-light.svg";
import logoDark from "/logo-dark.svg";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 bg-white dark:bg-neutral-950 transition-shadow duration-200 ${
        scrolled ? "shadow-md" : ""
      }`}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src={logoLight} alt="SkySurvey" className="h-10 dark:hidden" />
          <img
            src={logoDark}
            alt="SkySurvey"
            className="h-10 hidden dark:block"
          />
        </Link>

        {/* Links */}
        <div className="flex items-center gap-2">
          <Link
            to="/survey"
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            to="/admin"
            className="text-sm font-medium bg-[#011F53] dark:bg-[#2376E8] text-white px-8 py-4 rounded-full hover:bg-[#2376E8] dark:hover:bg-[#011F53] transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
}
