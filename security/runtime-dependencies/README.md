# Runtime dependency advisory checks

This private npm manifest records the exact top-level versions used by the administrator page (`@supabase/supabase-js`) and the deployed Edge Function source (`@supabase/server`). It is an audit fixture, not a website build or an extra browser download. The website remains a static site.

Run from the repository root:

```sh
npm audit --prefix security/runtime-dependencies --audit-level=high
```

GitHub Actions runs this in addition to the root dependency audit. It blocks high and critical findings. The audit needs network access to the npm advisory registry; a registry failure must not be reported as a clean audit.

When upgrading either package:

1. Update the exact version in this manifest and the corresponding Edge import or vendored SDK. Replace the SDK bytes from the exact npm version, compare them with the upstream UMD artifact, update `assets/vendor/provenance.json` and license notices, and align the administrator HTML's local URL and integrity hash. Keep script CSP restricted to self.
2. Regenerate this lockfile with `npm install --prefix security/runtime-dependencies --package-lock-only --ignore-scripts` from the repository root.
3. Run both dependency audits and `npm test`. The source-version guard must pass.
4. Validate authentication, content publishing, and Owner operations in a permitted test environment before deploying a changed runtime package. Updating this fixture alone does not deploy or upgrade an Edge Function.

The npm graph is an advisory snapshot. The vendored browser bundle and Deno's deployed transitive resolution are separate delivery systems; a zero-result audit does not attest to every deployed byte or prove the absence of vulnerabilities. The browser still requires its pinned Subresource Integrity hash, and the Edge Function still requires verified authentication and server-side authorization.
