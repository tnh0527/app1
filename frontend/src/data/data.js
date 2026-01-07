import { iconsImgs } from "../utils/images";

export const profileNavLink = [
  {
    id: 1,
    title: "Edit Profile",
    icon: iconsImgs.edit,
    path: "/profile/personal",
  },
];
export const navigationLinks = [
  { id: 1, title: "Dashboard", icon: iconsImgs.home, path: "/dashboard" },

  {
    id: 2,
    title: "Calendar",
    icon: iconsImgs.calendar,
    path: "/calendar/month",
  },

  {
    id: 3,
    title: "Weather",
    icon: iconsImgs.weather,
    path: "/weather",
  },

  {
    id: 4,
    title: "Subscriptions",
    icon: iconsImgs.bills,
    path: "/subscriptions/all",
  },

  { id: 5, title: "Financials", icon: iconsImgs.wealth, path: "/financials" },

  { id: 6, title: "Travel", icon: iconsImgs.plane, path: "/travel/overview" },

  {
    id: 12,
    title: "AI Foundry",
    icon: iconsImgs.report,
    path: "/ai-foundry",
  },
  { id: 10, title: "Log Out", icon: iconsImgs.exit },
];

export const usStates = [
  { name: "Alabama", abbreviation: "AL" },
  { name: "Alaska", abbreviation: "AK" },
  { name: "Arizona", abbreviation: "AZ" },
  { name: "Arkansas", abbreviation: "AR" },
  { name: "California", abbreviation: "CA" },
  { name: "Colorado", abbreviation: "CO" },
  { name: "Connecticut", abbreviation: "CT" },
  { name: "Delaware", abbreviation: "DE" },
  { name: "Florida", abbreviation: "FL" },
  { name: "Georgia", abbreviation: "GA" },
  { name: "Hawaii", abbreviation: "HI" },
  { name: "Idaho", abbreviation: "ID" },
  { name: "Illinois", abbreviation: "IL" },
  { name: "Indiana", abbreviation: "IN" },
  { name: "Iowa", abbreviation: "IA" },
  { name: "Kansas", abbreviation: "KS" },
  { name: "Kentucky", abbreviation: "KY" },
  { name: "Louisiana", abbreviation: "LA" },
  { name: "Maine", abbreviation: "ME" },
  { name: "Maryland", abbreviation: "MD" },
  { name: "Massachusetts", abbreviation: "MA" },
  { name: "Michigan", abbreviation: "MI" },
  { name: "Minnesota", abbreviation: "MN" },
  { name: "Mississippi", abbreviation: "MS" },
  { name: "Missouri", abbreviation: "MO" },
  { name: "Montana", abbreviation: "MT" },
  { name: "Nebraska", abbreviation: "NE" },
  { name: "Nevada", abbreviation: "NV" },
  { name: "New Hampshire", abbreviation: "NH" },
  { name: "New Jersey", abbreviation: "NJ" },
  { name: "New Mexico", abbreviation: "NM" },
  { name: "New York", abbreviation: "NY" },
  { name: "North Carolina", abbreviation: "NC" },
  { name: "North Dakota", abbreviation: "ND" },
  { name: "Ohio", abbreviation: "OH" },
  { name: "Oklahoma", abbreviation: "OK" },
  { name: "Oregon", abbreviation: "OR" },
  { name: "Pennsylvania", abbreviation: "PA" },
  { name: "Rhode Island", abbreviation: "RI" },
  { name: "South Carolina", abbreviation: "SC" },
  { name: "South Dakota", abbreviation: "SD" },
  { name: "Tennessee", abbreviation: "TN" },
  { name: "Texas", abbreviation: "TX" },
  { name: "Utah", abbreviation: "UT" },
  { name: "Vermont", abbreviation: "VT" },
  { name: "Virginia", abbreviation: "VA" },
  { name: "Washington", abbreviation: "WA" },
  { name: "West Virginia", abbreviation: "WV" },
  { name: "Wisconsin", abbreviation: "WI" },
  { name: "Wyoming", abbreviation: "WY" },
];

export const canadaProvinces = [
  { name: "Alberta", abbreviation: "AB" },
  { name: "British Columbia", abbreviation: "BC" },
  { name: "Manitoba", abbreviation: "MB" },
  { name: "New Brunswick", abbreviation: "NB" },
  { name: "Newfoundland and Labrador", abbreviation: "NL" },
  { name: "Northwest Territories", abbreviation: "NT" },
  { name: "Nova Scotia", abbreviation: "NS" },
  { name: "Nunavut", abbreviation: "NU" },
  { name: "Ontario", abbreviation: "ON" },
  { name: "Prince Edward Island", abbreviation: "PE" },
  { name: "Quebec", abbreviation: "QC" },
  { name: "Saskatchewan", abbreviation: "SK" },
  { name: "Yukon", abbreviation: "YT" },
];

export const australiaStates = [
  { name: "Australian Capital Territory", abbreviation: "ACT" },
  { name: "New South Wales", abbreviation: "NSW" },
  { name: "Northern Territory", abbreviation: "NT" },
  { name: "Queensland", abbreviation: "QLD" },
  { name: "South Australia", abbreviation: "SA" },
  { name: "Tasmania", abbreviation: "TAS" },
  { name: "Victoria", abbreviation: "VIC" },
  { name: "Western Australia", abbreviation: "WA" },
];

// Countries that have state/province data
export const countryRegions = {
  "United States": usStates,
  Canada: canadaProvinces,
  Australia: australiaStates,
};

// Countries without state/province subdivisions (use text input instead)
export const countriesWithoutRegions = [
  "United Kingdom",
  "Germany",
  "France",
  "Japan",
  "Other",
];

export const csrfToken = (() => {
  const cookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("csrftoken="));

  return cookie ? cookie.split("=")[1] : null;
})();
