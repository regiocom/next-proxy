# @regiocom/next-proxy

A proxy handler for [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction).

**Example usage**

In this example we forward the request to a backend API and append an API Token.

```js
// pages/api/index.js

import { createProxyHandler } from '@regiocom/next-proxy'

export const config = {
  api: {
    // Do not let next.js parse body. We pipe it directly to the target endpoint.
    bodyParser: false,
  },
}

export default createProxyHandler({
  // Endpoint URL of backend API
  target: 'http://my-backend:3000',
  // Additional headers
  headers: {
    Authentication: `Bearer ${process.env.API_TOKEN}`,
  },
})
```

**Example with [@auth0/nextjs-auth0](https://github.com/auth0/nextjs-auth0/)**

In this example we use an access token stored in a session cookie.

```js
// pages/api/index.js
import { createProxyHandler } from '@regiocom/next-proxy'
import auth0 from '../../lib/auth0'

export const config = {
  api: {
    // Do not let next.js parse body. We pipe it directly to the API_ENDPOINT.
    bodyParser: false,
  },
}

/**
 * Acts as reverse proxy for API_ENDPOINT.
 *
 * Ensures that the user is authenticated and adds the access token
 * as well as the user's sub to the backend request.
 *
 * @param {import('next').NextApiRequest} req - Request object
 * @param {import('next').NextApiResponse} res - Response object
 * @returns {Promise<void>}
 */
export async function proxy(req, res) {
  const session = await auth0.getUserInfo(req)

  if (!session || !session.user) {
    res.status(401).json({
      error: 'not_authenticated',
      description:
        'The user does not have an active session or is not authenticated',
    })

    return
  }

  const handler = createProxyHandler({
    target: process.env.API_ENDPOINT,
    headers: {
      'X-Authenticated-UserID': session.user.sub,
      Authorization: `Bearer ${session.accessToken}`,
    },
  })

  return await handler(req, res)
}
```
