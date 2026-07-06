// Static reference data for the onboarding/profile flows: languages, countries,
// and country-aware address field configuration (label + postal-code format).

export const LANGUAGES = [
  "English",
  "Arabic",
  "Mandarin Chinese",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Russian",
  "Hindi",
  "Bengali",
  "Urdu",
  "Japanese",
  "Korean",
  "Italian",
  "Dutch",
  "Turkish",
  "Persian (Farsi)",
  "Polish",
  "Ukrainian",
  "Romanian",
  "Greek",
  "Czech",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Hungarian",
  "Hebrew",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Malay",
  "Filipino (Tagalog)",
  "Swahili",
  "Afrikaans",
  "Amharic",
  "Punjabi",
  "Tamil",
  "Telugu",
  "Marathi",
  "Gujarati",
  "Serbian",
  "Croatian",
  "Bulgarian",
  "Slovak",
  "Catalan",
  "Armenian",
  "Georgian",
  "Kurdish",
  "Pashto",
];

export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahrain", "Bangladesh", "Belgium", "Bolivia",
  "Bosnia and Herzegovina", "Brazil", "Bulgaria", "Cambodia", "Cameroon",
  "Canada", "Chile", "China", "Colombia", "Costa Rica", "Croatia", "Cyprus",
  "Czechia", "Denmark", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
  "Estonia", "Ethiopia", "Finland", "France", "Georgia", "Germany", "Ghana",
  "Greece", "Guatemala", "Honduras", "Hungary", "Iceland", "India", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kuwait", "Latvia", "Lebanon", "Libya", "Lithuania",
  "Luxembourg", "Malaysia", "Maldives", "Malta", "Mexico", "Moldova", "Monaco",
  "Montenegro", "Morocco", "Nepal", "Netherlands", "New Zealand", "Nigeria",
  "North Macedonia", "Norway", "Oman", "Pakistan", "Panama", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Singapore", "Slovakia", "Slovenia",
  "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tanzania", "Thailand", "Tunisia", "Turkey", "Uganda",
  "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zimbabwe",
];

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois",
  "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana",
  "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
  "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
  "District of Columbia",
];

export const CA_PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", "Nunavut",
  "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon",
];

// Default config used for any country not explicitly listed below.
export const DEFAULT_ADDRESS_CONFIG = {
  cityLabel: "City",
  stateLabel: "State / Province / Region",
  stateOptions: null,
  postalLabel: "Postal code",
  postalPlaceholder: "Postal code",
  postalPattern: null, // no strict validation
};

// Per-country overrides. `postalPattern` is a RegExp; `null` label hides the field.
export const COUNTRY_ADDRESS_CONFIG = {
  "United States": {
    cityLabel: "City",
    stateLabel: "State",
    stateOptions: US_STATES,
    postalLabel: "ZIP code",
    postalPlaceholder: "10001",
    postalPattern: /^\d{5}(-\d{4})?$/,
  },
  Canada: {
    cityLabel: "City",
    stateLabel: "Province / Territory",
    stateOptions: CA_PROVINCES,
    postalLabel: "Postal code",
    postalPlaceholder: "K1A 0B1",
    postalPattern: /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/,
  },
  "United Kingdom": {
    cityLabel: "Town / City",
    stateLabel: "County",
    stateOptions: null,
    postalLabel: "Postcode",
    postalPlaceholder: "SW1A 1AA",
    postalPattern: /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/,
  },
  Australia: {
    cityLabel: "Suburb / City",
    stateLabel: "State / Territory",
    stateOptions: [
      "Australian Capital Territory", "New South Wales", "Northern Territory",
      "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia",
    ],
    postalLabel: "Postcode",
    postalPlaceholder: "2000",
    postalPattern: /^\d{4}$/,
  },
  Germany: {
    cityLabel: "City",
    stateLabel: "State (Bundesland)",
    stateOptions: null,
    postalLabel: "Postal code (PLZ)",
    postalPlaceholder: "10115",
    postalPattern: /^\d{5}$/,
  },
  France: {
    cityLabel: "City",
    stateLabel: "Region",
    stateOptions: null,
    postalLabel: "Postal code",
    postalPlaceholder: "75001",
    postalPattern: /^\d{5}$/,
  },
  India: {
    cityLabel: "City",
    stateLabel: "State",
    stateOptions: null,
    postalLabel: "PIN code",
    postalPlaceholder: "110001",
    postalPattern: /^\d{6}$/,
  },
  Netherlands: {
    cityLabel: "City",
    stateLabel: "Province",
    stateOptions: null,
    postalLabel: "Postal code",
    postalPlaceholder: "1011 AB",
    postalPattern: /^\d{4} ?[A-Za-z]{2}$/,
  },
  Brazil: {
    cityLabel: "City",
    stateLabel: "State",
    stateOptions: null,
    postalLabel: "CEP",
    postalPlaceholder: "01310-100",
    postalPattern: /^\d{5}-?\d{3}$/,
  },
  Japan: {
    cityLabel: "City / Ward",
    stateLabel: "Prefecture",
    stateOptions: null,
    postalLabel: "Postal code",
    postalPlaceholder: "100-0001",
    postalPattern: /^\d{3}-?\d{4}$/,
  },
  Lebanon: {
    cityLabel: "City",
    stateLabel: "Governorate",
    stateOptions: [
      "Beirut", "Mount Lebanon", "North", "Akkar", "Beqaa", "Baalbek-Hermel",
      "South", "Nabatieh",
    ],
    postalLabel: "Postal code",
    postalPlaceholder: "1107 2020",
    postalPattern: /^\d{4}( ?\d{4})?$/,
  },
  "United Arab Emirates": {
    cityLabel: "City",
    stateLabel: "Emirate",
    stateOptions: [
      "Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain",
      "Ras Al Khaimah", "Fujairah",
    ],
    postalLabel: null, // UAE does not use postal codes
    postalPlaceholder: "",
    postalPattern: null,
  },
  "Saudi Arabia": {
    cityLabel: "City",
    stateLabel: "Region",
    stateOptions: null,
    postalLabel: "Postal code",
    postalPlaceholder: "11564",
    postalPattern: /^\d{5}$/,
  },
  Spain: {
    cityLabel: "City",
    stateLabel: "Province",
    stateOptions: null,
    postalLabel: "Postal code",
    postalPlaceholder: "28001",
    postalPattern: /^\d{5}$/,
  },
  Italy: {
    cityLabel: "City",
    stateLabel: "Province",
    stateOptions: null,
    postalLabel: "CAP",
    postalPlaceholder: "00100",
    postalPattern: /^\d{5}$/,
  },
};

export function getAddressConfig(country) {
  return COUNTRY_ADDRESS_CONFIG[country] || DEFAULT_ADDRESS_CONFIG;
}

// Returns null when valid (or empty), otherwise a human-readable error message.
export function getPostalError(country, value) {
  const v = (value || "").trim();
  if (!v) return null; // postal code is optional
  const cfg = getAddressConfig(country);
  if (!cfg.postalLabel) return null; // country has no postal codes
  if (cfg.postalPattern && !cfg.postalPattern.test(v)) {
    return `Enter a valid ${cfg.postalLabel}${
      cfg.postalPlaceholder ? ` (e.g. ${cfg.postalPlaceholder})` : ""
    }.`;
  }
  return null;
}
