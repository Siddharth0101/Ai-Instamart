# Contributing

This project is a runnable local pilot. Start with the [README](README.md) and [development guide](docs/DEVELOPMENT.md). Run `npm run typecheck`, `npm test`, and `npm run build` for code changes; `node scripts/smoke.mjs` checks the running local synthetic flow.

## Change workflow

1. Choose a small task from the [roadmap](docs/ROADMAP.md) and describe its intended behavior.
2. Check the relevant product requirement, API contract, integration constraint, and design decision.
3. Implement the change with appropriate validation and meaningful tests once code exists.
4. Update documentation and examples in the same change.
5. Review the diff and include the verification performed and any known limitations.

If the project is hosted in Git, use a focused branch and pull request. Preserve unrelated staged changes and never commit local credentials or database contents.

## Implementation expectations

- Keep speech and commerce providers behind explicit adapter interfaces.
- Treat natural language and provider content as input requiring validation.
- Keep secrets, authorization checks, and commerce calls on the server.
- Use returned product/address/order identifiers instead of inventing them.
- Preserve existing remote cart contents unless the user asks to change them.
- Require current, explicit checkout confirmation and handle pending/unknown results honestly.
- Use synthetic data and fixtures in automated tests.

See [SECURITY.md](SECURITY.md) for customer data and credential handling. Do not include real tokens, addresses, phone numbers, recordings, or order identifiers in issues, screenshots, examples, or fixtures.

## Documentation expectations

Distinguish implemented behavior from planned behavior. Do not add installation commands, environment variables, provider tools, or API guarantees without code or an authoritative reference supporting them. Link new documents from the [index](docs/README.md).

When changing a contract, update its callers, examples, data model, tests, and related docs together. Keep provider-specific source links in [SWIGGY_MCP.md](docs/SWIGGY_MCP.md).

## Review checklist

- The change has a clear user or developer outcome.
- Authorization and validation cover the changed behavior.
- Verification matches the risk and scope of the change.
- Automated tests cannot accidentally place real orders.
- The change contains no secrets or personal customer data.
- The documentation describes what the code actually does.

No project license has been selected. Do not add or assume one on behalf of the owner.
