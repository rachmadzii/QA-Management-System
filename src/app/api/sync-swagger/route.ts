import { NextRequest, NextResponse } from "next/server";
import { parseSwagger } from "@/lib/swaggerParser";

export async function POST(req: NextRequest) {
  try {
    const { swaggerUrl } = await req.json();

    if (!swaggerUrl) {
      return NextResponse.json({ error: "Missing swaggerUrl" }, { status: 400 });
    }

    // 1. Fetch Swagger specification
    let spec: any;
    try {
      const response = await fetch(swaggerUrl, {
        headers: { "Accept": "application/json" },
        cache: "no-store",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      spec = await response.json();
    } catch (fetchErr: any) {
      return NextResponse.json({ 
        error: `Could not fetch Swagger specification from ${swaggerUrl}. Error: ${fetchErr.message}` 
      }, { status: 400 });
    }

    // 2. Parse specification
    const parsedEndpoints = parseSwagger(spec, swaggerUrl);
    if (parsedEndpoints.length === 0) {
      return NextResponse.json({ error: "No endpoints found in the specification" }, { status: 422 });
    }

    return NextResponse.json({ 
      success: true, 
      endpoints: parsedEndpoints 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
