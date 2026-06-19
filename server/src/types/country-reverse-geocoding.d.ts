declare module 'country-reverse-geocoding' {
  interface CountryResult {
    name: string;
    code: string;
  }

  const countryReverseGeocoding: {
    get_country(latitude: number, longitude: number): CountryResult | null;
  };

  export = countryReverseGeocoding;
}
