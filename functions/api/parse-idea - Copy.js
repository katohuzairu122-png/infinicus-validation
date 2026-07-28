// functions/api/parse-idea.js
// Cloudflare Pages Function — parse business idea from uploaded image
// Uses Cloudflare Workers AI vision model (llama-3.2-11b-vision-instruct)
// Bound via Pages dashboard: AI binding name = "AI"

export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return Response.json({ error: 'No image provided' }, { status: 400, headers: corsHeaders });
    }

    const mimeType = file.type || 'image/jpeg';
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimeType)) {
      return Response.json({ error: 'Unsupported image type' }, { status: 400, headers: corsHeaders });
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);

    // Check AI binding
    if (!env.AI) {
      // Fallback: return placeholder if AI not bound
      return Response.json({
        idea: 'Image uploaded. AI parsing unavailable — please describe your business idea in the text box below.',
        fallback: true,
      }, { headers: corsHeaders });
    }

    // Call Workers AI vision model
    const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: base64,
            },
            {
              type: 'text',
              text: 'This image contains a business idea, business plan, pitch, or concept. Extract and summarize the core business idea in 2-4 concise sentences. Focus on: what the business does, who the customers are, and how it makes money. Reply with only the business idea summary, no preamble.',
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const idea = response?.response?.trim() || '';

    if (!idea) {
      return Response.json(
        { error: 'Could not extract idea from image — try a clearer image or type your idea directly.' },
        { status: 422, headers: corsHeaders }
      );
    }

    return Response.json({ idea }, { headers: corsHeaders });

  } catch (err) {
    return Response.json(
      { error: 'Parse error: ' + (err.message || 'unknown error') },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
