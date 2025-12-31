import { iconsImgs } from "../utils/images";

export const profileNavLink = [
  {
    id: 1,
    title: "Edit Profile",
    image: iconsImgs.edit,
    path: "/profile",
  },
];
export const navigationLinks = [
  { id: 1, title: "Dashboard", image: iconsImgs.home, path: "/dashboard" },

  { id: 2, title: "Calendar", image: iconsImgs.calendar, path: "/calendar" },

  { id: 3, title: "Weather", image: iconsImgs.weather, path: "/weather" },

  { id: 4, title: "Financials", image: iconsImgs.wealth, path: "/financials" },

  {
    id: 5,
    title: "Subscriptions",
    image: iconsImgs.bills,
    path: "/subscriptions",
  },

  { id: 6, title: "Travel", image: iconsImgs.plane, path: "/travel" },

  {
    id: 12,
    title: "AI Foundry",
    image: iconsImgs.report,
    path: "/ai-foundry",
  },
  { id: 10, title: "Log Out", image: iconsImgs.exit },
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

export const csrfToken = (() => {
  const cookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("csrftoken="));

  return cookie ? cookie.split("=")[1] : null;
})();
