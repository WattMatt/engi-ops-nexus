// Comprehensive database of South African cities and towns mapped to SANS 10400-XA climatic zones
// Based on official SANS 204 climatic zone map

export interface CityZoneData {
  city: string;
  zone: string;
  province: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export const SA_CITIES_ZONES: CityZoneData[] = [
  // Zone 1: Cold Interior
  { city: "Johannesburg", zone: "1", province: "Gauteng", coordinates: [28.0473, -26.2041] },
  { city: "Bloemfontein", zone: "1", province: "Free State", coordinates: [26.2309, -29.0852] },
  { city: "Welkom", zone: "1", province: "Free State", coordinates: [26.7056, -27.9772] },
  { city: "Kroonstad", zone: "1", province: "Free State", coordinates: [27.2344, -27.6504] },
  { city: "Virginia", zone: "1", province: "Free State", coordinates: [26.8653, -28.1039] },
  { city: "Vereeniging", zone: "1", province: "Gauteng", coordinates: [27.9261, -26.6496] },
  { city: "Vanderbijlpark", zone: "1", province: "Gauteng", coordinates: [27.8378, -26.7131] },
  { city: "Soweto", zone: "1", province: "Gauteng", coordinates: [27.8546, -26.2678] },
  { city: "Benoni", zone: "1", province: "Gauteng", coordinates: [28.3201, -26.1885] },
  { city: "Boksburg", zone: "1", province: "Gauteng", coordinates: [28.2621, -26.2149] },
  
  // Zone 2: Temperate Interior
  { city: "Pretoria", zone: "2", province: "Gauteng", coordinates: [28.1881, -25.7479] },
  { city: "Polokwane", zone: "2", province: "Limpopo", coordinates: [29.4687, -23.9045] },
  { city: "Centurion", zone: "2", province: "Gauteng", coordinates: [28.1889, -25.8601] },
  { city: "Midrand", zone: "2", province: "Gauteng", coordinates: [28.1273, -25.9894] },
  { city: "Mmabatho", zone: "2", province: "North West", coordinates: [25.6420, -25.8544] },
  { city: "Rustenburg", zone: "2", province: "North West", coordinates: [27.2403, -25.6672] },
  { city: "Klerksdorp", zone: "2", province: "North West", coordinates: [26.6630, -26.8520] },
  { city: "Potchefstroom", zone: "2", province: "North West", coordinates: [27.1036, -26.7144] },
  { city: "Brits", zone: "2", province: "North West", coordinates: [27.7804, -25.6351] },
  { city: "Phalaborwa", zone: "2", province: "Limpopo", coordinates: [31.1411, -23.9430] },
  
  // Zone 3: Hot Interior
  { city: "Makhado", zone: "3", province: "Limpopo", coordinates: [29.9067, -23.0446] },
  { city: "Nelspruit", zone: "3", province: "Mpumalanga", coordinates: [30.9703, -25.4753] },
  { city: "Musina", zone: "3", province: "Limpopo", coordinates: [30.0419, -22.3420] },
  { city: "Thohoyandou", zone: "3", province: "Limpopo", coordinates: [30.4833, -22.9500] },
  { city: "Tzaneen", zone: "3", province: "Limpopo", coordinates: [30.1634, -23.8333] },
  { city: "White River", zone: "3", province: "Mpumalanga", coordinates: [31.0125, -25.3317] },
  { city: "Barberton", zone: "3", province: "Mpumalanga", coordinates: [31.0536, -25.7886] },
  { city: "Hazyview", zone: "3", province: "Mpumalanga", coordinates: [31.1497, -25.0453] },
  { city: "Hoedspruit", zone: "3", province: "Limpopo", coordinates: [31.0483, -24.3500] },
  
  // Zone 4: Temperate Coastal
  { city: "Cape Town", zone: "4", province: "Western Cape", coordinates: [18.4241, -33.9249] },
  { city: "Port Elizabeth", zone: "4", province: "Eastern Cape", coordinates: [25.6022, -33.9608] },
  { city: "George", zone: "4", province: "Western Cape", coordinates: [22.4610, -33.9630] },
  { city: "Stellenbosch", zone: "4", province: "Western Cape", coordinates: [18.8558, -33.9321] },
  { city: "Worcester", zone: "4", province: "Western Cape", coordinates: [19.4483, -33.6464] },
  { city: "Paarl", zone: "4", province: "Western Cape", coordinates: [18.9645, -33.7341] },
  { city: "Mossel Bay", zone: "4", province: "Western Cape", coordinates: [22.1265, -34.1817] },
  { city: "Knysna", zone: "4", province: "Western Cape", coordinates: [23.0469, -34.0364] },
  { city: "Plettenberg Bay", zone: "4", province: "Western Cape", coordinates: [23.3716, -34.0527] },
  { city: "Oudtshoorn", zone: "4", province: "Western Cape", coordinates: [22.2015, -33.5897] },
  { city: "Hermanus", zone: "4", province: "Western Cape", coordinates: [19.2345, -34.4187] },
  { city: "Swellendam", zone: "4", province: "Western Cape", coordinates: [20.4413, -34.0270] },
  { city: "Cradock", zone: "4", province: "Eastern Cape", coordinates: [25.6197, -32.1693] },
  { city: "Uitenhage", zone: "4", province: "Eastern Cape", coordinates: [25.3971, -33.7577] },
  { city: "Grahamstown", zone: "4", province: "Eastern Cape", coordinates: [26.5225, -33.3042] },
  { city: "Port Nolloth", zone: "4", province: "Northern Cape", coordinates: [16.8717, -29.2494] },
  { city: "Alexander Bay", zone: "4", province: "Northern Cape", coordinates: [16.4833, -28.5833] },
  { city: "Saldanha Bay", zone: "4", province: "Western Cape", coordinates: [17.9442, -33.0117] },
  
  // Zone 5: Sub-tropical Coastal
  { city: "Durban", zone: "5", province: "KwaZulu-Natal", coordinates: [31.0218, -29.8587] },
  { city: "Richards Bay", zone: "5", province: "KwaZulu-Natal", coordinates: [32.0378, -28.7830] },
  { city: "East London", zone: "5", province: "Eastern Cape", coordinates: [27.9116, -33.0153] },
  { city: "Pietermaritzburg", zone: "5", province: "KwaZulu-Natal", coordinates: [30.3753, -29.6008] },
  { city: "Port Shepstone", zone: "5", province: "KwaZulu-Natal", coordinates: [30.7411, -30.7414] },
  { city: "Margate", zone: "5", province: "KwaZulu-Natal", coordinates: [30.8647, -30.8644] },
  { city: "Ulundi", zone: "5", province: "KwaZulu-Natal", coordinates: [31.4161, -28.3050] },
  { city: "Empangeni", zone: "5", province: "KwaZulu-Natal", coordinates: [31.8931, -28.7539] },
  { city: "St Lucia", zone: "5", province: "KwaZulu-Natal", coordinates: [32.4142, -28.3769] },
  { city: "Umtata", zone: "5", province: "Eastern Cape", coordinates: [28.7842, -31.5892] },
  { city: "Port St Johns", zone: "5", province: "Eastern Cape", coordinates: [29.5408, -31.6292] },
  { city: "Kokstad", zone: "5", province: "KwaZulu-Natal", coordinates: [29.4242, -30.5472] },
  
  // Zone 6: Arid Interior
  { city: "Kimberley", zone: "6", province: "Northern Cape", coordinates: [24.7631, -28.7282] },
  { city: "Upington", zone: "6", province: "Northern Cape", coordinates: [21.2561, -28.4478] },
  { city: "De Aar", zone: "6", province: "Northern Cape", coordinates: [24.0122, -30.6500] },
  { city: "Springbok", zone: "6", province: "Northern Cape", coordinates: [17.8833, -29.6667] },
  { city: "Calvinia", zone: "6", province: "Northern Cape", coordinates: [19.7761, -31.4719] },
  { city: "Postmasburg", zone: "6", province: "Northern Cape", coordinates: [23.0667, -28.3333] },
  { city: "Kuruman", zone: "6", province: "Northern Cape", coordinates: [23.4325, -27.4500] },
  { city: "Prieska", zone: "6", province: "Northern Cape", coordinates: [22.7439, -29.6653] },
  { city: "Carnarvon", zone: "6", province: "Northern Cape", coordinates: [22.1333, -30.9667] },
  { city: "Sutherland", zone: "6", province: "Northern Cape", coordinates: [20.6667, -32.4000] },
];

// Function to find zone by city name
export const findZoneByCity = (cityName: string): CityZoneData | undefined => {
  const normalizedSearch = cityName.toLowerCase().trim();
  return SA_CITIES_ZONES.find(
    city => city.city.toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes(city.city.toLowerCase())
  );
};

// Function to get all cities in a specific zone
export const getCitiesByZone = (zone: string): CityZoneData[] => {
  return SA_CITIES_ZONES.filter(city => city.zone === zone);
};

// Function to find closest city to coordinates
export const findClosestCity = (lng: number, lat: number): CityZoneData | undefined => {
  let closest: CityZoneData | undefined;
  let minDistance = Infinity;
  
  SA_CITIES_ZONES.forEach(city => {
    const distance = Math.sqrt(
      Math.pow(city.coordinates[0] - lng, 2) + 
      Math.pow(city.coordinates[1] - lat, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closest = city;
    }
  });
  
  return closest;
};
