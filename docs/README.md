# Documentation index

**Implemented pilot:** the [root README](../README.md) and [development guide](DEVELOPMENT.md) describe the runnable app. [Implementation references](IMPLEMENTATION_REFERENCES.md) map shipped modules to reviewed repositories. [Voice setup](LOCAL_VOICE_SETUP.md) covers inline ElevenLabs dictation and optional private spoken replies. Shared contracts are in `src/lib/contracts.ts`.

The detailed product/release documents retain future targets. Live purchases, production authentication/deployment, and real speech quality evaluation remain incomplete; use the implementation-status notes at the top of engineering documents.


**Project stage:** runnable live-only local pilot with direct all-category catalog search, a live bag, complete bill review, explicit checkout confirmation and editable voice transcripts.

The product uses the official Swiggy Instamart MCP connection. Synthetic commerce is confined to tests. Inline ElevenLabs dictation and Groq structured reasoning are implemented; optional Kokoro supplies spoken replies; obsolete batch transcription was removed. Account search/cart/review and one hosted speech clip were observed before testing stopped at the user’s request on 19 October. Final edits, browser microphone capture, local speech and purchase completion remain unverified; see [the verification record](VERIFICATION.md).

## Product and delivery

[Conversation assistant: implementation, examples, API, and remaining work](ASSISTANT.md) describes the new home experience and its verified boundaries.

| Document | Purpose |
| --- | --- |
| [Project README](../README.md) | Goal, current status, integration direction, and starting point |
| [Product requirements](PRODUCT_REQUIREMENTS.md) | MVP scope, user stories, boundaries, and acceptance criteria |
| [Voice experience](VOICE_EXPERIENCE.md) | Conversation flow, clarification, confirmation, and recovery |
| [Roadmap](ROADMAP.md) | Implementation sequence and milestone completion gates |

## Engineering

| Document | Purpose |
| --- | --- |
| [Verification record](VERIFICATION.md) | Actual checks, bounded performance measurements, and live MCP results |
| [Source review](CODE_REVIEW.md) | Correctness fixes, performance decisions and repository comparisons without test execution |
| [Structured data](STRUCTURED_DATA.md) | Zod contracts, Groq JSON Schema and validation boundaries |
| [Implementation references](IMPLEMENTATION_REFERENCES.md) | Shipped modules mapped to source reviews, with commit pins where available |
| [Local voice setup](LOCAL_VOICE_SETUP.md) | Pinned speech service setup and readiness checks |
| [Architecture](ARCHITECTURE.md) | Components, trust boundaries, and execution flow |
| [Selected voice and AI stack](OPEN_SOURCE_STACK.md) | Inline ElevenLabs dictation, Groq reasoning, optional output, sources and costs |
| [Speech alternatives](SPEECH_ALTERNATIVES.md) | Open model comparison, published evidence and the decision to retain ElevenLabs |
| [Reference architectures](REFERENCE_ARCHITECTURES.md) | Commit-pinned source reviews, adopted patterns, observed gaps, and reuse boundaries |
| [Swiggy MCP integration](SWIGGY_MCP.md) | Official sources, authorized connectivity, and tool behavior |
| [API contract](API_CONTRACT.md) | Implemented endpoints and separately labeled future contracts |
| [Data model](DATA_MODEL.md) | Application state, provider references, and checkout records |
| [Development](DEVELOPMENT.md) | Repository layout, configuration plan, and first implementation steps |
| [Assistant evaluations](EVALS.md) | Repeatable conversation dataset, executable graders, traces and model checks |
| [Testing](TESTING.md) | Functional, conversation, integration, and checkout verification |
| [Decisions](DECISIONS.md) | Design decisions, rationale, and unresolved choices |

## Working on the project

- [Contributing](../CONTRIBUTING.md): change workflow and review expectations.
- [Security](../SECURITY.md): credentials, customer data, and action controls.

## Maintaining these documents

Update contracts and examples alongside implementation changes. Label each capability as proposed, implemented, or deferred. Keep provider-specific behavior in the MCP integration document, and verify its official references before implementing or changing the adapter.

If an application contract and provider behavior differ, the adapter must translate explicitly. Do not assume our route names, identifiers, normalized states, or paise-based money representation are provider schemas.

Foundation drafted on **17 October 2026**.

Voice/AI stack and implementation status updated on **20 October 2026**.
