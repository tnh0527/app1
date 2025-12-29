// Capital cities for countries - used when user searches only a country name
// Maps country names (lowercase) to their capital city search strings

const CAPITAL_CITIES = {
  // North America
  usa: "Washington, D.C., USA",
  "united states": "Washington, D.C., USA",
  "united states of america": "Washington, D.C., USA",
  canada: "Ottawa, Ontario, Canada",
  mexico: "Mexico City, Mexico",

  // South America
  brazil: "Brasília, Brazil",
  argentina: "Buenos Aires, Argentina",
  chile: "Santiago, Chile",
  colombia: "Bogotá, Colombia",
  peru: "Lima, Peru",
  venezuela: "Caracas, Venezuela",
  ecuador: "Quito, Ecuador",
  bolivia: "La Paz, Bolivia",
  paraguay: "Asunción, Paraguay",
  uruguay: "Montevideo, Uruguay",

  // Europe
  uk: "London, United Kingdom",
  "united kingdom": "London, United Kingdom",
  england: "London, United Kingdom",
  "great britain": "London, United Kingdom",
  france: "Paris, France",
  germany: "Berlin, Germany",
  italy: "Rome, Italy",
  spain: "Madrid, Spain",
  portugal: "Lisbon, Portugal",
  netherlands: "Amsterdam, Netherlands",
  belgium: "Brussels, Belgium",
  switzerland: "Bern, Switzerland",
  austria: "Vienna, Austria",
  poland: "Warsaw, Poland",
  sweden: "Stockholm, Sweden",
  norway: "Oslo, Norway",
  denmark: "Copenhagen, Denmark",
  finland: "Helsinki, Finland",
  ireland: "Dublin, Ireland",
  greece: "Athens, Greece",
  "czech republic": "Prague, Czech Republic",
  czechia: "Prague, Czech Republic",
  hungary: "Budapest, Hungary",
  romania: "Bucharest, Romania",
  ukraine: "Kyiv, Ukraine",
  russia: "Moscow, Russia",
  turkey: "Ankara, Turkey",

  // Asia
  china: "Beijing, China",
  japan: "Tokyo, Japan",
  "south korea": "Seoul, South Korea",
  korea: "Seoul, South Korea",
  "north korea": "Pyongyang, North Korea",
  india: "New Delhi, India",
  pakistan: "Islamabad, Pakistan",
  bangladesh: "Dhaka, Bangladesh",
  indonesia: "Jakarta, Indonesia",
  malaysia: "Kuala Lumpur, Malaysia",
  singapore: "Singapore",
  thailand: "Bangkok, Thailand",
  vietnam: "Hanoi, Vietnam",
  philippines: "Manila, Philippines",
  taiwan: "Taipei, Taiwan",
  "hong kong": "Hong Kong",
  "saudi arabia": "Riyadh, Saudi Arabia",
  uae: "Abu Dhabi, UAE",
  "united arab emirates": "Abu Dhabi, UAE",
  israel: "Jerusalem, Israel",
  iran: "Tehran, Iran",
  iraq: "Baghdad, Iraq",
  afghanistan: "Kabul, Afghanistan",
  nepal: "Kathmandu, Nepal",
  "sri lanka": "Colombo, Sri Lanka",
  myanmar: "Naypyidaw, Myanmar",
  cambodia: "Phnom Penh, Cambodia",
  laos: "Vientiane, Laos",

  // Africa
  egypt: "Cairo, Egypt",
  "south africa": "Pretoria, South Africa",
  nigeria: "Abuja, Nigeria",
  kenya: "Nairobi, Kenya",
  ethiopia: "Addis Ababa, Ethiopia",
  morocco: "Rabat, Morocco",
  algeria: "Algiers, Algeria",
  tunisia: "Tunis, Tunisia",
  libya: "Tripoli, Libya",
  sudan: "Khartoum, Sudan",
  ghana: "Accra, Ghana",
  tanzania: "Dodoma, Tanzania",
  uganda: "Kampala, Uganda",
  zimbabwe: "Harare, Zimbabwe",
  zambia: "Lusaka, Zambia",
  angola: "Luanda, Angola",
  mozambique: "Maputo, Mozambique",
  senegal: "Dakar, Senegal",
  "ivory coast": "Yamoussoukro, Ivory Coast",
  cameroon: "Yaoundé, Cameroon",

  // Oceania
  australia: "Canberra, Australia",
  "new zealand": "Wellington, New Zealand",
  fiji: "Suva, Fiji",
  "papua new guinea": "Port Moresby, Papua New Guinea",

  // Central America & Caribbean
  cuba: "Havana, Cuba",
  jamaica: "Kingston, Jamaica",
  haiti: "Port-au-Prince, Haiti",
  "dominican republic": "Santo Domingo, Dominican Republic",
  "puerto rico": "San Juan, Puerto Rico",
  panama: "Panama City, Panama",
  "costa rica": "San José, Costa Rica",
  guatemala: "Guatemala City, Guatemala",
  honduras: "Tegucigalpa, Honduras",
  "el salvador": "San Salvador, El Salvador",
  nicaragua: "Managua, Nicaragua",
  belize: "Belmopan, Belize",
};

/**
 * Check if input is a country name and return its capital city
 * @param {string} input - The user's search input
 * @returns {string|null} - Capital city string or null if not a country
 */
export const getCapitalCity = (input) => {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  return CAPITAL_CITIES[normalized] || null;
};

/**
 * Transform location input - if it's just a country, use capital city
 * @param {string} input - The user's search input
 * @returns {string} - Either the capital city or the original input
 */
export const transformLocationInput = (input) => {
  const capital = getCapitalCity(input);
  return capital || input;
};

export default CAPITAL_CITIES;
