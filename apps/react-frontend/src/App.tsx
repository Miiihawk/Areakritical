import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { useAuth } from "./auth/useAuth";
import { RequireRole } from "./auth/RequireRole";
import { RequireAuth } from "./auth/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LibraryPage } from "./pages/LibraryPage";
import { GameDetailPage } from "./pages/GameDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RankingPage } from "./pages/RankingPage";
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
  { to: "/admin/reviews", label: "Reviews" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/reports", label: "Reports" },
];

function App() {
  const { role } = useAuth();

  return (
    <>
      {/* The navbar only exists once a user is signed in, and differs by role. */}
      {role === "Admin" ? (
        <AdminNavBar />
      ) : role ? (
        <UserNavBar />
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
                <AdminPage />
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

          {/* Remaining admin links — stubbed for later development. */}
          {adminNavLinks
            .filter(
              (link) =>
                !["/admin", "/admin/users", "/admin/games", "/admin/reports"].includes(link.to),
            )
            .map((link) => (
              <Route
                key={link.to}
                path={link.to}
                element={
                  <RequireRole allowedRoles={["Admin"]}>
                    <ComingSoon title={`Admin · ${link.label}`} />
                  </RequireRole>
                }
              />
            ))}

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

/** Navbar for signed-in regular users. */
function UserNavBar() {
  const { role, logout } = useAuth();

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
        <NavLink to="/profile" className="nav__ghost">
          Profile
        </NavLink>
        <span className="nav__status">
          <span className="nav__dot" aria-hidden="true" /> {role}
        </span>
        <button type="button" className="btn btn--cta" onClick={() => logout()}>
          Log out
        </button>
      </div>
    </nav>
  );
}

/** Navbar for signed-in admins — management-focused links. */
function AdminNavBar() {
  const { role, logout } = useAuth();

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
        <span className="nav__status">
          <span className="nav__dot" aria-hidden="true" /> {role}
        </span>
        <button type="button" className="btn btn--cta" onClick={() => logout()}>
          Log out
        </button>
      </div>
    </nav>
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

          <ul className="hero__stats">
            <li>
              <strong>2.4K</strong>
              <span>Titles archived</span>
            </li>
            <li>
              <strong>18K</strong>
              <span>Retrospectives</span>
            </li>
            <li>
              <strong>96</strong>
              <span>Genres tracked</span>
            </li>
          </ul>
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

function AdminPage() {
  return (
    <section className="panel">
      <h1>Admin Panel</h1>
      <p>Admin-only area.</p>
    </section>
  );
}

/** Placeholder for routes scaffolded but not yet built. */
function ComingSoon({ title }: { title: string }) {
  return (
    <section className="panel">
      <p className="panel__eyebrow">In development</p>
      <h1>{title}</h1>
      <p>This section is scaffolded and coming in a later build.</p>
    </section>
  );
}

export default App;
