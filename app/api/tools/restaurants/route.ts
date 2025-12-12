import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { cuisine, location, price_range } = await request.json();

  // Use Google Places, Yelp, or similar API
  // Note: Ensure GOOGLE_PLACES_API_KEY is set in your .env.local
  const searchQuery = [cuisine, "restaurant", location].filter(Boolean).join(" ");
  
  // Example using a places API
  // Note: This endpoint format depends on the specific Google Maps API version and endpoint you are using.
  // The prompt uses "textsearch", which is part of the Places API (legacy) or the new Places API (New).
  // Assuming the prompt's example is what the user wants.
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${process.env.GOOGLE_PLACES_API_KEY}`
  );

  if (!response.ok) {
     return NextResponse.json({ error: "Failed to fetch restaurant results" }, { status: response.status });
  }

  const data = await response.json();

  const restaurants = data.results?.slice(0, 5).map((place: any) => ({
    name: place.name,
    address: place.formatted_address,
    rating: place.rating,
    price_level: "$".repeat(place.price_level || 2),
    open_now: place.opening_hours?.open_now,
  })) || [];

  return NextResponse.json({
    restaurants,
    summary: restaurants.length > 0
      ? `Found ${restaurants.length} restaurants: ${restaurants.map((r: any) => `${r.name} (${r.rating}★)`).join(", ")}`
      : "No restaurants found matching your criteria",
  });
}

