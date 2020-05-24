import http from 'http'
import fetch from 'isomorphic-unfetch'
import { apiResolver } from 'next/dist/next-server/server/api-utils'
import listen from 'test-listen'

import { createProxyHandler } from './index'

/**
 * Reads a request's body and parse it as JSON
 *
 * @param {http.IncomingMessage}req
 * @return {Promise<*>}
 */
function readBodyJSON(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req
      .on('data', chunk => (body += chunk))
      .on('error', reject)
      .on('end', () => {
        resolve(JSON.parse(body))
      })
  })
}

describe('createProxyHandler', () => {
  it('validates options', () => {
    // @ts-ignore
    const call = () => createProxyHandler()

    expect(call).toThrow('argument is required')
  })

  it('validates options (target)', () => {
    // @ts-ignore
    const call = () => createProxyHandler({})

    expect(call).toThrow('target')
  })
})

describe('handler (proxy)', () => {
  /** @type {http.Server}*/
  let mockServer
  /** @type {http.Server}*/
  let server
  /** @type {string} */
  let url

  const mockHandler = jest.fn((req, res) => res.end())

  beforeEach(async () => {
    mockHandler.mockClear()

    mockServer = http.createServer(mockHandler)
    const mockUrl = await listen(mockServer)

    /**
     * Forwards request to proxy handler
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @return {Promise<void>}
     */
    function requestHandler(req, res) {
      const proxy = createProxyHandler({
        target: mockUrl,
      })

      // Add body parser options
      // @ts-ignore
      proxy.config = {
        api: {
          bodyParser: false,
        },
      }

      // @ts-ignore
      return apiResolver(req, res, undefined, proxy)
    }

    server = http.createServer(requestHandler)
    url = await listen(server)
  })

  afterEach(async () => {
    mockServer.close()
    server.close()
  })

  it('forwards request to mockHandler', async () => {
    const response = await fetch(url)

    expect(mockHandler).toBeCalledTimes(1)
    expect(response.status).toBe(200)
  })

  it('appends query to request', async () => {
    expect.assertions(1)

    mockHandler.mockImplementation(function (req, res) {
      expect(req.url).toMatch('foo=bar')

      res.end()
    })

    await fetch(`${url}?foo=bar`)
  })

  it('forwards body', async () => {
    expect.assertions(3)

    mockHandler.mockImplementation(async (req, res) => {
      expect(req.method).toBe('POST')
      expect(req.headers['content-type']).toBe('application/json')

      const body = await readBodyJSON(req)
      expect(body).toEqual({ foo: 'bar' })

      res.end()
    })

    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ foo: 'bar' }),
    })
  })
})
