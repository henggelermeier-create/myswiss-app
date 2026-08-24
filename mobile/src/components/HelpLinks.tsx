import { Browser } from "@capacitor/browser";

const AI_HELP_URL = "https://schiessportal.com/?hilfe=ki&quelle=app";
const CONTACT_URL = "https://schiessportal.com/kontakt?quelle=app";

async function openUrl(url: string) {
  try {
    await Browser.open({ url, presentationStyle: "popover" });
  } catch {
    window.location.href = url;
  }
}

export function HelpLinks({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`panel flex flex-col ${compact ? "gap-2.5 p-3" : "gap-3 p-4"}`}>
      {!compact && (
        <div>
          <p className="font-semibold">Hilfe von Schiessportal</p>
          <p className="mt-1 text-sm text-muted-foreground">
            KI-Hilfe und persönlicher Kontakt laufen über schiessportal.com. So bleibt die App bewusst einfach.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" className="btn-secondary" onClick={() => void openUrl(AI_HELP_URL)}>
          KI-Hilfe
        </button>
        <button type="button" className="btn-secondary" onClick={() => void openUrl(CONTACT_URL)}>
          Hilfe &amp; Kontakt
        </button>
      </div>
    </section>
  );
}
