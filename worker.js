export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight check requirements if your dashboard runs on a separate host
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    // --- ROUTE 1: STAFF AUTHENTICATION ---
    if (request.method === "POST" && url.pathname === "/auth") {
      try {
        const { user, pass } = await request.json();

        // Server-Side User Directory (Case Sensitive)
        const staffDirectory = {
          "brycen.26": "ItsAlwaysNull",
          ".athos.": "binot",
          "gamerfuelactive": "GamerIsAGamerForNil"
        };

        if (staffDirectory[user] && staffDirectory[user] === pass) {
          return new Response(JSON.stringify({ success: true, message: "Authorized" }), {
            status: 200,
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*" 
            }
          });
        }

        return new Response(JSON.stringify({ error: "Invalid Credentials" }), {
          status: 401,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Bad Request Structure" }), { status: 400 });
      }
    }

    // --- ROUTE 2: MODERATION COMMAND DEPLOYMENT ---
    if (request.method === "POST" && url.pathname === "/moderation") {
      try {
        const payload = await request.json();
        const API_KEY = env.ROBLOX_API_KEY;
        const UNIVERSE_ID = env.UNIVERSE_ID;

        if (!API_KEY || !UNIVERSE_ID) {
          return new Response(JSON.stringify({ error: "Server structural config missing." }), { status: 500 });
        }

        // Direct Execution Route matching backend design
        if (payload.action === "ban") {
          const robloxResponse = await fetch(`https://apis.roblox.com/cloud/v2/universes/${UNIVERSE_ID}/user-bans`, {
            method: 'POST',
            headers: {
              'x-api-key': API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user: `users/${payload.userId}`,
              displayReason: payload.displayReason,
              privateReason: payload.privateReason,
              duration: payload.duration === "permanent" ? null : payload.duration
            })
          });

          const resText = await robloxResponse.text();
          return new Response(resText, { 
            status: robloxResponse.status,
            headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
          });
        } 
        
        // MessagingService fallback route for real-time kick/warn scripts
        if (payload.action === "kick" || payload.action === "warn") {
          const robloxMsgResponse = await fetch(`https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/ThunderstruckMod`, {
            method: 'POST',
            headers: {
              'x-api-key': API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: JSON.stringify({
                action: payload.action,
                userId: payload.userId,
                reason: payload.displayReason
              })
            })
          });

          if (robloxMsgResponse.ok) {
            return new Response(JSON.stringify({ success: true }), { 
              status: 200, 
              headers: { "Access-Control-Allow-Origin": "*" } 
            });
          }
          return new Response(JSON.stringify({ error: "MessagingService pipeline failed" }), { status: 502 });
        }

        return new Response(JSON.stringify({ error: "Unknown operational action Type" }), { status: 400 });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    return new Response(JSON.stringify({ error: "Not Found" }), { status: 404 });
  }
};
