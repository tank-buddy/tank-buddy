import type { Request, Response } from 'express'

const isRequestValid = (request) => {
  const identifier = request.params.identifier

  return !(identifier !== 'soft-reset' && identifier !== 'hard-reset')
}

export default [
  {
    id: 'put-system-operations',
    url: '/api/system-operations/:identifier',
    method: 'PUT',
    variants: [
      {
        id: 'default',
        type: 'middleware',
        options: {
          middleware: (request: Request, response: Response) => {
            if (!isRequestValid(request)) {
              response.status(400)
              response.send({
                success: false,
                message: 'Identifier is not valid.',
              })
              return
            }

            response.status(200)
            setTimeout(
              () =>
                response.send({
                  success: true,
                  message: `System will perfrom a ${request.params.identifier.replace('-', ' ')} in 5 seconds.`,
                }),
              5000
            )
          },
        },
      },
    ],
  },
]
