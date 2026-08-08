// Open-Meteo — Free, accurate, no API key needed
// Uses two-step approach:
// Step 1: Geocoding API to convert city name → lat/lon
// Step 2: Weather API to fetch live weather using coordinates

const GEO_URL     = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// WMO Weather code → { emoji, label }
const weatherInfo = {
  0:  { emoji: "☀️",  label: "Clear Sky" },
  1:  { emoji: "🌤️", label: "Mainly Clear" },
  2:  { emoji: "⛅",  label: "Partly Cloudy" },
  3:  { emoji: "☁️",  label: "Overcast" },
  45: { emoji: "🌫️", label: "Foggy" },
  48: { emoji: "🌫️", label: "Icy Fog" },
  51: { emoji: "🌦️", label: "Light Drizzle" },
  53: { emoji: "🌦️", label: "Drizzle" },
  55: { emoji: "🌧️", label: "Heavy Drizzle" },
  61: { emoji: "🌧️", label: "Light Rain" },
  63: { emoji: "🌧️", label: "Rain" },
  65: { emoji: "🌧️", label: "Heavy Rain" },
  71: { emoji: "❄️",  label: "Light Snow" },
  73: { emoji: "❄️",  label: "Snow" },
  75: { emoji: "❄️",  label: "Heavy Snow" },
  77: { emoji: "❄️",  label: "Snow Grains" },
  80: { emoji: "🌦️", label: "Rain Showers" },
  81: { emoji: "🌧️", label: "Heavy Showers" },
  82: { emoji: "🌧️", label: "Violent Showers" },
  85: { emoji: "❄️",  label: "Snow Showers" },
  86: { emoji: "❄️",  label: "Heavy Snow Showers" },
  95: { emoji: "⛈️",  label: "Thunderstorm" },
  96: { emoji: "⛈️",  label: "Thunderstorm w/ Hail" },
  99: { emoji: "⛈️",  label: "Thunderstorm w/ Heavy Hail" },
};

// DOM elements
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const card      = document.getElementById("weather-card");
const errorMsg  = document.getElementById("error-msg");

async function getWeather(city) {
  if (!city.trim()) return;

  card.style.display = "none";
  errorMsg.style.display = "none";
  searchBtn.textContent = "...";
  searchBtn.disabled = true;

  try {
    // Step 1: Get coordinates from city name
    const geoRes  = await fetch(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      showError("❌ City not found. Please check the spelling and try again.");
      return;
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // Step 2: Get weather using coordinates
    const params = new URLSearchParams({
      latitude,
      longitude,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      wind_speed_unit: "kmh",
      timezone: "auto",
    });

    const weatherRes  = await fetch(`${WEATHER_URL}?${params}`);
    const weatherData = await weatherRes.json();

    showWeather(name, country, weatherData.current);

  } catch (err) {
    showError("🌐 Network error. Please check your internet connection.");
  } finally {
    searchBtn.textContent = "Search";
    searchBtn.disabled = false;
  }
}

function showWeather(city, country, current) {
  const code  = current.weather_code;
  const info  = weatherInfo[code] ?? { emoji: "🌡️", label: "Unknown" };

  document.getElementById("city-name").textContent    = `${city}, ${country}`;
  document.getElementById("weather-icon").textContent = info.emoji;
  document.getElementById("temperature").textContent  = `${Math.round(current.temperature_2m)}°C`;
  document.getElementById("description").textContent  = info.label;
  document.getElementById("humidity").textContent     = `${current.relative_humidity_2m}%`;
  document.getElementById("wind").textContent         = `${Math.round(current.wind_speed_10m)} km/h`;
  document.getElementById("feels-like").textContent   = `${Math.round(current.apparent_temperature)}°C`;

  card.style.display = "block";
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = "block";
}

// Events
searchBtn.addEventListener("click", () => getWeather(cityInput.value));
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") getWeather(cityInput.value);
});
