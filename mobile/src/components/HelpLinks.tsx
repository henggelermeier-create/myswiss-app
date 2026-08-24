import { Browser } from "@capacitor/browser";

const WEBSITE_URL = "https://schiessportal.com";
const AI_HELP_URL = "https://chatgpt.com/";

async function openUrl(url: string) {
  try {
    await Browser.open({ url, presentationStyle: "popover" });
  } catch {
    window.location.href = url;
  }
}

export function HelpLinks({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`panel flex flex-col ${compact ? "gap-2 p-3" : "gap-3 p-4"}`}>
      <div>
        <p className="font-semibold">Hilfe</p>
        {!compact && (
          <p className="mt-1 text-sm text-muted-foreground">
            Portal öffnen oder für Fragen die Online-KI-Hilfe verwenden. Für die KI-Hilfe ist Internet erforderlich.
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" className="btn-secondary" onClick={() => void openUrl(WEBSITE_URL)}>
          schiessportal.com öffnen
        </button>
        <button type="button" className="btn-secondary" onClick={() => void openUrl(AI_HELP_URL)}>
          KI-Hilfe öffnen
        </button>
      </div>
    </section>
  );
}
