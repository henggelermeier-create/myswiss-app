SCHIESSPORTAL MOBILE 1.2.1 – GITHUB DESKTOP OVERLAY

Diese ZIP enthält nur die Dateien, die in das bestehende Repository
henggelermeier-create/myswiss-app kopiert/überschrieben werden müssen.

WICHTIG:
- Den bestehenden Ordner android/ im Repository NICHT löschen.
- ZIP direkt in den lokalen Repository-Ordner entpacken und Dateien überschreiben.
- Danach in GitHub Desktop: Commit to main -> Push origin.
- GitHub Actions startet automatisch und baut die echte Debug-APK.
- Keine Secrets, device_secret, Offline-Codes oder Transfer-Schlüssel eintragen.

Erwartetes Artefakt nach grünem Build:
schiessportal-android-1.2.1
APK:
android/app/build/outputs/apk/debug/app-debug.apk
