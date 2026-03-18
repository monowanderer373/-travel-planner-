import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getTotalTravelDays } from '../utils/time';
import { getCityForDay } from '../utils/time';
import './DashboardHero.css';

const WEATHER_CODE_LABEL = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

const WEATHER_CODE_LABEL_ZH = {
  0: '晴朗',
  1: '大部分晴',
  2: '部分多云',
  3: '阴天',
  45: '雾',
  48: '冻雾',
  51: '小毛毛雨',
  53: '中度毛毛雨',
  55: '浓密毛毛雨',
  56: '小冻毛毛雨',
  57: '冻毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  66: '小冻雨',
  67: '冻雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '雪粒',
  80: '阵雨',
  81: '中到大阵雨',
  82: '强烈阵雨',
  85: '小雪阵',
  86: '大雪阵',
  95: '雷暴',
  96: '雷暴伴小冰雹',
  99: '雷暴伴大冰雹',
};

function formatShort(dateStr, isZh) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  if (isZh) return `${d.getMonth() + 1}/${d.getDate()}`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export default function DashboardHero() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { themeId } = useTheme();
  const { user } = useAuth();
  const { trip, days, tripCreator, updateTrip } = useItinerary();
  const hasDetails = trip.destination?.trim() && trip.startDate && trip.endDate;
  const totalDays = hasDetails ? getTotalTravelDays(trip.startDate, trip.endDate) : days.length;
  const title = trip.destination?.trim() || t('home.hero.defaultTitle');
  const dates =
    trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : t('home.dash');
  const isVoyage = themeId === 'voyage-light' || themeId === 'voyage-dark';
  const isZh = lang === 'zh-CN';

  const creatorEmail = String(tripCreator?.email || '').trim().toLowerCase();
  const currentEmail = String(user?.email || '').trim().toLowerCase();
  const creatorId = String(tripCreator?.id || '').trim();
  const currentId = String(user?.id || '').trim();
  const isCreator =
    !!user &&
    (!!creatorEmail && !!currentEmail && creatorEmail === currentEmail) ||
    (!!creatorId && !!currentId && creatorId === currentId);

  const [paste, setPaste] = useState('');

  // Creator edit modals (Voyage-only)
  const [tripEditOpen, setTripEditOpen] = useState(false);
  const [citiesEditOpen, setCitiesEditOpen] = useState(false);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [citiesDraft, setCitiesDraft] = useState([]);

  // Weather state (Voyage-only)
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [weatherMonth, setWeatherMonth] = useState(() => {
    const base = trip.startDate ? new Date(trip.startDate + 'T00:00:00') : new Date();
    return { year: base.getFullYear(), month: base.getMonth() }; // 0-based month
  });
  const [selectedWeatherDate, setSelectedWeatherDate] = useState('');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [weatherForecast, setWeatherForecast] = useState(null);
  const [weatherCityName, setWeatherCityName] = useState('');
  const abortRef = useRef(null);
  const geoCacheRef = useRef(new Map()); // cityName -> { lat, lon }
  const openedWeatherForDateRef = useRef(new Set()); // avoid repeated window.open

  const citySegments = useMemo(() => {
    const list = (trip.cities || [])
      .filter((c) => c?.name && c?.startDate && c?.endDate)
      .map((c) => ({ ...c, name: String(c.name).trim() }));
    return list;
  }, [trip.cities]);

  const slugifyWeatherForecastLocation = (name) => {
    const s = String(name || '').trim();
    if (!s) return '';
    return s
      .replace(/['"]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9\u00C0-\u024F\u3040-\u30FF\u4E00-\u9FFF\-]/g, '')
      .replace(/\-+/g, '-');
  };

  const resolveCityNameForDate = (dateStr) => {
    if (!trip.startDate) return (trip.destination || '').trim();
    const start = new Date(trip.startDate + 'T00:00:00');
    const sel = new Date(dateStr + 'T00:00:00');
    const ms = sel.getTime() - start.getTime();
    const dayIndex = Math.round(ms / (24 * 60 * 60 * 1000));
    return (getCityForDay(dayIndex, trip.startDate, trip.cities) || trip.destination || '').trim();
  };

  const buildWeatherWebsiteUrl = (cityName) => {
    const q = slugifyWeatherForecastLocation(cityName);
    if (!q) return '';
    // AccuWeather doesn't expose a simple "daily by date" URL without a location key.
    // We open their free city search page; user can view daily forecast for the selected date.
    return `https://www.accuweather.com/en/search-locations?query=${encodeURIComponent(cityName)}`;
  };

  useEffect(() => {
    if (!tripEditOpen) return;
    setEditStartDate(trip.startDate || '');
    setEditEndDate(trip.endDate || '');
  }, [tripEditOpen, trip.startDate, trip.endDate]);

  useEffect(() => {
    if (!citiesEditOpen) return;
    const cloned = Array.isArray(trip.cities) ? JSON.parse(JSON.stringify(trip.cities)) : [];
    setCitiesDraft(cloned);
  }, [citiesEditOpen, trip.cities]);

  useEffect(() => {
    if (!weatherOpen || !selectedWeatherDate || !trip.startDate || !trip.endDate) return;
    if (!hasDetails) return;

    const controller = new AbortController();
    abortRef.current?.abort?.();
    abortRef.current = controller;

    const fetchForecast = async () => {
      setWeatherLoading(true);
      setWeatherError('');
      setWeatherForecast(null);
      try {
        const start = new Date(trip.startDate + 'T00:00:00');
        const sel = new Date(selectedWeatherDate + 'T00:00:00');
        const ms = sel.getTime() - start.getTime();
        const dayIndex = Math.round(ms / (24 * 60 * 60 * 1000));
        const cityForDay = getCityForDay(dayIndex, trip.startDate, trip.cities) || trip.destination?.trim();
        const cityName = (cityForDay || '').trim();
        if (!cityName) throw new Error('Missing city');

        setWeatherCityName(cityName);
        const websiteUrl = buildWeatherWebsiteUrl(cityName);

        let coords = geoCacheRef.current.get(cityName);
        if (!coords) {
          const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
          const geoRes = await fetch(geoUrl, { signal: controller.signal });
          if (!geoRes.ok) throw new Error(`Geocoding failed (${geoRes.status})`);
          const geoJson = await geoRes.json();
          const first = geoJson?.results?.[0];
          if (!first?.latitude || !first?.longitude) throw new Error('No geocoding result');
          coords = { lat: first.latitude, lon: first.longitude };
          geoCacheRef.current.set(cityName, coords);
        }

        const forecastUrl =
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
          '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum' +
          '&timezone=auto&forecast_days=16';
        const fRes = await fetch(forecastUrl, { signal: controller.signal });
        if (!fRes.ok) throw new Error(`Forecast failed (${fRes.status})`);
        const fJson = await fRes.json();

        const times = fJson?.daily?.time || [];
        const idx = times.indexOf(selectedWeatherDate);
        if (idx < 0) throw new Error('Selected date not in forecast range');

        const weatherCode = fJson?.daily?.weather_code?.[idx];
        const maxTemp = fJson?.daily?.temperature_2m_max?.[idx];
        const minTemp = fJson?.daily?.temperature_2m_min?.[idx];
        const precipMm = fJson?.daily?.precipitation_sum?.[idx];

        const codeInt = typeof weatherCode === 'number' ? weatherCode : Number(weatherCode);
        const labelEn = WEATHER_CODE_LABEL[codeInt] || 'Unknown';
        const labelZh = WEATHER_CODE_LABEL_ZH[codeInt] || '未知';

        setWeatherForecast({
          maxTemp: maxTemp == null ? '—' : Number(maxTemp).toFixed(0),
          minTemp: minTemp == null ? '—' : Number(minTemp).toFixed(0),
          precipMm: precipMm == null ? '—' : Number(precipMm).toFixed(1),
          weatherLabel: isZh ? labelZh : labelEn,
          sourceUrl: websiteUrl || forecastUrl,
        });
      } catch (e) {
        setWeatherError(e?.message || 'Failed to load forecast');
      } finally {
        setWeatherLoading(false);
      }
    };

    void fetchForecast();
    return () => controller.abort();
  }, [weatherOpen, selectedWeatherDate, trip.startDate, trip.endDate, trip.cities, trip.destination, hasDetails, isZh]);

  return (
    <header className="dashboard-hero">
      <div className="dashboard-hero-bg" aria-hidden="true" />
      <div className="dashboard-hero-content">
        <h1 className="dashboard-hero-title">{title}</h1>
        <p className="dashboard-hero-meta">
          {dates}
          {totalDays > 0 && (
            <span className="dashboard-hero-days">
              · {totalDays} {t('home.totalDays')}
            </span>
          )}
          {isVoyage && (
            <>
              {isCreator && (
                <button
                  type="button"
                  className="dashboard-hero-edit-btn"
                  onClick={() => setTripEditOpen(true)}
                >
                  {isZh ? '编辑' : 'Edit'}
                </button>
              )}
              <button
                type="button"
                className="dashboard-hero-chip dashboard-hero-weather-btn"
                onClick={() => {
                  if (!trip.startDate || !trip.endDate) return;
                  setWeatherMonth(() => {
                    const base = new Date(trip.startDate + 'T00:00:00');
                    return { year: base.getFullYear(), month: base.getMonth() };
                  });
                  setSelectedWeatherDate(trip.startDate);
                  setWeatherForecast(null);
                  setWeatherError('');
                  setWeatherOpen(true);
                }}
              >
                Weather
              </button>
            </>
          )}
        </p>
        {isVoyage && (
          <div className="dashboard-hero-segments">
            {citySegments.length > 0 ? (
              <>
                <div className="dashboard-hero-cityseg-list">
                  {citySegments.map((c, idx) => (
                    <div key={`${c.name}-${idx}`} className={`dashboard-hero-cityseg ${idx % 2 === 0 ? 'dashboard-hero-cityseg--a' : 'dashboard-hero-cityseg--b'}`}>
                      <div className="dashboard-hero-cityseg-city">{c.name}</div>
                      <div className="dashboard-hero-cityseg-dates">
                        {formatShort(c.startDate, isZh)}–{formatShort(c.endDate, isZh)}
                      </div>
                    </div>
                  ))}
                </div>
                {isCreator && (
                  <button type="button" className="dashboard-hero-segments-edit" onClick={() => setCitiesEditOpen(true)}>
                    Edit cities
                  </button>
                )}
              </>
            ) : (
              <span className="dashboard-hero-segments-text">{trip.destination?.trim() ? trip.destination.trim() : ''}</span>
            )}
          </div>
        )}
        <div className="dashboard-hero-actions">
          <Link to="/create" className="dashboard-hero-cta primary">
            {t('home.hero.continuePlanning')}
          </Link>
          {isVoyage && (
            <form
              className="dashboard-hero-paste"
              onSubmit={(e) => {
                e.preventDefault();
                const url = (paste || '').trim();
                if (!url) return;
                setPaste('');
                navigate('/saved', { state: { pasteUrl: url } });
              }}
            >
              <input
                className="dashboard-hero-paste-input"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={t('home.paste.placeholder')}
                type="url"
              />
            </form>
          )}
        </div>
      </div>

      {tripEditOpen && isCreator && (
        <div className="weather-backdrop" role="dialog" aria-modal="true" onClick={() => setTripEditOpen(false)}>
          <div className="weather-modal weather-modal--narrow" onClick={(e) => e.stopPropagation()}>
            <div className="weather-modal-header">
              <div className="weather-modal-title">{t('home.editTrip')}</div>
              <button type="button" className="weather-modal-close" onClick={() => setTripEditOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="trip-edit-form">
              <label className="trip-edit-field">
                <span>{t('create.startDate')}</span>
                <input type="date" value={editStartDate} min={''} onChange={(e) => setEditStartDate(e.target.value)} />
              </label>
              <label className="trip-edit-field">
                <span>{t('create.endDate')}</span>
                <input type="date" value={editEndDate} min={editStartDate} onChange={(e) => setEditEndDate(e.target.value)} />
              </label>
              <div className="trip-edit-actions">
                <button type="button" className="weather-btn" onClick={() => setTripEditOpen(false)}>
                  {t('settings.cancel')}
                </button>
                <button
                  type="button"
                  className="weather-btn weather-btn-primary"
                  onClick={() => {
                    const s = editStartDate;
                    const e = editEndDate;
                    if (!s || !e) return;
                    const start = new Date(s + 'T00:00:00');
                    const end = new Date(e + 'T00:00:00');
                    if (end < start) return;

                    const clampToRange = (dateStr) => {
                      if (!dateStr) return dateStr;
                      const d = new Date(dateStr + 'T00:00:00');
                      if (Number.isNaN(d.getTime())) return dateStr;
                      if (d < start) return s;
                      if (d > end) return e;
                      return dateStr;
                    };

                    const nextCities = (trip.cities || []).map((c) => {
                      const next = { ...c };
                      next.startDate = clampToRange(next.startDate);
                      next.endDate = clampToRange(next.endDate);
                      if (next.startDate && next.endDate && next.endDate < next.startDate) next.endDate = next.startDate;
                      return next;
                    });

                    updateTrip({ startDate: s, endDate: e, cities: nextCities });
                    setTripEditOpen(false);
                  }}
                >
                  {t('profile.save') ?? 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {citiesEditOpen && isCreator && (
        <div className="weather-backdrop" role="dialog" aria-modal="true" onClick={() => setCitiesEditOpen(false)}>
          <div className="weather-modal weather-modal--narrow" onClick={(e) => e.stopPropagation()}>
            <div className="weather-modal-header">
              <div className="weather-modal-title">Edit cities</div>
              <button type="button" className="weather-modal-close" onClick={() => setCitiesEditOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="cities-edit">
              <div className="cities-edit-list">
                {(citiesDraft || []).map((c, idx) => (
                  <div key={idx} className="cities-edit-row">
                    <input
                      className="cities-edit-name"
                      value={c?.name || ''}
                      placeholder={isZh ? '城市/地区' : 'City/Region'}
                      onChange={(e) => {
                        const next = [...(citiesDraft || [])];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setCitiesDraft(next);
                      }}
                    />
                    <input
                      type="date"
                      className="cities-edit-date"
                      value={c?.startDate || ''}
                      min={trip.startDate || ''}
                      max={trip.endDate || ''}
                      onChange={(e) => {
                        const next = [...(citiesDraft || [])];
                        next[idx] = { ...next[idx], startDate: e.target.value };
                        setCitiesDraft(next);
                      }}
                    />
                    <input
                      type="date"
                      className="cities-edit-date"
                      value={c?.endDate || ''}
                      min={(c?.startDate || trip.startDate || '')}
                      max={trip.endDate || ''}
                      onChange={(e) => {
                        const next = [...(citiesDraft || [])];
                        next[idx] = { ...next[idx], endDate: e.target.value };
                        setCitiesDraft(next);
                      }}
                    />
                    <button
                      type="button"
                      className="cities-edit-remove"
                      onClick={() => {
                        const next = (citiesDraft || []).filter((_, i) => i !== idx);
                        setCitiesDraft(next);
                      }}
                      aria-label="Remove city segment"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="cities-edit-actions">
                <button
                  type="button"
                  className="weather-btn"
                  onClick={() => {
                    const next = [
                      ...(citiesDraft || []),
                      { name: '', startDate: trip.startDate || '', endDate: trip.endDate || '' },
                    ];
                    setCitiesDraft(next);
                  }}
                >
                  {t('create.addCity')}
                </button>
                <div className="cities-edit-save-row">
                  <button type="button" className="weather-btn" onClick={() => setCitiesEditOpen(false)}>
                    {t('settings.cancel')}
                  </button>
                  <button
                    type="button"
                    className="weather-btn weather-btn-primary"
                    onClick={() => {
                      const cleaned = (citiesDraft || [])
                        .map((c) => ({
                          name: String(c?.name || '').trim(),
                          startDate: c?.startDate || '',
                          endDate: c?.endDate || '',
                        }))
                        .filter((c) => c.name && c.startDate && c.endDate);
                      updateTrip({ cities: cleaned });
                      setCitiesEditOpen(false);
                    }}
                  >
                    {t('profile.save') ?? 'Save'}
                  </button>
                </div>
              </div>
              <div className="cities-edit-hint">
                {isZh ? '日期重叠时：按上面顺序采用第一个匹配段。' : 'Overlapping dates use the first matching segment (top-to-bottom order).'}
              </div>
            </div>
          </div>
        </div>
      )}

      {weatherOpen && (
        <div className="weather-backdrop" role="dialog" aria-modal="true" onClick={() => setWeatherOpen(false)}>
          <div className="weather-modal" onClick={(e) => e.stopPropagation()}>
            <div className="weather-modal-header">
              <div className="weather-modal-title">{trip.destination?.trim() || 'Trip'}</div>
              <button type="button" className="weather-modal-close" onClick={() => setWeatherOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            <div className="weather-grid">
              <div className="weather-calendar">
                <div className="weather-month-row">
                  <button
                    type="button"
                    className="weather-month-nav"
                    onClick={() => {
                      setWeatherMonth((prev) => {
                        const d = new Date(prev.year, prev.month, 1);
                        d.setMonth(d.getMonth() - 1);
                        return { year: d.getFullYear(), month: d.getMonth() };
                      });
                    }}
                  >
                    ‹
                  </button>
                  <div className="weather-month-label">
                    {new Date(weatherMonth.year, weatherMonth.month, 1).toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </div>
                  <button
                    type="button"
                    className="weather-month-nav"
                    onClick={() => {
                      setWeatherMonth((prev) => {
                        const d = new Date(prev.year, prev.month, 1);
                        d.setMonth(d.getMonth() + 1);
                        return { year: d.getFullYear(), month: d.getMonth() };
                      });
                    }}
                  >
                    ›
                  </button>
                </div>
                <div className="weather-dow">
                  {(isZh ? ['日', '一', '二', '三', '四', '五', '六'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((d) => (
                    <div key={d} className="weather-dow-cell">
                      {d}
                    </div>
                  ))}
                </div>
                <WeatherMonthGrid
                  tripStart={trip.startDate}
                  tripEnd={trip.endDate}
                  month={weatherMonth}
                  selectedDate={selectedWeatherDate}
                  onSelect={(dateStr) => {
                    setSelectedWeatherDate(dateStr);
                    // Open the free forecast site immediately (pop-up blockers require user-initiated actions).
                    if (!openedWeatherForDateRef.current.has(dateStr)) {
                      const cityName = resolveCityNameForDate(dateStr);
                      const url = buildWeatherWebsiteUrl(cityName);
                      if (url) {
                        window.open(url, '_blank', 'noopener,noreferrer');
                        openedWeatherForDateRef.current.add(dateStr);
                      }
                    }
                  }}
                  isZh={isZh}
                />
              </div>

              <div className="weather-forecast">
                {weatherLoading && <div className="weather-status">{t('profile.loading')}</div>}
                {weatherError && <div className="weather-error">{weatherError}</div>}
                {!weatherLoading && !weatherError && selectedWeatherDate && weatherForecast && (
                  <>
                    <div className="weather-city">
                      <strong>{weatherCityName || (trip.destination?.trim() || '')}</strong>
                      <span className="weather-city-date">
                        {formatShort(selectedWeatherDate, isZh)}
                      </span>
                    </div>
                    <div className="weather-kpis">
                      <div className="weather-kpi">
                        <div className="weather-kpi-label">{isZh ? '最高' : 'High'}</div>
                        <div className="weather-kpi-value">{weatherForecast.maxTemp}°C</div>
                      </div>
                      <div className="weather-kpi">
                        <div className="weather-kpi-label">{isZh ? '最低' : 'Low'}</div>
                        <div className="weather-kpi-value">{weatherForecast.minTemp}°C</div>
                      </div>
                      <div className="weather-kpi">
                        <div className="weather-kpi-label">{isZh ? '降水' : 'Precip'}</div>
                        <div className="weather-kpi-value">
                          {weatherForecast.precipMm}mm
                        </div>
                      </div>
                    </div>
                    <div className="weather-desc">
                      {isZh ? '天气' : 'Weather'}: {weatherForecast.weatherLabel}
                    </div>
                    <div className="weather-actions">
                      <a
                        className="weather-open-link"
                        href={weatherForecast.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {isZh ? '打开天气来源' : 'Open forecast source'}
                      </a>
                    </div>
                  </>
                )}
                {!weatherLoading && !weatherError && !weatherForecast && (
                  <div className="weather-empty">{isZh ? '选择日期查看预报' : 'Select a date to see forecast'}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function WeatherMonthGrid({ tripStart, tripEnd, month, selectedDate, onSelect, isZh }) {
  const start = tripStart ? new Date(tripStart + 'T00:00:00') : null;
  const end = tripEnd ? new Date(tripEnd + 'T00:00:00') : null;

  const firstOfMonth = new Date(month.year, month.month, 1);
  const startDow = firstOfMonth.getDay(); // 0 Sun
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();

  const cells = [];
  // pad previous month
  for (let i = 0; i < startDow; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = new Date(month.year, month.month, d);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const inTrip = (!start || !end) ? true : (date >= start && date <= end);
    cells.push({ dateStr, inTrip });
  }
  // pad to 42
  while (cells.length < 42) cells.push(null);

  return (
    <div className="weather-cal-grid">
      {cells.map((c, idx) => {
        if (!c) return <div key={idx} className="weather-cal-cell weather-cal-cell--empty" />;
        const isSelected = c.dateStr === selectedDate;
        return (
          <button
            key={idx}
            type="button"
            className={`weather-cal-cell ${isSelected ? 'weather-cal-cell--selected' : ''} ${
              c.inTrip ? 'weather-cal-cell--in-trip' : 'weather-cal-cell--out-trip'
            }`}
            disabled={!c.inTrip}
            onClick={() => onSelect(c.dateStr)}
          >
            {Number(c.dateStr.slice(-2))}
          </button>
        );
      })}
    </div>
  );
}
