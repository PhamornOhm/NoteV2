import React, { useState, useEffect } from 'react';

export default function GithubWidget({ user }) {
  const ghProvider = user?.app_metadata?.provider === 'github' ? user?.user_metadata?.user_name : null;
  const defaultUser = ghProvider || localStorage.getItem('customGithubUser') || '';
  const [githubUser, setGithubUser] = useState(defaultUser);
  const [data, setData] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(!!defaultUser);

  useEffect(() => {
    if (!githubUser) { setData(null); setRepos([]); setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetch(`https://api.github.com/users/${githubUser}`).then(r => r.json()),
      fetch(`https://api.github.com/users/${githubUser}/repos?sort=updated&per_page=4`).then(r => r.json()),
    ]).then(([ud, rp]) => {
      setData(ud.message === 'Not Found' ? null : ud);
      setRepos(Array.isArray(rp) ? rp : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [githubUser]);

  const handleSet = () => {
    const n = prompt('GitHub Username (เว้นว่าง = ซ่อน):', githubUser);
    if (n !== null) { const t = n.trim(); setGithubUser(t); t ? localStorage.setItem('customGithubUser', t) : localStorage.removeItem('customGithubUser'); }
  };

  if (loading) return <div className="widget-shimmer"><div className="shimmer-bar" /></div>;
  if (!githubUser) return <div className="widget-empty" onClick={handleSet}>คลิกเพื่อเชื่อมต่อ GitHub</div>;
  if (!data) return <div className="widget-empty" onClick={handleSet}>❌ ไม่พบ "{githubUser}"</div>;

  return (
    <div className="github-widget">
      <div className="gh-profile-row">
        <a href={data.html_url} target="_blank" rel="noreferrer">
          <img className="gh-avatar github-avatar-hover" src={data.avatar_url} alt="" />
        </a>
        <div className="gh-profile-info">
          <div className="gh-name">{data.name || data.login}</div>
          {data.bio && <div className="gh-bio">{data.bio}</div>}
          <button className="gh-change-btn" onClick={handleSet}>@{data.login} ✎</button>
        </div>
      </div>
      <div className="gh-stats-row">
        <div className="gh-stat"><span className="gh-stat-val">{data.public_repos}</span><span className="gh-stat-lbl">Repos</span></div>
        <div className="gh-stat"><span className="gh-stat-val">{data.followers}</span><span className="gh-stat-lbl">Followers</span></div>
        <div className="gh-stat"><span className="gh-stat-val">{data.following}</span><span className="gh-stat-lbl">Following</span></div>
        {data.public_gists > 0 && <div className="gh-stat"><span className="gh-stat-val">{data.public_gists}</span><span className="gh-stat-lbl">Gists</span></div>}
      </div>
      {repos.length > 0 && (
        <div className="gh-repos-section">
          <div className="gh-repos-title">อัปเดตล่าสุด</div>
          {repos.map(r => (
            <a key={r.id} href={r.html_url} target="_blank" rel="noreferrer" className="gh-repo-row">
              <span className="gh-repo-dot" />
              <span className="gh-repo-name">{r.name}</span>
              {r.stargazers_count > 0 && <span className="gh-repo-stars">⭐ {r.stargazers_count}</span>}
              {r.language && <span className="gh-repo-lang">{r.language}</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
