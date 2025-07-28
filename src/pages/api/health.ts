import type { NextApiRequest, NextApiResponse } from 'next'

type HealthResponse = {
  status: string
  timestamp: string
  uptime: number
  frontend: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      frontend: 'Method not allowed'
    })
    return
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    frontend: 'Next.js application running'
  })
} 