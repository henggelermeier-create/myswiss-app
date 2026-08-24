# Schiessportal Mobile 1.2.1

Android-Container für [schiessportal.com](https://schiessportal.com), basierend auf
Capacitor 8. Die App wird ausschliesslich für Android gebaut.

## Lokaler Build

Voraussetzungen sind Node.js 22, Java 21 sowie Android SDK Platform 36:

```bash
npm install
npm run build
npx cap sync android
cd android
gradle wrapper --gradle-version 8.14.3 --distribution-type bin
./gradlew assembleDebug
```

Der erzeugte `gradle-wrapper.jar` ist eine Binärdatei und wird deshalb nicht im
Repository gespeichert. Die GitHub Action erzeugt ihn vor dem Build automatisch.

Die Debug-APK liegt danach unter
`android/app/build/outputs/apk/debug/app-debug.apk`.

> Es dürfen keine Secrets, `device_secret`, Offline-Codes oder Transfer-Keys in
> diesem Repository gespeichert werden. Sensible Daten werden zur Laufzeit nur
> über den nativen Secure-Storage-Plug-in gespeichert.
