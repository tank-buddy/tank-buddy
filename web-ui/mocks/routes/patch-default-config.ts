const isRequestValid = (request) => {
  const hostname = request.body.hostname
  if (hostname === undefined || hostname === '') {
    return false
  }

  const mode = request.body.wifi?.interface
  if (mode === undefined || (mode !== 'C' && mode !== 'AP')) {
    return false
  }

  const ssid = request.body.wifi?.ssid
  if (ssid === undefined || ssid === '') {
    return false
  }

  return true
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
          middleware: async (request, response) => {
            console.log(request.body)

            if (!isRequestValid(request)) {
              response.status(400)
              response.send({ success: false, message: 'Config is not valid.' })
              return
            }

            response.status(200)
            response.send(request.body)
          },
        },
      },
    ],
  },
]
