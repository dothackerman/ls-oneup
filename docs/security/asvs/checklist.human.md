# ASVS Checklist (Human View)

This report is optimized for human review.
Structured per-control data remains in `checklist.machine.json` and `checklist.findings.jsonl`.

## Snapshot

- Generated at: 2026-03-14T07:51:35.944Z
- Source commit: ae4ab5b261a72b63edd6a10b4e2d600ea6937e2b
- Source blob: f7ae2926598c4648ff7614a6968e4c8fd89524bd
- Total requirements: 345
- Completed: 18
- TODO: 198
- Not applicable: 129
- TODO critical: 0
- TODO high: 58

## Level Target View

| Level | Completed | TODO | Not applicable | Total |
| ----- | --------- | ---- | -------------- | ----- |
| L1    | 3         | 39   | 28             | 70    |
| L2    | 8         | 101  | 74             | 183   |
| L3    | 7         | 58   | 27             | 92    |

- Current practical target: Level 2 first, with selective Level 3 carryovers where they are cheap, highly relevant, or already partially implemented.
- Level 2 current state: 8 completed, 101 todo, 74 not applicable.
- Level 3 current state: 7 completed, 58 todo, 27 not applicable.

## Read This Before Interpreting The TODO Count

- The checklist covers all 345 ASVS controls, not just the crypto work completed recently.
- A large TODO count means most ASVS chapters are still open or only lightly evidenced, not that the recent crypto changes failed.
- The strongest current chapter is `V11 Cryptography`; several other chapters are intentionally `not_applicable` because the repo does not implement those technologies or account systems.

## Chapter Summary

| Chapter | Area                                | Completed | TODO | Not applicable |
| ------- | ----------------------------------- | --------- | ---- | -------------- |
| V1      | Encoding and Sanitization           | 0         | 29   | 1              |
| V2      | Validation and Business Logic       | 0         | 13   | 0              |
| V3      | Web Frontend Security               | 0         | 31   | 0              |
| V4      | API and Web Service                 | 0         | 14   | 2              |
| V5      | File Handling                       | 0         | 13   | 0              |
| V6      | Authentication                      | 0         | 0    | 47             |
| V7      | Session Management                  | 0         | 0    | 19             |
| V8      | Authorization                       | 0         | 13   | 0              |
| V9      | Self-contained Tokens               | 0         | 0    | 7              |
| V10     | OAuth and OIDC                      | 0         | 0    | 36             |
| V11     | Cryptography                        | 18        | 1    | 5              |
| V12     | Secure Communication                | 0         | 12   | 0              |
| V13     | Configuration                       | 0         | 21   | 0              |
| V14     | Data Protection                     | 0         | 13   | 0              |
| V15     | Secure Coding and Architecture      | 0         | 21   | 0              |
| V16     | Security Logging and Error Handling | 0         | 17   | 0              |
| V17     | WebRTC                              | 0         | 0    | 12             |

## Current Security Highlight

- V11 Cryptography: 18 completed, 1 todo, 5 not applicable.
- Remaining open crypto control: V11.7.1 — The repository still contains no mechanism to enable full memory encryption or confidential-computing controls for the Worker runtime. Even with encrypted D1 rows and encrypted R2 image objects, tokens, decrypted submission payloads, and decrypted image bytes still enter normal process memory during request handling.

## Highest Severity Open Backlog

- V1.2.10 [high] — Verify that the application is protected against CSV and Formula Injection. The application must follow the escaping rules defined in RFC 4180 sections 2.6 and 2.7 when exporting CSV content. Additionally, when exporting to CSV or other spreadsheet formats (such as XLS, XLSX, or ODF), special characters (including '=', '+', '-', '@', '\t' (tab), and '\0' (null character)) must be escaped with a single quote if they appear as the first character in a field value.
- V1.3.12 [high] — Verify that regular expressions are free from elements causing exponential backtracking, and ensure untrusted input is sanitized to mitigate ReDoS or Runaway Regex attacks.
- V1.5.3 [high] — Verify that different parsers used in the application for the same data type (e.g., JSON parsers, XML parsers, URL parsers), perform parsing in a consistent way and use the same character encoding mechanism to avoid issues such as JSON Interoperability vulnerabilities or different URI or file parsing behavior being exploited in Remote File Inclusion (RFI) or Server-side Request Forgery (SSRF) attacks.
- V2.3.5 [high] — Verify that high-value business logic flows require multi-user approval to prevent unauthorized or accidental actions. This could include but is not limited to large monetary transfers, contract approvals, access to classified information, or safety overrides in manufacturing.
- V2.4.2 [high] — Verify that business logic flows require realistic human timing, preventing excessively rapid transaction submissions.
- V3.1.1 [high] — Verify that application documentation states the expected security features that browsers using the application must support (such as HTTPS, HTTP Strict Transport Security (HSTS), Content Security Policy (CSP), and other relevant HTTP security mechanisms). It must also define how the application must behave when some of these features are not available (such as warning the user or blocking access).
- V3.2.3 [high] — Verify that the application avoids DOM clobbering when using client-side JavaScript by employing explicit variable declarations, performing strict type checking, avoiding storing global variables on the document object, and implementing namespace isolation.
- V3.3.5 [high] — Verify that when the application writes a cookie, the cookie name and value length combined are not over 4096 bytes. Overly large cookies will not be stored by the browser and therefore not sent with requests, preventing the user from using application functionality which relies on that cookie.
- V3.4.7 [high] — Verify that the Content-Security-Policy header field specifies a location to report violations.
- V3.4.8 [high] — Verify that all HTTP responses that initiate a document rendering (such as responses with Content-Type text/html), include the Cross‑Origin‑Opener‑Policy header field with the same-origin directive or the same-origin-allow-popups directive as required. This prevents attacks that abuse shared access to Window objects, such as tabnabbing and frame counting.
- V3.5.6 [high] — Verify that JSONP functionality is not enabled anywhere across the application to avoid Cross-Site Script Inclusion (XSSI) attacks.
- V3.5.7 [high] — Verify that data requiring authorization is not included in script resource responses, like JavaScript files, to prevent Cross-Site Script Inclusion (XSSI) attacks.
- V3.5.8 [high] — Verify that authenticated resources (such as images, videos, scripts, and other documents) can be loaded or embedded on behalf of the user only when intended. This can be accomplished by strict validation of the Sec-Fetch-\* HTTP request header fields to ensure that the request did not originate from an inappropriate cross-origin call, or by setting a restrictive Cross-Origin-Resource-Policy HTTP response header field to instruct the browser to block returned content.
- V3.6.1 [high] — Verify that client-side assets, such as JavaScript libraries, CSS, or web fonts, are only hosted externally (e.g., on a Content Delivery Network) if the resource is static and versioned and Subresource Integrity (SRI) is used to validate the integrity of the asset. If this is not possible, there should be a documented security decision to justify this for each resource.
- V3.7.3 [high] — Verify that the application shows a notification when the user is being redirected to a URL outside of the application's control, with an option to cancel the navigation.
- V3.7.4 [high] — Verify that the application's top-level domain (e.g., site.tld) is added to the public preload list for HTTP Strict Transport Security (HSTS). This ensures that the use of TLS for the application is built directly into the main browsers, rather than relying only on the Strict-Transport-Security response header field.
- V3.7.5 [high] — Verify that the application behaves as documented (such as warning the user or blocking access) if the browser used to access the application does not support the expected security features.
- V4.1.4 [high] — Verify that only HTTP methods that are explicitly supported by the application or its API (including OPTIONS during preflight requests) can be used and that unused methods are blocked.
- V4.1.5 [high] — Verify that per-message digital signatures are used to provide additional assurance on top of transport protections for requests or transactions which are highly sensitive or which traverse a number of systems.
- V4.2.2 [high] — Verify that when generating HTTP messages, the Content-Length header field does not conflict with the length of the content as determined by the framing of the HTTP protocol, in order to prevent request smuggling attacks.
- V4.2.3 [high] — Verify that the application does not send nor accept HTTP/2 or HTTP/3 messages with connection-specific header fields such as Transfer-Encoding to prevent response splitting and header injection attacks.
- V4.2.4 [high] — Verify that the application only accepts HTTP/2 and HTTP/3 requests where the header fields and values do not contain any CR (\r), LF (\n), or CRLF (\r\n) sequences, to prevent header injection attacks.
- V4.2.5 [high] — Verify that, if the application (backend or frontend) builds and sends requests, it uses validation, sanitization, or other mechanisms to avoid creating URIs (such as for API calls) or HTTP request header fields (such as Authorization or Cookie), which are too long to be accepted by the receiving component. This could cause a denial of service, such as when sending an overly long request (e.g., a long cookie header field), which results in the server always responding with an error status.
- V5.2.4 [high] — Verify that a file size quota and maximum number of files per user are enforced to ensure that a single user cannot fill up the storage with too many files, or excessively large files.
- V5.2.5 [high] — Verify that the application does not allow uploading compressed files containing symlinks unless this is specifically required (in which case it will be necessary to enforce an allowlist of the files that can be symlinked to).

## Human Navigation

- Security overview: `../README.md`
- Security decision record: `../../requirements/12-m1-security-decision-record.md`
- Level 2 implementation plan: `../../plans/2026-03-14-asvs-level2-implementation-plan.md`
- ASVS pipeline and maintenance notes: `README.md`
- Full structured checklist: `checklist.machine.json`
