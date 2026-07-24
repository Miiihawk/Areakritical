import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { adminApi } from '../../services/adminApi';
import { gamesApi } from '../../services/gamesApi';
import { profileApi } from '../../services/profileApi';
import './Admin.css';

/**
 * Admin overview (Admin Dashboard reference). A read-only snapshot of the platform: how many
 * accounts, games, and reviews exist, plus the open-report queue. Every number comes from an
 * endpoint we already have — users from the admin list, games from the catalogue count, reviews
 * summed from the rankings, reports from the open queue.
 */
export function AdminOverviewPage() {
  const { token } = useAuth();
  const [displayName, setDisplayName] = useState('admin');
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalGames, setTotalGames] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState<number | null>(null);
  const [openReports, setOpenReports] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    profileApi
      .get(token)
      .then((profile) => {
        if (active) setDisplayName(profile.displayName?.trim() || profile.username);
      })
      .catch(() => {
        /* Greeting falls back to "admin" — a missing profile shouldn't blank the page. */
      });

    // Each metric loads independently so one slow/failing call never blanks the whole grid.
    adminApi
      .listUsers(token)
      .then((users) => active && setTotalUsers(users.length))
      .catch(() => active && setTotalUsers(null));

    gamesApi
      .browseCount('popular', {}, token)
      .then((count) => active && setTotalGames(count))
      .catch(() => active && setTotalGames(null));

    gamesApi
      .rankings(token)
      .then((rankings) => active && setTotalReviews(rankings.reduce((sum, r) => sum + r.reviewCount, 0)))
      .catch(() => active && setTotalReviews(null));

    adminApi
      .listReports('Open', token)
      .then((reports) => active && setOpenReports(reports.length))
      .catch(() => active && setOpenReports(null));

    return () => {
      active = false;
    };
  }, [token]);

  const show = (value: number | null) => (value === null ? '—' : value.toLocaleString());

  return (
    <div className="adm">
      <div className="adm__head">
        <div>
          <p className="adm__eyebrow">Admin Dashboard</p>
          <h1 className="adm__title">
            Welcome <em>{displayName}.</em>
          </h1>
        </div>

        <div className="adm__chips">
          <div className="adm__chip adm__chip--accent">
            <span className="adm__chip-label">Status</span>
            <span className="adm__chip-value">All systems live</span>
          </div>
          <div className="adm__chip">
            <span className="adm__chip-label">Review Queue</span>
            <span className="adm__chip-value">
              {openReports === null ? '—' : `${openReports} pending ${openReports === 1 ? 'item' : 'items'}`}
            </span>
          </div>
        </div>
      </div>

      <div className="adm-stats">
        <StatCard
          accent
          label="Total Users"
          value={show(totalUsers)}
          sub="Registered accounts"
          icon="👥"
        />
        <StatCard label="Total Games" value={show(totalGames)} sub="In the catalogue" icon="🎮" />
        <StatCard label="Total Reviews" value={show(totalReviews)} sub="Across all titles" icon="✦" />
        <StatCard label="Open Reports" value={show(openReports)} sub="Awaiting moderation" icon="⚑" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  accent?: boolean;
}) {
  return (
    <div className={`adm-stat${accent ? ' adm-stat--accent' : ''}`}>
      <div className="adm-stat__top">
        <span className="adm-stat__label">{label}</span>
        <span className="adm-stat__icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="adm-stat__value">{value}</p>
      <p className="adm-stat__sub">{sub}</p>
      <div className="adm-stat__bar" aria-hidden="true">
        <span style={{ width: accent ? '70%' : '55%' }} />
      </div>
    </div>
  );
}
