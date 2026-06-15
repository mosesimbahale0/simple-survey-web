import type { Route } from "./+types/home";
import { Link } from "react-router";
import Navbar from "../components/Navbar";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "SkySurvey | Sky World" },
    {
      name: "description",
      content:
        "SkySurvey lets you run fast, targeted surveys across SMS, email, and web — then see results as they come in, not a week later.",
    },
  ];
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-200">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 pb-24">
        {/* ── Hero ── */}
        <header className="pt-24 pb-16 flex flex-col items-center text-center">
          <h1 className="text-6xl leading-[1.1] font-semibold tracking-tight mb-10 max-w-3xl max-sm:text-4xl">
            Gather Feedback,{" "}
            <span className="text-[#2376E8]">Drive improvement</span>
          </h1>

          <p className="text-md leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-xl mb-10">
            With Sky World Limited's dynamic survey solution, craft engaging,
            omnichannel surveys to capture valuable customer insights. Enhance
            decision-making and tailor products to meet customer needs.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-full bg-[#011F53] dark:bg-[#2376E8] text-white px-8 py-4 text-base font-medium hover:bg-[#2376E8] dark:hover:bg-[#011F53] transition-colors"
            >
              Admin dashboard
            </Link>
            <Link
              to="/user"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 px-8 py-4 text-base font-medium hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
            >
              Take a Survey
            </Link>
          </div>
        </header>

        {/* ── Footer ── */}
        <footer className="flex items-center justify-between pt-6 border-t border-neutral-100 dark:border-neutral-800">
          <span className="text-sm font-semibold text-neutral-400 dark:text-neutral-500">
            SkySurvey
          </span>
          <div className="flex gap-5">
            {["Privacy", "Docs", "Status", "Contact"].map((item) => (
              <Link
                key={item}
                to={`/${item.toLowerCase()}`}
                className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
