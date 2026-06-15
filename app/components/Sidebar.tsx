import React, { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router";
import {
  LayoutDashboard,
  ClipboardList,
  MessageSquareText,
  UserCircle,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import logoLight from "/logo-light.svg";

// ─── Nav Config ───────────────────────────────────────────────────────────────

const navItems = [
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/surveys", label: "Surveys", Icon: ClipboardList },
  { to: "/responses", label: "Responses", Icon: MessageSquareText },
  { to: "/account", label: "Account", Icon: UserCircle },
];

const settingsItems = [
  { to: "/settings", label: "Settings", Icon: Settings },
  { to: "/notifications", label: "Notifications", Icon: Bell },
];

// ─── Shared link renderer ─────────────────────────────────────────────────────

function NavItems({ onSelect }) {
  return (
    <>
      {navItems.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/admin"}
          onClick={onSelect}
          className={({ isActive }) =>
            `flex items-center gap-2.5 py-2.5 pr-4 pl-0 no-underline text-sm font-medium font-sans transition-colors duration-150 ${
              isActive
                ? "rounded-r-full bg-[#2376E8] text-white"
                : "rounded-r-full text-[#011F53] hover:bg-slate-50"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.8}
                className="ml-5 flex-shrink-0"
              />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </>
  );
}

function SettingsItems({ onSelect }) {
  return (
    <>
      {settingsItems.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onSelect}
          className={({ isActive }) =>
            `flex items-center gap-2.5 py-2.5 pr-4 pl-0 no-underline text-sm font-medium font-sans transition-colors duration-150 ${
              isActive
                ? "rounded-r-full bg-[#2376E8] text-white"
                : "rounded-r-full text-[#011F53] hover:bg-slate-50"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.8}
                className="ml-5 flex-shrink-0"
              />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  /* close popover on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <>
      {/* ── MOBILE: sticky topbar (visible below md) ───────────────────── */}
      <header className="md:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <img src={logoLight} alt="Logo" className="h-6 w-auto" />

        <div ref={popoverRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className={`flex items-center justify-center w-9 h-9 border border-[#2376E8] rounded-lg cursor-pointer transition-colors duration-200 ${
              open
                ? "bg-[#2376E8] text-white"
                : "bg-white text-[#011F53] hover:bg-slate-50"
            }`}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Dropdown popover */}
          {open && (
            <div className="absolute top-[calc(100%+12px)] right-0 z-[100] w-52 py-2 pr-2 pl-0 bg-white border border-slate-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
              <div className="flex flex-col gap-1 mb-1">
                <NavItems onSelect={() => setOpen(false)} />
              </div>

              <div className="mx-3 my-2 border-t border-slate-100" />

              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 ml-5 mb-1">
                Settings
              </p>
              <div className="flex flex-col gap-1 mb-2">
                <SettingsItems onSelect={() => setOpen(false)} />
              </div>

              <div className="mx-3 my-2 border-t border-slate-100" />

              {/* User row */}
              <div className="flex items-center gap-3 px-4 py-2">
                <div className="w-7 h-7 rounded-full bg-[#2376E8] flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
                  JD
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#011F53] truncate">
                    Jane Doe
                  </p>
                  <p className="text-[10.5px] text-slate-400">Admin</p>
                </div>
                <button
                  aria-label="Log out"
                  className="p-1 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                >
                  <LogOut size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── DESKTOP: fixed sidebar (visible from md up) ─────────────────── */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 z-40 w-[220px] h-screen bg-white border-r border-slate-200 box-border">
        {/* Logo */}
        <div className="pt-6 px-5 pb-[18px] border-b border-slate-200">
          <img src={logoLight} alt="Logo" className="block h-10 w-auto" />
        </div>

        {/* Primary nav */}
        <nav className="flex flex-col gap-1 pt-[14px] pr-2.5 pl-0">
          <NavItems />
        </nav>

        {/* Divider */}
        <div className="mx-5 my-3 border-t border-slate-100" />

        {/* Settings nav */}
        <nav className="flex flex-col gap-1 pr-2.5 pl-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 ml-5 mb-1">
            Settings
          </p>
          <SettingsItems />
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User footer */}
        <div className="px-4 py-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#2376E8] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-[#011F53] truncate">
                Jane Doe
              </p>
              <p className="text-[11px] text-slate-400 truncate">Admin</p>
            </div>
            <button
              aria-label="Log out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Version */}
        <div className="py-[14px] px-5 border-t border-slate-200 text-[11px] text-slate-400 font-mono">
          v1.0.0
        </div>
      </aside>
    </>
  );
}
