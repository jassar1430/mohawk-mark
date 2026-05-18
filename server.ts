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
  const { flightNumber, airlabsApiKey } = req.body;
  
  const KEY = airlabsApiKey || process.env.AIRLABS_API_KEY;

  if (!flightNumber) {
    return res.status(400).json({ error: 'Flight number is required' });
  }

  if (!KEY || KEY === 'YOUR_AIRLABS_API_KEY') {
    return res.status(401).json({ error: 'AirLabs API Key missing. Please provide it in the settings panel.' });
  }

  try {
    console.log(`Querying AirLabs for: ${flightNumber}`);
    
    // AirLabs search: By flight IATA
    const url = `https://airlabs.co/api/v9/flights?flight_iata=${flightNumber}&api_key=${KEY}`;
    const response = await fetch(url);
    const result: any = await response.json();

    if (result.error) {
      console.error('AirLabs API Error:', result.error);
      return res.status(500).json({ 
        error: `AirLabs API Error: ${result.error.message || 'Unknown error'}` 
      });
    }

    const flights = result.response || [];
    if (flights.length === 0) {
      return res.status(404).json({ error: `No active records found for flight ${flightNumber}. Note: AirLabs free tier primarily tracks active flights.` });
    }

    const flight = flights[0];
    
    // Map AirLabs to internal format
    const mappedData = {
      airline: {
        name: flight.airline_name || 'Unknown',
        iata: flight.airline_iata || '',
        icao: flight.airline_icao || '',
      },
      airline_name: flight.airline_name || 'Unknown',
      flight_status: 'IN-FLIGHT', // If it's in the /flights endpoint, it's active
      flight: {
        number: flight.flight_number || '',
        iata: flight.flight_iata || '',
        icao: flight.flight_icao || '',
      },
      aircraft: {
        registration: flight.reg_number || 'N/A',
        model: flight.aircraft_icao || 'Aircraft', // Model might need another lookup but we use what we have
        icao24: flight.hex || '',
      },
      live: {
        latitude: flight.lat,
        longitude: flight.lng,
        altitude: flight.alt,
        direction: flight.dir,
        speed_horizontal: flight.speed,
        speed_vertical: flight.v_speed,
        squawk: flight.squawk,
        is_ground: false
      },
      departure: {
        iata: flight.dep_iata || 'N/A',
        icao: flight.dep_icao || 'N/A',
      },
      arrival: {
        iata: flight.arr_iata || 'N/A',
        icao: flight.arr_icao || 'N/A',
      }
    };

    const info = `### 🛫 Live Flight Intelligence: ${flightNumber}
    
- **Airline:** ${mappedData.airline_name}
- **Status:** ACTIVE TELEMETRY
- **Aircraft:** ${mappedData.aircraft.model} (${mappedData.aircraft.registration})
- **Route:** ${mappedData.departure.iata} ➔ ${mappedData.arrival.iata}
- **Altitude:** ${Math.round((mappedData.live.altitude || 0) * 3.28084).toLocaleString()} FT
- **Speed:** ${Math.round(mappedData.live.speed_horizontal || 0)} KTS

---
**Technical Telemetry:**
GPS Coordinates: ${mappedData.live.latitude.toFixed(4)}, ${mappedData.live.longitude.toFixed(4)}
Heading: ${mappedData.live.direction}° | Vertical Speed: ${mappedData.live.speed_vertical || 0} FPM

*Data provided by AirLabs Network Infrastructure.*`;

    res.json({ 
      info, 
      data: mappedData,
      sources: ["https://airlabs.co/"], 
      isRadar: true,
      fetchedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('AirLabs Integration Error:', error);
    res.status(500).json({ 
      error: 'AirLabs telemetry relay failed.',
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
