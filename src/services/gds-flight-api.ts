export type FlightSearchInput = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
};

export async function searchFlights(input: FlightSearchInput) {
  return [
    {
      provider: "mock-gds",
      airline: "Qatar Airways",
      flightNumber: "QR653",
      origin: input.origin,
      destination: input.destination,
      departureDate: input.departureDate,
      fare: 68000,
      tax: 14000,
      currency: "NPR",
    },
  ];
}
