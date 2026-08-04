---
title: mobile-app
---

# mobile-app CI/CD

Stack: Flutter/Dart. Workflows live in `mobile-app/.github/workflows/`.

## CI (`ci.yml`)

- **Triggers:** push and pull_request on all branches (`**`).
- **No concurrency group defined** (unlike the other repos' workflows).

**Job: `test-and-lint`**
- Checkout (`actions/checkout@v3`)
- `subosito/flutter-action@v2` — Flutter `3.x`, stable channel
- `flutter pub get`
- `dart analyze lib test`
- `flutter test`

## CD (`cd.yml`, name: "CD - Deploy")

- **Triggers:** push on all branches, GitHub `release` published events, and manual `workflow_dispatch`.
- **No concurrency group defined.**

**Jobs:**

1. **deploy-check** — repeats the CI steps (Flutter setup, `pub get`, `dart analyze`, `flutter test`) as a gate before building.
2. **build-android** (needs `deploy-check`, `ubuntu-latest`) — `flutter build apk --release`, uploads the APK output directory (`build/app/outputs/apk/release/`) as artifact `app-release.apk`.
3. **build-ios** (needs `deploy-check`, `macos-latest`) — `flutter build ios --release`, uploads `build/ios/iphoneos/` as artifact `ios-build`.

## Notes

- Both workflows run on every branch push, not just PRs/main — CD effectively re-lints/re-tests and builds platform artifacts on every push.
- No code signing, store upload, or external distribution step (e.g. no Fastlane/Play Store/TestFlight) — pipeline ends at producing build artifacts.
- No concurrency cancellation configured here, unlike the backend repos, so overlapping runs on rapid pushes are not automatically cancelled.
