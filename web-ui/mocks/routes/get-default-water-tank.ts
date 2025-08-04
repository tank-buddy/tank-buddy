;[
  {
    id: 'get-default-water-tank',
    url: '/api/water-tanks/default',
    method: 'GET',
    variants: [
      {
        id: 'default',
        type: 'json',
        options: {
          status: 200,
          body: {
            height: 200,
            distanceToWater: 50,
          },
        },
      },
    ],
  },
]

import type { Request, Response } from 'express'

const isRequestValid = (request) => {
  const mode = request.body.wifi?.interface
  if (mode === undefined || (mode !== 'C' && mode !== 'AP')) {
    return false
  }

  const ssid = request.body.wifi?.ssid
  return !(ssid === undefined || ssid === '')
}

export default [
  {
    id: 'get-default-water-tank',
    url: '/api/water-tanks/default',
    method: 'GET',
    variants: [
      {
        id: 'default',
        type: 'middleware',
        options: {
          middleware: (_request: Request, response: Response) => {
            response.status(200)
            setTimeout(
              () =>
                response.send({
                  height: 200,
                  distanceToWater: Math.floor(Math.random() * 200),
                }),
              5000
            )
          },
        },
      },
    ],
  },
]
