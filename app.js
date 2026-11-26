/* Gold Cup Rio Matchboard – app logic (EN/DE/FR/ES, themes, favourites) */
(async()=>{
const $=s=>document.querySelector(s);
const LS={get(k,d){try{const v=localStorage.getItem("gcmb_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("gcmb_"+k,JSON.stringify(v))}catch(e){}}};
const LANGS={en:"English",de:"Deutsch",fr:"Français",es:"Español"};
let lang=LS.get("lang",null);if(!LANGS[lang])lang=["de","fr","es"].find(l=>(navigator.language||"").toLowerCase().startsWith(l))||"en";
let theme=LS.get("theme","auto"),favs=new Set(LS.get("favs",[]));

let INFO={};try{INFO=await (await fetch("teaminfo.json",{cache:"no-cache"})).json()}catch(e){}
let PEOPLE=[];try{PEOPLE=await (await fetch("people.json",{cache:"no-cache"})).json()}catch(e){}
const okData=d=>{try{return d&&Array.isArray(d.rounds)&&d.rounds.length>=5&&d.rounds.every(r=>r&&r.id&&r.start&&r.end&&Array.isArray(r.groups)&&r.groups.length&&r.groups.every(g=>g&&g.id&&Array.isArray(g.rows)&&g.rows.length&&g.rows.every(x=>x&&typeof x.team=="string"&&Array.isArray(x.r))))}catch(e){return false}};
async function pullFile(){try{const r=await fetch("results.json?t="+Date.now(),{cache:"no-store"});if(!r.ok)return false;const d=await r.json();if(okData(d)&&(!D.updatedAt||Date.parse(d.updatedAt)>=Date.parse(D.updatedAt))){const ch=JSON.stringify(d.rounds)!==JSON.stringify(D.rounds);D=d;if(d.checkedAt)checkedAt=d.checkedAt;return ch}}catch(e){}return false}
let RO={};try{RO=await (await fetch("roster.json",{cache:"no-cache"})).json()}catch(e){}
let D=JSON.parse($("#snap").textContent),checkedAt=null,view="board",round=null,sel=null,filt="all",sortBy="status",q="",live=false,stale=false,jump=false;

/* ---------- strings ---------- */
const ORD={en:n=>n+(n%10==1&&n!=11?"st":n%10==2&&n!=12?"nd":n%10==3&&n!=13?"rd":"th"),de:n=>n+".",fr:n=>n==1?"1er":n+"e",es:n=>n+".º"};
const S={
en:{rounds:"Rounds",bracket:"Matchboard",teams:"Teams",official:"Official results",updated:"Updated",ago:m=>m<1?"just now":m<60?`${m} min ago`:`${Math.round(m/60)} h ago`,rio:"Rio time",offline:"offline copy",
 rn:{r32:"1/32 Finals",r16:"1/16 Finals",r8:"1/8 Finals",r4:"Quarter-finals",sf:"Semi-finals",pf:"Petit Final",f:"Grand Final"},
 group:"Group",decided:"decided",racing:"racing",open:"open",st:{done:"completed",live:"in progress",up:"upcoming"},races:n=>`${n} race${n>1?"s":""} per group`,
 upNext:"Up next",startsIn:d=>d<=0?"starts today":d==1?"starts tomorrow":`starts in ${d} days`,groupsOf4:n=>`${n} group${n>1?"s":""} of four`,oneRace:"One race – the finishing order decides.",
 through:"through",out:"out",toFinal:"to Final",toPetit:"to Petit Final",medals:["Gold","Silver","Bronze","4th"],pts:"Pts",
 outIn:(r,g,p)=>`Out in the ${r} (Group ${g}, ${p})`,gf:m=>`Grand Final: ${m}`,finished:p=>`Finished ${p}`,thrTbc:"Through – next group to be confirmed",
 seeded:(r,g,d)=>`Seeded – enters the ${r}, Group ${g}, ${d}`,racingNow:"Racing now",
 nations:n=>`${n} nations`,stillIn:"still in",outN:"out",search:"Search nation, nickname or sailor",all:"All",chipIn:"Still in",chipOut:"Out",mine:"★ My teams",sStatus:"Status",sRank:"Ranking",sAz:"A–Z",noTeam:"No team found.",rank:"Rank",
 captain:"Captain",helm:"Helm",ranking:"SSL Nations Ranking",rankBoard:"Ranking board ↗",entered:"Entered Rio at",showRound:"Show that round ›",gc23:"Gold Cup 2023",br23:"2023 bracket ›",status:"Status",stIn:"Still in",stOut:"Out",whereEnded:"Where it ended ›",curGroup:"Current group ›",
 background:"Background",road:"Road to Rio",story:"Story",site:"Team site",qualRes:"Qualifier results ↗",sslRank:"SSL Nations Ranking ↗",resRio:"Results in Rio",photos:"Crew photos",byPos:"Crew by position",leader:"Team leader",wider:"Wider squad · position TBC",
 squadNote:(n,p)=>`${n} names in the squad. 8–10 sail each race and the line-up can change from day to day. Positions and numbers from the official team site; portraits from the Gold Cup Rio graphics${p?"":" (none yet for this team)"}.`,
 noSquad:"No squad list published for this team yet.",showPath:"Show path in bracket",copyLink:"Copy link",copied:"Link copied",close:"Close",jersey:"Jersey",numTbc:"Number TBC",capTag:"Captain",favOn:"Following",favOff:"Follow",
 brHint:"Tap a team for crew and history. Swipe for later rounds.",h23:"Gold Cup 2023",champ23:"Gran Canaria · champion",hl:"highlighted",tap26:"Tap a team for its Rio 2026 page.",off23:"Official 2023 results ↗",
 myTeams:"My teams",myHint:"Tap ☆ on a team page to follow it.",
 foot:"Scoring: 4-3-2-1 points per race, double points in the last race of each group (8-6-4-2). Top two of each group advance. Results refresh automatically from the official SSL results page. Ranking = SSL Nations Ranking at the start of the Final Series.",
 notes:{ocs:"* OCS (early start)  ** Standard penalty"},theme:{auto:"🌊 Matchboard",light:"☀️ Day",dark:"🌙 Night"},
 g23:{champ:"Champion (Gold)",second:"Runner-up (Silver)",third:"3rd (Bronze)",fourth:"4th – Grand Final",sf:"Semi-finals",qf:"Quarter-finals",r8:"1/8 Finals",r16:"1/16 Finals",r32:"1/32 Finals",none:"Didn't race the 2023 Final Series"},
 ev:{asia:"Asian Qualifiers",afoc:"African & Oceanian Qualifiers",eu1:"European Qualifiers 1",eu2:"European Qualifiers 2",pan:"Pan-American Qualifiers"},
 route:{won:(e,g)=>`Won the ${e}, Group ${g}`,pos:(p,e,g)=>`${p} in the ${e}, Group ${g}`,lc:(e,g)=>`3rd in the ${e} Group ${g}, then won the Last Chance race`,ranking:"Qualified through the SSL Nations Ranking",host:"Host nation, seeded into the 1/8 Finals",seeded:r=>`Seeded into the ${r} via the SSL Nations Ranking`},
 roles:{Helm:"Steers the boat",Tactician:"Strategy & calls","Main Trimmer":"Mainsail",Trimmer:"Jib & gennaker",Grinder:"Powers the winches",Pit:"Halyards & controls","Mid-Bow":"Mast & foredeck",Bow:"Bow & starts",Floater:"Utility / reserve"}},
de:{rounds:"Runden",bracket:"Matchboard",teams:"Teams",official:"Offizielle Ergebnisse",updated:"Stand",ago:m=>m<1?"gerade eben":m<60?`vor ${m} Min.`:`vor ${Math.round(m/60)} Std.`,rio:"Rio-Zeit",offline:"Offline-Stand",
 rn:{r32:"1/32-Finale",r16:"1/16-Finale",r8:"Achtelfinale",r4:"Viertelfinale",sf:"Halbfinale",pf:"Kleines Finale",f:"Grand Final"},
 group:"Gruppe",decided:"entschieden",racing:"läuft",open:"offen",st:{done:"abgeschlossen",live:"läuft",up:"steht an"},races:n=>`${n} Rennen pro Gruppe`,
 upNext:"Als Nächstes",startsIn:d=>d<=0?"beginnt heute":d==1?"beginnt morgen":`beginnt in ${d} Tagen`,groupsOf4:n=>`${n} Gruppe${n>1?"n":""} à 4 Teams`,oneRace:"Ein Rennen – die Zielreihenfolge entscheidet.",
 through:"weiter",out:"raus",toFinal:"ins Finale",toPetit:"ins kl. Finale",medals:["Gold","Silber","Bronze","4. Platz"],pts:"Pkt",
 outIn:(r,g,p)=>`Ausgeschieden im ${r} (Gruppe ${g}, Platz ${p})`,gf:m=>`Grand Final: ${m}`,finished:p=>`Endplatz ${p}`,thrTbc:"Weiter – nächste Gruppe noch offen",
 seeded:(r,g,d)=>`Gesetzt – steigt im ${r} ein, Gruppe ${g}, ${d}`,racingNow:"Läuft gerade",
 nations:n=>`${n} Nationen`,stillIn:"noch dabei",outN:"raus",search:"Land, Spitzname oder Segler suchen",all:"Alle",chipIn:"Noch dabei",chipOut:"Raus",mine:"★ Meine Teams",sStatus:"Status",sRank:"Ranking",sAz:"A–Z",noTeam:"Kein Team gefunden.",rank:"Rang",
 captain:"Kapitän",helm:"Steuer",ranking:"SSL Nations Ranking",rankBoard:"Zum Ranking ↗",entered:"Einstieg in Rio",showRound:"Runde zeigen ›",gc23:"Gold Cup 2023",br23:"Bracket 2023 ›",status:"Status",stIn:"Noch dabei",stOut:"Ausgeschieden",whereEnded:"Wo es endete ›",curGroup:"Aktuelle Gruppe ›",
 background:"Hintergrund",road:"Weg nach Rio",story:"Story",site:"Teamseite",qualRes:"Quali-Ergebnisse ↗",sslRank:"SSL Nations Ranking ↗",resRio:"Ergebnisse in Rio",photos:"Crew-Fotos",byPos:"Crew nach Position",leader:"Teamchef",wider:"Weiterer Kader · Position offen",
 squadNote:(n,p)=>`${n} Namen im Kader. Pro Rennen segeln 8–10 an Bord, die Aufstellung kann täglich wechseln. Positionen und Nummern laut offizieller Teamseite; Porträts aus den Gold-Cup-Rio-Grafiken${p?"":" (für dieses Team noch keine)"}.`,
 noSquad:"Für dieses Team liegt noch kein Kader vor.",showPath:"Weg im Bracket zeigen",copyLink:"Link kopieren",copied:"Link kopiert",close:"Schließen",jersey:"Trikot",numTbc:"Nummer offen",capTag:"Kapitän",favOn:"Folge ich",favOff:"Folgen",
 brHint:"Team antippen für Crew und Historie. Wischen für spätere Runden.",h23:"Gold Cup 2023",champ23:"Gran Canaria · Sieger",hl:"markiert",tap26:"Team antippen für die Rio-2026-Seite.",off23:"Offizielle Ergebnisse 2023 ↗",
 myTeams:"Meine Teams",myHint:"Auf einer Teamseite ☆ antippen, um dem Team zu folgen.",
 foot:"Wertung: 4-3-2-1 Punkte pro Rennen, im letzten Gruppenrennen doppelt (8-6-4-2). Die ersten zwei jeder Gruppe kommen weiter. Ergebnisse werden automatisch von der offiziellen SSL-Ergebnisseite übernommen. Ranking = SSL Nations Ranking zu Beginn der Final Series.",
 notes:{ocs:"* OCS (Frühstart)  ** Standardstrafe"},theme:{auto:"🌊 Matchboard",light:"☀️ Tag",dark:"🌙 Nacht"},
 g23:{champ:"Weltmeister (Gold)",second:"Vizemeister (Silber)",third:"3. Platz (Bronze)",fourth:"4. – Grand Final",sf:"Halbfinale",qf:"Viertelfinale",r8:"Achtelfinale",r16:"1/16-Finale",r32:"1/32-Finale",none:"2023 nicht in der Final Series"},
 ev:{asia:"Asien-Quali",afoc:"Afrika-&-Ozeanien-Quali",eu1:"Europa-Quali 1",eu2:"Europa-Quali 2",pan:"Panamerika-Quali"},
 route:{won:(e,g)=>`Sieger ${e}, Gruppe ${g}`,pos:(p,e,g)=>`${p} Platz ${e}, Gruppe ${g}`,lc:(e,g)=>`3. in ${e} Gruppe ${g}, dann Sieg im Last-Chance-Rennen`,ranking:"Über das SSL Nations Ranking qualifiziert",host:"Gastgeber, fürs Achtelfinale gesetzt",seeded:r=>`Über das SSL Nations Ranking fürs ${r} gesetzt`},
 roles:{Helm:"Steuert das Boot",Tactician:"Strategie & Ansagen","Main Trimmer":"Großsegel",Trimmer:"Fock & Gennaker",Grinder:"Kurbelt die Winschen",Pit:"Fallen & Strecker","Mid-Bow":"Mast & Vorschiff",Bow:"Vorschiff & Start",Floater:"Allrounder / Ersatz"}},
fr:{rounds:"Tours",bracket:"Matchboard",teams:"Équipes",official:"Résultats officiels",updated:"Mis à jour",ago:m=>m<1?"à l'instant":m<60?`il y a ${m} min`:`il y a ${Math.round(m/60)} h`,rio:"heure de Rio",offline:"copie hors ligne",
 rn:{r32:"1/32 de finale",r16:"1/16 de finale",r8:"1/8 de finale",r4:"Quarts de finale",sf:"Demi-finales",pf:"Petite finale",f:"Grande finale"},
 group:"Groupe",decided:"terminé",racing:"en course",open:"à venir",st:{done:"terminé",live:"en cours",up:"à venir"},races:n=>`${n} course${n>1?"s":""} par groupe`,
 upNext:"Prochain tour",startsIn:d=>d<=0?"commence aujourd'hui":d==1?"commence demain":`commence dans ${d} jours`,groupsOf4:n=>`${n} groupe${n>1?"s":""} de quatre`,oneRace:"Une course – l'ordre d'arrivée décide.",
 through:"qualifié",out:"éliminé",toFinal:"en finale",toPetit:"en petite finale",medals:["Or","Argent","Bronze","4e"],pts:"Pts",
 outIn:(r,g,p)=>`Éliminé en ${r} (groupe ${g}, ${p})`,gf:m=>`Grande finale : ${m}`,finished:p=>`Classé ${p}`,thrTbc:"Qualifié – prochain groupe à confirmer",
 seeded:(r,g,d)=>`Tête de série – entre en ${r}, groupe ${g}, ${d}`,racingNow:"En course",
 nations:n=>`${n} nations`,stillIn:"en lice",outN:"éliminées",search:"Pays, surnom ou marin",all:"Toutes",chipIn:"En lice",chipOut:"Éliminées",mine:"★ Mes équipes",sStatus:"Statut",sRank:"Classement",sAz:"A–Z",noTeam:"Aucune équipe trouvée.",rank:"Rang",
 captain:"Capitaine",helm:"Barreur",ranking:"Classement SSL des nations",rankBoard:"Voir le classement ↗",entered:"Entrée à Rio",showRound:"Voir ce tour ›",gc23:"Gold Cup 2023",br23:"Tableau 2023 ›",status:"Statut",stIn:"En lice",stOut:"Éliminée",whereEnded:"Où elle s'est arrêtée ›",curGroup:"Groupe actuel ›",
 background:"Contexte",road:"Route vers Rio",story:"À retenir",site:"Site de l'équipe",qualRes:"Résultats des qualifs ↗",sslRank:"Classement SSL ↗",resRio:"Résultats à Rio",photos:"Photos de l'équipage",byPos:"Équipage par poste",leader:"Chef d'équipe",wider:"Groupe élargi · poste à confirmer",
 squadNote:(n,p)=>`${n} noms dans l'effectif. 8 à 10 naviguent à chaque course et la composition peut changer chaque jour. Postes et numéros selon le site officiel de l'équipe ; portraits issus des graphismes Gold Cup Rio${p?"":" (pas encore pour cette équipe)"}.`,
 noSquad:"Aucun effectif publié pour cette équipe.",showPath:"Voir le parcours dans le tableau",copyLink:"Copier le lien",copied:"Lien copié",close:"Fermer",jersey:"Maillot",numTbc:"Numéro à confirmer",capTag:"Capitaine",favOn:"Suivie",favOff:"Suivre",
 brHint:"Touchez une équipe pour l'équipage et l'historique. Balayez pour les tours suivants.",h23:"Gold Cup 2023",champ23:"Grande Canarie · vainqueur",hl:"en surbrillance",tap26:"Touchez une équipe pour sa page Rio 2026.",off23:"Résultats officiels 2023 ↗",
 myTeams:"Mes équipes",myHint:"Touchez ☆ sur la page d'une équipe pour la suivre.",
 foot:"Barème : 4-3-2-1 points par course, points doublés à la dernière course de chaque groupe (8-6-4-2). Les deux premiers de chaque groupe se qualifient. Résultats mis à jour automatiquement depuis la page officielle de la SSL. Classement = classement SSL des nations au début de la phase finale.",
 notes:{ocs:"* OCS (départ anticipé)  ** Pénalité standard"},theme:{auto:"🌊 Matchboard",light:"☀️ Jour",dark:"🌙 Nuit"},
 g23:{champ:"Champion (Or)",second:"Finaliste (Argent)",third:"3e (Bronze)",fourth:"4e – Grande finale",sf:"Demi-finales",qf:"Quarts de finale",r8:"1/8 de finale",r16:"1/16 de finale",r32:"1/32 de finale",none:"Absente de la phase finale 2023"},
 ev:{asia:"qualifications Asie",afoc:"qualifications Afrique & Océanie",eu1:"qualifications Europe 1",eu2:"qualifications Europe 2",pan:"qualifications panaméricaines"},
 route:{won:(e,g)=>`Vainqueur des ${e}, groupe ${g}`,pos:(p,e,g)=>`${p} des ${e}, groupe ${g}`,lc:(e,g)=>`3e des ${e} (groupe ${g}), puis vainqueur de la course de la dernière chance`,ranking:"Qualifiée via le classement SSL des nations",host:"Pays hôte, qualifié directement pour les 1/8",seeded:r=>`Tête de série en ${r} via le classement SSL des nations`},
 roles:{Helm:"Barre le bateau",Tactician:"Stratégie & annonces","Main Trimmer":"Grand-voile",Trimmer:"Foc & gennaker",Grinder:"Moulins à café",Pit:"Drisses & réglages","Mid-Bow":"Mât & avant",Bow:"Étrave & départs",Floater:"Polyvalent / remplaçant"}},
es:{rounds:"Rondas",bracket:"Matchboard",teams:"Equipos",official:"Resultados oficiales",updated:"Actualizado",ago:m=>m<1?"ahora mismo":m<60?`hace ${m} min`:`hace ${Math.round(m/60)} h`,rio:"hora de Río",offline:"copia sin conexión",
 rn:{r32:"1/32 de final",r16:"1/16 de final",r8:"Octavos de final",r4:"Cuartos de final",sf:"Semifinales",pf:"Final de consolación",f:"Gran final"},
 group:"Grupo",decided:"decidido",racing:"en regata",open:"abierto",st:{done:"terminada",live:"en curso",up:"próxima"},races:n=>`${n} regata${n>1?"s":""} por grupo`,
 upNext:"Siguiente",startsIn:d=>d<=0?"empieza hoy":d==1?"empieza mañana":`empieza en ${d} días`,groupsOf4:n=>`${n} grupo${n>1?"s":""} de cuatro`,oneRace:"Una regata: decide el orden de llegada.",
 through:"pasa",out:"fuera",toFinal:"a la final",toPetit:"a consolación",medals:["Oro","Plata","Bronce","4.º"],pts:"Pts",
 outIn:(r,g,p)=>`Eliminado en ${r} (Grupo ${g}, ${p})`,gf:m=>`Gran final: ${m}`,finished:p=>`Terminó ${p}`,thrTbc:"Clasificado – siguiente grupo por confirmar",
 seeded:(r,g,d)=>`Cabeza de serie – entra en ${r}, Grupo ${g}, ${d}`,racingNow:"En regata",
 nations:n=>`${n} naciones`,stillIn:"siguen",outN:"fuera",search:"Buscar país, apodo o regatista",all:"Todos",chipIn:"Siguen",chipOut:"Fuera",mine:"★ Mis equipos",sStatus:"Estado",sRank:"Ranking",sAz:"A–Z",noTeam:"No se encontró ningún equipo.",rank:"Puesto",
 captain:"Capitán",helm:"Timonel",ranking:"Ranking SSL de naciones",rankBoard:"Ver ranking ↗",entered:"Entrada en Río",showRound:"Ver esa ronda ›",gc23:"Gold Cup 2023",br23:"Cuadro 2023 ›",status:"Estado",stIn:"Sigue",stOut:"Eliminado",whereEnded:"Dónde terminó ›",curGroup:"Grupo actual ›",
 background:"Contexto",road:"Camino a Río",story:"Historia",site:"Web del equipo",qualRes:"Resultados de clasificación ↗",sslRank:"Ranking SSL de naciones ↗",resRio:"Resultados en Río",photos:"Fotos de la tripulación",byPos:"Tripulación por puesto",leader:"Líder del equipo",wider:"Resto del equipo · puesto por confirmar",
 squadNote:(n,p)=>`${n} nombres en el equipo. Navegan 8–10 en cada regata y la alineación puede cambiar cada día. Puestos y números según la web oficial del equipo; retratos de los gráficos de la Gold Cup Río${p?"":" (aún no hay para este equipo)"}.`,
 noSquad:"Este equipo aún no ha publicado su lista.",showPath:"Ver recorrido en el cuadro",copyLink:"Copiar enlace",copied:"Enlace copiado",close:"Cerrar",jersey:"Dorsal",numTbc:"Número por confirmar",capTag:"Capitán",favOn:"Siguiendo",favOff:"Seguir",
 brHint:"Toca un equipo para ver tripulación e historia. Desliza para ver más rondas.",h23:"Gold Cup 2023",champ23:"Gran Canaria · campeón",hl:"resaltado",tap26:"Toca un equipo para su página de Río 2026.",off23:"Resultados oficiales 2023 ↗",
 myTeams:"Mis equipos",myHint:"Toca ☆ en la página de un equipo para seguirlo.",
 foot:"Puntuación: 4-3-2-1 puntos por regata, puntos dobles en la última regata de cada grupo (8-6-4-2). Pasan los dos primeros de cada grupo. Los resultados se actualizan automáticamente desde la web oficial de la SSL. Ranking = Ranking SSL de naciones al inicio de la fase final.",
 notes:{ocs:"* OCS (salida anticipada)  ** Penalización estándar"},theme:{auto:"🌊 Matchboard",light:"☀️ Día",dark:"🌙 Noche"},
 g23:{champ:"Campeón (Oro)",second:"Subcampeón (Plata)",third:"3.º (Bronce)",fourth:"4.º – Gran final",sf:"Semifinales",qf:"Cuartos de final",r8:"Octavos de final",r16:"1/16 de final",r32:"1/32 de final",none:"No disputó la fase final 2023"},
 ev:{asia:"clasificación asiática",afoc:"clasificación de África y Oceanía",eu1:"clasificación europea 1",eu2:"clasificación europea 2",pan:"clasificación panamericana"},
 route:{won:(e,g)=>`Ganó la ${e}, Grupo ${g}`,pos:(p,e,g)=>`${p} en la ${e}, Grupo ${g}`,lc:(e,g)=>`3.º en la ${e} (Grupo ${g}) y luego ganó la regata de última oportunidad`,ranking:"Clasificado por el Ranking SSL de naciones",host:"Anfitrión, directo a octavos",seeded:r=>`Cabeza de serie en ${r} por el Ranking SSL de naciones`},
 roles:{Helm:"Lleva el timón",Tactician:"Estrategia y decisiones","Main Trimmer":"Mayor",Trimmer:"Foque y gennaker",Grinder:"Mueve los winches",Pit:"Drizas y controles","Mid-Bow":"Mástil y proa",Bow:"Proa y salidas",Floater:"Comodín / reserva"}}};
const SX={
en:{back:"‹ Team",position:"Position",team:"Team",indRank:"SSL ranking",highlights:"Highlights",profile:"SSL profile ↗",findProfile:"Find SSL profile ↗",ws:"World Sailing ↗",mates:"Teammates",posTbc:"Position TBC",noInfo:"No further details published yet – the links below search the official profiles."},
de:{back:"‹ Team",position:"Position",team:"Team",indRank:"SSL-Ranking",highlights:"Erfolge",profile:"SSL-Profil ↗",findProfile:"SSL-Profil suchen ↗",ws:"World Sailing ↗",mates:"Teamkollegen",posTbc:"Position offen",noInfo:"Noch keine weiteren Infos veröffentlicht – die Links unten suchen die offiziellen Profile."},
fr:{back:"‹ Équipe",position:"Poste",team:"Équipe",indRank:"Classement SSL",highlights:"Palmarès",profile:"Profil SSL ↗",findProfile:"Chercher le profil SSL ↗",ws:"World Sailing ↗",mates:"Coéquipiers",posTbc:"Poste à confirmer",noInfo:"Pas encore d'autres infos publiées – les liens ci-dessous cherchent les profils officiels."},
es:{back:"‹ Equipo",position:"Puesto",team:"Equipo",indRank:"Ranking SSL",highlights:"Logros",profile:"Perfil SSL ↗",findProfile:"Buscar perfil SSL ↗",ws:"World Sailing ↗",mates:"Compañeros",posTbc:"Puesto por confirmar",noInfo:"Aún no hay más datos publicados: los enlaces de abajo buscan los perfiles oficiales."}};
const SY={
en:{today:"Today",raceDay:(n,t)=>`race day ${n} of ${t}`,finalDay:"Final day – last race counts double",stream:"▶ Live stream",tracking:"Tracking",schedule:"Schedule",adv:(a,b)=>`1st → ${a} · 2nd → ${b}`,advSf:"1st–2nd → Final · 3rd–4th → Petit Final",clinched:"✓ through",elim:"out",secNow:"In the current round",secSeeded:r=>`Seeded – enter in the ${r}`,secOut:"Out",lineup:"Line-up",
 howT:"How the Gold Cup works",how:["National teams, one SSL47 boat each – all boats identical and provided by the organisers.","Groups of four. 4-3-2-1 points per race; the last race of each group counts double (8-6-4-2).","The top two of every group advance; better-ranked nations enter later rounds.","Semi-finals and finals are a single race each; the Grand Final decides the world champion."]},
de:{today:"Heute",raceDay:(n,t)=>`Renntag ${n} von ${t}`,finalDay:"Letzter Tag – das letzte Rennen zählt doppelt",stream:"▶ Livestream",tracking:"Tracking",schedule:"Zeitplan",adv:(a,b)=>`1. → ${a} · 2. → ${b}`,advSf:"1.–2. → Finale · 3.–4. → Kleines Finale",clinched:"✓ sicher weiter",elim:"raus",secNow:"In der aktuellen Runde",secSeeded:r=>`Gesetzt – Einstieg im ${r}`,secOut:"Ausgeschieden",lineup:"Aufstellung",
 howT:"So funktioniert der Gold Cup",how:["Nationalteams, je ein SSL47 – alle Boote baugleich und vom Veranstalter gestellt.","Vierergruppen. 4-3-2-1 Punkte pro Rennen; das letzte Gruppenrennen zählt doppelt (8-6-4-2).","Die ersten zwei jeder Gruppe kommen weiter; besser platzierte Nationen steigen später ein.","Halbfinale und Finale sind je ein Rennen; das Grand Final entscheidet über den Weltmeister."]},
fr:{today:"Aujourd'hui",raceDay:(n,t)=>`jour de course ${n} sur ${t}`,finalDay:"Dernier jour – la dernière course compte double",stream:"▶ Direct",tracking:"Suivi",schedule:"Programme",adv:(a,b)=>`1er → ${a} · 2e → ${b}`,advSf:"1er–2e → Finale · 3e–4e → Petite finale",clinched:"✓ qualifié",elim:"éliminé",secNow:"Dans le tour en cours",secSeeded:r=>`Tête de série – entre en ${r}`,secOut:"Éliminées",lineup:"Équipage",
 howT:"Comment fonctionne la Gold Cup",how:["Équipes nationales sur SSL47 – bateaux identiques fournis par l'organisation.","Groupes de quatre. 4-3-2-1 points par course ; la dernière course du groupe compte double (8-6-4-2).","Les deux premiers de chaque groupe se qualifient ; les nations mieux classées entrent plus tard.","Demi-finales et finales en une seule course ; la Grande finale désigne le champion du monde."]},
es:{today:"Hoy",raceDay:(n,t)=>`día de regata ${n} de ${t}`,finalDay:"Último día: la última regata cuenta doble",stream:"▶ En directo",tracking:"Tracking",schedule:"Calendario",adv:(a,b)=>`1.º → ${a} · 2.º → ${b}`,advSf:"1.º–2.º → Final · 3.º–4.º → Consolación",clinched:"✓ clasificado",elim:"fuera",secNow:"En la ronda actual",secSeeded:r=>`Cabeza de serie – entra en ${r}`,secOut:"Eliminados",lineup:"Tripulación",
 howT:"Cómo funciona la Gold Cup",how:["Equipos nacionales en SSL47: barcos idénticos que pone la organización.","Grupos de cuatro. 4-3-2-1 puntos por regata; la última regata del grupo cuenta doble (8-6-4-2).","Pasan los dos primeros de cada grupo; las naciones mejor clasificadas entran más tarde.","Semifinales y finales son a una regata; la Gran final decide el campeón del mundo."]}};
for(const l in SX)Object.assign(S[l],SX[l],SY[l]);
const SV={
en:{race:"Race",nextRace:"Next race",todayRaces:"Today's races",rioT:"Rio time",loc:"your time",onWater:"on the water",done:"done",inX:m=>m<60?`in ${m} min`:`in ${Math.floor(m/60)} h ${String(m%60).padStart(2,"0")}`,firstStart:"First start",schedT:"Race schedule",schedNote:"Times are Rio de Janeiro time (UTC−3), from the official schedule. Its groups G1–G4 are shown here as groups A–D.",
 needT:"Before the final race (double points)",need:{sure:"through, whatever happens",gone:"out, whatever happens",win:"a win is enough",top:k=>`${k} or better is enough`,mustWin:"must win",help:"and needs help from the others",maybe:k=>`${k} may be enough – depends on the others`,iff:(k,c)=>`${k} is enough if ${c}`,mustIf:c=>`must win, and only if ${c}`,ahead:R=>`ahead of ${R}`,behind:R=>`behind ${R}`,notWin:R=>`${R} doesn't win`,last:R=>`${R} finishes last`,wins:R=>`${R} wins`,tie:"level on points possible – tie-break decides"},needNote:"Worked out from the current points; ≈ means teams could finish level, then the official tie-break decides.",offline:"offline – last saved data",install:"Add to Home Screen for the app icon."},
de:{race:"Rennen",nextRace:"Nächstes Rennen",todayRaces:"Rennen heute",rioT:"Rio-Zeit",loc:"deine Zeit",onWater:"auf dem Wasser",done:"fertig",inX:m=>m<60?`in ${m} Min.`:`in ${Math.floor(m/60)} Std. ${String(m%60).padStart(2,"0")}`,firstStart:"Erster Start",schedT:"Zeitplan der Runde",schedNote:"Zeiten in Rio-Zeit (UTC−3), laut offiziellem Zeitplan. Dessen Gruppen G1–G4 stehen hier als Gruppen A–D.",
 needT:"Vor dem letzten Rennen (doppelte Punkte)",need:{sure:"sicher weiter, egal was passiert",gone:"raus, egal was passiert",win:"ein Sieg reicht",top:k=>`Platz ${String(k).replace(/\.$/,"")} oder besser reicht`,mustWin:"muss gewinnen",help:"und braucht Hilfe der anderen",maybe:k=>`Platz ${String(k).replace(/\.$/,"")} kann reichen – hängt von den anderen ab`,iff:(k,c)=>`Platz ${String(k).replace(/\.$/,"")} reicht, wenn ${c}`,mustIf:c=>`muss gewinnen, und nur wenn ${c}`,ahead:R=>`vor ${R}`,behind:R=>`hinter ${R}`,notWin:R=>`${R} nicht gewinnt`,last:R=>`${R} Letzter wird`,wins:R=>`${R} gewinnt`,tie:"Punktgleichheit möglich – dann entscheidet der Tie-Break"},needNote:"Berechnet aus dem aktuellen Punktestand; ≈ heißt, Teams können punktgleich enden, dann entscheidet der offizielle Tie-Break.",offline:"offline – zuletzt gespeicherte Daten",install:"Zum Home-Bildschirm hinzufügen für das App-Icon."},
fr:{race:"Course",nextRace:"Prochaine course",todayRaces:"Courses du jour",rioT:"heure de Rio",loc:"chez vous",onWater:"sur l'eau",done:"terminée",inX:m=>m<60?`dans ${m} min`:`dans ${Math.floor(m/60)} h ${String(m%60).padStart(2,"0")}`,firstStart:"Premier départ",schedT:"Programme du tour",schedNote:"Heures de Rio de Janeiro (UTC−3), d'après le programme officiel. Ses groupes G1–G4 sont ici les groupes A–D.",
 needT:"Avant la dernière course (points doubles)",need:{sure:"qualifiée quoi qu'il arrive",gone:"éliminée quoi qu'il arrive",win:"une victoire suffit",top:k=>`${k} place ou mieux suffit`,mustWin:"doit gagner",help:"et a besoin des autres",maybe:k=>`${k} place peut suffire – selon les autres`,iff:(k,c)=>`${k} place suffit si ${c}`,mustIf:c=>`doit gagner, et seulement si ${c}`,ahead:R=>`devant ${R}`,behind:R=>`derrière ${R}`,notWin:R=>`${R} ne gagne pas`,last:R=>`${R} finit dernier`,wins:R=>`${R} gagne`,tie:"égalité possible – le départage décide"},needNote:"Calculé à partir des points actuels ; ≈ signifie une égalité possible, départagée par la règle officielle.",offline:"hors ligne – dernières données",install:"Ajoutez à l'écran d'accueil pour l'icône."},
es:{race:"Regata",nextRace:"Próxima regata",todayRaces:"Regatas de hoy",rioT:"hora de Río",loc:"tu hora",onWater:"en el agua",done:"terminada",inX:m=>m<60?`en ${m} min`:`en ${Math.floor(m/60)} h ${String(m%60).padStart(2,"0")}`,firstStart:"Primera salida",schedT:"Calendario de la ronda",schedNote:"Horas de Río de Janeiro (UTC−3), según el calendario oficial. Sus grupos G1–G4 aparecen aquí como grupos A–D.",
 needT:"Antes de la última regata (puntos dobles)",need:{sure:"clasificado pase lo que pase",gone:"fuera pase lo que pase",win:"le basta ganar",top:k=>`${k} o mejor le basta`,mustWin:"tiene que ganar",help:"y necesita ayuda de los demás",maybe:k=>`${k} puede bastar – depende de los demás`,iff:(k,c)=>`${k} basta si ${c}`,mustIf:c=>`tiene que ganar, y solo si ${c}`,ahead:R=>`por delante de ${R}`,behind:R=>`por detrás de ${R}`,notWin:R=>`${R} no gana`,last:R=>`${R} queda último`,wins:R=>`${R} gana`,tie:"posible empate a puntos – decide el desempate"},needNote:"Calculado con los puntos actuales; ≈ significa posible empate, que resuelve el desempate oficial.",offline:"sin conexión – últimos datos guardados",install:"Añade a la pantalla de inicio para el icono."}};
for(const l in SV)Object.assign(S[l],SV[l]);
const SZ={"en":{"fsT":"Final Series","qsT":"Qualifying Series","qsLeg":"Highlighted: qualified through this series. ● = in Rio via the SSL Nations Ranking. Tap a team in Rio for its page.","qsNote":"The winner of each qualifying group (group C: top two) was drawn into the 1/32 Finals. 29 teams qualified for the Final Series via the SSL Ranking, with spots per continent: 12 Europe, 8 Pan-America, 6 Asia, 1 Africa, 2 Oceania.","reg":{"asia":"Asia","afoc":"Africa & Oceania","eur":"Europe","pam":"Pan-America"},"fin":"Final","petit":"Petit F.","swipe":"Swipe sideways for later rounds →","road2":"Road to Rio","inRio":"In Rio via SSL Ranking","mbHint":"Top two of each group advance. Tap a team for crew and history."},"de":{"fsT":"Final Series","qsT":"Qualifying Series","qsLeg":"Hervorgehoben: über diese Serie qualifiziert. ● = über das SSL Nations Ranking in Rio. Team in Rio antippen für die Teamseite.","qsNote":"Der Sieger jeder Qualifikationsgruppe (Gruppe C: die ersten zwei) wurde in die 1/32-Finale gelost. 29 Teams kamen über das SSL Ranking in die Final Series, mit Plätzen je Kontinent: 12 Europa, 8 Panamerika, 6 Asien, 1 Afrika, 2 Ozeanien.","reg":{"asia":"Asien","afoc":"Afrika & Ozeanien","eur":"Europa","pam":"Panamerika"},"fin":"Finale","petit":"Kl. Finale","swipe":"Seitlich wischen für spätere Runden →","road2":"Weg nach Rio","inRio":"Über das SSL Ranking in Rio","mbHint":"Die ersten zwei jeder Gruppe kommen weiter. Team antippen für Crew und Historie."},"fr":{"fsT":"Final Series","qsT":"Qualifying Series","qsLeg":"En surbrillance : qualifiée par cette série. ● = à Rio via le classement SSL des nations. Touchez une équipe présente à Rio pour sa page.","qsNote":"Le vainqueur de chaque groupe de qualification (groupe C : les deux premiers) a été tiré au sort dans les 1/32 de finale. 29 équipes se sont qualifiées pour les Final Series via le classement SSL, avec des places par continent : 12 Europe, 8 Amériques, 6 Asie, 1 Afrique, 2 Océanie.","reg":{"asia":"Asie","afoc":"Afrique & Océanie","eur":"Europe","pam":"Amériques"},"fin":"Finale","petit":"Petite F.","swipe":"Balayez pour les tours suivants →","road2":"Route vers Rio","inRio":"À Rio via le classement SSL","mbHint":"Les deux premiers de chaque groupe passent. Touchez une équipe pour l'équipage et l'historique."},"es":{"fsT":"Final Series","qsT":"Qualifying Series","qsLeg":"Resaltado: clasificado en esta serie. ● = en Río por el Ranking SSL de naciones. Toca un equipo presente en Río para ver su página.","qsNote":"El ganador de cada grupo de clasificación (grupo C: los dos primeros) fue sorteado en los 1/32 de final. 29 equipos se clasificaron para las Final Series por el Ranking SSL, con plazas por continente: 12 Europa, 8 Panamérica, 6 Asia, 1 África, 2 Oceanía.","reg":{"asia":"Asia","afoc":"África y Oceanía","eur":"Europa","pam":"Panamérica"},"fin":"Final","petit":"Consolación","swipe":"Desliza para ver más rondas →","road2":"Camino a Río","inRio":"En Río por el Ranking SSL","mbHint":"Pasan los dos primeros de cada grupo. Toca un equipo para ver tripulación e historia."}};for(const l in SZ)Object.assign(S[l],SZ[l]);
const T=k=>S[lang][k]??S.en[k];
const ord=n=>ORD[lang](n);

/* ---------- names & flags ---------- */
const X={SLO:["SI"],BUL:["BG"],AUT:["AT"],FIN:["FI"],CRO:["HR"],NOR:["NO"],BER:["BM"],PHI:["PH"],VIE:["VN"],UAE:["AE"],KAZ:["KZ"],MAR:["MA"],MOZ:["MZ"],BEL:["BE"],SRB:["RS"],TUR:["TR"],PUR:["PR"],VEN:["VE"],MEX:["MX"],ESA:["SV"]};
const FC={"de":["#000001","#e50000","#e5b700"],"ae":["#e50000","#00732f","#000001"],"za":["#c22c23","#007847","#00075e"],"ch":["#e50000","#8e0000"],"es":["#aa151b","#e3b401"],"vn":["#ca221a","#7d1510"],"pe":["#d50f22","#840915"],"au":["#e50000","#00008b"],"kz":["#00abc2","#006a78"],"hr":["#e50001","#171796"],"ph":["#cca418","#0037a8","#ce1025"],"rs":["#b43136","#a16244","#0b3f76"],"sv":["#0f46af","#092c6c"],"mz":["#e50000","#19a217","#e5b500"],"nz":["#891640","#00247d"],"uy":["#0037a8","#002268"],"si":["#0000bf","#d50000"],"ee":["#0078e5","#000001"],"th":["#a51831","#2c294a"],"at":["#c8102d","#7b091c"],"se":["#e5b700","#005193"],"co":["#e5d000","#00138e","#da000f"],"sc":["#003d88","#e0b205","#c61f20"],"ua":["#0056b8","#e5c100"],"hu":["#cf3315","#378d00"],"mm":["#e5b700","#38ad37","#d11424"],"us":["#1a2f5d","#94515e","#ad373e"],"ar":["#2a76ba","#1a4973"],"fi":["#002e6c","#001d42"],"om":["#d5130f","#039027"],"cu":["#cb1515","#00298f"],"nl":["#ae1c27","#20458b"],"ma":["#be262c","#76171b"],"mx":["#006846","#ce1025"],"ca":["#c9281c","#7c1911"],"ag":["#050001","#ddb407","#ce1025"],"pr":["#004ce5","#e50000"],"lt":["#e3a201","#006a43","#be262c"],"bg":["#00966e","#d32511"],"pl":["#d21339","#820b23"],"bm":["#c91431","#88665d","#ce142a"],"kr":["#b92c39","#080809","#084699"],"fr":["#000091","#e1000e"],"it":["#009246","#bd2732"],"pt":["#036600","#e50000"],"jp":["#bc002c","#74001b"],"cz":["#10447e","#d11319"],"ve":["#e5b700","#00247d","#ce142a"],"no":["#002564","#d31121"],"tr":["#db0916","#88060d"],"cl":["#0038a6","#c9281c"],"dk":["#c8102d","#7b091c"],"pf":["#d61e0f","#841309"],"ec":["#e5d000","#271c70","#da000d"],"my":["#000066","#cb6b19","#cc0000"],"sg":["#df0000","#8a0000"],"gr":["#0d5dae","#083a6c"],"be":["#000001","#e5c100","#da0b21"],"gb":["#484f84","#c8102d"],"br":["#219e45","#dfcd06","#324fa3"]};
const iso=c=>INFO[c]?INFO[c].iso:(X[c]||[])[0];
const FIX={GBR:{en:"Great Britain",de:"Großbritannien",fr:"Grande-Bretagne",es:"Gran Bretaña"},TAH:{en:"Tahiti",de:"Tahiti",fr:"Tahiti",es:"Tahití"},MYA:{en:"Myanmar",de:"Myanmar",fr:"Myanmar",es:"Myanmar"},USA:{en:"USA",de:"USA",fr:"États-Unis",es:"EE. UU."}};
let DN=null;const dn=()=>{try{if(!DN||DN.l!=lang){DN=new Intl.DisplayNames([lang],{type:"region"});DN.l=lang}}catch(e){DN=null}return DN};
function NM(c){if(FIX[c])return FIX[c][lang];const i=iso(c);try{if(i&&dn())return dn().of(i)}catch(e){}return INFO[c]?INFO[c].name:c}
function FL(c){const i=iso(c);return i?`<img class="flg" src="img/fl/${i.toLowerCase()}.webp" alt="" width="22" height="16">`:""}
function FG(c){const i=iso(c),a=i&&FC[i.toLowerCase()];return a?`--fg:linear-gradient(90deg,${a.join(",")})`:""}
const MO={en:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],de:["Jan.","Feb.","März","Apr.","Mai","Juni","Juli","Aug.","Sep.","Okt.","Nov.","Dez."],fr:["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."],es:["ene","feb","mar","abr","may","jun","jul","ago","sept","oct","nov","dic"]};
const fmtD=iso=>{const p=iso.split("-");return lang=="de"?`${+p[2]}. ${MO.de[p[1]-1]}`:`${+p[2]} ${MO[lang][p[1]-1]}`};
const range=r=>r.start===r.end?fmtD(r.start):(r.start.slice(5,7)==r.end.slice(5,7)?`${+r.start.slice(8)}${lang=="de"?".":""}–${fmtD(r.end)}`:`${fmtD(r.start)} – ${fmtD(r.end)}`);
const RNm=r=>T("rn")[r.id]||r.name;
const RS={r32:"1/32",r16:"1/16",r8:"1/8",r4:"1/4",sf:"1/2",pf:"Petit",f:"Final"};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today=()=>new Date().toLocaleDateString("sv-SE",{timeZone:"America/Sao_Paulo"});
const days=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);
const RL={R1:"1/32",R2:"1/16",EF:"1/8",QF:"1/4",SF:"1/2"};
const phRe=/^(R1|R2|EF|QF|SF)([A-D])(\d)$/,ph2=/^(1st|2nd)\s+1\/32\s+([A-D])$/i;
function ph(c){let m=c.match(phRe);if(m)return `${ord(+m[3])} ${RL[m[1]]} ${m[2]}`;m=c.match(ph2);if(m)return `${ord(m[1].toLowerCase()=="1st"?1:2)} 1/32 ${m[2]}`;return null}
const isTeam=c=>!ph(c);
const star=c=>favs.has(c)?`<span class="fav" aria-label="★">★</span>`:"";

/* ---------- state logic ---------- */
function gState(g,r){const filled=g.rows.every(x=>String(x.total??"").trim()!==""&&x.r.every(v=>String(v).trim()!==""));
  if(filled)return"done";const any=g.rows.some(x=>x.r.some(v=>String(v).trim()!==""));const td=today();
  return(any||(td>=r.start&&td<=r.end))?"live":"up"}
function rState(r){const s=r.groups.map(g=>gState(g,r));return s.every(x=>x=="done")?"done":s.some(x=>x=="live")?"live":"up"}
function outcome(rid,pos,done){if(!done)return null;
  if(["r32","r16","r8","r4"].includes(rid))return pos<=2?["w",T("through"),1]:["o",T("out"),0];
  if(rid=="sf")return pos<=2?["w",T("toFinal"),1]:["o",T("toPetit"),1];
  if(rid=="f")return[pos<=3?"w":"o",T("medals")[pos-1],1];
  if(rid=="pf")return["o",ord(pos+4),0];return null}
const NEXT={r32:"r16",r16:"r8",r8:"r4",r4:"sf"};
const ADV={r32:{A:["B","D"],B:["C","A"],C:["A","B"],D:["D","C"]},r16:{A:["C","A"],B:["A","B"],C:["D","C"],D:["B","D"]},r8:{A:["A","B"],B:["D","C"],C:["B","D"],D:["C","A"]},r4:{A:["A","B"],B:["B","A"],C:["A","B"],D:["B","A"]}};
function advText(r,g){if(r.id=="sf")return T("advSf");const a=ADV[r.id];if(!a||!a[g.id])return"";const n=RS[NEXT[r.id]];const[x,y]=a[g.id];return T("adv")(n+" "+x,n+" "+y)}
function liveCalc(g){const n=g.rows[0].r.length;const tot=g.rows.map(x=>parseFloat(x.total)||x.r.reduce((s,v)=>s+(parseFloat(v)||0),0));
  const mx=g.rows.map((x,k)=>tot[k]+x.r.reduce((s,v,i)=>s+(String(v).trim()===""?(i==n-1?8:4):0),0));
  return g.rows.map((x,k)=>{const above=tot.filter((t,j)=>j!=k&&t>mx[k]).length;const reach=mx.filter((m,j)=>j!=k&&m>=tot[k]).length;return above>=2?"elim":reach<2?"clinch":""})}
function raceDay(r){const t=days(r.start,r.end)+1,n=Math.min(t,Math.max(1,days(r.start,today())+1));return[n,t]}
const LINKS=()=>`<span class="lk"><a href="https://www.youtube.com/@Starsailors/streams" target="_blank" rel="noopener">${T("stream")}</a><a href="https://app.georacing.com/?application_id=46" target="_blank" rel="noopener">${T("tracking")}</a><a href="https://sslgoldcup.worldofsailors.com/schedule/" target="_blank" rel="noopener">${T("schedule")}</a></span>`;
function current(){const r=D.rounds.find(r=>rState(r)!="done");return(r||D.rounds[D.rounds.length-1]).id}
function teams(){const M={};
  D.rounds.forEach(r=>r.groups.forEach(g=>{const done=gState(g,r)=="done";g.rows.forEach((x,i)=>{if(!isTeam(x.team))return;
    const t=M[x.team]||(M[x.team]={code:x.team,path:[]});t.path.push({r,g,pos:i+1,done,o:outcome(r.id,i+1,done)})})}));
  return Object.values(M).map(t=>{const last=t.path[t.path.length-1],first=t.path[0],I=INFO[t.code]||{};let out=false,txt;
    if(last.o&&last.o[2]===0&&last.r.id!="pf"){out=true;txt=T("outIn")(RNm(last.r),last.g.id,ord(last.pos))}
    else if(last.r.id=="f"&&last.done)txt=T("gf")(last.o[1]);
    else if(last.r.id=="pf"&&last.done){out=true;txt=T("finished")(ord(last.pos+4))}
    else if(last.done)txt=T("thrTbc");
    else if(t.path.length==1&&rState(first.r)=="up"&&first.r.id!="r32")txt=T("seeded")(RNm(first.r),first.g.id,fmtD(first.r.start));
    else{const s=gState(last.g,last.r);txt=`${s=="live"?T("racingNow"):T("upNext")}: ${RNm(last.r)}, ${T("group")} ${last.g.id} · ${range(last.r)}`}
    return{...t,out,txt,I,name:NM(t.code),flag:FL(t.code),lvl:D.rounds.indexOf(last.r)}})}

/* ---------- people ---------- */
const ROLES=["Helm","Tactician","Main Trimmer","Trimmer","Grinder","Pit","Mid-Bow","Bow","Floater"];
function role(p){const s=String(p||"").toLowerCase(),cap=/capt|kapit|capit/.test(s),r=s.replace(/capt\w*|kapit\w*|capit\w*/g,"");let k=null;
  if(/main/.test(r))k="Main Trimmer";else if(/helm/.test(r))k="Helm";else if(/tact|strateg/.test(r))k="Tactician";else if(/grind/.test(r))k="Grinder";
  else if(/mid/.test(r))k="Mid-Bow";else if(/bow/.test(r))k="Bow";else if(/pit/.test(r))k="Pit";else if(/trim/.test(r))k="Trimmer";else if(/float|reserv|spare/.test(r))k="Floater";
  return{cap,k}}
const tc=n=>String(n).split(" ").map(w=>w.length>1&&w==w.toUpperCase()&&/[A-ZÀ-Þ]/.test(w)?w[0]+w.slice(1).toLowerCase():w).join(" ");
const ini=n=>{const w=tc(n).replace(/["“”].*?["“”]/g,"").split(/[\s-]+/).filter(Boolean);return w.length?(w[0][0]+(w.length>1?w[w.length-1][0]:"")).toUpperCase():"?"};
const STOP=new Set(["mohd","muhamad","muhammad","mohamed","mohamad","bin","binti","de","la","del","da","dos","al","nur","abdul","van","von","the"]);
const tok=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z ]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOP.has(w));
const SQ={};
function squad(code){if(SQ[code])return SQ[code];const t=RO[code],I=INFO[code]||{},crew=(I.crew||[]).map(c=>({...c,t:tok(c.name),used:false}));
  const out=[],seen={};const C=code;
  if(t)t.s.forEach(([nm,pos,no])=>{const k=tc(nm).toLowerCase(),r=role(pos),o={name:tc(nm),no:String(no),cap:r.cap,k:r.k};
    if(seen[k]){if(!seen[k].k&&o.k)Object.assign(seen[k],o);return}seen[k]=o;out.push(o)});
  const capn=tc(t?t.c:(I.captain||"")).toLowerCase();out.forEach(p=>{if(p.name.toLowerCase()==capn)p.cap=true});
  out.forEach(p=>{const pt=tok(p.name);let best=null,bs=0;
    crew.forEach(c=>{if(c.used)return;let s=c.t.filter(w=>pt.includes(w)).length*2;if(s&&String(c.no)==p.no)s+=1;if(s>bs){bs=s;best=c}});
    if(best){best.used=true;p.img=best.img;if(!/^\d+$/.test(p.no))p.no=String(best.no)}});
  crew.filter(c=>!c.used).forEach(c=>out.push({name:c.name,no:String(c.no),img:c.img,cap:false,k:null,extra:true}));
  out.forEach((p,i)=>{p.i=i;p.code=C});
  return SQ[code]={n:(t&&t.n)||I.nick||"",c:t?tc(t.c):(I.captain||""),ppl:out}}
const av=(p,small)=>`<span class="av${small?" s":""}${p.img?" ph":""}">${p.img?`<img src="${esc(p.img)}" alt="" loading="lazy">`:esc(ini(p.name))}${/^\d+$/.test(p.no)?`<i>${esc(p.no)}</i>`:""}</span>`;
const pinfo=(code,p)=>{const tk=tok(p.name);return PEOPLE.find(e=>e.t==code&&tk.includes(e.m))};
const person=p=>`<div class="pp" role="button" tabindex="0" data-pi="${p.i}">${av(p)}<span class="nm">${esc(p.name)}${p.cap?`<span class="ctag">${T("capTag")}</span>`:""}<small>${/^\d+$/.test(p.no)?T("jersey")+" "+esc(p.no):T("numTbc")}${p.code&&pinfo(p.code,p)&&pinfo(p.code,p).rank?" · SSL #"+pinfo(p.code,p).rank:""}</small></span></div>`;
function capPhoto(code){const sq=squad(code);const p=sq.ppl.find(x=>x.cap&&x.img)||sq.ppl.find(x=>x.no=="10"&&x.img)||sq.ppl.find(x=>x.img);return p&&p.img}
function routeText(code,T0){const R=(INFO[code]||{}).route,r=T("route"),e=R&&R.ev?T("ev")[R.ev]:"";
  if(!R)return T0?r.seeded(RNm(T0.path[0].r)):"–";
  if(R.k=="won")return r.won(e,R.g);if(R.k=="pos")return r.pos(ord(R.p),e,R.g);if(R.k=="lc")return r.lc(e,R.g);return r[R.k]}

/* ---------- schedule (official, Rio time UTC-3) ---------- */
const ROT=[["A","B","C","D"],["D","A","B","C"],["C","D","A","B"],["B","C","D","A"]];
const T4=["12:00","13:10","14:30","16:00"],T32=[["12:00","13:20","14:40","16:00"],["11:00","12:20","13:40","15:00"],["12:00","13:20","14:40","16:00"],["12:00","13:20","14:40","16:00"]];
const SDAYS={r32:["2026-11-19","2026-11-20","2026-11-21","2026-11-22"],r16:["2026-11-26","2026-11-27","2026-11-28","2026-11-29"],r8:["2026-12-02","2026-12-03","2026-12-04","2026-12-05"],r4:["2026-12-07","2026-12-08","2026-12-09","2026-12-10"]};
const SCH=[];
for(const rid in SDAYS)SDAYS[rid].forEach((d,i)=>ROT[i].forEach((g,j)=>SCH.push({rid,d,t:(rid=="r32"?T32[i]:T4)[j],g,n:i+1})));
SCH.push({rid:"sf",d:"2026-12-12",t:"12:00",g:"A",n:1},{rid:"sf",d:"2026-12-12",t:"13:10",g:"B",n:1},{rid:"pf",d:"2026-12-13",t:"12:00",g:"A",n:1},{rid:"f",d:"2026-12-13",t:"13:10",g:"A",n:1});
const at=x=>Date.parse(`${x.d}T${x.t}:00-03:00`);
const nowMs=()=>Date.now();
const myTZ=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch(e){return""}})();
const showLocal=(()=>{const d=new Date();try{return new Intl.DateTimeFormat("en",{timeZone:"America/Sao_Paulo",hour:"numeric"}).format(d)!==new Intl.DateTimeFormat("en",{hour:"numeric"}).format(d)}catch(e){return false}})();
const locT=x=>{try{return new Date(at(x)).toLocaleTimeString(lang,{hour:"2-digit",minute:"2-digit",hourCycle:"h23"})}catch(e){return""}};
const wday=d=>{try{return new Date(d+"T12:00:00-03:00").toLocaleDateString(lang,{weekday:"short",day:"numeric",month:"short",timeZone:"America/Sao_Paulo"})}catch(e){return fmtD(d)}};
const rnd=id=>D.rounds.find(r=>r.id==id);
function raceDone(x){const r=rnd(x.rid),g=r&&r.groups.find(y=>y.id==x.g);if(!g)return false;const i=x.n-1;return g.rows.every(z=>String(z.r[i]??"").trim()!=="")}
function rState2(x){if(raceDone(x))return"done";const t=at(x),n=nowMs();if(n>=t-5*60e3&&n<t+75*60e3)return"now";if(n>=t+75*60e3)return"past";return"up"}
function nextFor(rid,gid){return SCH.filter(x=>x.rid==rid&&x.g==gid&&!raceDone(x)&&rState2(x)!="past").sort((a,b)=>at(a)-at(b))[0]}
function raceLi(x,nx){const st=rState2(x),r=rnd(x.rid),g=r&&r.groups.find(y=>y.id==x.g);
  const fl=g?g.rows.filter(z=>isTeam(z.team)).map(z=>FL(z.team)).join(""):"";
  const lbl=x.rid=="f"?RNm(rnd("f")):x.rid=="pf"?RNm(rnd("pf")):`${T("group")} ${x.g}`;
  const s=st=="done"?`✓ ${T("done")}`:st=="now"?T("onWater"):x===nx&&at(x)-nowMs()<12*36e5?T("inX")(Math.max(1,Math.round((at(x)-nowMs())/6e4))):"";
  return `<li class="${st=="done"||st=="past"?"past":st=="now"?"now":x===nx?"nxt":""}"><span class="ti">${x.t}${showLocal?`<small>${esc(locT(x))}</small>`:""}</span><span class="gt"><b>${esc(lbl)}</b><i>${["sf","pf","f"].includes(x.rid)?esc(RS[x.rid]):T("race")+" "+x.n}</i><span class="fls">${fl}</span></span><span class="s">${esc(s)}</span></li>`}
function raceList(list){const nx=list.filter(x=>rState2(x)=="up").sort((a,b)=>at(a)-at(b))[0];return `<ul class="races">${list.sort((a,b)=>at(a)-at(b)).map(x=>raceLi(x,nx)).join("")}</ul>`}
function tzNote(){return `<small style="display:block;color:var(--mute);font-size:12px;margin-top:8px">${T("rioT")}${showLocal?` · ${T("loc")} (${esc(myTZ)})`:""}</small>`}
function schedFor(r){const L=SCH.filter(x=>x.rid==r.id||(r.id=="f"&&x.rid=="pf"));if(!L.length)return"";const days=[...new Set(L.map(x=>x.d))];
  return `<details class="sched g"><summary>${T("schedT")}</summary>${days.map(d=>`<div class="sday"><h5>${esc(wday(d))}</h5>${raceList(L.filter(x=>x.d==d))}</div>`).join("")}<p class="warn" style="padding:0 16px">${T("schedNote")} <a href="https://sslgoldcup.worldofsailors.com/schedule/" target="_blank" rel="noopener">↗</a></p></details>`}

/* ---------- what each team needs before the final race ---------- */
const PERMS=(()=>{const o=[];const f=(a,r)=>{if(!r.length)return o.push(a);r.forEach((x,i)=>f([...a,x],r.filter((_,j)=>j!=i)))};f([],[0,1,2,3]);return o})();
const num=v=>parseFloat(String(v).replace(/[^\d.\-]/g,""))||0;
function needs(r,g){if(!["r32","r16","r8","r4"].includes(r.id))return null;const n=g.rows[0].r.length;if(n<2||g.rows.length!=4||!g.rows.every(x=>isTeam(x.team)))return null;
  const left=g.rows[0].r.map((_,i)=>g.rows.every(x=>String(x.r[i]??"").trim()==="")).filter(Boolean).length;
  if(left!=1||String(g.rows[0].r[n-1]??"").trim()!=="")return null;
  const base=g.rows.map(x=>x.r.reduce((s,v)=>s+num(v),0)),P=[8,6,4,2];
  const res=PERMS.map(pm=>{const tot=base.slice();pm.forEach((ti,pos)=>tot[ti]+=P[pos]);const pos=[];pm.forEach((ti,p)=>pos[ti]=p);
    return{pos,st:tot.map((t,i)=>{const ab=tot.filter((u,j)=>j!=i&&u>t).length,eq=tot.filter((u,j)=>j!=i&&u==t).length;return ab>=2?"out":ab+eq<=1?"in":"tie"})}});
  const N=T("need"),codes=g.rows.map(x=>x.team);
  return codes.map((c,i)=>{const at4=[0,1,2,3].map(p=>res.filter(o=>o.pos[i]==p));
    const cls=L=>L.every(o=>o.st[i]=="in")?"in":L.every(o=>o.st[i]=="out")?"out":L.some(o=>o.st[i]=="in")?"mix":L.some(o=>o.st[i]=="tie")?"tie":"out";
    const C=at4.map(cls);let txt,tie=false;
    if(C.every(x=>x=="in"))txt=N.sure;else if(C[0]=="out")txt=N.gone;
    else{let k=0;while(k<4&&C[k]=="in")k++;
      const cond=p=>{const L=at4[p];for(let j=0;j<4;j++){if(j==i)continue;const R=codes[j];const tests=[[o=>o.pos[j]>p,N.ahead(R)],[o=>o.pos[j]!=0,N.notWin(R)],[o=>o.pos[j]==3,N.last(R)],[o=>o.pos[j]<p,N.behind(R)],[o=>o.pos[j]==0,N.wins(R)]];
          for(const[f,t]of tests)if(L.every(o=>(o.st[i]=="in")==f(o))&&L.some(f))return t}return null};
      const ok=p=>ORD[lang](p+1);
      if(k==0){const c0=C[0]=="mix"?cond(0):null;txt=c0?N.mustIf(c0):N.mustWin+" "+N.help;if(C[0]=="tie")tie=true}
      else{txt=k==1?N.win:N.top(ok(k-1));if(k<4&&(C[k]=="mix"||C[k]=="tie")){const ck=C[k]=="mix"?cond(k):null;txt+=" · "+(ck?N.iff(ok(k),ck):N.maybe(ok(k)));if(C[k]=="tie"||at4[k].some(o=>o.st[i]=="tie"))tie=true}}
      if(!tie)tie=at4.slice(0,k+1).some(L=>L.some(o=>o.st[i]=="tie"))}
    return{c,txt,tie}})}
function needBox(r,g){const L=needs(r,g);if(!L)return"";return `<div class="need"><h4>${T("needT")}</h4><ul>${L.map(x=>`<li><b>${FL(x.c)}${esc(x.c)}</b><span>${esc(x.txt)}${x.tie?" ≈":""}</span></li>`).join("")}</ul><small>${T("needNote")}</small></div>`}

/* ---------- views ---------- */
function ladder(){const L=$("#ladder");L.hidden=view!="board";if(L.hidden)return;
  L.innerHTML=D.rounds.map(r=>{const s=rState(r),cls=s=="done"?"done":s=="live"?"live":(r.id==current()?"nx":"");
    return `<button data-r="${r.id}" class="${r.id==round?"on":""}"><b>${esc(RS[r.id]||r.short)}</b><small><span class="dot ${cls}"></span>${esc(range(r))}</small></button>`}).join("");
  const on=L.querySelector(".on");if(on)on.scrollIntoView({block:"nearest",inline:"center"})}
function note(g){return g.note?(/OCS|Frühstart|early/i.test(g.note)?T("notes").ocs:g.note):""}
function gtable(r,g,clickable){const gs=gState(g,r);const lc=gs=="live"&&g.rows.some(x=>x.r.some(v=>String(v).trim()!==""))&&["r32","r16","r8","r4"].includes(r.id)?liveCalc(g):null;
  return `<table><thead><tr><th>#</th><th>Team</th>${g.rows[0].r.map((_,i)=>`<th class="r">R${i+1}</th>`).join("")}<th>${T("pts")}</th></tr></thead><tbody>${
  g.rows.map((x,i)=>{const o=outcome(r.id,i+1,gs=="done"),tm=isTeam(x.team);const c=[o?(o[0]=="w"?"q":(o[2]===0&&r.id!="pf"?"x":"")):"",sel==x.team?"sel":"",clickable&&tm?"team":""].join(" ");
    const nm=tm?`<span class="fl">${FL(x.team)}</span><span class="n">${esc(NM(x.team))}</span>${star(x.team)}`:`<span class="ph">${esc(ph(x.team))}</span>`;
    const lt=lc&&lc[i]?`<span class="tag ${lc[i]=="clinch"?"w":"o"}">${T(lc[i]=="clinch"?"clinched":"elim")}</span>`:"";
    return `<tr class="${c}${gs!="done"&&i==1&&g.rows.length>2&&r.id!="f"&&r.id!="pf"?" qline":""}${lc&&lc[i]=="elim"?" x":""}" data-t="${esc(x.team)}"><td class="p">${i+1}</td><td class="t">${nm}${o?(o[0]=="w"&&["r32","r16","r8","r4","sf"].includes(r.id)?`<span class="bdg" title="${esc(o[1])}">${esc(ord(i+1))}</span>`:`<span class="tag ${o[0]}">${esc(o[1])}</span>`):lt}${clickable&&tm?`<span class="chev">›</span>`:""}</td>${x.r.map(v=>`<td class="r">${esc(v)||"–"}</td>`).join("")}<td class="tot">${esc(x.total)||"–"}</td></tr>`}).join("")
  }</tbody></table>${note(g)?`<div class="note">${esc(note(g))}</div>`:""}${clickable&&advText(r,g)?`<div class="adv">${esc(advText(r,g))}</div>`:""}`}
function mine(){if(!favs.size)return"";const TT=teams().filter(t=>favs.has(t.code));if(!TT.length)return"";
  return `<div class="mine"><h3>★ ${T("myTeams")}</h3>${TT.map(t=>`<button data-t="${esc(t.code)}" class="tmx"><span>${t.flag}</span><span><b>${esc(t.name)}</b><br><small>${esc(t.txt)}</small></span></button>`).join("")}</div>`}
function board(){const r=D.rounds.find(x=>x.id==round)||D.rounds[0],s=rState(r),n=r.groups[0].rows[0].r.length;
  let h=mine();const td=today(),tl=SCH.filter(x=>x.d==td);
  if(tl.length){const lr=rnd(tl[0].rid),[dn,dt]=raceDay(lr);
    h+=`<div class="next"><h3><span>${T("todayRaces")} · ${esc(RNm(lr))}</span><small>${esc(wday(td))} · ${T("raceDay")(dn,dt)}${dn==dt&&dt>1?` · <b class="cd">${T("finalDay")}</b>`:""}</small></h3>${raceList(tl)}${tzNote()}${LINKS()}</div>`}
  else{const up=SCH.filter(x=>x.d>td).sort((a,b)=>at(a)-at(b))[0];if(up){const ur=rnd(up.rid),d1=SCH.filter(x=>x.d==up.d);
    h+=`<div class="next"><h3><span>${T("upNext")}: ${esc(RNm(ur))}</span><small>${esc(wday(up.d))} · <span class="cd">${T("startsIn")(days(td,up.d))}</span></small></h3>${raceList(d1)}${tzNote()}${LINKS()}</div>`}}
  h+=`<div class="rhead"><h2>${esc(RNm(r))}</h2><p>${esc(range(r))} · ${T("races")(n)} · ${s=="live"&&td>=r.start&&td<=r.end?T("raceDay")(...raceDay(r)):T("st")[s]}</p></div>`;
  if(r.id=="f"||r.id=="pf")h+=`<p class="warn">${T("oneRace")}</p>`;
  h+=`<div class="grid">`+r.groups.map(g=>{const gs=gState(g,r),nx=gs!="done"?nextFor(r.id,g.id):null;
    return `<section class="g"><div class="gh"><b>${r.groups.length>1?T("group")+" "+esc(g.id):esc(RNm(r))}</b><span class="st"><span class="dot ${gs=="done"?"done":gs=="live"?"live":""}"></span>${T(gs=="done"?"decided":gs=="live"?"racing":"open")}</span></div>${nx?`<div class="gnx">${T("nextRace")}: <b>${["sf","pf","f"].includes(nx.rid)?"":T("race")+" "+nx.n+" · "}${esc(wday(nx.d))} · ${nx.t}</b>${showLocal?` (${esc(locT(nx))} ${T("loc")})`:""}</div>`:""}${gtable(r,g,true)}${needBox(r,g)}</section>`}).join("")+`</div>`;
  return h+schedFor(r)}
const MBC={r32:"R1",r16:"R2",r8:"EF",r4:"QF",sf:"SF"};
const KO=["r32","r16","r8","r4","sf"];
function bcode(r,g){return r.id=="f"?T("fin"):r.id=="pf"?T("petit"):`${MBC[r.id]||RS[r.id]} ${g.id}`}
function phm(c){const m=c.match(phRe);return m?`${m[1]} ${m[2]}${m[3]}`:c}
function mrow(c,o){const tm=isTeam(c),w=o.w;return `<div class="mr${w?" w":""}${o.x?" x":""}${sel==c?" sel":""}${tm&&(o.click!==false)&&INFO[c]?" team":""}${o.me?" me":""}" data-t="${esc(c)}"${w&&tm?` style="${FG(c)}"`:""}>${tm?FL(c)+`<b>${esc(c)}</b>${star(c)}${o.dot?`<span class="rio" title="${esc(T("inRio"))}">●</span>`:""}`:`<i>${esc(phm(c))}</i>`}${o.v!=null?`<span class="v">${esc(o.v)}</span>`:""}</div>`}
function mbox(r,g,opt={}){const gs=gState(g,r),done=gs=="done",has=g.rows.some(x=>String(x.total??"").trim()!=="");
  const rows=g.rows.map((x,i)=>{const o=outcome(r.id,i+1,done);return mrow(x.team,{w:o&&o[0]=="w",x:o&&o[2]===0&&r.id!="pf",v:has?String(x.total??"").trim():null,me:opt.me==x.team,click:!opt.me})}).join("");
  const bd=KO.includes(r.id)&&!opt.me?`<div class="bdgs" aria-hidden="true"><span>${esc(ord(1))}</span><span>${esc(ord(2))}</span></div>`:"";
  return `<div class="mb ${gs}"${opt.go?` data-go="${opt.go}" role="button" tabindex="0"`:""}>${bd}<div class="mh"><span>${esc(bcode(r,g))}</span>${gs=="live"?`<span class="dot live"></span>`:done?`<span class="ok">✓</span>`:""}</div>${rows}</div>`}
function mbNav(k){return `<nav class="seg">${[["bracket",T("fsT")],["qualifying",T("qsT")],["gc2023",T("gc23")]].map(([h,l])=>`<a href="#${h}"${k==h?` class="on" aria-current="page"`:""}>${esc(l)}</a>`).join("")}</nav>`}
function bracket(){const cols=KO.map(id=>D.rounds.find(r=>r.id==id)).filter(Boolean),fin=["f","pf"].map(id=>D.rounds.find(r=>r.id==id)).filter(Boolean);
  const head=r=>{const s=rState(r);return `<div class="mch"><b>${esc(RNm(r))}</b><small><span class="dot ${s=="done"?"done":s=="live"?"live":r.id==current()?"nx":""}"></span>${esc(range(r))}</small></div>`};
  let h=mbNav("bracket")+`<h2 class="pill">${T("fsT")}</h2><p class="warn mbh">${T("mbHint")} <span class="sw">${T("swipe")}</span></p><div class="mbw"><div class="mbg">`;
  h+=cols.map(r=>`<div class="mc">${head(r)}<div class="mcb">${r.groups.map(g=>mbox(r,g)).join("")}</div></div>`).join("");
  if(fin.length)h+=`<div class="mc fin">${head(fin[0])}<div class="mcb">${fin.map(r=>r.groups.map(g=>mbox(r,g)).join("")).join("")}</div></div>`;
  return h+`</div></div>`}
const QS=[{id:"asia",d:"2025-12",loc:"TH",g:[["A","PHI,MYA*,KOR,VIE"],["B","OMA*,UAE,KAZ"]]},{id:"afoc",d:[["2026-06-02","2026-06-04"]],loc:"CH",g:[["C","TAH*,SEY*,MAR,MOZ"]]},{id:"eur",d:[["2026-06-08","2026-06-11"],["2026-07-14","2026-07-17"]],loc:"CH",g:[["D","EST*,AUT,SLO"],["E","LTU*,NOR,BEL,SRB"],["F","UKR*,FIN,GRE"],["G","POR*,TUR,BUL"]]},{id:"pam",d:[["2026-11-12","2026-11-16"]],loc:"BR",g:[["H","URU*,PUR,ANT*,VEN"],["I","CUB*,BER,MEX,ESA"]]}];
const cn=i=>{try{return dn().of(i)}catch(e){return i}};
const qdate=R=>typeof R.d=="string"?`${MO[lang][+R.d.slice(5)-1]} ${R.d.slice(0,4)}`:R.d.map(([a,b])=>range({start:a,end:b})).join(" & ")+" "+R.d[0][0].slice(0,4);
function qsOf(c){for(const R of QS)for(const[id,l]of R.g){const L=l.split(",");if(L.some(e=>e.replace("*","")==c))return{R,id,L}}return null}
function qsBox(id,L,me){return `<div class="mb done"${me?` data-go="qualifying" role="button" tabindex="0"`:""}><div class="mh"><span>QS ${esc(id)}</span></div>${L.map(e=>{const c=e.replace("*",""),w=e.endsWith("*");return mrow(c,{w,me:me==c,click:!me,dot:!me&&!w&&!!INFO[c]})}).join("")}</div>`}
function qualifying(){let h=mbNav("qualifying")+`<h2 class="pill">${T("qsT")}</h2><p class="warn mbh">${T("qsLeg")}</p><div class="qsg">`;
  h+=QS.map(R=>`<section class="qreg"><div class="qrh"><b>${esc(T("reg")[R.id])}</b><small>${esc(qdate(R))} · ${esc(cn(R.loc))}</small></div><div class="qbx">${R.g.map(([id,l])=>qsBox(id,l.split(","))).join("")}</div></section>`).join("");
  return h+`</div><p class="warn qnote">* ${esc(T("qsNote"))}</p>`}
function road(code,TM){const q=qsOf(code);let h="";
  if(q)h+=qsBox(q.id,q.L,code);
  if(TM)h+=TM.path.map(s=>mbox(s.r,s.g,{me:code,go:"round-"+s.r.id})).join("");
  return h?`<div class="road" aria-label="${esc(T("road2"))}">${h}</div>`:""}
function bx2(adv,cells,title,status){const h=bx(cells,title,status);return adv?h.slice(0,-6)+`<div class="advb">${esc(adv)}</div></div>`:h}
function bx(cells,title,status){return `<div class="bx"><div><span>${title}</span><span>${status}</span></div>${cells}</div>`}
const G23=[["1/32","10–14 Nov 2023",["TAH 19,SLO 14,BUL 8,PER 7","POR 15,EST 14,CHI 12,CUB 8","MAS 16,BER 12,ANT 12,UKR 8","LTU 18,RSA 16,CZE 10,OMA 6"]],["1/16","Nov 2023",["CHI 8,MAS 8,EST 8,AUT 6","HUN 17,TAH 15,FIN 11,BER 7","POR 14,RSA 13,ANT 12,CRO 11","LTU 11,SLO 8,CAN 6,JPN 5"]],["1/8","Nov 2023",["MAS 14,HUN 13,ARG 12,USA 11","LTU 20,BRA 13,TAH 11,POL 4","CHI 16,SUI 13,RSA 11,NOR 10","POR 17,FRA 12,SWE 10,SLO 10"]],["1/4","Nov 2023",["GBR 20,FRA 13,MAS 12,DEN 4","HUN 18,NED 12,CHI 10,GER 10","BRA 16,NZL 13,AUS 12,POR 9","ESP 19,ITA 14,SUI 10,LTU 7"]],["1/2","2 Dec 2023",["ITA 4,NED 3,GBR 2,BRA 1","ESP 4,HUN 3,NZL 2,FRA 1"]],["Final","3 Dec 2023",["HUN 4,ITA 3,NED 2,ESP 1"]]];
function gc23(){let h=mbNav("gc2023")+`<div class="rhead"><h2>${T("h23")}</h2><p>${T("champ23")} ${FL("HUN")} ${esc(NM("HUN"))}</p></div><p class="warn" style="margin:0 0 12px">${sel?`${FL(sel)} ${esc(NM(sel))} ${T("hl")}. `:""}${T("tap26")} <a href="https://nationscircuit.worldofsailors.com/results/" target="_blank" rel="noopener" style="color:var(--link);text-decoration:none">${T("off23")}</a></p><div class="bracket">`;
  h+=G23.map(([rn,dt,gs],ri)=>{const nxt=ri<G23.length-1?G23[ri+1][2].join(",")+",":"";
    return `<div class="col"><h3>${rn} <small>${dt}</small></h3>${gs.map((g,gi)=>bx(g.split(",").map((e,i)=>{const[c,p]=e.trim().split(" "),w=rn=="Final"?i<3:nxt.includes(c+" ");
      return `<div class="${w?"q":"x"} ${sel==c?"sel":""} ${INFO[c]?"team":""}" data-t="${c}"><span>${FL(c)} ${c}${star(c)}</span><span class="v">${p}</span></div>`}).join(""),gs.length>1?T("group")+" "+(gi+1):rn,"✓")).join("")}</div>`}).join("");
  return h+`</div>`}
function teamView(){const TT=teams(),inn=TT.filter(t=>!t.out).length;
  const list=TT.filter(t=>{if(filt=="in"&&t.out||filt=="out"&&!t.out||filt=="fav"&&!favs.has(t.code))return false;if(!q)return true;
    const sq=squad(t.code);return(t.name+" "+t.code+" "+(INFO[t.code]||{}).name+" "+sq.n+" "+sq.ppl.map(p=>p.name).join(" ")).toLowerCase().includes(q.toLowerCase())});
  list.sort(sortBy=="rank"?(a,b)=>(a.I.rank||999)-(b.I.rank||999):sortBy=="name"?(a,b)=>a.name.localeCompare(b.name,lang):(a,b)=>a.out-b.out||b.lvl-a.lvl||(a.I.rank||999)-(b.I.rank||999));
  return `<div class="rhead"><h2>${T("nations")(TT.length)}</h2><p>${inn} ${T("stillIn")} · ${TT.length-inn} ${T("outN")}</p></div>
  <div class="tools"><input id="q" type="search" placeholder="${esc(T("search"))}" value="${esc(q)}" aria-label="${esc(T("search"))}"></div>
  <div class="tools">${[["all",T("all")],["in",T("chipIn")],["out",T("chipOut")],["fav",T("mine")]].map(([k,l])=>`<button class="chip ${filt==k?"on":""}" data-f="${k}">${l}</button>`).join("")}<span style="flex:1"></span>${[["status",T("sStatus")],["rank",T("sRank")],["name",T("sAz")]].map(([k,l])=>`<button class="chip ${sortBy==k?"on":""}" data-s="${k}">${l}</button>`).join("")}</div>
  ${filt=="fav"&&!favs.size?`<p class="warn">${T("myHint")}</p>`:""}
  ${sortBy=="status"?sections(list):`<div class="tl">${list.map(card).join("")}</div>`}`}
function sections(list){const cur=current(),G=[];const add=(title,arr)=>{if(arr.length)G.push(`<h3 class="sec">${esc(title)} <span>${arr.length}</span></h3><div class="tl">${arr.map(card).join("")}</div>`)};
  const by=(a,b)=>(a.I.rank||999)-(b.I.rank||999);
  const inn=list.filter(t=>!t.out),now=inn.filter(t=>t.path.some(p=>p.r.id==cur)||t.path[t.path.length-1].done).sort(by);
  now.forEach(t=>{const l=t.path[t.path.length-1],tot=String(l.g.rows[l.pos-1].total||"").trim();t.short=l.done?t.txt:`${RNm(l.r)} · ${T("group")} ${l.g.id}${tot?` · ${ord(l.pos)} · ${tot} ${T("pts")}`:""}`});add(T("secNow"),now);
  D.rounds.forEach(r=>{const a=inn.filter(t=>!now.includes(t)&&t.path[0].r.id==r.id).sort(by);a.forEach(t=>t.short=`${T("group")} ${t.path[0].g.id} · ${fmtD(r.start)}`);add(T("secSeeded")(RNm(r)),a)});
  add(T("secOut"),list.filter(t=>t.out).sort((a,b)=>b.lvl-a.lvl||by(a,b)));return G.join("")||`<p>${T("noTeam")}</p>`}
function card(t){{const img=capPhoto(t.code),nick=squad(t.code).n;
    return `<button class="tm ${t.out?"out":""}" data-t="${esc(t.code)}"><span class="avt">${img?`<img src="${esc(img)}" alt="" loading="lazy">`:t.flag}</span><span><b>${img?t.flag+" ":""}${esc(t.name)}${favs.has(t.code)?` <span class="star">★</span>`:""}</b>${nick?`<span class="nk">${esc(nick)}</span>`:""}<small>${esc(t.short||t.txt)}</small></span>${t.I.rank?`<span class="rk"><small>${T("rank")}</small>#${t.I.rank}</span>`:""}</button>`}}

/* ---------- team sheet ---------- */
let openCode=null;
function openTeam(code){if(!isTeam(code))return;openCode=code;const d=$("#tmd"),sq=squad(code),I=INFO[code]||{},TM=teams().find(x=>x.code==code);
  const path=TM?TM.path.map(s=>{const o=s.o;return `<span role="button" tabindex="0" data-go="round-${s.r.id}" class="${o?(o[0]=="w"?"w":(o[2]===0?"o":"")):""}">${esc(RS[s.r.id])} · ${T("group")} ${esc(s.g.id)}${s.done?` · ${ord(s.pos)}`:""} ›</span>`}).join(""):"";
  const lastP=TM?TM.path[TM.path.length-1]:null;
  let h=`<div class="th"><span class="fg">${FL(code)}</span><div><div class="nick">${esc(sq.n||code)}</div><h2>${esc(NM(code))}</h2></div>
  <div class="thb"><button class="fv ${favs.has(code)?"on":""}" aria-pressed="${favs.has(code)}" title="${favs.has(code)?T("favOn"):T("favOff")}">${favs.has(code)?"★":"☆"}</button><button class="ln" title="${T("copyLink")}" aria-label="${T("copyLink")}">🔗</button><button class="x" aria-label="${T("close")}">✕</button></div></div><div class="tb">`;
  const lp=TM&&TM.path[TM.path.length-1],tnx=lp&&!TM.out?nextFor(lp.r.id,lp.g.id):null;
  h+=`${TM?`<div class="tst">${esc(TM.txt)}</div>`:""}${tnx?`<div class="tnx">${T("nextRace")}: <b>${["sf","pf","f"].includes(tnx.rid)?esc(RNm(lp.r)):T("race")+" "+tnx.n} · ${esc(wday(tnx.d))} · ${tnx.t}</b> ${T("rioT")}${showLocal?` (${esc(locT(tnx))} ${T("loc")})`:""}</div>`:""}${road(code,TM)}`;
  const pics=sq.ppl.filter(p=>p.img);
  if(pics.length)h+=`<div class="strip" aria-label="${esc(T("lineup"))}">${pics.map(p=>`<figure role="button" tabindex="0" data-pi="${p.i}"><img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy"><figcaption><b>${/^\d+$/.test(p.no)?esc(p.no):""}</b> ${esc(p.name.split(" ")[0])}</figcaption></figure>`).join("")}</div>`;
  h+=`<div class="sstats"><a class="sl" href="https://worldofsailors.com/ranking/nation" target="_blank" rel="noopener"><small>${T("ranking")}</small><b>${I.rank?"#"+I.rank:"–"}</b><em>${T("rankBoard")}</em></a>${TM?`<button class="sl" data-go="round-${TM.path[0].r.id}"><small>${T("entered")}</small><b>${esc(RNm(TM.path[0].r))}</b><em>${T("showRound")}</em></button>`:""}<button class="sl" data-go="gc2023"><small>${T("gc23")}</small><b>${esc(T("g23")[I.gc23||"none"])}</b><em>${T("br23")}</em></button>${lastP?`<button class="sl" data-go="round-${lastP.r.id}"><small>${T("status")}</small><b>${TM.out?T("stOut"):T("stIn")}</b><em>${TM.out?T("whereEnded"):T("curGroup")}</em></button>`:""}</div>`;
  const R=I.route,qual=R&&/won|pos|lc/.test(R.k);
  h+=`<h3>${T("background")}</h3><div class="grp"><dl class="facts">${sq.c?`<dt>${T("captain")}</dt><dd>${esc(sq.c)}</dd>`:""}${I.helm?`<dt>${T("helm")}</dt><dd>${esc(I.helm)}</dd>`:""}<dt>${T("road")}</dt><dd>${esc(routeText(code,TM))}<br><a href="${qual?"https://sslgoldcup.worldofsailors.com/results/":"https://worldofsailors.com/ranking/nation"}" target="_blank" rel="noopener">${qual?T("qualRes"):T("sslRank")}</a></dd>${I.note?`<dt>${T("story")}</dt><dd>${esc(I.note[lang]||I.note.en)}</dd>`:""}<dt>${T("site")}</dt><dd><a href="https://${esc(code.toLowerCase())}.sslgoldcup.com/" target="_blank" rel="noopener">${esc(code.toLowerCase())}.sslgoldcup.com ↗</a></dd></dl></div>`;
  if(TM)h+=`<h3>${T("resRio")}</h3><div class="grp rt">${TM.path.map(p=>`<div style="padding:10px 16px 0;font-weight:600">${esc(RNm(p.r))} · ${T("group")} ${esc(p.g.id)} <span style="color:var(--mute);font-weight:400">${esc(range(p.r))}</span></div>${gtable(p.r,p.g,false)}`).join("")}</div>`;

  const rl=sq.ppl.filter(p=>!p.extra);
  if(!rl.length&&!pics.length)h+=`<p>${T("noSquad")}</p>`;
  else if(rl.length){const capOnly=rl.filter(p=>p.cap&&!p.k);
    h+=`<h3>${T("byPos")}</h3><div class="grp">`;
    if(capOnly.length)h+=`<div class="role"><div class="rl"><b>${T("captain")}</b><small>${T("leader")}</small></div><div class="ppl">${capOnly.map(person).join("")}</div></div>`;
    ROLES.forEach(k=>{const L=rl.filter(p=>p.k==k);if(!L.length)return;
      L.sort((a,b)=>(/^\d+$/.test(a.no)?0:1)-(/^\d+$/.test(b.no)?0:1)||(b.img?1:0)-(a.img?1:0));
      h+=`<div class="role"><div class="rl"><b>${esc(k)}</b><small>${esc(T("roles")[k])}</small></div><div class="ppl">${L.map(person).join("")}</div></div>`});
    h+=`</div>`;const rest=rl.filter(p=>!p.k&&!p.cap);
    if(rest.length)h+=`<h3>${T("wider")}</h3><div class="grp rest">${rest.map(p=>`<div class="pp" role="button" tabindex="0" data-pi="${p.i}">${av(p,1)}<span class="nm">${esc(p.name)}</span></div>`).join("")}</div>`;
    h+=`<div class="tf">${T("squadNote")(rl.length,pics.length)}</div>`}
  h+=`<div class="tact"><button data-br="1">${T("showPath")}</button></div></div>`;
  d.innerHTML=h;
  d.querySelector(".x").onclick=()=>d.close();
  d.querySelector(".fv").onclick=()=>{favs.has(code)?favs.delete(code):favs.add(code);LS.set("favs",[...favs]);const y=d.scrollTop;openTeam(code);d.scrollTop=y;render(true)};
  d.querySelector(".ln").onclick=async()=>{const u=location.href.split("#")[0]+"#team-"+code;try{await navigator.clipboard.writeText(u);toast(T("copied"))}catch(e){toast(u)}};
  d.querySelector("[data-br]").onclick=()=>{d.close();sel=code;jump=true;go("bracket")};
  d.querySelectorAll("[data-go]").forEach(b=>{const f=()=>{d.close();sel=code;jump=true;go(b.dataset.go)};b.onclick=f;b.onkeydown=e=>{if(e.key=="Enter")f()}});
  d.querySelectorAll("[data-pi]").forEach(el=>{const f=()=>openSailor(code,+el.dataset.pi);el.onclick=f;el.onkeydown=e=>{if(e.key=="Enter")f()}});
  show(d)}
function show(d){if(!d.open)d.showModal();d.scrollTop=0;const th=d.querySelector(".th");if(th){th.tabIndex=-1;th.focus({preventScroll:true})}}
function openSailor(code,i){const d=$("#tmd"),sq=squad(code),p=sq.ppl[i];if(!p)return;openCode=code;const PE=pinfo(code,p),TM=teams().find(x=>x.code==code),n=sq.ppl.length;
  const q2=encodeURIComponent;let h=`<div class="th"><button class="bk">${T("back")}</button><div class="thb"><button class="pv" aria-label="previous">‹</button><button class="nx2" aria-label="next">›</button><button class="x" aria-label="${T("close")}">✕</button></div></div><div class="tb">`;
  h+=`<div class="shero">${p.img?`<img src="${esc(p.img)}" alt="${esc(p.name)}">`:`<span class="big">${esc(ini(p.name))}</span>`}<div><div class="nick">${FL(code)} ${esc(NM(code))}${sq.n?" · "+esc(sq.n):""}</div><h2>${esc(p.name)}</h2>${p.cap?`<span class="ctag">${T("capTag")}</span>`:""}</div></div>`;
  h+=`<div class="sstats"><div class="sl"><small>${T("position")}</small><b>${esc(p.k||(p.cap?T("captain"):T("posTbc")))}</b>${p.k?`<em style="color:var(--mute)">${esc(T("roles")[p.k])}</em>`:""}</div><div class="sl"><small>${T("jersey")}</small><b>${/^\d+$/.test(p.no)?"#"+esc(p.no):"–"}</b></div>${PE&&PE.rank?`<a class="sl" href="https://worldofsailors.com/ranking/men" target="_blank" rel="noopener"><small>${T("indRank")}</small><b>#${PE.rank}</b><em>${T("rankBoard")}</em></a>`:""}<button class="sl" data-tm="1"><small>${T("team")}</small><b>${FL(code)} ${esc(NM(code))}</b><em>${esc(TM?TM.txt:"")}</em></button></div>`;
  const hl=PE&&PE.b&&(PE.b[lang]||PE.b.en);
  h+=hl&&hl.length?`<h3>${T("highlights")}</h3><div class="grp"><ul class="hl">${hl.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:`<p class="warn">${T("noInfo")}</p>`;
  h+=`<div class="slinks">${PE&&PE.slug?`<a href="https://worldofsailors.com/sailor/${esc(PE.slug)}" target="_blank" rel="noopener">${T("profile")}</a>`:`<a href="https://www.google.com/search?q=${q2('site:worldofsailors.com/sailor "'+p.name+'"')}" target="_blank" rel="noopener">${T("findProfile")}</a>`}<a href="https://www.google.com/search?q=${q2('site:sailing.org/sailor "'+p.name+'"')}" target="_blank" rel="noopener">${T("ws")}</a><a href="https://${esc(code.toLowerCase())}.sslgoldcup.com/" target="_blank" rel="noopener">${esc(code.toLowerCase())}.sslgoldcup.com ↗</a></div>`;
  h+=`<h3>${T("mates")}</h3><div class="grp mates">${sq.ppl.filter(x=>x.i!=i).map(x=>`<button data-pi="${x.i}">${av(x,1)}<span>${esc(x.name)}</span></button>`).join("")}</div></div>`;
  d.innerHTML=h;
  d.querySelector(".x").onclick=()=>d.close();d.querySelector(".bk").onclick=()=>openTeam(code);d.querySelector("[data-tm]").onclick=()=>openTeam(code);
  d.querySelector(".pv").onclick=()=>openSailor(code,(i-1+n)%n);d.querySelector(".nx2").onclick=()=>openSailor(code,(i+1)%n);
  d.querySelectorAll("[data-pi]").forEach(el=>el.onclick=()=>openSailor(code,+el.dataset.pi));
  d.onkeydown=e=>{if(!d.querySelector(".shero"))return;if(e.key=="ArrowLeft")openSailor(code,(i-1+n)%n);if(e.key=="ArrowRight")openSailor(code,(i+1)%n)};
  show(d)}
function toast(m){let el=$(".toast");if(!el){el=document.createElement("div");el.className="toast";el.setAttribute("role","status");document.body.appendChild(el)}el.textContent=m;el.classList.add("on");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("on"),1800)}

/* ---------- chrome: header bar, theme, language ---------- */
function applyTheme(){const r=document.documentElement,t=theme=="auto"?"mb":theme;r.setAttribute("data-theme",t);let m=$("meta[name=theme-color]");if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content={mb:"#1c4688",light:"#192550",dark:"#0b1630"}[t]}
const ICO=['<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="4" rx="1.5"/><rect x="3" y="10" width="18" height="4" rx="1.5"/><rect x="3" y="16" width="18" height="4" rx="1.5"/></svg>','<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="2.5" y="3.5" width="6" height="5" rx="1"/><rect x="2.5" y="15.5" width="6" height="5" rx="1"/><rect x="15.5" y="9.5" width="6" height="5" rx="1"/><path d="M8.5 6H12v12H8.5M12 12h3.5"/></svg>','<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 21V3.5M5 4h12l-2.5 4.5L17 13H5"/></svg>'];
$("#lang").onchange=e=>{lang=e.target.value;LS.set("lang",lang);for(const k in SQ)delete SQ[k];render();if($("#tmd").open&&openCode)openTeam(openCode)};
$("#thm").onclick=()=>{theme={auto:"light",light:"dark",dark:"auto"}[theme];LS.set("theme",theme);applyTheme();chrome()};
function chrome(){document.documentElement.lang=lang;$("#lang").value=lang;$("#thm").textContent=T("theme")[theme];
  const tb=document.querySelectorAll(".tabs button");[T("rounds"),T("bracket"),T("teams")].forEach((l,i)=>tb[i].innerHTML=ICO[i]+`<span>${esc(l)}</span>`);
  $("#off").textContent=T("official");const F=$("#foot");const op=F.querySelector("details")?.open;F.innerHTML=`<details class="how"${op?" open":""}><summary>${esc(T("howT"))}</summary><ul>${T("how").map(x=>`<li>${esc(x)}</li>`).join("")}</ul></details><p>${esc(T("foot"))}</p>`;$("#tmd").setAttribute("aria-label",T("teams"));stand()}
function stand(){const u=new Date(checkedAt&&Date.parse(checkedAt)>Date.parse(D.updatedAt)?checkedAt:D.updatedAt);if(isNaN(u)){$("#stand").textContent="–";return}
  const m=Math.max(0,Math.round((Date.now()-u)/6e4)),abs=u.toLocaleString(lang,{timeZone:"America/Sao_Paulo",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  $("#stand").innerHTML=`${T("updated")} ${esc(abs)} · <span class="ago">${esc(T("ago")(m))}</span>${stale?" · "+esc(T("offline")):""}`}
applyTheme();

/* ---------- render & routing ---------- */
let GOOD=null;
function render(keepScroll){try{render0(keepScroll);GOOD=D}catch(e){console.error(e);if(GOOD&&GOOD!==D){D=GOOD;try{render0(keepScroll)}catch(e2){}}}}
function render0(keepScroll){const y=scrollY;chrome();
  document.querySelectorAll(".tabs button").forEach(b=>b.setAttribute("aria-selected",b.dataset.v==view||(b.dataset.v=="bracket"&&(view=="qualifying"||view=="gc2023"))));
  ladder();const M=$("#main");
  M.innerHTML=view=="board"?board():view=="bracket"?bracket():view=="qualifying"?qualifying():view=="gc2023"?gc23():teamView();
  if(jump){jump=false;const sr=M.querySelector("tr.sel,.bx .sel,.mr.sel");if(sr)setTimeout(()=>sr.scrollIntoView({block:"center",inline:"center"}),60);else scrollTo(0,0)}else if(keepScroll)scrollTo(0,y);
  const i=$("#q");if(i)i.oninput=e=>{q=e.target.value;const p=i.selectionStart;render(true);const n=$("#q");n.focus();n.setSelectionRange(p,p)}}
function route(){const h=location.hash.slice(1);let m;
  if(h=="bracket"||h=="teams"||h=="gc2023"||h=="qualifying")view=h;
  else if(m=h.match(/^team-([A-Z]{3})$/)){if(view=="board"&&!round)view="teams";render();openTeam(m[1]);return}
  else{view="board";m=h.match(/^(?:round|runde)-(\w+)$/);round=m&&D.rounds.some(r=>r.id==m[1])?m[1]:(round||current())}
  LS.set("view",h);render()}
const go=h=>{if(location.hash.slice(1)!==h){try{location.hash=h;return}catch(e){}}route()};

document.querySelector(".tabs").addEventListener("click",e=>{const b=e.target.closest("button");if(b)go(b.dataset.v=="board"?"round-"+(round||current()):b.dataset.v)});
$("#ladder").addEventListener("click",e=>{const b=e.target.closest("button");if(b){round=b.dataset.r;go("round-"+round)}});
$("#main").addEventListener("click",e=>{const f=e.target.closest("[data-f]");if(f){filt=f.dataset.f;render(true);return}
  const s=e.target.closest("[data-s]");if(s){sortBy=s.dataset.s;render(true);return}
  const t=e.target.closest(".team,.tm,.tmx");if(t)openTeam(t.dataset.t)});
$("#tmd").addEventListener("click",e=>{if(e.target.id=="tmd")e.target.close()});
$("#tmd").addEventListener("close",()=>{openCode=null;if(/^#team-/.test(location.hash))try{location.hash="teams"}catch(e){}});
window.addEventListener("hashchange",route);
document.addEventListener("keydown",e=>{if(e.target.matches("input,select,textarea")||$("#tmd").open)return;
  if(e.key=="/"){const i=$("#q");if(i){e.preventDefault();i.focus()}}
  if(view=="board"&&(e.key=="ArrowRight"||e.key=="ArrowLeft")){const ids=D.rounds.map(r=>r.id),i=ids.indexOf(round)+(e.key=="ArrowRight"?1:-1);if(ids[i]){round=ids[i];go("round-"+round)}}});
setInterval(()=>{stand();if(view=="board"&&!$("#tmd").open&&!document.hidden&&!(document.activeElement&&document.activeElement.matches("input,select")))render(true)},60000);
setInterval(async()=>{if(document.hidden)return;if(await pullFile()){render(true);if($("#tmd").open&&openCode){const y=$("#tmd").scrollTop;openTeam(openCode);$("#tmd").scrollTop=y}}else stand()},60000);
document.addEventListener("visibilitychange",async()=>{if(!document.hidden&&await pullFile())render(true)});
await pullFile();live=true;
round=current();
if(!location.hash){const v=LS.get("view","");if(v&&!/^team-/.test(v))try{location.hash=v}catch(e){}}
route();

/* ---------- offline / home-screen app (own hosting only; artifact frames refuse service workers) ---------- */
try{if("serviceWorker" in navigator&&window.top===window&&location.protocol=="https:"&&!/claude/.test(location.hostname))navigator.serviceWorker.register("sw.js").catch(()=>{})}catch(e){}

/* ---------- live data ---------- */
(async()=>{try{const db=await window.claude?.use?.("db");if(!db)return;
  const timer=setTimeout(()=>{if(!live){stale=true;stand()}},10000);
  db.doc("gc/results").onSnapshot(s=>{if(s.exists){const d=s.data();if(d&&d.checkedAt)checkedAt=d.checkedAt;if(okData(d)&&(!D.updatedAt||Date.parse(d.updatedAt)>=Date.parse(D.updatedAt))){D=JSON.parse(JSON.stringify(d));live=true;
      if(!D.rounds.some(r=>r.id==round))round=current();render(true);if($("#tmd").open&&openCode){const y=$("#tmd").scrollTop;openTeam(openCode);$("#tmd").scrollTop=y}}}
    if(!s.metadata.fromCache)clearTimeout(timer)},()=>clearTimeout(timer))}catch(e){}})();
})();
