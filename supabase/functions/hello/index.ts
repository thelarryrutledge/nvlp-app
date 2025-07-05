import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("Hello function started")

serve(async (req) => {
  const { method, url } = req
  
  // Handle CORS preflight requests
  if (method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "apikey, Authorization, Content-Type",
      },
    })
  }

  try {
    // Simple hello world response
    const data = {
      message: "Hello from NVLP Edge Function!",
      timestamp: new Date().toISOString(),
      method: method,
      url: url,
      version: "1.0.0"
    }

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 500,
      }
    )
  }
})