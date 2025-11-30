# Grok API Specification

## Endpoint
POST https://api.grok.x.ai/v1/chat/completions

## Auth
Header: Authorization: Bearer $GROK_API_KEY

## Payload
{
  "model": "grok-beta",
  "messages": [...]
}
