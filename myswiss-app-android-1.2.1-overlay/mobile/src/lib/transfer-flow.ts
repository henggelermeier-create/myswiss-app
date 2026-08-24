export type TransferState =
  | { step: "leer" }
  | { step: "abholbar"; hits: number; operations: number }
  | { step: "abholen_laeuft" }
  | { step: "bereit_zum_senden"; hits: number; operations: number }
  | { step: "senden_laeuft" }
  | { step: "gesendet"; settled: number }
  | { step: "fehler"; message: string; zurueck: TransferState };
export type TransferEvent =
  | { type: "PENDING_ERKANNT"; hits: number; operations: number }
  | { type: "ABHOLEN_GESTARTET" }
  | { type: "ABHOLEN_ERFOLGREICH"; hits: number; operations: number }
  | { type: "ABHOLEN_FEHLGESCHLAGEN"; message: string }
  | { type: "SENDEN_GESTARTET" }
  | { type: "SENDEN_ERFOLGREICH"; settled: number }
  | { type: "SENDEN_FEHLGESCHLAGEN"; message: string }
  | { type: "ZURUECKSETZEN" };
export const initialTransferState: TransferState = { step: "leer" };
export function describeTransferState(state: TransferState): { title: string; action: string | null } {
  switch (state.step) {
    case "leer": return { title: "Keine Daten warten", action: null };
    case "abholbar": return { title: `${state.hits} Treffer und ${state.operations} Änderungen warten`, action: "Von Box abholen" };
    case "abholen_laeuft": return { title: "Holt Daten von der Box …", action: null };
    case "bereit_zum_senden": return { title: `${state.hits} Treffer und ${state.operations} Änderungen bereit`, action: "Jetzt ins Portal senden" };
    case "senden_laeuft": return { title: "Sendet ins Portal …", action: null };
    case "gesendet": return { title: `Übertragen · ${state.settled} Datensätze bestätigt`, action: null };
    case "fehler": return { title: state.message, action: "Erneut versuchen" };
  }
}
export function transferReducer(state: TransferState, event: TransferEvent): TransferState {
  switch (event.type) {
    case "PENDING_ERKANNT": return event.hits + event.operations <= 0 ? { step: "leer" } : { step: "abholbar", hits: event.hits, operations: event.operations };
    case "ABHOLEN_GESTARTET": return { step: "abholen_laeuft" };
    case "ABHOLEN_ERFOLGREICH": return { step: "bereit_zum_senden", hits: event.hits, operations: event.operations };
    case "ABHOLEN_FEHLGESCHLAGEN": return { step: "fehler", message: event.message, zurueck: { step: "abholbar", hits: 0, operations: 0 } };
    case "SENDEN_GESTARTET": return { step: "senden_laeuft" };
    case "SENDEN_ERFOLGREICH": return { step: "gesendet", settled: event.settled };
    case "SENDEN_FEHLGESCHLAGEN": return { step: "fehler", message: event.message, zurueck: state.step === "bereit_zum_senden" ? state : { step: "bereit_zum_senden", hits: 0, operations: 0 } };
    case "ZURUECKSETZEN": return state.step === "fehler" ? state.zurueck : { step: "leer" };
  }
}
