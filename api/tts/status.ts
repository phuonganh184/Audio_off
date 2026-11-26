interface ServerlessReq {
  method?: string;
}

interface ServerlessRes {
  status: (code: number) => ServerlessRes;
  setHeader?: (name: string, value: string) => void;
  json: (data: unknown) => void;
}

export default function handler(req: ServerlessReq, res: ServerlessRes) {
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).json({});
    return;
  }
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  const available = Boolean(process.env.GEMINI_API_KEY?.trim());
  res.status(200).json({ available });
}
