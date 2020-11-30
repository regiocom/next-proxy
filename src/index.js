import http from 'http'
import https from 'https'

/**
 * @typedef {Object} ProxyOptions
 *
 * @property {string} target
 *    Target URL of backend API
 * @property {Object<string, *>} [headers]
 *    Additional headers passed to the backend API
 */

/**
 * Acts as reverse proxy for a backend API.
 *
 * @param {ProxyOptions} options
 * @returns {import('next').NextApiHandler}
 */
export function createProxyHandler(options) {
  if (!options) {
    throw new Error('options argument is required')
  }

  if (!options.target) {
    throw new Error('target: string is a required option')
  }

  return function (req, res) {
    return new Promise((resolve, reject) => {
      try {
        // Use request headers and append authentication data.
        const headers = {
          ...req.headers,
          ...options.headers,
        }

        // We always should use the target host.
        delete headers.host

        // Append the original query also to the outgoing request.
        let url = options.target

        if (req.url) {
          const orgUrl = new URL(req.url, `http://${req.headers.host}`)
          if (orgUrl.search) {
            url = `${url}${orgUrl.search}`
          }
        }

        const requestHandler = /^https:/.exec(url)
          ? https.request
          : http.request

        const request = requestHandler(
          url,
          {
            headers,
            method: req.method,
          },
          response => {
            // Copy response from API backend
            res.status(response.statusCode || 200)

            // Copy all response headers
            for (const key in response.headers) {
              if (!response.headers.hasOwnProperty(key)) {
                continue
              }

              res.setHeader(key, /** @type{string} **/ (response.headers[key]))
            }

            // Pipe response's body
            response
              .pipe(res)
              .on('error', reject)
              .on('finish', () => resolve())
          },
        )

        // If the request has a body we pipe it to the backend
        if (req.readable) {
          req
            .pipe(request)
            .on('error', reject)
            .on('finish', () => {
              request.end()
            })
        } else {
          request.end()
        }
      } catch (error) {
        res.status(500).json(error)
        res.end()
        resolve()
      }
    })
  }
}
