import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { query, num_results = 5 } = await request.json();

  // Use Tavily, Serper, or similar search API
  // Note: Ensure TAVILY_API_KEY is set in your .env.local
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: num_results,
      include_answer: true,
    }),
  });

  if (!response.ok) {
     return NextResponse.json({ error: "Failed to fetch search results" }, { status: response.status });
  }

  const data = await response.json();

  return NextResponse.json({
    results: data.results?.map((r: any) => ({
      title: r.title,
      snippet: r.content,
      url: r.url,
    })) || [],
    answer: data.answer,
  });
}

