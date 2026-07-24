import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { useAuth } from "./auth/useAuth";
import { profileApi } from "./services/profileApi";
import { statsApi, type SiteStats } from "./services/statsApi";
import { RequireRole } from "./auth/RequireRole";
import { RequireAuth } from "./auth/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LibraryPage } from "./pages/LibraryPage";
import { GameDetailPage } from "./pages/GameDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RankingPage } from "./pages/RankingPage";
import { AdminOverviewPage } from "./pages/admin/AdminOverviewPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminGamesPage } from "./pages/admin/AdminGamesPage";
import { AdminReportsPage } from "./pages/admin/AdminReportsPage";

/**
 * Navigation targets, defined once so the navbars and the routes stay in sync.
 * Most point at pages that are stubbed for later development.
 */
const userNavLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/library", label: "Game Library" },
  { to: "/ranking", label: "Ranking" },
];

const adminNavLinks = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/games", label: "Games" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/reports", label: "Reports" },
];

function App() {
  const { role } = useAuth();
  const location = useLocation();

  // The navbar follows the AREA the admin is in, not just their role: on admin routes they get the
  // admin navbar; when they step out to the public site they get the user navbar (with a shortcut
  // back to the admin side). Regular users always get the user navbar.
  const inAdminArea = location.pathname.startsWith("/admin");
  const isAdmin = role === "Admin";

  return (
    <>
      {/* The navbar only exists once a user is signed in. */}
      {isAdmin && inAdminArea ? (
        <AdminNavBar />
      ) : role ? (
        <UserNavBar isAdmin={isAdmin} />
      ) : null}

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />

          <Route
            path="/library"
            element={
              <RequireAuth>
                <LibraryPage />
              </RequireAuth>
            }
          />

          {/* Game detail page — the hub for reviews, comments, and reports (feature 002). */}
          <Route
            path="/games/:id"
            element={
              <RequireAuth>
                <GameDetailPage />
              </RequireAuth>
            }
          />

          {/* Own profile — view/edit details and change password (feature 002, US6). */}
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />

          {/* Community leaderboard — games ranked by aggregate impact score. */}
          <Route
            path="/ranking"
            element={
              <RequireAuth>
                <RankingPage />
              </RequireAuth>
            }
          />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/admin"
            element={
              <RequireRole allowedRoles={["Admin"]}>
                <AdminOverviewPage />
              </RequireRole>
            }
          />

          {/* Admin moderation pages (feature 002, US8). */}
          <Route
            path="/admin/users"
            element={
              <RequireRole allowedRoles={["Admin"]}>
                <AdminUsersPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/games"
            element={
              <RequireRole allowedRoles={["Admin"]}>
                <AdminGamesPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RequireRole allowedRoles={["Admin"]}>
                <AdminReportsPage />
              </RequireRole>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

/** Brand wordmark, reused across navbars and the landing header. */
function Brand({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="nav__brand" aria-label="AreaKritical home">
      <span className="nav__brand-glyph" aria-hidden="true">
        ▮▮
      </span>
      <span className="nav__brand-name">
        AREA<span>KRITICAL</span>
      </span>
    </Link>
  );
}

/**
 * The signed-in user's avatar in the navbar — their initials, linking to the profile page. It
 * replaces what used to be a plain "Profile" text link, so the navbar's right side reads as a
 * consistent set of controls (avatar + log out) rather than mixed text and buttons.
 */
function NavAvatar() {
  const { token } = useAuth();
  const [initials, setInitials] = useState("AK");

  useEffect(() => {
    let active = true;
    profileApi
      .get(token)
      .then((profile) => {
        if (!active) return;
        // Same derivation as the profile page, so the two avatars always agree.
        const name = profile.displayName?.trim() || profile.username || "";
        const derived = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
        if (derived) setInitials(derived);
      })
      .catch(() => {
        /* Keep the fallback initials if the profile can't be loaded — the link still works. */
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <NavLink to="/profile" className="nav__avatar" title="Your profile" aria-label="Your profile">
      {initials}
    </NavLink>
  );
}

/** The log-out control, shared by both navbars so they stay identical. */
function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button type="button" className="btn btn--cta" onClick={() => logout()}>
      Log out
    </button>
  );
}

/**
 * Navbar for the public site. Shown to regular users, and also to an admin who has stepped out to
 * the site — in that case `isAdmin` adds a shortcut back to the admin dashboard.
 */
function UserNavBar({ isAdmin = false }: { isAdmin?: boolean }) {

  return (
    <nav className="nav">
      <Brand to="/dashboard" />

      <div className="nav__links">
        {userNavLinks.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === "/dashboard"}>
            {link.label}
          </NavLink>
        ))}
      </div>

      <div className="nav__actions">
        {isAdmin && (
          <NavLink to="/admin" className="btn btn--outline nav__admin-return">
            <span aria-hidden="true">←</span> Admin
          </NavLink>
        )}
        <span className="nav__divider" aria-hidden="true" />
        <NavAvatar />
        <LogoutButton />
      </div>
    </nav>
  );
}

/** Navbar for signed-in admins — management-focused links. */
function AdminNavBar() {
  return (
    <nav className="nav nav--admin">
      <div className="nav__brand-wrap">
        <Brand to="/admin" />
        <span className="nav__badge">Admin</span>
      </div>

      <div className="nav__links">
        {adminNavLinks.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === "/admin"}>
            {link.label}
          </NavLink>
        ))}
      </div>

      <div className="nav__actions">
        <NavLink to="/dashboard" className="nav__ghost">
          View site
        </NavLink>
        <span className="nav__divider" aria-hidden="true" />
        <NavAvatar />
        <LogoutButton />
      </div>
    </nav>
  );
}

/** Compact formatting for the hero figures — "1.2K" rather than "1200". */
const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * The landing hero's headline figures, read from our own database via the public /api/stats
 * endpoint (the landing page is shown to signed-out visitors, so the endpoint is anonymous).
 * While the request is in flight the row shows placeholders so the hero doesn't shift; if it
 * fails the row is dropped entirely rather than showing a visitor broken numbers.
 */
function HeroStats() {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    let active = true;
    statsApi
      .getSiteStats()
      .then((result) => {
        if (active) setStats(result);
      })
      .catch(() => {
        if (active) setHasFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (hasFailed) {
    return null;
  }

  const show = (value: number | undefined) =>
    value === undefined ? "—" : compactNumber.format(value);

  return (
    <ul className="hero__stats">
      <li>
        <strong>{show(stats?.titlesReviewed)}</strong>
        <span>Titles reviewed</span>
      </li>
      <li>
        <strong>{show(stats?.retrospectives)}</strong>
        <span>Retrospectives</span>
      </li>
      <li>
        <strong>{show(stats?.members)}</strong>
        <span>Members</span>
      </li>
    </ul>
  );
}

function HomePage() {
  const { role } = useAuth();

  return (
    <div className="landing">
      {/* Ambient background layers */}
      <div className="landing__bg" aria-hidden="true">
        <div className="landing__glow" />
        <div className="landing__grid" />
        <div className="landing__scanlines" />
        <div className="landing__vignette" />
      </div>

      {/* In-page header — the public landing has no global navbar, so the
          brand and auth actions live directly on the page. Hidden once a
          user is signed in (the role-based navbar takes over). */}
      {!role && (
        <header className="landing__header">
          <Brand />
          <div className="landing__header-actions">
            <Link to="/login" className="nav__ghost">
              Sign in
            </Link>
            <Link to="/register" className="btn btn--cta">
              Register Now
            </Link>
          </div>
        </header>
      )}

      {/* Ghost brand text behind hero */}
      <span className="landing__ghost" aria-hidden="true">
        AREAKRITICAL
      </span>

      <section className="hero">
        <div className="hero__copy">
          <p className="hero__eyebrow">
            <span>Reviews</span>
            <i aria-hidden="true">◆</i>
            <span>Retrospectives</span>
            <i aria-hidden="true">◆</i>
            <span>Rankings</span>
          </p>

          <h1 className="hero__title glitch" data-text="AREAKRITICAL">
            AREAKRITICAL
          </h1>

          <p className="hero__lede">
            The living archive for the games that mattered. Revisit the
            classics, log your verdict, and see how every title holds up — one
            honest retrospective at a time.
          </p>

          <div className="hero__cta">
            <Link to="/dashboard" className="btn btn--primary">
              Enter the Archive <span aria-hidden="true">→</span>
            </Link>
            <Link to="/register" className="btn btn--outline">
              Create an Account
            </Link>
          </div>

          <HeroStats />
        </div>

        {/* Hero visual — CSS "game core" medallion */}
        <div className="hero__visual" aria-hidden="true">
          <div className="core">
            <div className="core__ring core__ring--1" />
            <div className="core__ring core__ring--2" />
            <div className="core__ring core__ring--3" />
            <div className="core__orb">
              <span className="core__spark">◇</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom strip: featured card + release ticker */}
      <div className="footstrip"></div>
    </div>
  );
}

export default App;
