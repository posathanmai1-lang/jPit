# jPit — Privacy Policy

**Effective date:** September 15, 2026
**Extension:** jPit — Just Paste it
**Publisher:** Thanmai
**Contact:** via GitHub issues at https://github.com/posathanmai1-lang/jPit/issues

---

## Summary

jPit collects, transmits, and stores **no personal information whatsoever**.
The extension runs 100% locally in your browser and makes **zero external
network requests**. There is no analytics, no tracking, no telemetry, no
account system, and no data sharing with the publisher or any third party.

## Data handling details

| Category | Collected? | Explanation |
| --- | --- | --- |
| Personal information | No | None is requested, read, transmitted, or stored. |
| Browsing history | No | jPit never reads, records, or transmits the pages you visit. |
| Website content | No | Page content is never read or transmitted. Only clipboard events are intercepted locally so sites cannot block them. |
| User rules and settings | Local only | Your per-site enable rules are stored in your browser's storage.sync area, tied to your own browser profile. They are never sent anywhere. |
| Clipboard text | No | jPit intercepts clipboard events to unblock them, but never reads, stores, or transmits clipboard contents. |
| Cookies and credentials | No | Never accessed. |
| Crash and analytics data | No | Not implemented. |

## Permissions justification

- **storage** — required to save your per-site enable rules and settings.
- **tabs** — required only to detect which tab is active so the toolbar
  icon can show whether jPit is enabled for the current page. Tab content
  and URLs are never recorded or transmitted.
- **scripting** — required to inject the paste-unblocking code into pages
  where you have enabled jPit.
- **Host permissions (all URLs)** — required so you can enable jPit on any
  site that blocks paste. jPit remains inactive by default and only runs on
  sites matching a rule you explicitly created.

## Third parties

None. The extension contains no third-party SDKs, no remote code, and
contacts no servers. The full source code is public at
https://github.com/posathanmai1-lang/jPit and can be audited by anyone.

## Changes to this policy

Any future change will be posted in this file and in the extension's
GitHub repository before it takes effect.

## Contact

Open an issue at https://github.com/posathanmai1-lang/jPit/issues
