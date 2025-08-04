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
    id: 'patch-default-config',
    url: '/api/configs/default',
    method: 'PATCH',
    variants: [
      {
        id: 'default',
        type: 'middleware',
        options: {
          middleware: (request: Request, response: Response) => {
            console.log(request.body)
            if (!isRequestValid(request)) {
              response.status(400)
              setTimeout(
                () =>
                  response.send({
                    success: false,
                    message: 'Config is not valid.',
                  }),
                5000
              )
              return
            }

            response.status(200)
            setTimeout(() => response.send({ success: true }), 5000)
          },
        },
      },
    ],
  },
]
