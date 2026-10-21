# Open speech recognition alternatives

Reviewed **20 October 2026**. Decision: retain the implemented ElevenLabs Scribe v2 Realtime flow. The user authorized a replacement only if an open alternative is equivalent or better. Published evidence supports credible candidates, but does not establish that condition for SayCart's mixed-language shopping dictation on the deployment hardware.

This is a review of upstream documentation, repositories and reported evaluations. No models were downloaded, providers called, recordings captured or benchmarks run. The existing ElevenLabs integration also remains unvalidated; retaining it is not a claim that its recognition quality has been proven.

## Candidates

| Candidate | Relevant evidence | Decision for this app |
| --- | --- | --- |
| **Voxtral Mini 4B Realtime 2602** | Apache-2.0 weights, native streaming, Hindi and English among 13 supported languages. Its model card recommends a 480 ms delay. The documented BF16 vLLM deployment uses a GPU with at least 16 GB memory; community Mac/MLX implementations also exist and are marked untested by the model authors. [Model card](https://huggingface.co/mistralai/Voxtral-Mini-4B-Realtime-2602) | Closest direct published comparison with Scribe; shortlist for a matched evaluation, without switching now. |
| **Nemotron 3.5 ASR Streaming 0.6B** | OpenMDW-1.1 model weights; native streaming with 80–1120 ms chunks; Hindi and English included. NVIDIA reports Hindi FLEURS word error rates of 7.41% with explicit Hindi and 9.88% with automatic detection at a 320 ms chunk size. [Model card](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b) | Strong compact candidate. These are not measurements against Scribe under a shared protocol or on Hinglish shopping commands. |
| **Qwen3-ASR 0.6B / 1.7B** | Apache-2.0 models supporting Hindi, English and other languages. The official package documents streaming through its vLLM backend. [Model card](https://huggingface.co/Qwen/Qwen3-ASR-1.7B), [repository](https://github.com/QwenLM/Qwen3-ASR) | Useful candidate; reviewed sources do not establish equivalent Scribe performance for this interaction. |
| **Whisper large-v3 through WhisperLiveKit** | A local streaming service with WebSocket APIs, reusable inference engines and Mac MLX support. Its streaming policies manage context and incremental text; this is more substantial than sending isolated tiny audio clips to Whisper. [Repository](https://github.com/QuentinFuxa/WhisperLiveKit) | Practical architecture reference, but the reviewed results do not demonstrate a matching Hindi/Hinglish shopping experience. |

The NVIDIA option is **not restricted to NVIDIA hardware**: the official Apache-2.0 [NeMo-Speech.cpp runtime](https://github.com/NVIDIA/NeMo-Speech.cpp) documents CPU, Metal, Vulkan and CUDA backends, microphone streaming and a realtime WebSocket server. Native Mac support makes it worth evaluating; it does not establish latency or accuracy on this machine.

## Direct comparison worth retaining

Mistral's [Voxtral Realtime technical report, Table 7](https://arxiv.org/html/2602.11298v1#A1.T7) reports:

| Model / configured delay | Hindi FLEURS WER | English FLEURS WER |
| --- | ---: | ---: |
| Scribe v2 Realtime | 12.62% | 3.54% |
| Voxtral Realtime / 480 ms | 12.88% | 4.90% |
| Voxtral Realtime / 960 ms | 11.82% | 4.34% |

Lower is better. Voxtral is close on Hindi at 480 ms and improves with additional delay, but does not win both languages here. These are the model developer's results, not our measurements. The report warns that delay definitions differ between realtime APIs. Do not equate configured model delay with microphone-to-field latency.

Do not rank Nemotron's separately reported FLEURS numbers against this table without reproducing the datasets, normalization and inference settings. Neither table measures mixed Hindi-English requests containing Instamart brands, quantities and corrections.

## What would justify replacing ElevenLabs

Use the same held-out recordings and live interaction conditions for both providers, including Hindi, English, Hinglish, background noise, brand names, pack sizes, quantities, negation and self-corrections. Compare:

- Final transcription errors and exact preservation of shopping-critical words.
- Time until useful partial text and until stable final text; include slow responses, not just averages.
- Corrections, repeated/missing text and stop/discard behavior.
- Warm/cold startup, memory and CPU/GPU use while SayCart is running.

A replacement should match or improve the important accuracy measures and responsiveness without adding recurring connection or resource failures. Pin the winning model and runtime before integration. This comparison has not been performed.

Self-hosted weights avoid a per-minute speech API bill, but require model storage, computation and maintenance. No paid hosting or new speech dependency has been added by this review.
