import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '29.0.0:11',
  releaseNotes: {
    en_US: `Switching networks now moves the ports with it.

Bitcoin Cash Node listens for RPC and peer connections on a different port for each network, but changing the network only restarted the node — it left the previous network's ports registered with StartOS. The node was then listening on one port while StartOS advertised another, so its own RPC address no longer worked and no service that depends on it could reach it, until the package was rebuilt by hand. The ports are now re-registered as part of the change.`,
    es_ES: `Cambiar de red ahora mueve también los puertos.

Bitcoin Cash Node escucha las conexiones RPC y de pares en un puerto distinto en cada red, pero cambiar de red solo reiniciaba el nodo: dejaba registrados en StartOS los puertos de la red anterior. El nodo quedaba escuchando en un puerto mientras StartOS anunciaba otro, así que su propia dirección RPC dejaba de funcionar y ningún servicio que dependiera de él podía alcanzarlo, hasta reconstruir el paquete a mano. Ahora los puertos se vuelven a registrar como parte del cambio.`,
    de_DE: `Ein Netzwerkwechsel verschiebt jetzt auch die Ports.

Bitcoin Cash Node lauscht in jedem Netzwerk auf einem anderen Port auf RPC- und Peer-Verbindungen, doch ein Netzwerkwechsel startete nur den Knoten neu und ließ die Ports des vorherigen Netzwerks bei StartOS registriert. Der Knoten lauschte dann auf dem einen Port, während StartOS einen anderen bekanntgab — seine eigene RPC-Adresse funktionierte nicht mehr und kein abhängiger Dienst konnte ihn erreichen, bis das Paket von Hand neu gebaut wurde. Die Ports werden nun als Teil des Wechsels neu registriert.`,
    pl_PL: `Zmiana sieci przenosi teraz również porty.

Bitcoin Cash Node nasłuchuje połączeń RPC i połączeń z węzłami na innym porcie w każdej sieci, ale zmiana sieci powodowała jedynie restart węzła — porty poprzedniej sieci pozostawały zarejestrowane w StartOS. Węzeł nasłuchiwał wtedy na jednym porcie, podczas gdy StartOS ogłaszał inny, więc jego własny adres RPC przestawał działać i żadna zależna usługa nie mogła go osiągnąć, dopóki pakiet nie został ręcznie przebudowany. Porty są teraz rejestrowane ponownie w ramach zmiany.`,
    fr_FR: `Changer de réseau déplace désormais aussi les ports.

Bitcoin Cash Node écoute les connexions RPC et pair-à-pair sur un port différent selon le réseau, mais changer de réseau ne faisait que redémarrer le nœud : les ports du réseau précédent restaient enregistrés auprès de StartOS. Le nœud écoutait alors sur un port pendant que StartOS en annonçait un autre, de sorte que sa propre adresse RPC ne fonctionnait plus et qu'aucun service dépendant ne pouvait l'atteindre, jusqu'à reconstruire le paquet à la main. Les ports sont maintenant réenregistrés dans le cadre du changement.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
