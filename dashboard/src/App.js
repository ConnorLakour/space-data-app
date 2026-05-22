import { useState, useEffect, useCallback } from "react";
import "./App.css";

const API = "https://41n752euy6.execute-api.us-east-1.amazonaws.com/prod";

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Icons ─────────────────────────────────────────────────────────────────
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconAsteroid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M8 12s1-2 4-2 4 2 4 2"/><line x1="12" y1="8" x2="12" y2="8"/>
  </svg>
);
const IconWarning = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconStar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconSpinner = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Stars background ──────────────────────────────────────────────────────
function Stars() {
  return (
    <div className="stars-bg">
      {Array.from({ length: 80 }).map((_, i) => (
        <div
          key={i}
          className="star"
          style={{
            left:  `${Math.random() * 100}%`,
            top:   `${Math.random() * 100}%`,
            width:  `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${Math.random() * 3 + 2}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── APOD Section ──────────────────────────────────────────────────────────
function ApodSection() {
  const [apod, setApod]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    apiFetch("/apod")
      .then(setApod)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section apod-section">
      <div className="section-label"><IconStar /> Astronomy picture of the day</div>
      {loading && <div className="loading"><IconSpinner /> Loading...</div>}
      {error && <div className="err">Failed to load APOD</div>}
      {apod && (
        <div className="apod-card">
          {apod.mediaType === "image" ? (
            <div className="apod-img-wrap">
              <img src={apod.hdurl || apod.url} alt={apod.title} className="apod-img" />
            </div>
          ) : (
            <div className="apod-video-wrap">
              <iframe src={apod.url} title={apod.title} allowFullScreen className="apod-video" />
            </div>
          )}
          <div className="apod-info">
            <div className="apod-meta">
              <span className="apod-date">{apod.date}</span>
              {apod.copyright && <span className="apod-credit">© {apod.copyright}</span>}
            </div>
            <h2 className="apod-title">{apod.title}</h2>
            <p className={`apod-desc ${expanded ? "expanded" : ""}`}>{apod.explanation}</p>
            <button className="btn-text" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show less" : "Read more"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Asteroid Section ──────────────────────────────────────────────────────
function AsteroidSection() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [filter, setFilter]   = useState("all");

  useEffect(() => {
    apiFetch("/asteroids")
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const asteroids = data?.asteroids || [];
  const visible = filter === "hazardous"
    ? asteroids.filter((a) => a.isPotentiallyHazardous)
    : asteroids;

  const hazardCount = asteroids.filter((a) => a.isPotentiallyHazardous).length;

  return (
    <section className="section asteroid-section">
      <div className="section-header-row">
        <div className="section-label"><IconAsteroid /> Near-earth objects</div>
        <div className="filter-btns">
          <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
            All ({asteroids.length})
          </button>
          <button className={`filter-btn hazard ${filter === "hazardous" ? "active" : ""}`} onClick={() => setFilter("hazardous")}>
            <IconWarning /> Hazardous ({hazardCount})
          </button>
        </div>
      </div>

      {loading && <div className="loading"><IconSpinner /> Loading...</div>}
      {error && <div className="err">Failed to load asteroid data</div>}

      {!loading && !error && (
        <div className="asteroid-grid">
          {visible.slice(0, 12).map((a) => (
            <div key={a.id} className={`asteroid-card ${a.isPotentiallyHazardous ? "hazardous" : ""}`}>
              <div className="asteroid-card-top">
                <span className="asteroid-name">{a.name.replace(/[()]/g, "")}</span>
                {a.isPotentiallyHazardous && (
                  <span className="hazard-badge"><IconWarning /> Hazardous</span>
                )}
              </div>
              <div className="asteroid-stats">
                <div className="stat">
                  <span className="stat-label">Miss distance</span>
                  <span className="stat-val">{Number(a.missDistanceKm).toLocaleString(undefined, { maximumFractionDigits: 0 })} km</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Diameter</span>
                  <span className="stat-val">{a.estimatedDiameterMinKm?.toFixed(2)} – {a.estimatedDiameterMaxKm?.toFixed(2)} km</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Velocity</span>
                  <span className="stat-val">{Number(a.relativeVelocityKmH).toLocaleString(undefined, { maximumFractionDigits: 0 })} km/h</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Close approach</span>
                  <span className="stat-val">{a.closestApproachDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Search Section ────────────────────────────────────────────────────────
function SearchSection() {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(false);
  const [selected, setSelected] = useState(null);
  const [mediaType, setMediaType] = useState("image");

  const search = useCallback(async (q, mt) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(false);
    setResults(null);
    try {
      const data = await apiFetch(`/search?q=${encodeURIComponent(q)}&mediaType=${mt}`);
      setResults(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    search(query, mediaType);
  };

  const SUGGESTIONS = ["Apollo 11", "Hubble telescope", "Mars", "Black hole", "Saturn rings", "Nebula"];

  return (
    <section className="section search-section">
      <div className="section-label"><IconSearch /> Search NASA library</div>
      <p className="search-sub">Search over 140,000 NASA images, videos, and audio recordings</p>

      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrap">
          <IconSearch />
          <input
            type="text"
            placeholder="Search NASA archives..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn-search" disabled={loading}>
            {loading ? <IconSpinner /> : "Search"}
          </button>
        </div>
        <div className="search-controls">
          <div className="media-btns">
            {["image", "video", "audio"].map((t) => (
              <button
                key={t}
                type="button"
                className={`filter-btn ${mediaType === t ? "active" : ""}`}
                onClick={() => setMediaType(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Suggestions */}
      {!results && !loading && (
        <div className="suggestions">
          <span className="suggest-label">Try:</span>
          {SUGGESTIONS.map((s) => (
            <button key={s} className="suggest-btn" onClick={() => { setQuery(s); search(s, mediaType); }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <div className="err">Search failed. Please try again.</div>}

      {results && (
        <div className="search-results-header">
          <span className="results-count">{results.totalResults.toLocaleString()} results for "{results.query}"</span>
          <button className="btn-text" onClick={() => setResults(null)}>Clear</button>
        </div>
      )}

      {results && (
        <div className="search-grid">
          {results.results.map((item) => (
            <div key={item.nasaId} className="result-card" onClick={() => setSelected(item)}>
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.title} className="result-thumb" loading="lazy" />
              ) : (
                <div className="result-thumb-placeholder">{item.mediaType}</div>
              )}
              <div className="result-info">
                <p className="result-title">{item.title}</p>
                <p className="result-date">{item.dateCreated?.split("T")[0]}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}><IconClose /></button>
            {selected.thumbnail && (
              <img src={selected.thumbnail} alt={selected.title} className="modal-img" />
            )}
            <div className="modal-body">
              <p className="modal-date">{selected.dateCreated?.split("T")[0]} · {selected.center}</p>
              <h3 className="modal-title">{selected.title}</h3>
              <p className="modal-desc">{selected.description}</p>
              {selected.keywords?.length > 0 && (
                <div className="modal-tags">
                  {selected.keywords.slice(0, 6).map((k) => (
                    <span key={k} className="modal-tag">{k}</span>
                  ))}
                </div>
              )}
              <a href={selected.href} target="_blank" rel="noreferrer" className="modal-link">
                View full asset on NASA →
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────
function Nav({ active, setActive }) {
  const tabs = [
    { id: "apod",      label: "Picture of the Day" },
    { id: "asteroids", label: "Asteroids" },
    { id: "search",    label: "Search NASA" },
  ];

  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="nav-logo">
          <span className="logo-dot" />
          <span>SpaceData</span>
        </div>
        <div className="nav-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`nav-tab ${active === t.id ? "active" : ""}`}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("apod");

  return (
    <div className="app">
      <Stars />
      <Nav active={active} setActive={setActive} />
      <main className="main">
        {active === "apod"      && <ApodSection />}
        {active === "asteroids" && <AsteroidSection />}
        {active === "search"    && <SearchSection />}
      </main>
      <footer className="footer">
        <p>Data provided by <a href="https://api.nasa.gov" target="_blank" rel="noreferrer">NASA APIs</a> · Built with AWS Lambda, DynamoDB & API Gateway</p>
      </footer>
    </div>
  );
}
