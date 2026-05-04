Context-Shield AI 🛡️
The Surgical Privacy Layer for LLMs
Context-Shield AI is a surgical privacy middleware designed as a strictly localized browser extension. It ensures that sensitive Personally Identifiable Information (PII) is masked locally before it ever reaches Large Language Model (LLM) platforms like ChatGPT or Claude.

💡 Inspiration
As LLMs integrate into daily professional workflows, sectors like healthcare face a critical dilemma: leveraging AI without violating strict privacy regulations such as KVKK, HIPAA, or GDPR. Traditional keyword blockers are often too aggressive, destroying the context the AI needs for accurate analysis. We realized the industry didn't need a sledgehammer; it needed a scalpel.

✨ What it does
Context-Shield AI acts as a real-time, privacy-first interface between the user and the AI:

Surgical Masking: Automatically detects and replaces National IDs (TC), phone numbers, emails, and names with context-aware tokens like [KİŞİ_1] or [TC_1].

Context Preservation: Intelligently distinguishes between sensitive data and essential professional terminology, leaving titles such as "Uzm. Dr." (Specialist) or "Hasta" (Patient) untouched to maintain AI accuracy.

Dynamic Meta-Prompt: Automatically injects a system note at the end of texts to "whisper" definitions of masked tokens to the AI, enabling zero-hallucination analysis.

🛠️ How we built it
Core Engine: Built using vanilla JavaScript and Chrome Extension APIs for maximum performance and zero external dependencies.

Scanning Algorithm: Utilizes a robust Regex-based scanning engine combined with contextual exclusion lists.

State Management: Features a "Global Vault" that ensures token mapping remains consistent throughout a user's entire session.

🚀 Challenges & Accomplishments
Caret Jump Bug: Resolved the infamous issue where modern Virtual DOMs (like React or ProseMirror) reset the cursor position during text modification. We developed a custom offset-math algorithm to maintain seamless real-time typing.

Prompt Engineering: Our Dynamic Meta-Prompt Generator optimizes the LLM context window by only injecting instructions for the specific data types detected in the current text.

🗺️ What's next for Context-Shield AI
Look-up Table: Developing an interactive UI within the extension popup for users to securely view their active Global Vault mappings.

Local AI Integration: Planning to integrate lightweight, local models (such as ONNX) for even more advanced contextual recognition.

Developer: Begüm Handan Demir
Institution: Samsun University - Software Engineering