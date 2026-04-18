import type { ServiceStats, WrappedCard } from '../types/index.js';

let cardCounter = 0;
function makeCardId() {
  return `card_${Date.now()}_${++cardCounter}`;
}

function scoreStat(stat: ServiceStats): number {
  const totals = stat.aggregates.totals;
  let score = 0;
  for (const v of Object.values(totals)) {
    score += typeof v === 'number' ? v : 0;
  }
  return score;
}

// ── Card Builders ────────────────────────────────────────────────────────────

function introCard(): WrappedCard {
  return {
    id: makeCardId(),
    type: 'hero_stat',
    service: 'intro',
    title: "Here's Your Year",
    data: { value: 2025, unit: '', label: "2025 Wrapped" },
  };
}

function heroStat(
  stat: ServiceStats,
  key: string,
  label: string,
  unit: string,
  comparison?: string,
  emoji?: string
): WrappedCard {
  const value = stat.aggregates.totals[key] as number || 0;
  return {
    id: makeCardId(),
    type: 'hero_stat',
    service: stat.service,
    title: label,
    data: { value, unit, comparison, label, emoji },
  };
}

function topListCard(stat: ServiceStats): WrappedCard | null {
  for (const category of stat.aggregates.top_items) {
    if (category.items.length > 0) {
      return {
        id: makeCardId(),
        type: 'top_list',
        service: stat.service,
        title: `Your Top ${category.category.charAt(0).toUpperCase() + category.category.slice(1)}`,
        data: { items: category.items.slice(0, 5), category: category.category },
      };
    }
  }
  return null;
}

function insightCard(stat: ServiceStats, title: string, text: string, chips?: string[]): WrappedCard {
  return {
    id: makeCardId(),
    type: 'insight',
    service: stat.service,
    title,
    data: { text, chips: chips || [] },
  };
}

function chartCard(
  stat: ServiceStats,
  title: string,
  chartType: 'area' | 'bar' | 'donut',
  data: number[],
  labels: string[],
  unit: string
): WrappedCard {
  return {
    id: makeCardId(),
    type: 'chart',
    service: stat.service,
    title,
    data: { chartType, data, labels, unit },
  };
}

function communityCard(stat: ServiceStats, metric: string, value: string, percentile: number): WrappedCard {
  return {
    id: makeCardId(),
    type: 'community',
    service: stat.service,
    title: 'How You Stack Up',
    data: { metric, value, percentile },
  };
}

function comparisonCard(
  stat: ServiceStats,
  title: string,
  label1: string,
  val1: number,
  label2: string,
  val2: number,
  unit: string
): WrappedCard {
  return {
    id: makeCardId(),
    type: 'comparison',
    service: stat.service,
    title,
    data: { labels: [label1, label2], values: [val1, val2], unit },
  };
}

function shareCard(stat: ServiceStats, statText: string): WrappedCard {
  return {
    id: makeCardId(),
    type: 'share',
    service: stat.service,
    title: 'My 2025 Wrapped',
    data: { stat: statText, service: stat.service },
  };
}

// ── Service-Specific Card Strategies ─────────────────────────────────────────

function spotifyCards(stats: ServiceStats): WrappedCard[] {
  const cards: WrappedCard[] = [];
  const s = stats;
  const totals = s.aggregates.totals;

  // Hero stat: total listening time
  if (totals.totalMinutes) {
    const hours = Math.round((totals.totalMinutes as number) / 60);
    cards.push(heroStat(s, 'totalMinutes', `${hours} Hours`, 'of music streamed', 'Up 23% from last year', '🎧'));
  }

  // Top artists list
  const artistsList = topListCard(s);
  if (artistsList) cards.push(artistsList);

  // Genre insight
  const topArtists = s.aggregates.top_items.find(c => c.category === 'artists');
  if (topArtists?.items[0]) {
    cards.push(insightCard(s, 'Your #1 Artist', `${topArtists.items[0].name} was your soundtrack this year. No surprise there.`, [`Top 1: ${topArtists.items[0].name}`]));
  }

  // Monthly heatmap-style chart (mock for now)
  const monthlyData = [120, 145, 132, 158, 167, 189, 201, 195, 178, 210, 234, 256];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  cards.push(chartCard(s, 'Your Listening Journey', 'area', monthlyData, months, 'hours'));

  return cards;
}

function healthCards(stats: ServiceStats): WrappedCard[] {
  const cards: WrappedCard[] = [];
  const s = stats;
  const totals = s.aggregates.totals;

  // Steps hero
  if (totals.totalSteps) {
    const miles = Math.round((totals.totalSteps as number) / 2000 * 10) / 10;
    cards.push(heroStat(s, 'totalSteps', `${(totals.totalSteps as number / 1_000_000).toFixed(1)}M`, 'steps taken', `${miles} miles walked`, '👟'));
  }

  // Workouts chart
  if (totals.workouts) {
    const monthlyWorkouts = [12, 15, 18, 14, 21, 19, 22, 25, 20, 23, 28, 31];
    cards.push(chartCard(s, 'Workouts This Year', 'bar', monthlyWorkouts, ['J','F','M','A','M','J','J','A','S','O','N','D'], 'sessions'));
  }

  // Calories
  if (totals.calories) {
    const caloriesK = Math.round((totals.calories as number) / 1000);
    cards.push(heroStat(s, 'calories', `${caloriesK}K`, 'calories burned', 'Fueled by pure determination', '🔥'));
  }

  return cards;
}

function stravaCards(stats: ServiceStats): WrappedCard[] {
  const cards: WrappedCard[] = [];
  const s = stats;
  const totals = s.aggregates.totals;
  const topSport = (s.aggregates.streaks.topSport as string) || 'Running';

  if (totals.totalDistanceKm) {
    const km = totals.totalDistanceKm as number;
    const manhattanLoops = Math.round(km / 59); // ~59km around Manhattan
    cards.push(heroStat(s, 'totalDistanceKm', `${km.toLocaleString()} km`, 'covered', `That's ${manhattanLoops}x around Manhattan`, '🏃'));
  }

  if (totals.activityCount) {
    cards.push(insightCard(s, 'Consistency Check', `${totals.activityCount} activities logged. Your Strava grid is lighting up.`, [`Top sport: ${topSport}`, `${totals.activityCount} total activities`]));
  }

  // Monthly distance chart
  const monthlyDist = [42, 55, 38, 67, 89, 102, 95, 88, 74, 98, 115, 124];
  cards.push(chartCard(s, 'Distance Each Month', 'area', monthlyDist, ['J','F','M','A','M','J','J','A','S','O','N','D'], 'km'));

  return cards;
}

function goodreadsCards(stats: ServiceStats): WrappedCard[] {
  const cards: WrappedCard[] = [];
  const s = stats;
  const totals = s.aggregates.totals;

  if (totals.booksRead) {
    const pages = totals.pagesRead as number || 0;
    const avgPages = Math.round(pages / (totals.booksRead as number));
    cards.push(heroStat(s, 'booksRead', `${totals.booksRead}`, 'books read', `~${avgPages} pages each on average`, '📚'));
  }

  // Reading streak / top authors
  const authorsList = topListCard(s);
  if (authorsList) {
    (authorsList.data as Record<string,unknown>).category = 'authors';
    authorsList.title = 'Your Top Authors';
    cards.push(authorsList);
  }

  // Insight
  if (totals.pagesRead) {
    const pagesPerDay = Math.round((totals.pagesRead as number) / 365);
    cards.push(insightCard(s, 'Daily Reading', `${pagesPerDay} pages a day keeps the brain engaged. That's ${Math.round((totals.pagesRead as number) / 1800)} years of reading done.`, [`${(totals.pagesRead as number).toLocaleString()} total pages`]));
  }

  return cards;
}

function steamCards(stats: ServiceStats): WrappedCard[] {
  const cards: WrappedCard[] = [];
  const s = stats;
  const totals = s.aggregates.totals;
  const topGame = s.aggregates.top_items[0]?.items[0]?.name;

  if (totals.totalHours) {
    const days = Math.round((totals.totalHours as number) / 24 * 10) / 10;
    cards.push(heroStat(s, 'totalHours', `${(totals.totalHours as number).toLocaleString()} hrs`, 'of gaming', `That's ${days} full days in-game`, '🎮'));
  }

  if (topGame) {
    cards.push(insightCard(s, 'Your Game of the Year', `"${topGame}" dominated your screen time. No judgment.`, [`Top game: ${topGame}`, `${totals.gamesPlayed} games played`]));
  }

  // Games bar chart
  if (s.aggregates.top_items[0]?.items.length) {
    const gameHours = [342, 287, 156, 98, 67];
    const gameLabels = s.aggregates.top_items[0].items.slice(0, 5).map(i => i.name.split(' ')[0]);
    cards.push(chartCard(s, 'Top Games by Hours', 'bar', gameHours, gameLabels, 'hrs'));
  }

  return cards;
}

// ── Main Selector ─────────────────────────────────────────────────────────────

export function selectCards(stats: ServiceStats[], maxCards = 15): WrappedCard[] {
  const cards: WrappedCard[] = [introCard()];

  const sorted = [...stats].sort((a, b) => scoreStat(b) - scoreStat(a));

  for (const stat of sorted) {
    if (cards.length >= maxCards) break;

    let serviceCards: WrappedCard[] = [];
    switch (stat.service) {
      case 'spotify':    serviceCards = spotifyCards(stat);    break;
      case 'apple_health': serviceCards = healthCards(stat);  break;
      case 'strava':     serviceCards = stravaCards(stat);     break;
      case 'goodreads':  serviceCards = goodreadsCards(stat);  break;
      case 'steam':      serviceCards = steamCards(stat);      break;
      default: {
        // Generic cards for unknown services
        for (const [key, val] of Object.entries(stat.aggregates.totals)) {
          if (typeof val === 'number' && val > 0) {
            cards.push(heroStat(stat, key, `${val.toLocaleString()}`, key, undefined));
            break;
          }
        }
        const list = topListCard(stat);
        if (list) cards.push(list);
      }
    }
    cards.push(...serviceCards);
  }

  // Add community comparison for top 2 data-rich services
  for (const stat of sorted.slice(0, 2)) {
    if (cards.length >= maxCards) break;
    const percentile = Math.floor(Math.random() * 25) + 3; // 3–27%
    const metric = stat.service.replace('_', ' ');
    const values = Object.values(stat.aggregates.totals);
    const sampleValue = values.find(v => typeof v === 'number') as number;
    cards.push(communityCard(stat, metric, formatValue(sampleValue, metric), percentile));
  }

  // Comparison card (this year vs last)
  for (const stat of sorted.slice(0, 1)) {
    if (cards.length >= maxCards) break;
    const totals = stat.aggregates.totals;
    const comparisons = stat.aggregates.comparisons;
    if (comparisons.length > 0) {
      const c = comparisons[0];
      cards.push(comparisonCard(stat, 'This Year vs Last Year', '2024', c.previous, '2025', c.current, ''));
    } else {
      // Synthesize a comparison
      for (const key of Object.keys(totals)) {
        const val = totals[key];
        if (typeof val === 'number' && val > 0) {
          const lastYear = Math.round(val * (0.75 + Math.random() * 0.15));
          cards.push(comparisonCard(stat, 'This Year vs Last Year', 'Last Year', lastYear, 'This Year', val, ''));
          break;
        }
      }
    }
  }

  // Share card (always last)
  if (sorted.length > 0) {
    const top = sorted[0];
    const totals = top.aggregates.totals;
    const firstKey = Object.keys(totals).find(k => typeof totals[k] === 'number');
    const statText = firstKey ? `${formatValue(totals[firstKey] as number, firstKey)} ${firstKey.replace(/([A-Z])/g, ' $1').trim()}` : 'An incredible year';
    cards.push(shareCard(top, statText));
  }

  return cards.slice(0, maxCards);
}

function formatValue(val: number, key: string): string {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
  if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
  return val.toLocaleString();
}
