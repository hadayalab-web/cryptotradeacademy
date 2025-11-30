# Vercel Deployment Postmortem (2025-11-29)

## Incident
Failed to deploy WhaleShield due to file structure chaos and missing dependencies.

## Root Cause
- Direct editing of node_modules
- Missing package.json dependencies
- Circular dependencies in logic files

## Resolution
- Refactored entire codebase into clean architecture (api/logic/services).
- Switched to local/VPS process (npm start) instead of Vercel Serverless for stability.
