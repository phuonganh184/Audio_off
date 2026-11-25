interface ServerlessReq {
  method?: string;
}

interface ServerlessRes {
  status: (code: number) => ServerlessRes;
  json: (data: unknown) => void;
}

export default function handler(req: ServerlessReq, res: ServerlessRes) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  const available = Boolean(process.env.GEMINI_API_KEY?.trim());
  res.status(200).json({ available });
}
