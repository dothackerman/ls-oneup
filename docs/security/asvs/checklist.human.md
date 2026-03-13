# ASVS Checklist — Human View

> Generated: 2026-03-13T14:41:33.645Z  
> Source: OWASP/ASVS@ae4ab5b (v5.0.0)  
> Total: 345 controls  

## Summary

| Status | Count |
|--------|-------|
| completed | 103 |
| not_applicable | 178 |
| **todo** | **64** |

| Severity (todo only) | Count |
|---------------------|-------|
| critical | 0 |
| **high** | **5** |
| medium | 38 |
| low | 21 |

---

## Actionable TODOs by theme

These groupings are meant for coding agents to tackle in logical batches.

### Security Headers (worker middleware) (9)

- **V3.2.1** [medium] — Verify that security controls are in place to prevent browsers from rendering content or functionality in HTTP responses in an incorrect context (e.g., when an API, a user-uploaded file or other resource is requested directly). Possible controls could include: not serving the content unless HTTP request header fields (such as Sec-Fetch-\*) indicate it is the correct context, using the sandbox directive of the Content-Security-Policy header field or using the attachment disposition type in the Content-Disposition header field.
  - _No X-Content-Type-Options: nosniff header is set on any response. Without it, browsers may perform MIME sniffing and interpret content differently than intended._
  - Refs: worker/index.ts:1

- **V3.4.1** [**HIGH**] — Verify that a Strict-Transport-Security header field is included on all responses to enforce an HTTP Strict Transport Security (HSTS) policy. A maximum age of at least 1 year must be defined, and for L2 and up, the policy must apply to all subdomains as well.
  - _No Strict-Transport-Security header is set by the worker. Cloudflare may configure HSTS at the edge level, but the application code does not enforce it._
  - Refs: worker/index.ts:1

- **V3.4.3** [**HIGH**] — Verify that HTTP responses include a Content-Security-Policy response header field which defines directives to ensure the browser only loads and executes trusted content or resources, in order to limit execution of malicious JavaScript. As a minimum, a global policy must be used which includes the directives object-src 'none' and base-uri 'none' and defines either an allowlist or uses nonces or hashes. For an L3 application, a per-response policy with nonces or hashes must be defined.
  - _No Content-Security-Policy header is set. The SPA loads external fonts from fonts.googleapis.com and fonts.gstatic.com without CSP restrictions. Scripts and styles are not restricted by policy._
  - Refs: worker/index.ts:1, index.html:7

- **V3.4.4** [medium] — Verify that all HTTP responses contain an 'X-Content-Type-Options: nosniff' header field. This instructs browsers not to use content sniffing and MIME type guessing for the given response, and to require the response's Content-Type header field value to match the destination resource. For example, the response to a request for a style is only accepted if the response's Content-Type is 'text/css'. This also enables the use of the Cross-Origin Read Blocking (CORB) functionality by the browser.
  - _No X-Content-Type-Options: nosniff header is set. Image responses do set content-type explicitly (worker/index.ts:225) but without nosniff._
  - Refs: worker/index.ts:225

- **V3.4.5** [medium] — Verify that the application sets a referrer policy to prevent leakage of technically sensitive data to third-party services via the 'Referer' HTTP request header field. This can be done using the Referrer-Policy HTTP response header field or via HTML element attributes. Sensitive data could include path and query data in the URL, and for internal non-public applications also the hostname.
  - _No Referrer-Policy header is set. The SPA loads Google Fonts externally; the full URL (including any path-based token like /p/{token}) could leak via the Referer header._
  - Refs: worker/index.ts:1, index.html:7

- **V3.4.6** [**HIGH**] — Verify that the web application uses the frame-ancestors directive of the Content-Security-Policy header field for every HTTP response to ensure that it cannot be embedded by default and that embedding of specific resources is allowed only when necessary. Note that the X-Frame-Options header field, although supported by browsers, is obsolete and may not be relied upon.
  - _No frame-ancestors CSP directive is set. The application could be framed by any origin, creating clickjacking risk._
  - Refs: worker/index.ts:1

- **V3.4.7** [medium] — Verify that the Content-Security-Policy header field specifies a location to report violations.
  - _No CSP exists, so no report-uri or report-to directive for violation reporting._
  - Refs: worker/index.ts:1

- **V3.4.8** [medium] — Verify that all HTTP responses that initiate a document rendering (such as responses with Content-Type text/html), include the Cross‑Origin‑Opener‑Policy header field with the same-origin directive or the same-origin-allow-popups directive as required. This prevents attacks that abuse shared access to Window objects, such as tabnabbing and frame counting.
  - _HTML responses from the worker fallback (index.ts:406) do not include any security headers. The SPA entry point (index.html) is served via Cloudflare Assets binding without custom headers._
  - Refs: worker/index.ts:406, index.html:1

- **V3.7.4** [medium] — Verify that the application's top-level domain (e.g., site.tld) is added to the public preload list for HTTP Strict Transport Security (HSTS). This ensures that the use of TLS for the application is built directly into the main browsers, rather than relying only on the Strict-Transport-Security response header field.
  - _Cannot verify if the production domain is on the HSTS preload list. No evidence of preload submission in the codebase._

### CORS & Origin Validation (3)

- **V3.4.2** [medium] — Verify that the Cross-Origin Resource Sharing (CORS) Access-Control-Allow-Origin header field is a fixed value by the application, or if the Origin HTTP request header field value is used, it is validated against an allowlist of trusted origins. When 'Access-Control-Allow-Origin: *' needs to be used, verify that the response does not include any sensitive information.
  - _No CORS headers (Access-Control-Allow-Origin or others) are configured. The API does not set a fixed-value origin policy._
  - Refs: worker/index.ts:1

- **V3.5.1** [**HIGH**] — Verify that, if the application does not rely on the CORS preflight mechanism to prevent disallowed cross-origin requests to use sensitive functionality, these requests are validated to ensure they originate from the application itself. This may be done by using and validating anti-forgery tokens or requiring extra HTTP header fields that are not CORS-safelisted request-header fields. This is to defend against browser-based request forgery attacks, commonly known as cross-site request forgery (CSRF).
  - _The application does not validate Origin headers on state-changing requests. POST /api/probe/:token/submit accepts submissions from any origin without verification. POST /api/admin/probes also lacks origin validation (protected only by CF Access)._
  - Refs: worker/index.ts:258, worker/index.ts:85

- **V3.5.2** [medium] — Verify that, if the application relies on the CORS preflight mechanism to prevent disallowed cross-origin use of sensitive functionality, it is not possible to call the functionality with a request which does not trigger a CORS-preflight request. This may require checking the values of the 'Origin' and 'Content-Type' request header fields or using an extra header field that is not a CORS-safelisted header-field.
  - _No CORS preflight mechanism is configured. No Access-Control-Allow-Methods or Access-Control-Allow-Headers are defined._
  - Refs: worker/index.ts:1

### File Upload Hardening (8)

- **V5.1.1** [medium] — Verify that the documentation defines the permitted file types, expected file extensions, and maximum size (including unpacked size) for each upload feature. Additionally, ensure that the documentation specifies how files are made safe for end-users to download and process, such as how the application behaves when a malicious file is detected.
  - _No formal documentation defines permitted file types, expected extensions, or maximum size, although these are enforced in code: ALLOWED_IMAGE_MIME (jpeg/png), MAX_IMAGE_BYTES (2MB)._
  - Refs: src/shared/domain.ts:21, src/shared/domain.ts:22

- **V5.2.2** [medium] — Verify that when the application accepts a file, either on its own or within an archive such as a zip file, it checks if the file extension matches an expected file extension and validates that the contents correspond to the type represented by the extension. This includes, but is not limited to, checking the initial 'magic bytes', performing image re-writing, and using specialized libraries for file content validation. For L1, this can focus just on files which are used to make specific business or security decisions. For L2 and up, this must apply to all files being accepted.
  - _MIME type validation relies on the client-provided Content-Type (File.type property). No server-side magic byte verification confirms the file is actually a JPEG or PNG. A malicious file with a spoofed Content-Type would pass validation._
  - Refs: worker/index.ts:292

- **V5.2.4** [medium] — Verify that a file size quota and maximum number of files per user are enforced to ensure that a single user cannot fill up the storage with too many files, or excessively large files.
  - _No per-user file quota. Each probe accepts one image (single-use token), but a malicious admin could create many probes (up to 500 per request, unlimited requests). Total R2 storage is not monitored or limited at application level._
  - Refs: src/shared/validation.ts:7

- **V5.2.6** [low] — Verify that the application rejects uploaded images with a pixel size larger than the maximum allowed, to prevent pixel flood attacks.
  - _No pixel dimension validation is performed on uploaded images. Large-dimension images (e.g., 10000x10000 pixels within 2MB) could cause memory issues during any future server-side processing._
  - Refs: worker/index.ts:292

- **V5.4.3** [medium] — Verify that files obtained from untrusted sources are scanned by antivirus scanners to prevent serving of known malicious content.
  - _No antivirus scanning is performed on uploaded files before storage or serving._
  - Refs: worker/index.ts:336

- **V13.1.3** [low] — Verify that the application documentation defines resource‑management strategies for every external system or service it uses (e.g., databases, file handles, threads, HTTP connections). This should include resource‑release procedures, timeout settings, failure handling, and where retry logic is implemented, specifying retry limits, delays, and back‑off algorithms. For synchronous HTTP request–response operations it should mandate short timeouts and either disable retries or strictly limit retries to prevent cascading delays and resource exhaustion.
  - _No documented resource management strategies for D1, R2, or other external services._

- **V14.2.5** [low] — Verify that caching mechanisms are configured to only cache responses which have the expected content type for that resource and do not contain sensitive, dynamic content. The web server should return a 404 or 302 response when a non-existent file is accessed rather than returning a different, valid file. This should prevent Web Cache Deception attacks.
  - _No explicit cache content-type validation. Admin API JSON responses do not set Cache-Control._

- **V14.2.8** [low] — Verify that sensitive information is removed from the metadata of user-submitted files unless storage is consented to by the user.
  - _Uploaded images are stored with all original metadata (EXIF) intact. EXIF data may contain device info, embedded GPS, timestamps. No metadata stripping is performed._
  - Refs: worker/index.ts:336

### Rate Limiting & Anti-Automation (5)

- **V6.1.1** [medium] — Verify that application documentation defines how controls such as rate limiting, anti-automation, and adaptive response, are used to defend against attacks such as credential stuffing and password brute force. The documentation must make clear how these controls are configured and prevent malicious account lockout.
  - _No documentation defines rate limiting, anti-automation, or adaptive response controls for authentication. Admin auth is delegated to Cloudflare Access; farmer token access has no anti-automation controls._
  - Refs: worker/index.ts:231

- **V6.3.1** [medium] — Verify that controls to prevent attacks such as credential stuffing and password brute force are implemented according to the application's security documentation.
  - _No rate limiting or anti-automation controls protect the token lookup endpoint (GET /api/probe/:token). While the 256-bit token space makes brute-force infeasible, no throttling exists for invalid token attempts._
  - Refs: worker/index.ts:231

- **V13.1.2** [low] — Verify that for each service the application uses, the documentation defines the maximum number of concurrent connections (e.g., connection pool limits) and how the application behaves when that limit is reached, including any fallback or recovery mechanisms, to prevent denial of service conditions.
  - _No documentation of maximum concurrent connections or resource limits per service._

- **V15.1.3** [low] — Verify that the application documentation identifies functionality which is time-consuming or resource-demanding. This must include how to prevent a loss of availability due to overusing this functionality and how to avoid a situation where building a response takes longer than the consumer's timeout. Potential defenses may include asynchronous processing, using queues, and limiting parallel processes per user and per application.
  - _No documentation identifies time-consuming or resource-demanding functionality. Probe creation with 500 probes per request could be resource-intensive._
  - Refs: src/shared/validation.ts:7

- **V15.2.2** [medium] — Verify that the application has implemented defenses against loss of availability due to functionality which is time-consuming or resource-demanding, based on the documented security decisions and strategies for this.
  - _No explicit rate limiting or resource protection against DoS. Probe creation allows up to 500 per request with no rate limiting. Cloudflare Workers have platform-level CPU time limits but no application-level throttling._
  - Refs: src/shared/validation.ts:7, worker/index.ts:1

### Configuration & Secrets (6)

- **V11.1.1** [medium] — Verify that there is a documented policy for management of cryptographic keys and a cryptographic key lifecycle that follows a key management standard such as NIST SP 800-57. This should include ensuring that keys are not overshared (for example, with more than two entities for shared secrets and more than one entity for private keys).
  - _No documented cryptographic key management policy. TOKEN_PEPPER is the only cryptographic key, stored as a Cloudflare Workers environment variable. No key lifecycle documentation._
  - Refs: worker/types.ts:4

- **V13.1.4** [medium] — Verify that the application's documentation defines the secrets that are critical for the security of the application and a schedule for rotating them, based on the organization's threat model and business requirements.
  - _No documentation of critical secrets or rotation schedule. TOKEN_PEPPER is the primary secret with no rotation mechanism._
  - Refs: worker/types.ts:4

- **V13.2.3** [medium] — Verify that if a credential has to be used for service authentication, the credential being used by the consumer is not a default credential (e.g., root/root or admin/admin).
  - _wrangler.jsonc contains default development credentials: TOKEN_PEPPER='dev-only-token-pepper' and DEV_BYPASS_ACCESS='true'. Production values should override these but no verification mechanism exists._
  - Refs: wrangler.jsonc:12, wrangler.jsonc:13

- **V13.3.1** [medium] — Verify that a secrets management solution, such as a key vault, is used to securely create, store, control access to, and destroy backend secrets. These could include passwords, key material, integrations with databases and third-party systems, keys and seeds for time-based tokens, other internal secrets, and API keys. Secrets must not be included in application source code or included in build artifacts. For an L3 application, this must involve a hardware-backed solution such as an HSM.
  - _No secrets management solution (key vault) is used. TOKEN_PEPPER is stored as a Cloudflare Workers environment variable. Cloudflare dashboard provides basic secret management via 'wrangler secret' command._
  - Refs: worker/types.ts:4

- **V13.3.4** [medium] — Verify that secrets are configured to expire and be rotated based on the application's documentation.
  - _No secret expiration or rotation mechanism. TOKEN_PEPPER has no expiration. If compromised, all token hashes would need regeneration._
  - Refs: worker/types.ts:4

- **V13.4.2** [**HIGH**] — Verify that debug modes are disabled for all components in production environments to prevent exposure of debugging features and information leakage.
  - _DEV_BYPASS_ACCESS='true' in wrangler.jsonc enables admin auth bypass. This is a debug/development feature that must be disabled in production. No environment validation ensures it is false in production._
  - Refs: wrangler.jsonc:12, worker/index.ts:69

### Caching & Data Leakage (6)

- **V14.1.2** [medium] — Verify that all sensitive data protection levels have a documented set of protection requirements. This must include (but not be limited to) requirements related to general encryption, integrity verification, retention, how the data is to be logged, access controls around sensitive data in logs, database-level encryption, privacy and privacy-enhancing technologies to be used, and other confidentiality requirements.
  - _No documented protection requirements per sensitivity level._

- **V14.2.2** [medium] — Verify that the application prevents sensitive data from being cached in server components, such as load balancers and application caches, or ensures that the data is securely purged after use.
  - _No Cache-Control headers are set on admin API responses. Probe listing data (including GPS, customer names) could be cached by intermediary proxies. Only image responses set cache-control: private._
  - Refs: worker/index.ts:224

- **V14.2.4** [medium] — Verify that controls around sensitive data related to encryption, integrity verification, retention, how the data is to be logged, access controls around sensitive data in logs, privacy and privacy-enhancing technologies, are implemented as defined in the documentation for the specific data's protection level.
  - _No documented controls around encryption, integrity, retention, or logging of sensitive data._

- **V14.2.7** [medium] — Verify that sensitive information is subject to data retention classification, ensuring that outdated or unnecessary data is deleted automatically, on a defined schedule, or as the situation requires.
  - _No data retention policy. Probe records and images persist indefinitely. No automated cleanup or expiration of old data._

- **V14.3.1** [medium] — Verify that authenticated data is cleared from client storage, such as the browser DOM, after the client or session is terminated. The 'Clear-Site-Data' HTTP response header field may be able to help with this but the client-side should also be able to clear up if the server connection is not available when the session is terminated.
  - _No Clear-Site-Data header is sent on logout or session termination. The admin SPA stores theme preference in localStorage (ADMIN_THEME_STORAGE_KEY). No authenticated data cleanup mechanism._
  - Refs: src/App.tsx:90

- **V14.3.2** [medium] — Verify that the application sets sufficient anti-caching HTTP response header fields (i.e., Cache-Control: no-store) so that sensitive data is not cached in browsers.
  - _Admin API responses (GET /api/admin/probes) do not set Cache-Control: no-store. Probe data with GPS coordinates and customer names could be cached by browsers._
  - Refs: worker/index.ts:162

### Documentation-only (21)

- **V3.1.1** [medium] — Verify that application documentation states the expected security features that browsers using the application must support (such as HTTPS, HTTP Strict Transport Security (HSTS), Content Security Policy (CSP), and other relevant HTTP security mechanisms). It must also define how the application must behave when some of these features are not available (such as warning the user or blocking access).
  - _No documentation exists defining expected browser security features or minimum browser versions required to run the application._

- **V3.6.1** [low] — Verify that client-side assets, such as JavaScript libraries, CSS, or web fonts, are only hosted externally (e.g., on a Content Delivery Network) if the resource is static and versioned and Subresource Integrity (SRI) is used to validate the integrity of the asset. If this is not possible, there should be a documented security decision to justify this for each resource.
  - _External Google Fonts CSS and font files are loaded from fonts.googleapis.com / fonts.gstatic.com without subresource integrity (SRI) attributes._
  - Refs: index.html:7, index.html:9

- **V3.7.5** [low] — Verify that the application behaves as documented (such as warning the user or blocking access) if the browser used to access the application does not support the expected security features.
  - _No documentation defines minimum browser requirements. No feature detection or browser compatibility warnings are implemented._

- **V6.1.3** [low] — Verify that, if the application includes multiple authentication pathways, these are all documented together with the security controls and authentication strength which must be consistently enforced across them.
  - _Authentication pathways are not formally documented. Two pathways exist: 1) Admin via Cloudflare Access (Cf-Access-Authenticated-User-Email), 2) Farmer via HMAC-hashed single-use tokens._
  - Refs: worker/index.ts:68, worker/index.ts:231

- **V6.3.4** [low] — Verify that, if the application includes multiple authentication pathways, there are no undocumented pathways and that security controls and authentication strength are enforced consistently.
  - _Authentication pathways are not formally documented: admin via Cf-Access header, farmer via HMAC token. DEV_BYPASS_ACCESS creates an undocumented pathway._
  - Refs: worker/index.ts:69

- **V8.1.1** [medium] — Verify that authorization documentation defines rules for restricting function-level and data-specific access based on consumer permissions and resource attributes.
  - _No formal documentation defines authorization rules. The codebase enforces two levels: admin (CF Access authenticated) and farmer (valid token holder). No documentation defines function-level or data-specific access rules._
  - Refs: worker/index.ts:68

- **V8.1.2** [low] — Verify that authorization documentation defines rules for field-level access restrictions (both read and write) based on consumer permissions and resource attributes. Note that these rules might depend on other attribute values of the relevant data object, such as state or status.
  - _No field-level access restriction documentation. All admin users see all probe fields. Farmer token lookup returns only non-sensitive fields (customer_name, order_number, probe_number)._
  - Refs: worker/index.ts:250

- **V8.1.3** [low] — Verify that the application's documentation defines the environmental and contextual attributes (including but not limited to, time of day, user location, IP address, or device) that are used in the application to make security decisions, including those pertaining to authentication and authorization.
  - _No documentation defines environmental/contextual attributes for authorization (IP, time-of-day, device)._

- **V8.1.4** [low] — Verify that authentication and authorization documentation defines how environmental and contextual factors are used in decision-making, in addition to function-level, data-specific, and field-level authorization. This should include the attributes evaluated, thresholds for risk, and actions taken (e.g., allow, challenge, deny, step-up authentication).
  - _No documentation defines how environmental factors are used in authorization decisions._

- **V11.1.2** [medium] — Verify that a cryptographic inventory is performed, maintained, regularly updated, and includes all cryptographic keys, algorithms, and certificates used by the application. It must also document where keys can and cannot be used in the system, and the types of data that can and cannot be protected using the keys.
  - _No cryptographic inventory maintained. Cryptographic usage: HMAC-SHA256 for token hashing (worker/security.ts:23), crypto.getRandomValues for token generation (worker/security.ts:18), crypto.randomUUID for IDs (worker/index.ts:114)._
  - Refs: worker/security.ts:18, worker/security.ts:23, worker/index.ts:114

- **V11.1.4** [low] — Verify that a cryptographic inventory is maintained. This must include a documented plan that outlines the migration path to new cryptographic standards, such as post-quantum cryptography, in order to react to future threats.
  - _No migration plan documented for cryptographic algorithm changes._

- **V13.1.1** [medium] — Verify that all communication needs for the application are documented. This must include external services which the application relies upon and cases where an end user might be able to provide an external location to which the application will then connect.
  - _No formal documentation of communication needs. The application communicates with: Cloudflare D1 (database), Cloudflare R2 (object storage), Cloudflare Access (auth proxy), Google Fonts (external CDN from client-side)._
  - Refs: wrangler.jsonc:1

- **V13.2.6** [low] — Verify that where the application connects to separate services, it follows the documented configuration for each connection, such as maximum parallel connections, behavior when maximum allowed connections is reached, connection timeouts, and retry strategies.
  - _No documented configuration for connection pooling or resource management when connecting to D1/R2._

- **V14.1.1** [medium] — Verify that all sensitive data created and processed by the application has been identified and classified into protection levels. This includes data that is only encoded and therefore easily decoded, such as Base64 strings or the plaintext payload inside a JWT. Protection levels need to take into account any data protection and privacy regulations and standards which the application is required to comply with.
  - _No formal data classification. The application stores: customer names, GPS coordinates (location data), crop names, soil/vitality data, and probe images. No sensitivity labels or protection levels defined._
  - Refs: migrations/0001_m1_init.sql:1

- **V14.2.3** [medium] — Verify that defined sensitive data is not sent to untrusted parties (e.g., user trackers) to prevent unwanted collection of data outside of the application's control.
  - _External Google Fonts are loaded from fonts.googleapis.com. The Referer header may leak the page URL (including /p/{token} paths) to Google when loading fonts. No Referrer-Policy is set._
  - Refs: index.html:7

- **V15.1.1** [medium] — Verify that application documentation defines risk based remediation time frames for 3rd party component versions with vulnerabilities and for updating libraries in general, to minimize the risk from these components.
  - _No documented remediation timeframes for third-party component vulnerabilities._

- **V15.1.2** [medium] — Verify that an inventory catalog, such as software bill of materials (SBOM), is maintained of all third-party libraries in use, including verifying that components come from pre-defined, trusted, and continually maintained repositories.
  - _No SBOM (software bill of materials) is maintained. Dependencies are listed in package.json but no formal inventory with version tracking._
  - Refs: package.json:1

- **V15.1.4** [low] — Verify that application documentation highlights third-party libraries which are considered to be "risky components".
  - _No documentation identifies risky third-party libraries._

- **V15.1.5** [low] — Verify that application documentation highlights parts of the application where "dangerous functionality" is being used.
  - _No documentation highlights dangerous functionality areas._

- **V15.2.1** [medium] — Verify that the application only contains components which have not breached the documented update and remediation time frames.
  - _No automated vulnerability scanning or update enforcement for dependencies._
  - Refs: package.json:1

- **V15.2.5** [low] — Verify that the application implements additional protections around parts of the application which are documented as containing "dangerous functionality" or using third-party libraries considered to be "risky components". This could include techniques such as sandboxing, encapsulation, containerization or network level isolation to delay and deter attackers who compromise one part of an application from pivoting elsewhere in the application.
  - _No documented dangerous functionality areas or additional protections around them._

### Other (6)

- **V8.2.3** [medium] — Verify that the application ensures that field-level access is restricted to consumers with explicit permissions to specific fields to mitigate broken object property level authorization (BOPLA).
  - _No field-level access restrictions. All authenticated admins can see all fields of all probes, including GPS coordinates. No role-based field filtering._
  - Refs: worker/index.ts:162

- **V8.3.2** [low] — Verify that changes to values on which authorization decisions are made are applied immediately. Where changes cannot be applied immediately, (such as when relying on data in self-contained tokens), there must be mitigating controls to alert when a consumer performs an action when they are no longer authorized to do so and revert the change. Note that this alternative would not mitigate information leakage.
  - _No formal documentation defines which data properties should be readable or writable by which actors._

- **V8.4.1** [medium] — Verify that multi-tenant applications use cross-tenant controls to ensure consumer operations will never affect tenants with which they do not have permissions to interact.
  - _No environmental/contextual attributes (IP, time, device) are used in authorization decisions. All admin users have equal access regardless of context._

- **V8.4.2** [low] — Verify that access to administrative interfaces incorporates multiple layers of security, including continuous consumer identity verification, device security posture assessment, and contextual risk analysis, ensuring that network location or trusted endpoints are not the sole factors for authorization even though they may reduce the likelihood of unauthorized access.
  - _No documentation defines specific scenarios for contextual authorization evaluation._

- **V11.1.3** [low] — Verify that cryptographic discovery mechanisms are employed to identify all instances of cryptography in the system, including encryption, hashing, and signing operations.
  - _No formal cryptographic discovery mechanism. Cryptographic usage is limited to worker/security.ts (HMAC-SHA256, CSPRNG)._
  - Refs: worker/security.ts:1

- **V11.2.2** [medium] — Verify that the application is designed with crypto agility such that random number, authenticated encryption, MAC, or hashing algorithms, key lengths, rounds, ciphers and modes can be reconfigured, upgraded, or swapped at any time, to protect against cryptographic breaks. Similarly, it must also be possible to replace keys and passwords and re-encrypt data. This will allow for seamless upgrades to post-quantum cryptography (PQC), once high-assurance implementations of approved PQC schemes or standards are widely available.
  - _Application is not designed with explicit crypto agility. The HMAC-SHA256 algorithm is hardcoded in worker/security.ts. Changing the algorithm would require code changes and re-hashing all tokens._
  - Refs: worker/security.ts:27

---

## Full checklist

| Requirement | Level | Status | Severity | Reasoning |
|---|---|---|---|---|
| V1.1.1 | 2 | completed | medium | Input decoding is handled consistently: URL path parameters are decoded once by the Hono router, form data is parsed once via c.req.formData(), and JSON bodies via c.req.json(). Zod schemas then valid |
| V1.1.2 | 2 | completed | medium | Output encoding is handled by the framework layer: React JSX auto-escapes all rendered values in the SPA (no dangerouslySetInnerHTML usage found). Server responses use c.json() which JSON-encodes outp |
| V1.2.1 | 1 | completed | low | HTTP responses are JSON (via Hono c.json()) or binary image streams. React handles HTML element/attribute encoding. No manual HTML construction in worker except the dev fallback at index.ts:406 which  |
| V1.2.2 | 1 | completed | low | URL construction uses string template with baseUrl (admin-controlled APP_BASE_URL or origin-derived) concatenated with a base64url token. The token is generated from crypto.getRandomValues and base64u |
| V1.2.3 | 1 | completed | low | All SQL queries use D1 parameterized statements with positional bind parameters (?1, ?2, etc.). No string concatenation or interpolation in SQL. Verified across all repository.ts queries: orderExists, |
| V1.2.4 | 1 | not_applicable | none | Application does not use LDAP. No LDAP libraries or directory services found in package.json or codebase. |
| V1.2.5 | 1 | not_applicable | none | Application does not use OS command execution. No child_process, exec, spawn, or shell command invocation found in worker or src code. Cloudflare Workers runtime does not support OS command execution. |
| V1.2.6 | 2 | completed | low | Application uses Zod schema validation for all incoming data. Input that doesn't match the schema is rejected with a 400 error before processing. This includes crop_name (string trim min 1), vitality  |
| V1.2.7 | 2 | not_applicable | none | Application does not use XPath. No XML processing or XPath queries exist in the codebase. |
| V1.2.8 | 2 | not_applicable | none | Application does not use LaTeX processing. No LaTeX libraries or template engines found. |
| V1.2.9 | 2 | not_applicable | none | Application does not construct regular expressions from user input. Zod uses static schemas. No RegExp constructor with user data found. |
| V1.2.10 | 3 | not_applicable | none | Application does not generate CSV or spreadsheet output. All API responses are JSON. No CSV export functionality exists. |
| V1.3.1 | 1 | not_applicable | none | Application does not process XML. No XML parsing libraries found. All API communication is JSON-based. |
| V1.3.2 | 1 | not_applicable | none | Application does not use XML serialization or DTD processing. |
| V1.3.3 | 2 | not_applicable | none | Application does not use XML or XPath. No XML processing found. |
| V1.3.4 | 2 | not_applicable | none | Application does not accept SVG uploads. ALLOWED_IMAGE_MIME restricts to image/jpeg and image/png only. |
| V1.3.5 | 2 | not_applicable | none | Application does not use server-side template engines. React SPA is pre-compiled by Vite. Worker returns JSON responses via Hono c.json(). |
| V1.3.6 | 2 | completed | medium | Worker does not make outbound HTTP requests based on user input. The only outbound operations are to D1 (database) and R2 (object storage), both using Cloudflare bindings with fixed configuration. Ima |
| V1.3.7 | 2 | not_applicable | none | Application does not use server-side templates. React SPA is pre-compiled. Worker returns JSON responses only. |
| V1.3.8 | 2 | not_applicable | none | Application does not use JNDI (Java Naming and Directory Interface). This is a TypeScript/Node application running on Cloudflare Workers. |
| V1.3.9 | 2 | not_applicable | none | Application does not use memcache. Data is stored in Cloudflare D1 (SQLite) and R2 (object storage). |
| V1.3.10 | 2 | not_applicable | none | Application does not use format strings. JavaScript/TypeScript does not have C-style format string vulnerabilities. Template literals are used only with static templates. |
| V1.3.11 | 2 | not_applicable | none | Application does not send emails. No SMTP, IMAP, or email libraries found in dependencies. |
| V1.3.12 | 3 | completed | medium | Zod schema patterns are static (enum values, fixed min/max bounds). No user-supplied regular expressions. The application does not construct RegExp from untrusted input, so ReDoS risk does not apply. |
| V1.4.1 | 2 | completed | medium | Application uses strict Zod schemas that define exactly which fields are accepted and their types/constraints. Unknown fields in JSON bodies are ignored by Zod's default behavior (strip). createProbes |
| V1.4.2 | 2 | completed | medium | Zod schemas enforce strict type constraints: probe_count is z.number().int().min(1).max(500), GPS coordinates have range validation, vitality and soil_moisture use z.enum() with allowed values, string |
| V1.4.3 | 2 | completed | low | All data passed from the API is rendered in the React SPA using JSX expressions which auto-escape values. No raw HTML rendering found. Customer names, crop names, and other text fields are displayed t |
| V1.5.1 | 1 | not_applicable | none | Application does not use XML parsers. No XML parsing libraries in dependencies. |
| V1.5.2 | 2 | completed | medium | Deserialization uses JSON.parse only (via Hono c.req.json()). Zod validates the parsed structure against strict schemas before processing. No unsafe deserialization (eval, Function constructor, node:v |
| V1.5.3 | 3 | completed | low | Application uses a single JSON parser (the built-in JSON.parse via Hono). No multiple parser inconsistencies possible. URL parsing uses the standard URL constructor. |
| V2.1.1 | 1 | completed | medium | All API endpoints validate input server-side using Zod schemas before processing. createProbesSchema, listProbesQuerySchema, cropOverrideSchema, and farmerSubmitFieldsSchema define explicit constraint |
| V2.1.2 | 2 | completed | medium | Zod validation acts as a centralized validation layer shared between all API routes. Schema definitions are in a single shared/validation.ts file imported by the worker. |
| V2.1.3 | 2 | completed | medium | Zod schemas enforce strict positive validation: customer_name requires min(1) non-empty string, probe_count requires int min(1) max(500), vitality/soil_moisture are enum-restricted, GPS coordinates ha |
| V2.2.1 | 1 | completed | medium | File upload validation includes MIME type checking against ALLOWED_IMAGE_MIME (image/jpeg, image/png) and size checking against MAX_IMAGE_BYTES (2MB). Image is stored in R2 with a server-generated key |
| V2.2.2 | 1 | completed | low | Uploaded files are stored in R2 with server-generated keys: `${initialState.id}/${crypto.randomUUID()}.${extension}` where extension is derived from the validated MIME type, not from the original file |
| V2.2.3 | 2 | completed | medium | Related data items are validated together: farmerSubmitFieldsSchema validates crop_name, vitality, soil_moisture, GPS coordinates as a single object. GPS coordinates are range-checked (-90/90 for lat, |
| V2.3.1 | 1 | completed | medium | Business flow is sequential per-user: admin creates probes, farmer retrieves token state (GET), then submits (POST). Submission checks token exists, not used (submitted_at IS NULL), and not expired (e |
| V2.3.2 | 2 | completed | low | Query parameters are validated through Zod schema: listProbesQuerySchema accepts only customer_name, order_number, and status (enum-restricted). Unknown query parameters are ignored. No array paramete |
| V2.3.3 | 2 | completed | high | Submission uses an atomic UPDATE with WHERE conditions (submitted_at IS NULL AND expire_by > now). If the update affects 0 rows (race condition or invalid state), the image upload is rolled back (R2 d |
| V2.3.4 | 2 | completed | medium | Limited resources are handled: each probe token is single-use (enforced by UPDATE WHERE submitted_at IS NULL). Order uniqueness is enforced by the orderExists check. Probe count is capped at 500 per c |
| V2.3.5 | 3 | not_applicable | none | Application does not have high-value business flows requiring multi-user approval. Probe creation is a simple admin action, and farmer submission is a one-time data entry per token. |
| V2.4.1 | 2 | completed | low | Application does not perform internal file path operations based on user input. Image storage uses server-generated R2 keys. No file path traversal possible as there is no filesystem access (Cloudflar |
| V2.4.2 | 3 | completed | low | No path traversal risk: R2 object keys are constructed from server-generated UUIDs. The probeId parameter used in image retrieval queries the database by ID, not the filesystem. No directory listing o |
| V3.1.1 | 3 | todo | medium | No documentation exists defining expected browser security features or minimum browser versions required to run the application. |
| V3.2.1 | 1 | todo | medium | No X-Content-Type-Options: nosniff header is set on any response. Without it, browsers may perform MIME sniffing and interpret content differently than intended. |
| V3.2.2 | 1 | completed | medium | React JSX automatically escapes text content, preventing HTML injection. No dangerouslySetInnerHTML usage found. Text data from API (customer_name, crop_name, etc.) is rendered as text nodes in JSX, n |
| V3.2.3 | 3 | completed | low | React components use explicit variable declarations and JSX. No document.getElementById() followed by property access patterns that could enable DOM clobbering. React's virtual DOM prevents direct DOM |
| V3.3.1 | 1 | not_applicable | none | Application does not set cookies directly. Cloudflare Access manages authentication cookies externally. No Set-Cookie header found in worker code. |
| V3.3.2 | 2 | not_applicable | none | Application does not set cookies. Cloudflare Access manages session cookies externally. |
| V3.3.3 | 2 | not_applicable | none | Application does not set cookies. Cloudflare Access manages session cookies externally. |
| V3.3.4 | 2 | not_applicable | none | Application does not set cookies. Cloudflare Access manages session cookies externally. |
| V3.3.5 | 3 | not_applicable | none | Application does not use cookies directly. Session management is delegated to Cloudflare Access. |
| V3.4.1 | 1 | todo | high | No Strict-Transport-Security header is set by the worker. Cloudflare may configure HSTS at the edge level, but the application code does not enforce it. |
| V3.4.2 | 1 | todo | medium | No CORS headers (Access-Control-Allow-Origin or others) are configured. The API does not set a fixed-value origin policy. |
| V3.4.3 | 2 | todo | high | No Content-Security-Policy header is set. The SPA loads external fonts from fonts.googleapis.com and fonts.gstatic.com without CSP restrictions. Scripts and styles are not restricted by policy. |
| V3.4.4 | 2 | todo | medium | No X-Content-Type-Options: nosniff header is set. Image responses do set content-type explicitly (worker/index.ts:225) but without nosniff. |
| V3.4.5 | 2 | todo | medium | No Referrer-Policy header is set. The SPA loads Google Fonts externally; the full URL (including any path-based token like /p/{token}) could leak via the Referer header. |
| V3.4.6 | 2 | todo | high | No frame-ancestors CSP directive is set. The application could be framed by any origin, creating clickjacking risk. |
| V3.4.7 | 3 | todo | medium | No CSP exists, so no report-uri or report-to directive for violation reporting. |
| V3.4.8 | 3 | todo | medium | HTML responses from the worker fallback (index.ts:406) do not include any security headers. The SPA entry point (index.html) is served via Cloudflare Assets binding without custom headers. |
| V3.5.1 | 1 | todo | high | The application does not validate Origin headers on state-changing requests. POST /api/probe/:token/submit accepts submissions from any origin without verification. POST /api/admin/probes also lacks o |
| V3.5.2 | 1 | todo | medium | No CORS preflight mechanism is configured. No Access-Control-Allow-Methods or Access-Control-Allow-Headers are defined. |
| V3.5.3 | 1 | completed | medium | State-changing operations use appropriate HTTP methods: POST for creation (probes, submit), PATCH for update (crop-override), GET for reads. No state changes on GET endpoints. |
| V3.5.4 | 2 | not_applicable | none | Application does not use cookies directly. Session management is delegated to Cloudflare Access. |
| V3.5.5 | 2 | not_applicable | none | Application does not use postMessage API. No window.postMessage or event.data handling found in the SPA code. |
| V3.5.6 | 3 | completed | low | No JSONP functionality exists. All API responses use standard JSON via c.json() or Response.json(). No callback parameters are supported. |
| V3.5.7 | 3 | completed | medium | Script resources do not contain user data. The Vite-built JavaScript bundle is static. API responses are JSON, not served as scripts. No dynamic script generation. |
| V3.5.8 | 3 | completed | medium | Authenticated resources (admin probe images) are served with cache-control: private, max-age=60. Image URLs include the probe ID path, and the admin middleware checks authentication before serving. |
| V3.6.1 | 3 | todo | low | External Google Fonts CSS and font files are loaded from fonts.googleapis.com / fonts.gstatic.com without subresource integrity (SRI) attributes. |
| V3.7.1 | 2 | completed | low | Application uses modern, supported technologies: React 18, TypeScript, Hono, Cloudflare Workers. No deprecated browser APIs (document.write, eval) are used. |
| V3.7.2 | 2 | not_applicable | none | Application does not perform automatic redirects to external domains. The SPA handles client-side routing. No redirect endpoints exist in the worker. |
| V3.7.3 | 3 | not_applicable | none | Application does not redirect to external URLs. No outbound redirect functionality exists. |
| V3.7.4 | 3 | todo | medium | Cannot verify if the production domain is on the HSTS preload list. No evidence of preload submission in the codebase. |
| V3.7.5 | 3 | todo | low | No documentation defines minimum browser requirements. No feature detection or browser compatibility warnings are implemented. |
| V4.1.1 | 1 | completed | medium | JSON responses use c.json() which sets Content-Type: application/json. Image responses explicitly set content-type from R2 metadata or fallback (worker/index.ts:225). Error responses use Response.json |
| V4.1.2 | 2 | not_applicable | none | Application is an API + SPA served over Cloudflare Workers, which only accepts HTTPS. HTTP-to-HTTPS redirect is handled by Cloudflare at the edge level, not at the application level. |
| V4.1.3 | 2 | completed | medium | The application uses Cf-Access-Authenticated-User-Email header set by Cloudflare Access (a trusted intermediary). This header is validated in the admin middleware at worker/index.ts:74. Cloudflare Acc |
| V4.1.4 | 3 | completed | medium | Hono router only handles explicitly defined routes: GET/POST for specific paths. The catch-all returns 404 for /api/* and serves SPA assets for other paths. Undefined HTTP methods on defined routes ar |
| V4.1.5 | 3 | not_applicable | none | Application does not process high-value transactions requiring per-message digital signatures. Probe submissions are standard form data. |
| V4.2.1 | 2 | completed | low | Cloudflare Workers handles HTTP message parsing. The Hono framework uses standard Web APIs (Request, Response) for message boundary handling. No custom HTTP parsing. |
| V4.2.2 | 3 | completed | low | Hono and Web API Response objects automatically calculate Content-Length. JSON responses use Response.json() which handles this correctly. Image responses stream the R2 body directly. |
| V4.2.3 | 3 | completed | low | Cloudflare Workers handles HTTP/2 and HTTP/3 protocol-level concerns. The application uses standard Web APIs and does not set connection-specific headers. |
| V4.2.4 | 3 | completed | low | Cloudflare Workers validates HTTP/2 and HTTP/3 headers at the edge. The application does not directly handle protocol-level header validation. |
| V4.2.5 | 3 | completed | medium | The worker builds one outbound-style request: inferring base URL (worker/index.ts:48). This uses the request URL or APP_BASE_URL config, not user-supplied URL parameters. No other outbound request con |
| V4.3.1 | 2 | not_applicable | none | No GraphQL dependencies (checked: graphql, apollo-server, @apollo/server, mercurius, graphql-yoga, type-graphql) or code markers (checked: GraphQLSchema, buildSchema, graphql(, gql`) detected in codeb |
| V4.3.2 | 2 | not_applicable | none | No GraphQL dependencies (checked: graphql, apollo-server, @apollo/server, mercurius, graphql-yoga, type-graphql) or code markers (checked: GraphQLSchema, buildSchema, graphql(, gql`) detected in codeb |
| V4.4.1 | 1 | not_applicable | none | Application does not use WebSocket connections. |
| V4.4.2 | 2 | not_applicable | none | Application does not use WebSocket connections. |
| V4.4.3 | 2 | not_applicable | none | Application does not use WebSocket connections. |
| V4.4.4 | 2 | not_applicable | none | Application does not use WebSocket connections. |
| V5.1.1 | 2 | todo | medium | No formal documentation defines permitted file types, expected extensions, or maximum size, although these are enforced in code: ALLOWED_IMAGE_MIME (jpeg/png), MAX_IMAGE_BYTES (2MB). |
| V5.2.1 | 1 | completed | medium | File size is checked before processing: image.size > MAX_IMAGE_BYTES (2MB) returns 413. The image is streamed to R2, so memory usage is bounded. |
| V5.2.2 | 1 | todo | medium | MIME type validation relies on the client-provided Content-Type (File.type property). No server-side magic byte verification confirms the file is actually a JPEG or PNG. A malicious file with a spoofe |
| V5.2.3 | 2 | not_applicable | none | Application only accepts JPEG and PNG images, not compressed archives (zip, gz, docx, odt). |
| V5.2.4 | 3 | todo | medium | No per-user file quota. Each probe accepts one image (single-use token), but a malicious admin could create many probes (up to 500 per request, unlimited requests). Total R2 storage is not monitored o |
| V5.2.5 | 3 | not_applicable | none | Application only accepts JPEG and PNG images, not compressed files with potential symlinks. |
| V5.2.6 | 3 | todo | low | No pixel dimension validation is performed on uploaded images. Large-dimension images (e.g., 10000x10000 pixels within 2MB) could cause memory issues during any future server-side processing. |
| V5.3.1 | 1 | completed | high | Uploaded files are stored in Cloudflare R2 (object storage), not in a public folder. They are only accessible via the authenticated admin image endpoint. Cloudflare Workers cannot execute uploaded fil |
| V5.3.2 | 1 | completed | high | Server-generated file paths are used: `${probeId}/${crypto.randomUUID()}.${extension}`. No user-submitted filenames are used in storage paths. |
| V5.3.3 | 3 | not_applicable | none | Application does not perform file decompression. Only JPEG/PNG images are stored. |
| V5.4.1 | 2 | completed | medium | Application does not serve files with user-submitted filenames. Images are served inline with content-disposition: inline. No filename parameter is set in the response. |
| V5.4.2 | 2 | completed | low | No filenames are included in response headers. Images are served with content-disposition: inline only. |
| V5.4.3 | 2 | todo | medium | No antivirus scanning is performed on uploaded files before storage or serving. |
| V6.1.1 | 1 | todo | medium | No documentation defines rate limiting, anti-automation, or adaptive response controls for authentication. Admin auth is delegated to Cloudflare Access; farmer token access has no anti-automation cont |
| V6.1.2 | 2 | not_applicable | none | Application does not manage passwords. Admin auth is via Cloudflare Access. Farmer access uses HMAC tokens. |
| V6.1.3 | 2 | todo | low | Authentication pathways are not formally documented. Two pathways exist: 1) Admin via Cloudflare Access (Cf-Access-Authenticated-User-Email), 2) Farmer via HMAC-hashed single-use tokens. |
| V6.2.1 | 1 | not_applicable | none | Application does not manage passwords. Admin authentication is delegated to Cloudflare Access. Farmer access uses single-use HMAC tokens, not passwords. |
| V6.2.2 | 1 | not_applicable | none | Application does not manage passwords. Admin authentication is delegated to Cloudflare Access. Farmer access uses single-use HMAC tokens, not passwords. |
| V6.2.3 | 1 | not_applicable | none | Application does not manage passwords. Admin authentication is delegated to Cloudflare Access. Farmer access uses single-use HMAC tokens, not passwords. |
| V6.2.4 | 1 | not_applicable | none | Application does not manage passwords. Admin authentication is delegated to Cloudflare Access. Farmer access uses single-use HMAC tokens, not passwords. |
| V6.2.5 | 1 | not_applicable | none | Application does not manage passwords. Admin authentication is delegated to Cloudflare Access. Farmer access uses single-use HMAC tokens, not passwords. |
| V6.2.6 | 1 | not_applicable | none | Application does not manage passwords. Admin authentication is delegated to Cloudflare Access. Farmer access uses single-use HMAC tokens, not passwords. |
| V6.2.7 | 1 | not_applicable | none | Application does not manage passwords. Admin authentication is delegated to Cloudflare Access. Farmer access uses single-use HMAC tokens, not passwords. |
| V6.2.8 | 1 | not_applicable | none | Application does not manage passwords. Admin authentication is delegated to Cloudflare Access. Farmer access uses single-use HMAC tokens, not passwords. |
| V6.2.9 | 2 | not_applicable | none | Application does not manage passwords. Admin authentication is delegated to Cloudflare Access. Farmer access uses single-use HMAC tokens, not passwords. |
| V6.2.10 | 2 | not_applicable | none | Application does not manage passwords. Admin authentication is delegated to Cloudflare Access. Farmer access uses single-use HMAC tokens, not passwords. |
| V6.2.11 | 2 | not_applicable | none | Application does not manage passwords. Admin authentication is delegated to Cloudflare Access. Farmer access uses single-use HMAC tokens, not passwords. |
| V6.2.12 | 2 | not_applicable | none | Application does not manage passwords. Admin authentication is delegated to Cloudflare Access. Farmer access uses single-use HMAC tokens, not passwords. |
| V6.3.1 | 1 | todo | medium | No rate limiting or anti-automation controls protect the token lookup endpoint (GET /api/probe/:token). While the 256-bit token space makes brute-force infeasible, no throttling exists for invalid tok |
| V6.3.2 | 1 | not_applicable | none | Application does not have default user accounts. Admin access is via Cloudflare Access (external IdP). |
| V6.3.3 | 2 | not_applicable | none | MFA is managed by Cloudflare Access, not the application. Farmer access is token-based (single-use, no MFA). |
| V6.3.4 | 2 | todo | low | Authentication pathways are not formally documented: admin via Cf-Access header, farmer via HMAC token. DEV_BYPASS_ACCESS creates an undocumented pathway. |
| V6.3.5 | 3 | not_applicable | none | Application does not manage authentication sessions. Cloudflare Access handles admin auth notifications. Farmer tokens are anonymous. |
| V6.3.6 | 3 | not_applicable | none | Application does not use email as an authentication mechanism. |
| V6.3.7 | 3 | not_applicable | none | Application does not manage authentication credentials. Cloudflare Access handles credential management. |
| V6.3.8 | 3 | completed | medium | Invalid token lookups return a generic 404 'Link nicht gefunden' without revealing whether the token existed or expired vs never existed. However, used tokens return 409 and expired tokens return 410, |
| V6.4.1 | 1 | not_applicable | none | Application does not manage user accounts, passwords, or authentication factors. Admin auth is delegated to Cloudflare Access. |
| V6.4.2 | 1 | not_applicable | none | Application does not manage user accounts, passwords, or authentication factors. Admin auth is delegated to Cloudflare Access. |
| V6.4.3 | 2 | not_applicable | none | Application does not manage user accounts, passwords, or authentication factors. Admin auth is delegated to Cloudflare Access. |
| V6.4.4 | 2 | not_applicable | none | Application does not manage user accounts, passwords, or authentication factors. Admin auth is delegated to Cloudflare Access. |
| V6.4.5 | 3 | not_applicable | none | Application does not manage user accounts, passwords, or authentication factors. Admin auth is delegated to Cloudflare Access. |
| V6.4.6 | 3 | not_applicable | none | Application does not manage user accounts, passwords, or authentication factors. Admin auth is delegated to Cloudflare Access. |
| V6.5.1 | 2 | not_applicable | none | Application does not implement MFA. Admin MFA is managed by Cloudflare Access. |
| V6.5.2 | 2 | not_applicable | none | Application does not implement MFA. Admin MFA is managed by Cloudflare Access. |
| V6.5.3 | 2 | not_applicable | none | Application does not implement MFA. Admin MFA is managed by Cloudflare Access. |
| V6.5.4 | 2 | not_applicable | none | Application does not implement MFA. Admin MFA is managed by Cloudflare Access. |
| V6.5.5 | 2 | not_applicable | none | Application does not implement MFA. Admin MFA is managed by Cloudflare Access. |
| V6.5.6 | 3 | not_applicable | none | Application does not implement MFA. Admin MFA is managed by Cloudflare Access. |
| V6.5.7 | 3 | not_applicable | none | Application does not implement MFA. Admin MFA is managed by Cloudflare Access. |
| V6.5.8 | 3 | not_applicable | none | Application does not implement MFA. Admin MFA is managed by Cloudflare Access. |
| V6.6.1 | 2 | not_applicable | none | Application does not implement out-of-band authentication (SMS, push notifications). |
| V6.6.2 | 2 | not_applicable | none | Application does not implement out-of-band authentication (SMS, push notifications). |
| V6.6.3 | 2 | not_applicable | none | Application does not implement out-of-band authentication (SMS, push notifications). |
| V6.6.4 | 3 | not_applicable | none | Application does not implement out-of-band authentication (SMS, push notifications). |
| V6.7.1 | 3 | not_applicable | none | Application does not use certificate-based authentication. Admin auth uses Cloudflare Access headers. |
| V6.7.2 | 3 | completed | medium | Probe tokens use 256 bits of cryptographic randomness (crypto.getRandomValues with 32 bytes), which exceeds the 64-bit nonce requirement. Each token is unique and single-use. |
| V6.8.1 | 2 | not_applicable | none | Application uses a single identity provider (Cloudflare Access). No multi-IdP configuration exists. |
| V6.8.2 | 2 | not_applicable | none | No SAML dependencies (checked: saml2-js, passport-saml, @node-saml/passport-saml, samlify) or code markers (checked: SAMLResponse, SAMLRequest, samlp://) detected in codebase. |
| V6.8.3 | 2 | not_applicable | none | No SAML dependencies (checked: saml2-js, passport-saml, @node-saml/passport-saml, samlify) or code markers (checked: SAMLResponse, SAMLRequest, samlp://) detected in codebase. |
| V6.8.4 | 2 | not_applicable | none | Application does not implement OAuth or OIDC directly. Admin auth is delegated to Cloudflare Access. |
| V7.1.1 | 2 | not_applicable | none | Session management is delegated to Cloudflare Access. The application does not manage session timeouts. |
| V7.1.2 | 2 | not_applicable | none | Concurrent session management is handled by Cloudflare Access, not the application. |
| V7.1.3 | 2 | not_applicable | none | Federated session management is handled by Cloudflare Access. |
| V7.2.1 | 1 | completed | medium | Token verification is performed server-side: the worker hashes the token with HMAC-SHA256 and looks up the hash in D1. No client-side token verification exists. |
| V7.2.2 | 1 | not_applicable | none | Application does not use traditional session tokens. Admin sessions are Cloudflare Access tokens (external). Farmer tokens are single-use HMAC-hashed access tokens. |
| V7.2.3 | 1 | completed | medium | Farmer tokens are generated using crypto.getRandomValues(new Uint8Array(32)) — 256 bits of CSPRNG entropy, base64url-encoded. Tokens are unique and looked up via HMAC hash. |
| V7.2.4 | 1 | not_applicable | none | Application does not manage user sessions. No session token regeneration applies. Farmer tokens are pre-generated, not tied to authentication events. |
| V7.3.1 | 2 | not_applicable | none | Session timeout management is delegated to Cloudflare Access. Farmer tokens have a 60-day absolute expiry (not session-based). |
| V7.3.2 | 2 | not_applicable | none | Session timeout management is delegated to Cloudflare Access. Farmer tokens have a 60-day absolute expiry (not session-based). |
| V7.4.1 | 1 | not_applicable | none | Session termination is managed by Cloudflare Access. The application does not implement logout. Farmer tokens are consumed on use (no session to terminate). |
| V7.4.2 | 1 | not_applicable | none | Session termination is managed by Cloudflare Access. The application does not implement logout. Farmer tokens are consumed on use (no session to terminate). |
| V7.4.3 | 2 | not_applicable | none | Session termination is managed by Cloudflare Access. The application does not implement logout. Farmer tokens are consumed on use (no session to terminate). |
| V7.4.4 | 2 | not_applicable | none | Session termination is managed by Cloudflare Access. The application does not implement logout. Farmer tokens are consumed on use (no session to terminate). |
| V7.4.5 | 2 | not_applicable | none | Session termination is managed by Cloudflare Access. The application does not implement logout. Farmer tokens are consumed on use (no session to terminate). |
| V7.5.1 | 2 | not_applicable | none | Session abuse defenses are managed by Cloudflare Access. The application does not manage user accounts or sensitive account attributes. |
| V7.5.2 | 2 | not_applicable | none | Session abuse defenses are managed by Cloudflare Access. The application does not manage user accounts or sensitive account attributes. |
| V7.5.3 | 3 | not_applicable | none | Session abuse defenses are managed by Cloudflare Access. The application does not manage user accounts or sensitive account attributes. |
| V7.6.1 | 2 | not_applicable | none | Federated re-authentication is managed by Cloudflare Access, not the application. |
| V7.6.2 | 2 | not_applicable | none | Federated re-authentication is managed by Cloudflare Access, not the application. |
| V8.1.1 | 1 | todo | medium | No formal documentation defines authorization rules. The codebase enforces two levels: admin (CF Access authenticated) and farmer (valid token holder). No documentation defines function-level or data- |
| V8.1.2 | 2 | todo | low | No field-level access restriction documentation. All admin users see all probe fields. Farmer token lookup returns only non-sensitive fields (customer_name, order_number, probe_number). |
| V8.1.3 | 3 | todo | low | No documentation defines environmental/contextual attributes for authorization (IP, time-of-day, device). |
| V8.1.4 | 3 | todo | low | No documentation defines how environmental factors are used in authorization decisions. |
| V8.2.1 | 1 | completed | high | Admin functions are restricted to users with Cf-Access-Authenticated-User-Email header (Cloudflare Access). Farmer functions require a valid token. Health endpoint is public. Unmatched routes return 4 |
| V8.2.2 | 1 | completed | medium | Data access is restricted: admin routes require CF Access auth and can access all probes. Farmer token lookup returns only the specific probe's basic info. Image endpoint requires admin auth. Token-ba |
| V8.2.3 | 2 | todo | medium | No field-level access restrictions. All authenticated admins can see all fields of all probes, including GPS coordinates. No role-based field filtering. |
| V8.2.4 | 3 | completed | medium | Probe data can only be modified via defined endpoints: submit (requires valid token, sets submitted_at atomically) and crop-override (requires admin auth + probe must be submitted). No bulk modificati |
| V8.3.1 | 1 | completed | medium | Farmer token lookup reveals minimal data: customer_name, order_number, probe_number. No GPS, crop, or image data is returned to the farmer. Admin endpoints return full probe data only to authenticated |
| V8.3.2 | 3 | todo | low | No formal documentation defines which data properties should be readable or writable by which actors. |
| V8.3.3 | 3 | completed | medium | Sensitive operations require explicit authorization: probe creation requires admin auth, submission requires valid token, crop override requires admin auth + submitted state. No anonymous state-changi |
| V8.4.1 | 2 | todo | medium | No environmental/contextual attributes (IP, time, device) are used in authorization decisions. All admin users have equal access regardless of context. |
| V8.4.2 | 3 | todo | low | No documentation defines specific scenarios for contextual authorization evaluation. |
| V9.1.1 | 1 | completed | high | Cloudflare Workers only accept HTTPS connections. All external traffic uses TLS managed by Cloudflare. TLS 1.2 minimum is enforced by default. |
| V9.1.2 | 1 | completed | medium | TLS cipher suite and version management is handled by Cloudflare. Cloudflare enforces modern cipher suites and supports TLS 1.3. |
| V9.1.3 | 1 | completed | low | Cloudflare Workers do not support mTLS for end-user connections by default. This control is about validating mTLS client certificates which are not used in this application. |
| V9.2.1 | 1 | completed | high | All client-to-server connections use TLS via Cloudflare. No HTTP fallback is possible on Cloudflare Workers. |
| V9.2.2 | 2 | completed | medium | TLS certificates are managed by Cloudflare. Cloudflare provides publicly-trusted certificates (DigiCert/Let's Encrypt) for all custom domains. |
| V9.2.3 | 2 | completed | medium | All internal connections use Cloudflare bindings (D1, R2) which are platform-internal. No HTTP-based internal communication exists. |
| V9.2.4 | 2 | completed | low | All connectivity between worker and data stores (D1, R2) uses Cloudflare internal bindings with strong platform-level authentication. |
| V10.1.1 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.1.2 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.2.1 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.2.2 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.2.3 | 3 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.3.1 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.3.2 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.3.3 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.3.4 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.3.5 | 3 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.1 | 1 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.2 | 1 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.3 | 1 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.4 | 1 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.5 | 1 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.6 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.7 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.8 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.9 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.10 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.11 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.12 | 3 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.13 | 3 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.14 | 3 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.15 | 3 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.4.16 | 3 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.5.1 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.5.2 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.5.3 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.5.4 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.5.5 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.6.1 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.6.2 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.7.1 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.7.2 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V10.7.3 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which manages the OAuth/OIDC flow externally. The worker only checks the Cf-Access-Authenticated-U |
| V11.1.1 | 2 | todo | medium | No documented cryptographic key management policy. TOKEN_PEPPER is the only cryptographic key, stored as a Cloudflare Workers environment variable. No key lifecycle documentation. |
| V11.1.2 | 2 | todo | medium | No cryptographic inventory maintained. Cryptographic usage: HMAC-SHA256 for token hashing (worker/security.ts:23), crypto.getRandomValues for token generation (worker/security.ts:18), crypto.randomUUI |
| V11.1.3 | 3 | todo | low | No formal cryptographic discovery mechanism. Cryptographic usage is limited to worker/security.ts (HMAC-SHA256, CSPRNG). |
| V11.1.4 | 3 | todo | low | No migration plan documented for cryptographic algorithm changes. |
| V11.2.1 | 2 | completed | high | Application uses Web Crypto API (crypto.subtle.importKey, crypto.subtle.sign, crypto.getRandomValues), which is the platform-provided, industry-validated cryptographic implementation in Cloudflare Wor |
| V11.2.2 | 2 | todo | medium | Application is not designed with explicit crypto agility. The HMAC-SHA256 algorithm is hardcoded in worker/security.ts. Changing the algorithm would require code changes and re-hashing all tokens. |
| V11.2.3 | 2 | completed | medium | HMAC-SHA256 provides 256-bit security. Token generation uses 256 bits of randomness. Both exceed the 128-bit minimum requirement. |
| V11.2.4 | 3 | completed | medium | HMAC operations use Web Crypto API which provides constant-time implementations. No custom comparison operations on cryptographic values. Token hashes are compared via SQL WHERE clause (database-level |
| V11.2.5 | 3 | completed | medium | Cryptographic failures (e.g., importKey or sign failures) would throw exceptions caught by the endpoint's catch blocks, returning a generic error. No Padding Oracle or similar vulnerability exists as  |
| V11.3.1 | 1 | not_applicable | none | Application does not use block cipher encryption. Only HMAC is used for token hashing. |
| V11.3.2 | 1 | not_applicable | none | Application does not perform symmetric encryption. |
| V11.3.3 | 2 | not_applicable | none | Application does not encrypt data (only HMAC hashing). Encryption at rest is managed by Cloudflare D1/R2. |
| V11.3.4 | 3 | not_applicable | none | Application does not use nonces or IVs. HMAC does not require them. |
| V11.3.5 | 3 | not_applicable | none | Application does not combine encryption with MAC. Only HMAC is used. |
| V11.4.1 | 1 | completed | medium | SHA-256 (via HMAC-SHA256) is the only hash function used. SHA-256 is approved for HMAC use. |
| V11.4.2 | 2 | not_applicable | none | Application does not store passwords. Admin auth is via Cloudflare Access. Token hashes use HMAC-SHA256 with a pepper (not password hashing). |
| V11.4.3 | 2 | completed | medium | Data integrity is enforced: DB triggers validate all required fields on INSERT/UPDATE when submitted_at is set. MIME type must be image/jpeg or image/png, image_bytes must be <= 2097152. Plant_vitalit |
| V11.4.4 | 2 | not_applicable | none | Application does not derive keys from passwords. |
| V11.5.1 | 2 | completed | high | All random values use crypto.getRandomValues() (CSPRNG): 32 bytes for tokens (worker/security.ts:18), crypto.randomUUID() for probe IDs and image keys (worker/index.ts:114, worker/index.ts:333). |
| V11.5.2 | 3 | completed | low | Web Crypto API's crypto.getRandomValues and crypto.randomUUID are designed to work under heavy demand. Cloudflare Workers runtime provides these as platform primitives. |
| V11.6.1 | 2 | completed | medium | HMAC-SHA256 is the only signing algorithm. Key import uses Web Crypto API with approved parameters. |
| V11.6.2 | 3 | not_applicable | none | Application does not perform key exchange (Diffie-Hellman). HMAC key is a shared secret (TOKEN_PEPPER). |
| V11.7.1 | 3 | not_applicable | none | Full memory encryption is a platform-level concern. Cloudflare Workers run in V8 isolates; application has no control over memory encryption. |
| V11.7.2 | 3 | completed | low | Sensitive data in memory is minimized: tokens are hashed immediately after receipt (worker/index.ts:233,260). The original token is not stored. Only the hash is persisted. |
| V12.1.1 | 1 | completed | medium | Cloudflare enforces TLS 1.2+ by default. TLS 1.3 is supported and preferred. The application does not configure TLS directly; Cloudflare manages it at the edge. |
| V12.1.2 | 2 | completed | medium | Cloudflare manages cipher suite selection, preferring strong ciphers. The application does not control cipher configuration. |
| V12.1.3 | 2 | not_applicable | none | Application does not use mTLS client certificates. |
| V12.1.4 | 3 | completed | low | OCSP stapling is managed by Cloudflare as part of their TLS termination. |
| V12.1.5 | 3 | not_applicable | none | Encrypted Client Hello (ECH) is a TLS feature managed at Cloudflare's edge level, not configurable from the worker application. |
| V12.2.1 | 1 | completed | high | All client-facing connections use HTTPS via Cloudflare. Cloudflare Workers only accept HTTPS. HTTP is redirected to HTTPS at the edge. |
| V12.2.2 | 1 | completed | medium | Cloudflare provides publicly-trusted TLS certificates for all custom domains. |
| V12.3.1 | 2 | completed | medium | All internal connections use Cloudflare bindings (D1, R2) which are platform-internal encrypted channels. No HTTP-based monitoring or management connections exist. |
| V12.3.2 | 2 | completed | low | The worker does not make outbound TLS connections. D1 and R2 use Cloudflare bindings. |
| V12.3.3 | 2 | completed | medium | Internal communication between worker and D1/R2 uses Cloudflare's internal binding mechanism, which is encrypted and authenticated by the platform. |
| V12.3.4 | 2 | not_applicable | none | No internal TLS certificates are used. All internal communication uses Cloudflare bindings. |
| V12.3.5 | 3 | completed | medium | Intra-service communication (worker to D1, worker to R2) uses Cloudflare bindings which provide strong platform-level authentication. Each binding is configured in wrangler.jsonc with specific databas |
| V13.1.1 | 2 | todo | medium | No formal documentation of communication needs. The application communicates with: Cloudflare D1 (database), Cloudflare R2 (object storage), Cloudflare Access (auth proxy), Google Fonts (external CDN  |
| V13.1.2 | 3 | todo | low | No documentation of maximum concurrent connections or resource limits per service. |
| V13.1.3 | 3 | todo | low | No documented resource management strategies for D1, R2, or other external services. |
| V13.1.4 | 3 | todo | medium | No documentation of critical secrets or rotation schedule. TOKEN_PEPPER is the primary secret with no rotation mechanism. |
| V13.2.1 | 2 | completed | medium | Backend communication uses Cloudflare bindings (D1, R2) which are authenticated by the platform. No custom service-to-service authentication is needed. |
| V13.2.2 | 2 | completed | medium | All communications to D1 and R2 use encrypted Cloudflare bindings. TLS is not configurable at this level — it's platform-managed. |
| V13.2.3 | 2 | todo | medium | wrangler.jsonc contains default development credentials: TOKEN_PEPPER='dev-only-token-pepper' and DEV_BYPASS_ACCESS='true'. Production values should override these but no verification mechanism exists |
| V13.2.4 | 2 | completed | medium | Zod schemas define explicit allowlists of accepted fields. Only validated fields are used in database operations. No req.body spread or uncontrolled field binding. |
| V13.2.5 | 2 | completed | medium | Zod schemas define explicit allowlists of accepted fields. Only validated fields are used in database operations. No req.body spread or uncontrolled field binding. |
| V13.2.6 | 3 | todo | low | No documented configuration for connection pooling or resource management when connecting to D1/R2. |
| V13.3.1 | 2 | todo | medium | No secrets management solution (key vault) is used. TOKEN_PEPPER is stored as a Cloudflare Workers environment variable. Cloudflare dashboard provides basic secret management via 'wrangler secret' com |
| V13.3.2 | 2 | completed | medium | TOKEN_PEPPER is only accessed in worker/security.ts:23 (tokenHash function). Environment variables are bound at runtime and not accessible outside the worker. Least privilege is maintained by design. |
| V13.3.3 | 3 | not_applicable | none | Application uses Web Crypto API directly (platform-provided). No external HSM or vault integration is needed for the limited cryptographic operations (HMAC-SHA256). |
| V13.3.4 | 3 | todo | medium | No secret expiration or rotation mechanism. TOKEN_PEPPER has no expiration. If compromised, all token hashes would need regeneration. |
| V13.4.1 | 1 | completed | medium | Cloudflare Workers deployment does not include source control metadata. The dist/ directory (Vite build output) is deployed as static assets. Worker code is compiled. |
| V13.4.2 | 2 | todo | high | DEV_BYPASS_ACCESS='true' in wrangler.jsonc enables admin auth bypass. This is a debug/development feature that must be disabled in production. No environment validation ensures it is false in producti |
| V13.4.3 | 2 | completed | low | Cloudflare Workers does not serve directory listings. SPA fallback is configured in wrangler.jsonc. |
| V13.4.4 | 2 | completed | low | Hono does not support HTTP TRACE. The catch-all route returns 404 for any unmatched /api/* request. |
| V13.4.5 | 2 | completed | low | Only /api/health is the monitoring endpoint and is intentionally public. No documentation or internal API endpoints are exposed. |
| V13.4.6 | 3 | completed | low | No version information is exposed. Hono does not add Server or X-Powered-By headers. Error responses contain only error_code and message. |
| V13.4.7 | 3 | completed | medium | Cloudflare Workers serves only the built SPA assets from the dist/ directory via the ASSETS binding. No configuration or hidden files are served. |
| V14.1.1 | 2 | todo | medium | No formal data classification. The application stores: customer names, GPS coordinates (location data), crop names, soil/vitality data, and probe images. No sensitivity labels or protection levels def |
| V14.1.2 | 2 | todo | medium | No documented protection requirements per sensitivity level. |
| V14.2.1 | 1 | completed | medium | Sensitive data (form submissions) is sent via POST body (JSON or multipart). Token is in URL path (/p/{token}) which appears in server logs, but this is the design choice for farmer link sharing. Admi |
| V14.2.2 | 2 | todo | medium | No Cache-Control headers are set on admin API responses. Probe listing data (including GPS, customer names) could be cached by intermediary proxies. Only image responses set cache-control: private. |
| V14.2.3 | 2 | todo | medium | External Google Fonts are loaded from fonts.googleapis.com. The Referer header may leak the page URL (including /p/{token} paths) to Google when loading fonts. No Referrer-Policy is set. |
| V14.2.4 | 2 | todo | medium | No documented controls around encryption, integrity, retention, or logging of sensitive data. |
| V14.2.5 | 3 | todo | low | No explicit cache content-type validation. Admin API JSON responses do not set Cache-Control. |
| V14.2.6 | 3 | completed | medium | API responses return only required fields. Farmer token lookup returns only customer_name, order_number, probe_number (not GPS, images, etc.). Admin listing maps database fields to a defined response  |
| V14.2.7 | 3 | todo | medium | No data retention policy. Probe records and images persist indefinitely. No automated cleanup or expiration of old data. |
| V14.2.8 | 3 | todo | low | Uploaded images are stored with all original metadata (EXIF) intact. EXIF data may contain device info, embedded GPS, timestamps. No metadata stripping is performed. |
| V14.3.1 | 1 | todo | medium | No Clear-Site-Data header is sent on logout or session termination. The admin SPA stores theme preference in localStorage (ADMIN_THEME_STORAGE_KEY). No authenticated data cleanup mechanism. |
| V14.3.2 | 2 | todo | medium | Admin API responses (GET /api/admin/probes) do not set Cache-Control: no-store. Probe data with GPS coordinates and customer names could be cached by browsers. |
| V14.3.3 | 2 | completed | low | Only the admin theme preference ('ls-oneup-admin-theme') is stored in localStorage. No sensitive data (tokens, customer data, GPS) is stored in browser storage. |
| V15.1.1 | 1 | todo | medium | No documented remediation timeframes for third-party component vulnerabilities. |
| V15.1.2 | 2 | todo | medium | No SBOM (software bill of materials) is maintained. Dependencies are listed in package.json but no formal inventory with version tracking. |
| V15.1.3 | 2 | todo | low | No documentation identifies time-consuming or resource-demanding functionality. Probe creation with 500 probes per request could be resource-intensive. |
| V15.1.4 | 3 | todo | low | No documentation identifies risky third-party libraries. |
| V15.1.5 | 3 | todo | low | No documentation highlights dangerous functionality areas. |
| V15.2.1 | 1 | todo | medium | No automated vulnerability scanning or update enforcement for dependencies. |
| V15.2.2 | 2 | todo | medium | No explicit rate limiting or resource protection against DoS. Probe creation allows up to 500 per request with no rate limiting. Cloudflare Workers have platform-level CPU time limits but no applicati |
| V15.2.3 | 2 | completed | low | Production deployment via Cloudflare Workers only includes the built SPA (dist/) and compiled worker code. Dev dependencies and test files are not deployed. |
| V15.2.4 | 3 | completed | medium | Dependencies are installed from npm (public registry). package-lock.json pins exact versions with integrity hashes. |
| V15.2.5 | 3 | todo | low | No documented dangerous functionality areas or additional protections around them. |
| V15.3.1 | 1 | completed | medium | API responses return defined field subsets. Farmer lookup returns only 4 fields. Admin listing maps specific columns. Token hash is never returned in any response. |
| V15.3.2 | 2 | not_applicable | none | Application backend does not make outbound HTTP requests. D1 and R2 are accessed via Cloudflare bindings. |
| V15.3.3 | 2 | completed | medium | Mass assignment is prevented by Zod schemas that define exact allowed fields. Only validated fields from parsed.data are used in database operations. No request body spreading or uncontrolled field bi |
| V15.3.4 | 2 | completed | medium | User IP is not used in application logic. The admin middleware reads Cf-Access-Authenticated-User-Email from Cloudflare Access, which is a trusted header set by the reverse proxy. |
| V15.3.5 | 2 | completed | medium | Zod enforces strict types: z.number().int() for probe_count, z.coerce.number() with range for GPS, z.enum() for vitality/soil_moisture. Strict equality is used in JavaScript for status checks. |
| V15.3.6 | 2 | completed | low | Application uses React components and standard data structures. No Object.assign or direct prototype chain manipulation. Zod schema parsing creates clean objects. |
| V15.3.7 | 2 | completed | medium | Query parameters are parsed via URL.searchParams.entries() and validated through Zod. Duplicate parameters are collapsed to the last value by URLSearchParams. POST bodies are JSON or FormData (framewo |
| V15.4.1 | 3 | not_applicable | none | Application is single-threaded (Cloudflare Workers runs in V8 isolates). No shared objects between threads. D1 handles concurrent access at the database level. |
| V15.4.2 | 3 | completed | high | TOCTOU race conditions on submission are mitigated: applySubmit uses an atomic UPDATE WHERE submitted_at IS NULL AND expire_by > now. State check and action are combined in a single SQL statement. |
| V15.4.3 | 3 | not_applicable | none | Application is single-threaded. No locks or thread synchronization needed. |
| V15.4.4 | 3 | not_applicable | none | Application is single-threaded (V8 isolate). No thread pools or thread starvation risk. |
| V16.1.1 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.2.1 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.2.2 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.2.3 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.2.4 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.2.5 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.3.1 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.3.2 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.3.3 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.3.4 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.4.1 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.4.2 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.4.3 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.5.1 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.5.2 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.5.3 | 2 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V16.5.4 | 3 | not_applicable | none | Application does not implement OAuth or OIDC. Admin authentication is delegated to Cloudflare Access, which handles the OAuth/OIDC flow externally. The worker only checks the resulting Cf-Access-Authe |
| V17.1.1 | 2 | not_applicable | none | No WebRTC dependencies (checked: simple-peer, webrtc, mediasoup, peerjs, wrtc, @mediasoup/client) or code markers (checked: RTCPeerConnection, RTCDataChannel, getUserMedia, RTCSessionDescription) dete |
| V17.1.2 | 3 | not_applicable | none | No WebRTC dependencies (checked: simple-peer, webrtc, mediasoup, peerjs, wrtc, @mediasoup/client) or code markers (checked: RTCPeerConnection, RTCDataChannel, getUserMedia, RTCSessionDescription) dete |
| V17.2.1 | 2 | not_applicable | none | No WebRTC dependencies (checked: simple-peer, webrtc, mediasoup, peerjs, wrtc, @mediasoup/client) or code markers (checked: RTCPeerConnection, RTCDataChannel, getUserMedia, RTCSessionDescription) dete |
| V17.2.2 | 2 | not_applicable | none | No WebRTC dependencies (checked: simple-peer, webrtc, mediasoup, peerjs, wrtc, @mediasoup/client) or code markers (checked: RTCPeerConnection, RTCDataChannel, getUserMedia, RTCSessionDescription) dete |
| V17.2.3 | 2 | not_applicable | none | No WebRTC dependencies (checked: simple-peer, webrtc, mediasoup, peerjs, wrtc, @mediasoup/client) or code markers (checked: RTCPeerConnection, RTCDataChannel, getUserMedia, RTCSessionDescription) dete |
| V17.2.4 | 2 | not_applicable | none | No WebRTC dependencies (checked: simple-peer, webrtc, mediasoup, peerjs, wrtc, @mediasoup/client) or code markers (checked: RTCPeerConnection, RTCDataChannel, getUserMedia, RTCSessionDescription) dete |
| V17.2.5 | 3 | not_applicable | none | No WebRTC dependencies (checked: simple-peer, webrtc, mediasoup, peerjs, wrtc, @mediasoup/client) or code markers (checked: RTCPeerConnection, RTCDataChannel, getUserMedia, RTCSessionDescription) dete |
| V17.2.6 | 3 | not_applicable | none | No WebRTC dependencies (checked: simple-peer, webrtc, mediasoup, peerjs, wrtc, @mediasoup/client) or code markers (checked: RTCPeerConnection, RTCDataChannel, getUserMedia, RTCSessionDescription) dete |
| V17.2.7 | 3 | not_applicable | none | No WebRTC dependencies (checked: simple-peer, webrtc, mediasoup, peerjs, wrtc, @mediasoup/client) or code markers (checked: RTCPeerConnection, RTCDataChannel, getUserMedia, RTCSessionDescription) dete |
| V17.2.8 | 3 | not_applicable | none | No WebRTC dependencies (checked: simple-peer, webrtc, mediasoup, peerjs, wrtc, @mediasoup/client) or code markers (checked: RTCPeerConnection, RTCDataChannel, getUserMedia, RTCSessionDescription) dete |
| V17.3.1 | 2 | not_applicable | none | No WebRTC dependencies (checked: simple-peer, webrtc, mediasoup, peerjs, wrtc, @mediasoup/client) or code markers (checked: RTCPeerConnection, RTCDataChannel, getUserMedia, RTCSessionDescription) dete |
| V17.3.2 | 2 | not_applicable | none | No WebRTC dependencies (checked: simple-peer, webrtc, mediasoup, peerjs, wrtc, @mediasoup/client) or code markers (checked: RTCPeerConnection, RTCDataChannel, getUserMedia, RTCSessionDescription) dete |
