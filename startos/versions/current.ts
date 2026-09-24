import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

/**
 * Whether users may downgrade from this release to an earlier one. Set it per
 * release: `true` only when earlier versions can still read the data this one
 * leaves behind, `false` when this release is one-way.
 */
const ALLOW_DOWNGRADE = false

export const current = VersionInfo.of({
  version: '29.1.0:0',
  releaseNotes: {
    en_US: `Bitcoin Cash Node 29.1.0, and three configuration fixes.

Updates Bitcoin Cash Node to upstream 29.1.0. The Ancestor and Descendant Limit settings are removed: Bitcoin Cash Node dropped those options in 23.1.0 and refuses to start when they are set, so any value left over in the configuration is now cleared. The Minimum Relay Fee must be above 0, which Bitcoin Cash Node also requires. Health checks now retry a failed RPC call a few times before reporting a problem.`,
    es_ES: `Bitcoin Cash Node 29.1.0 y tres correcciones de configuración.

Actualiza Bitcoin Cash Node a la versión 29.1.0. Se eliminan los ajustes de límite de ascendientes y descendientes: Bitcoin Cash Node quitó esas opciones en la 23.1.0 y no arranca si están definidas, por lo que cualquier valor que quede en la configuración se borra. La comisión mínima de retransmisión debe ser mayor que 0, algo que Bitcoin Cash Node también exige. Las comprobaciones de estado reintentan varias veces una llamada RPC fallida antes de informar de un problema.`,
    de_DE: `Bitcoin Cash Node 29.1.0 und drei Konfigurationskorrekturen.

Aktualisiert Bitcoin Cash Node auf Version 29.1.0. Die Einstellungen für Vorfahren- und Nachfahrenlimits entfallen: Bitcoin Cash Node hat diese Optionen in 23.1.0 entfernt und startet nicht, wenn sie gesetzt sind; noch vorhandene Werte werden daher aus der Konfiguration gelöscht. Die minimale Weiterleitungsgebühr muss größer als 0 sein, wie es Bitcoin Cash Node verlangt. Zustandsprüfungen wiederholen einen fehlgeschlagenen RPC-Aufruf einige Male, bevor sie ein Problem melden.`,
    pl_PL: `Bitcoin Cash Node 29.1.0 oraz trzy poprawki konfiguracji.

Aktualizuje Bitcoin Cash Node do wersji 29.1.0. Usunięto ustawienia limitów przodków i potomków: Bitcoin Cash Node usunął te opcje w wersji 23.1.0 i nie uruchamia się, gdy są ustawione, więc pozostałe w konfiguracji wartości są teraz czyszczone. Minimalna opłata za przekazanie musi być większa od 0, czego również wymaga Bitcoin Cash Node. Kontrole stanu ponawiają nieudane wywołanie RPC kilka razy, zanim zgłoszą problem.`,
    fr_FR: `Bitcoin Cash Node 29.1.0, et trois corrections de configuration.

Met à jour Bitcoin Cash Node vers la version 29.1.0. Les réglages de limite d'ascendants et de descendants sont supprimés : Bitcoin Cash Node a retiré ces options dans la 23.1.0 et refuse de démarrer lorsqu'elles sont définies, donc toute valeur restante est désormais effacée de la configuration. Les frais minimaux de relais doivent être supérieurs à 0, ce que Bitcoin Cash Node exige aussi. Les vérifications d'état réessaient plusieurs fois un appel RPC échoué avant de signaler un problème.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: ALLOW_DOWNGRADE ? async () => {} : IMPOSSIBLE,
  },
})
