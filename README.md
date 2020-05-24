# next-proxy

A proxy for Next.js API Routes

** Example usage **

```js
// pages/api/index.js

import { createProxyHandler } from 'next-proxy'

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
