// Top-5 coins by market cap, prices in USD, 24h change included
const API_URL =
  'https://api.coingecko.com/api/v3/coins/markets' +
  '?vs_currency=usd&order=market_cap_desc&per_page=5&page=1' +
  '&sparkline=false&price_change_percentage=24h';

const grid = document.getElementById('grid');
const refreshBtn = document.getElementById('refreshBtn');
const btnText = document.getElementById('btnText');
const btnIcon = document.getElementById('btnIcon');
const errorBox = document.getElementById('errorBox');

// Format a number as USD; extra precision for sub-$1 coins
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value);
}

// Format percentage with explicit sign, e.g. "+2.34%" / "-1.20%"
function formatPercent(value) {
  if (value === null || value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// Short click tone via Web Audio API, no external assets
function playClickSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.08);
  } catch {
    // ignore: audio is non-critical
  }
}

// Toggle button loading state
function setLoading(loading) {
  refreshBtn.disabled = loading;
  btnText.textContent = loading ? 'Загрузка...' : 'Обновить вручную';
  btnIcon.innerHTML = loading ? '<span class="spinner"></span>' : '↻';
}

// Show or hide error message
function showError(message) {
  if (!message) {
    errorBox.classList.add('hidden');
    errorBox.textContent = '';
    return;
  }
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

// Render placeholder cards while initial data loads
function renderSkeleton() {
  const cards = Array.from({ length: 5 }, () => `
    <div class="skeleton">
      <div class="skeleton-line wide"></div>
      <div class="skeleton-line medium"></div>
      <div class="skeleton-line narrow"></div>
      <div class="skeleton-line wide"></div>
    </div>
  `).join('');

  grid.innerHTML = cards;
}

// Build a single coin card from API data
function createCoinCard(coin) {
  const change = coin.price_change_percentage_24h;
  const changeClass = change >= 0 ? 'positive' : 'negative';

  return `
    <article class="card">
      <div class="card-top">
        <img
          class="coin-icon"
          src="${coin.image}"
          alt="${coin.name}"
          width="40"
          height="40"
          loading="lazy"
        />
        <div>
          <div class="coin-name">${coin.name}</div>
          <div class="coin-symbol">${coin.symbol}</div>
        </div>
      </div>

      <div class="coin-price">${formatCurrency(coin.current_price)}</div>
      <div class="coin-change ${changeClass}">${formatPercent(change)} за 24ч</div>

      <div class="coin-meta">
        Капитализация: ${formatCurrency(coin.market_cap)}<br />
        Рейтинг: #${coin.market_cap_rank}
      </div>
    </article>
  `;
}

// Render all coin cards
function renderCoins(coins) {
  grid.innerHTML = coins.map(createCoinCard).join('');
}

// Fetch data from API and update UI
async function fetchTopCoins() {
  setLoading(true);
  showError(null);

  try {
    const response = await fetch(API_URL);

    // fetch does not reject on 4xx/5xx
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Empty or invalid API response');
    }

    renderCoins(data);
  } catch (error) {
    console.error('Failed to load coins:', error);

    // TypeError means network failure, otherwise it's an API error
    const message =
      error instanceof TypeError
        ? 'Не удалось подключиться к API. Проверьте интернет-соединение.'
        : `Не удалось обновить данные: ${error.message}. Попробуйте позже.`;

    showError(message);

    if (grid.children.length === 0) {
      renderSkeleton();
    }
  } finally {
    setLoading(false);
  }
}

// Wire up events and load initial data
function init() {
  refreshBtn.addEventListener('click', () => {
    playClickSound();
    fetchTopCoins();
  });

  renderSkeleton();
  fetchTopCoins();
}

init();