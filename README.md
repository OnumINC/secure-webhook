# Secure-Webhook

Securely call webhook endpoints from GitHub Actions with HMAC-SHA256 signature verification.

## Usage

### Basic

```yaml
- name: Webhook
  uses: onuminc/secure-actions-webhook@0.1.4
  with:
    url: https://example.com/webhook
    hmacSecret: ${{ secrets.HMAC_SECRET }}
    data: '{"event": "deploy", "status": "success"}'
```

### With custom headers

```yaml
- name: Webhook
  uses: onuminc/secure-actions-webhook@0.1.4
  with:
    url: https://example.com/webhook
    hmacSecret: ${{ secrets.HMAC_SECRET }}
    data: '{"event": "deploy"}'
    headers: '{"Authorization": "Bearer ${{ secrets.API_TOKEN }}", "X-Custom-Header": "value"}'
```

### With timeout and retries

```yaml
- name: Webhook
  uses: onuminc/secure-actions-webhook@0.1.4
  with:
    url: https://example.com/webhook
    hmacSecret: ${{ secrets.HMAC_SECRET }}
    data: '{"event": "deploy"}'
    timeout: '60000'
    retries: '5'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `url` | Yes | - | Webhook endpoint URL (http or https) |
| `hmacSecret` | Yes | - | Secret for HMAC-SHA256 signature (min 32 chars) |
| `data` | No | - | Request body (JSON string or plain text) |
| `headers` | No | - | Additional headers as JSON object |
| `timeout` | No | `30000` | Request timeout in milliseconds |
| `retries` | No | `3` | Number of retry attempts on failure |

## Outputs

| Output | Description |
|--------|-------------|
| `response` | JSON object with `status` and `data` from the response |

## Headers

The action automatically includes these headers in every request:

| Header | Description |
|--------|-------------|
| `X-Hub-Signature` | HMAC-SHA256 hex digest of the body |
| `X-Hub-Signature-256` | Same signature prefixed with `sha256=` |
| `X-Hub-SHA` | Git commit SHA from the workflow |

Custom headers from the `headers` input are merged with these.

## Verifying the signature

On your endpoint, verify the request integrity by computing the HMAC-SHA256 of the raw request body and comparing it to the `X-Hub-Signature-256` header.

Example (Node.js):

```javascript
const crypto = require('crypto');

function verifySignature(secret, body, signature) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
```

## Credit

Thanks to <https://github.com/koraykoska/secure-actions-webhook> for providing the base signature generation code.
