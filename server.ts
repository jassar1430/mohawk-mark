import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

dotenv.config();

const app = express();
const PORT = 3000;

console.log('TripQuest Server: Initializing...');

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper for retry logic
async function generateWithRetry(params: any, retries = 6) {
  const modelFallback = ['gemini-3-flash-preview', 'gemini-2.0-flash-exp', 'gemini-2.0-flash'];
  
  for (let i = 0; i < retries; i++) {
    const currentModel = i < 2 ? (params.model || modelFallback[0]) : modelFallback[Math.min(i - 1, modelFallback.length - 1)];
    try {
      console.log(`Attempting generation with ${currentModel} (Attempt ${i + 1}/${retries})...`);
      // Ensure tool structure is correct for the specific SDK version
      const fetchParams = { ...params, model: currentModel };
      
      const response = await ai.models.generateContent(fetchParams);
      return response;
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || 
                          error.message?.includes('RESOURCE_EXHAUSTED') || 
                          error.status === 429 ||
                          (error.response && error.response.status === 429);
      
      const isNotFound = error.message?.includes('not found') || error.status === 404;

      if ((isRateLimit || isNotFound) && i < retries - 1) {
        const waitTime = isRateLimit ? (Math.pow(2, i + 1) * 1500 + Math.random() * 1000) : 500;
        console.log(`${isRateLimit ? 'Rate limited' : 'Model not found'} (${currentModel}). Retrying in ${Math.round(waitTime)}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
}

// Quest Generation Endpoint
app.post('/api/quests', async (req: Request, res: Response) => {
  const { from, to, via, tripType } = req.body;

  try {
    const prompt = `Act as a travel micro-adventure scout. 
    Route: From ${from} to ${to}${via ? ` passing through ${via}` : ''}.
    Trip Type: "${tripType}" (family, friends, or romantic partner).

    STRICT RULES:
    1. ZERO quests can be in the departure city (${from}).
    2. Focus on "Micro-Quests": small, 15-minute hidden gems, specific local snacks, or secret photo spots.
    3. At least 3 quests MUST be in/around the destination city (${to}), specifically things regular tourists DON'T see.
    4. Provide exactly 5 quests.
    5. Translate and provide Arabic equivalents for all text fields.

    For each quest, provide:
    1. title: Catchy English name.
    2. location: Spot name and city.
    3. objective: Specific action (e.g., "Find the blue door and knock twice").
    4. fits: Why it suits a ${tripType} trip.
    5. difficulty: Easy or Medium.
    6. arabic: Object with 'title', 'location', 'objective', 'fits' in Arabic.

    Return as a JSON array of objects.`;

    const response = await generateWithRetry({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              location: { type: Type.STRING },
              objective: { type: Type.STRING },
              fits: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              arabic: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  location: { type: Type.STRING },
                  objective: { type: Type.STRING },
                  fits: { type: Type.STRING },
                },
                required: ['title', 'location', 'objective', 'fits']
              }
            },
            required: ['title', 'location', 'objective', 'fits', 'difficulty', 'arabic'],
          },
        },
      },
    });

    const rawText = response.text || '[]';
    const cleanedText = rawText.replace(/```json|```/g, '').trim();
    const quests = JSON.parse(cleanedText);
    res.json({ quests });
  } catch (error: any) {
    console.error('Error generating adventure quests:', error);
    let message = 'Failed to generate adventure quests. Please try again.';
    if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      message = 'The AI is very busy right now. Please wait a few moments and try again.';
    }
    res.status(500).json({ error: message });
  }
});

app.post('/api/flight', async (req: Request, res: Response) => {
  const { flightNumber } = req.body;
  
  // PLACEHOLDER FOR API KEY
  const AVIATIONSTACK_API_KEY = process.env.AVIATIONSTACK_API_KEY || 'YOUR_AVIATIONSTACK_API_KEY';

  if (!flightNumber) {
    return res.status(400).json({ error: 'Flight number is required' });
  }

  try {
    console.log(`Querying Aviationstack for: ${flightNumber}`);
    
    // Primary search: By exact flight IATA
    let url = `http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_API_KEY}&flight_iata=${flightNumber}&limit=1`;
    let response = await fetch(url);
    let result: any = await response.json();

    // FALLBACK: If no results, try splitting the flight number (e.g., SV211 -> airline SV, flight 211)
    if ((!result.data || result.data.length === 0) && !result.error) {
      const match = flightNumber.match(/^([A-Z]{2,3})(\d+)$/);
      if (match) {
        const airlineIata = match[1];
        const num = match[2];
        console.log(`No exact match for ${flightNumber}. Attempting split search: Airline=${airlineIata}, Number=${num}`);
        const fallbackUrl = `http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_API_KEY}&airline_iata=${airlineIata}&flight_number=${num}&limit=1`;
        response = await fetch(fallbackUrl);
        result = await response.json();
      }
    }

    if (result.error) {
      console.error('Aviationstack API Error Object:', result.error);
      
      // Specific handling for Quota/Usage limits
      if (result.error.code === 'usage_limit_reached') {
        return res.status(429).json({ 
          error: "Radar System Quota Exceeded (Aviationstack).",
          details: "Your API key has reached its monthly request limit. Please upgrade your plan or use a different AVIATIONSTACK_API_KEY in the Secrets panel."
        });
      }

      return res.status(result.error.code === 'invalid_access_key' ? 401 : 500).json({ 
        error: `Aviationstack API Error: ${result.error.info || result.error.code}` 
      });
    }

    if (!result.data || result.data.length === 0) {
      return res.status(404).json({ error: `No active records found for flight ${flightNumber}. Ensure the flight is currently active or scheduled for today.` });
    }

    const flight = result.data[0];
    const airline = flight.airline?.name || 'Unknown Airline';
    const status = (flight.flight_status || 'Unknown').toUpperCase();
    
    // Extracting times
    const depTime = flight.departure?.scheduled || 'N/A';
    const arrTime = flight.arrival?.scheduled || 'N/A';
    const origin = flight.departure?.airport || flight.departure?.iata || 'N/A';
    const destination = flight.arrival?.airport || flight.arrival?.iata || 'N/A';
    
    // NEW: Extracting extra details for the dashboard
    const aircraft = flight.aircraft || {};
    const live = flight.live || null;
    const departureDetail = flight.departure || {};
    const arrivalDetail = flight.arrival || {};

    const info = `### 🛫 Official Flight Status: ${flightNumber}
    
- **Airline:** ${airline}
- **Current Status:** ${status}
- **Aircraft:** ${aircraft.model || 'N/A'} (${aircraft.registration || 'N/A'})
- **Route:** ${origin} ➔ ${destination}
- **Scheduled Departure:** ${new Date(depTime).toLocaleString()}
- **Scheduled Arrival:** ${new Date(arrTime).toLocaleString()}

---
**Technical Telemetry:**
The flight is currently recorded as **${status}**. Departure from ${origin} was handled by ${airline} operations.

*Data provided by Official Aviationstack API Infrastructure.*`;

    res.json({ 
      info, 
      data: {
        ...flight,
        airline_name: airline, // For display
        flight_status: status,
      },
      sources: ["https://aviationstack.com/"], 
      isRadar: true,
      fetchedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Aviationstack API Error:', error);
    res.status(500).json({ 
      error: 'Flight tracking system synchronization failed.',
      details: error.message 
    });
  }
});

// Shadow Research Endpoint (Hidden)
app.post('/api/shadow-research', async (req: Request, res: Response) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Research query is required' });
  }

  try {
    console.log(`[SHADOW RESEARCH] Processing: ${query}`);
    
    const prompt = `Act as a senior OSINT Intelligence officer specializing in civil aviation.
    The user is asking for deep intelligence on: "${query}".
    
    You have full access to search the web.
    Find data that isn't usually in standard UIs: 
    - Historical delays for this tail number or route.
    - Weather patterns affecting the specific airway.
    - Airline operational news.
    - Technical details of the specific airframe if a flight number is involved.
    
    Format your response as a professional brief. Use technical but clear language.
    Start with: ">>> SECURE DATA RELAY INITIATED" in bold.`;

    const response = await generateWithRetry({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
    });

    const info = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => chunk.web?.uri).filter(Boolean) || [];

    res.json({ info, sources });
  } catch (error: any) {
    console.error('Shadow Research Error:', error);
    res.status(500).json({ error: 'Intelligence relay failed.' });
  }
});

// Side Quest Generation Endpoint
app.post('/api/side-quest', async (req: Request, res: Response) => {
  const { location, lang } = req.body;

  try {
    const prompt = `Act as a local quest master. 
    Location: ${location}.
    Language: ${lang || 'en'}.
    Task: Generate a "Side Quest of the Day" for a traveler in this area.
    If the location is coordinates, determine the nearest city or place of interest.
    
    Difficulty Levels: Easy, Medium, Hard.
    Randomly select one of these difficulties for the generated quest. 
    Labels MUST match the actual effort required for the objective.
    
    XP Rewards (Use small numbers): 
    Easy: 1-2 XP
    Medium: 3-4 XP
    Hard: 5-7 XP

    For the quest, provide:
    1. title: Epic name.
    2. location: Name of the specific spot.
    3. objective: Clear action.
    4. difficulty: One of the 3 levels (Easy, Medium, Hard).
    5. xpReward: Number based on difficulty.
    6. arabic: Object with 'title', 'location', 'objective'.

    Return as a single JSON object.`;

    const response = await generateWithRetry({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            location: { type: Type.STRING },
            objective: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            xpReward: { type: Type.NUMBER },
            arabic: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                location: { type: Type.STRING },
                objective: { type: Type.STRING },
              },
              required: ['title', 'location', 'objective'],
            },
          },
          required: ['title', 'location', 'objective', 'difficulty', 'xpReward', 'arabic'],
        },
      },
    });

    const rawText = response.text || '{}';
    const cleanedText = rawText.replace(/```json|```/g, '').trim();
    const quest = JSON.parse(cleanedText);
    res.json({ quest });
  } catch (error: any) {
    console.error('Error generating side quest:', error);
    res.status(500).json({ error: 'System failed to spawn quest.' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  console.log(`TripQuest Server: Starting in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode...`);

  if (!isProd) {
    console.log('TripQuest Server: Preparing Vite middleware...');
    const vitePromise = createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        console.error('Vite middleware error:', err);
        next(err);
      }
    });
  } else {
    console.log('TripQuest Server: Serving static files from dist...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TripQuest Server: LISTENING on port ${PORT}`);
  });
}

startServer();
