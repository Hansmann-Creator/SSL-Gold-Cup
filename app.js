/* Gold Cup Rio Matchboard – app logic (EN/DE/FR/ES, themes, favourites) */
(async()=>{
const $=s=>document.querySelector(s);
const LS={get(k,d){try{const v=localStorage.getItem("gcmb_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("gcmb_"+k,JSON.stringify(v))}catch(e){}}};
const LANGS={en:"English",de:"Deutsch",fr:"Français",es:"Español",pt:"Português",zh:"中文",ar:"العربية"};
const LOC=()=>lang=="ar"?"ar-u-nu-latn":lang=="zh"?"zh-CN":lang=="pt"?"pt-BR":lang;
let lang=LS.get("lang",null);if(!LANGS[lang])lang=["de","fr","es","pt","zh","ar"].find(l=>(navigator.language||"").toLowerCase().startsWith(l))||"en";
let theme=LS.get("theme","auto"),favs=new Set(LS.get("favs",[]));

let TRK={};try{const r=await fetch("tracking.json",{cache:"no-cache"});if(r.ok)TRK=await r.json()}catch(e){}
let INFO={};try{INFO=await (await fetch("teaminfo.json",{cache:"no-cache"})).json()}catch(e){}
let PEOPLE=[];try{PEOPLE=await (await fetch("people.json",{cache:"no-cache"})).json()}catch(e){}
const okData=d=>{try{return d&&Array.isArray(d.rounds)&&d.rounds.length>=5&&d.rounds.every(r=>r&&r.id&&r.start&&r.end&&Array.isArray(r.groups)&&r.groups.length&&r.groups.every(g=>g&&g.id&&Array.isArray(g.rows)&&g.rows.length&&g.rows.every(x=>x&&typeof x.team=="string"&&Array.isArray(x.r))))}catch(e){return false}};
async function pullFile(){try{const r=await fetch("results.json?t="+Date.now(),{cache:"no-store"});if(!r.ok)return false;const d=await r.json();if(okData(d)&&(!D.updatedAt||Date.parse(d.updatedAt)>=Date.parse(D.updatedAt))){const ch=JSON.stringify(d.rounds)!==JSON.stringify(D.rounds);D=d;if(d.checkedAt)checkedAt=d.checkedAt;return ch}}catch(e){}return false}
let RO={};try{RO=await (await fetch("roster.json",{cache:"no-cache"})).json()}catch(e){}
let D=JSON.parse($("#snap").textContent),checkedAt=null,view="board",round=null,sel=null,filt="all",sortBy="status",q="",live=false,stale=false,jump=false;

/* ---------- strings ---------- */
const ORD={en:n=>n+(n%10==1&&n!=11?"st":n%10==2&&n!=12?"nd":n%10==3&&n!=13?"rd":"th"),de:n=>n+".",fr:n=>n==1?"1er":n+"e",es:n=>n+".º",pt:n=>n+"º",zh:n=>"第"+n+"名",ar:n=>({1:"الأول",2:"الثاني",3:"الثالث",4:"الرابع",5:"الخامس",6:"السادس",7:"السابع",8:"الثامن"})[n]||String(n)};
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
const SH={
en:{home:"Home",more:"More",sailors:"Sailors",welcome:"Final Series · Rio de Janeiro",dates:"19 Nov – 13 Dec 2026 · Marina da Glória",progress:"Tournament",latest:"Latest results",explore:"Explore",tiles:{board:["Rounds","Groups, points, times"],bracket:["Matchboard","The whole draw at a glance"],teams:["Teams","40 nations, crews, rankings"],sailors:["Sailors","Search every sailor"],qualifying:["Qualifying","How the teams got to Rio"],gc2023:["Gold Cup 2023","Last edition's bracket"]},
 showRound:"Open round ›",sailorsT:n=>`${n} sailors`,sSearch:"Search sailor, team or position",withPhoto:"With photo",allS:"All",moreT:"More",lang:"Language",design:"Design",share:"Share app",shared:"Link copied",links:"Links",about:"About this app",aboutT:"Unofficial companion app for the SSL Gold Cup Rio 2026. Results update automatically from the official SSL results page.",
 inst:{t:"Install the app",d:"Put SSL Gold Cup on your home screen – opens like an app, full screen, with live results.",b:"Install",done:"Installed ✓",ios:["Tap the Share button","at the bottom of Safari (top right on iPad).","Scroll down and tap “Add to Home Screen”.","Tap “Add” – done."],iosOther:"On iPhone this works in Safari: open this page in Safari first.",android:["Tap the ⋮ menu in the top right of your browser.","Tap “Install app” or “Add to Home screen”.","Confirm with “Install”."],desk:["Click the install icon in the address bar,","or open the browser menu and choose “Install SSL Gold Cup”."],how:"How to install",hide:"Not now",installedNote:"You're using the installed app."}},
de:{home:"Home",more:"Mehr",sailors:"Segler",welcome:"Final Series · Rio de Janeiro",dates:"19. Nov. – 13. Dez. 2026 · Marina da Glória",progress:"Turnier",latest:"Neueste Ergebnisse",explore:"Entdecken",tiles:{board:["Runden","Gruppen, Punkte, Zeiten"],bracket:["Matchboard","Der ganze Turnierbaum"],teams:["Teams","40 Nationen, Crews, Ranking"],sailors:["Segler","Alle Segler durchsuchen"],qualifying:["Qualifikation","Der Weg der Teams nach Rio"],gc2023:["Gold Cup 2023","Der Turnierbaum von 2023"]},
 showRound:"Runde öffnen ›",sailorsT:n=>`${n} Segler`,sSearch:"Segler, Team oder Position suchen",withPhoto:"Mit Foto",allS:"Alle",moreT:"Mehr",lang:"Sprache",design:"Design",share:"App teilen",shared:"Link kopiert",links:"Links",about:"Über diese App",aboutT:"Inoffizielle Begleit-App zum SSL Gold Cup Rio 2026. Die Ergebnisse kommen automatisch von der offiziellen SSL-Ergebnisseite.",
 inst:{t:"App installieren",d:"SSL Gold Cup auf den Homescreen legen – öffnet sich wie eine App, im Vollbild, mit Live-Ergebnissen.",b:"Installieren",done:"Installiert ✓",ios:["Tippe auf das Teilen-Symbol","unten in Safari (beim iPad oben rechts).","Runterscrollen und „Zum Home-Bildschirm“ antippen.","Auf „Hinzufügen“ tippen – fertig."],iosOther:"Auf dem iPhone geht das in Safari: Öffne diese Seite zuerst in Safari.",android:["Tippe oben rechts im Browser auf das ⋮-Menü.","Tippe auf „App installieren“ oder „Zum Startbildschirm hinzufügen“.","Mit „Installieren“ bestätigen."],desk:["Klicke auf das Installieren-Symbol in der Adresszeile","oder wähle im Browsermenü „SSL Gold Cup installieren“."],how:"So installierst du die App",hide:"Später",installedNote:"Du nutzt die installierte App."}},
fr:{home:"Accueil",more:"Plus",sailors:"Marins",welcome:"Final Series · Rio de Janeiro",dates:"19 nov. – 13 déc. 2026 · Marina da Glória",progress:"Tournoi",latest:"Derniers résultats",explore:"Explorer",tiles:{board:["Tours","Groupes, points, horaires"],bracket:["Matchboard","Tout le tableau d'un coup d'œil"],teams:["Équipes","40 nations, équipages, classement"],sailors:["Marins","Chercher un marin"],qualifying:["Qualifications","Le parcours jusqu'à Rio"],gc2023:["Gold Cup 2023","Le tableau de 2023"]},
 showRound:"Ouvrir le tour ›",sailorsT:n=>`${n} marins`,sSearch:"Chercher un marin, une équipe ou un poste",withPhoto:"Avec photo",allS:"Tous",moreT:"Plus",lang:"Langue",design:"Thème",share:"Partager l'app",shared:"Lien copié",links:"Liens",about:"À propos",aboutT:"Application non officielle pour la SSL Gold Cup Rio 2026. Les résultats viennent automatiquement de la page officielle de la SSL.",
 inst:{t:"Installer l'app",d:"Ajoutez SSL Gold Cup à l'écran d'accueil – plein écran, comme une app, avec les résultats en direct.",b:"Installer",done:"Installée ✓",ios:["Touchez le bouton Partager","en bas de Safari (en haut à droite sur iPad).","Faites défiler et touchez « Sur l'écran d'accueil ».","Touchez « Ajouter » – c'est fait."],iosOther:"Sur iPhone, cela fonctionne dans Safari : ouvrez d'abord cette page dans Safari.",android:["Touchez le menu ⋮ en haut à droite du navigateur.","Touchez « Installer l'application » ou « Ajouter à l'écran d'accueil ».","Confirmez avec « Installer »."],desk:["Cliquez sur l'icône d'installation dans la barre d'adresse,","ou choisissez « Installer SSL Gold Cup » dans le menu."],how:"Comment installer l'app",hide:"Plus tard",installedNote:"Vous utilisez l'app installée."}},
es:{home:"Inicio",more:"Más",sailors:"Regatistas",welcome:"Final Series · Río de Janeiro",dates:"19 nov – 13 dic 2026 · Marina da Glória",progress:"Torneo",latest:"Últimos resultados",explore:"Explorar",tiles:{board:["Rondas","Grupos, puntos, horarios"],bracket:["Matchboard","Todo el cuadro de un vistazo"],teams:["Equipos","40 naciones, tripulaciones, ranking"],sailors:["Regatistas","Busca a cualquier regatista"],qualifying:["Clasificación","El camino de los equipos a Río"],gc2023:["Gold Cup 2023","El cuadro de 2023"]},
 showRound:"Abrir ronda ›",sailorsT:n=>`${n} regatistas`,sSearch:"Buscar regatista, equipo o puesto",withPhoto:"Con foto",allS:"Todos",moreT:"Más",lang:"Idioma",design:"Diseño",share:"Compartir app",shared:"Enlace copiado",links:"Enlaces",about:"Sobre esta app",aboutT:"App no oficial para la SSL Gold Cup Río 2026. Los resultados se actualizan solos desde la página oficial de la SSL.",
 inst:{t:"Instalar la app",d:"Pon SSL Gold Cup en tu pantalla de inicio: se abre como una app, a pantalla completa, con resultados en directo.",b:"Instalar",done:"Instalada ✓",ios:["Toca el botón Compartir","abajo en Safari (arriba a la derecha en iPad).","Desliza y toca «Añadir a pantalla de inicio».","Toca «Añadir» y listo."],iosOther:"En iPhone funciona en Safari: abre primero esta página en Safari.",android:["Toca el menú ⋮ arriba a la derecha del navegador.","Toca «Instalar app» o «Añadir a pantalla de inicio».","Confirma con «Instalar»."],desk:["Haz clic en el icono de instalar de la barra de direcciones,","o elige «Instalar SSL Gold Cup» en el menú."],how:"Cómo instalar la app",hide:"Ahora no",installedNote:"Estás usando la app instalada."}}};
for(const l in SH)Object.assign(S[l],SH[l]);
const SL={pt:{rounds:"Rodadas",bracket:"Matchboard",teams:"Equipes",official:"Resultados oficiais",updated:"Atualizado",ago:m=>m<1?"agora mesmo":m<60?`há ${m} min`:`há ${Math.round(m/60)} h`,rio:"Horário do Rio",offline:"offline – últimos dados salvos",
 rn:{r32:"1/32 de final",r16:"1/16 de final",r8:"Oitavas de final",r4:"Quartas de final",sf:"Semifinais",pf:"Petit Final",f:"Grande Final"},
 group:"Grupo",decided:"decidido",racing:"em disputa",open:"aberto",st:{done:"concluída",live:"em andamento",up:"em breve"},races:n=>`${n} regata${n>1?"s":""} por grupo`,
 upNext:"A seguir",startsIn:d=>d<=0?"começa hoje":d==1?"começa amanhã":`começa em ${d} dias`,groupsOf4:n=>`${n} grupo${n>1?"s":""} de quatro`,oneRace:"Uma regata – a ordem de chegada decide.",
 through:"classificado",out:"eliminado",toFinal:"para a Final",toPetit:"para a Petit Final",medals:["Ouro","Prata","Bronze","4º"],pts:"Pts",
 outIn:(r,g,p)=>`Eliminado na ${r} (Grupo ${g}, ${p})`,gf:m=>`Grande Final: ${m}`,finished:p=>`Terminou em ${p}`,thrTbc:"Classificado – próximo grupo a confirmar",
 seeded:(r,g,d)=>`Pré-classificado – entra na ${r}, Grupo ${g}, ${d}`,racingNow:"Em disputa agora",
 nations:n=>`${n} nações`,stillIn:"ainda na disputa",outN:"eliminados",search:"Buscar país, apelido ou velejador",all:"Todos",chipIn:"Na disputa",chipOut:"Eliminados",mine:"★ Minhas equipes",sStatus:"Status",sRank:"Ranking",sAz:"A–Z",noTeam:"Nenhuma equipe encontrada.",rank:"Ranking",
 captain:"Capitão",helm:"Timoneiro",ranking:"SSL Nations Ranking",rankBoard:"Ver ranking ↗",entered:"Entrou no Rio na",showRound:"Ver essa rodada ›",gc23:"Gold Cup 2023",br23:"Chave de 2023 ›",status:"Status",stIn:"Na disputa",stOut:"Eliminada",whereEnded:"Onde parou ›",curGroup:"Grupo atual ›",
 background:"Histórico",road:"Caminho até o Rio",story:"História",site:"Site da equipe",qualRes:"Resultados da classificatória ↗",sslRank:"SSL Nations Ranking ↗",resRio:"Resultados no Rio",photos:"Fotos da tripulação",byPos:"Tripulação por posição",leader:"Líder da equipe",wider:"Elenco ampliado · posição a confirmar",
 squadNote:(n,p)=>`${n} nomes no elenco. 8–10 velejam em cada regata e a formação pode mudar de um dia para o outro. Posições e números do site oficial da equipe; retratos dos gráficos da Gold Cup Rio${p?"":" (ainda nenhum para esta equipe)"}.`,
 noSquad:"Ainda não há lista de elenco publicada para esta equipe.",showPath:"Mostrar caminho na chave",copyLink:"Copiar link",copied:"Link copiado",close:"Fechar",jersey:"Camisa",numTbc:"Número a confirmar",capTag:"Capitão",favOn:"Seguindo",favOff:"Seguir",
 brHint:"Toque numa equipe para ver tripulação e histórico. Deslize para as próximas rodadas.",h23:"Gold Cup 2023",champ23:"Gran Canaria · campeã",hl:"destacada",tap26:"Toque numa equipe para ver a página Rio 2026.",off23:"Resultados oficiais 2023 ↗",
 myTeams:"Minhas equipes",myHint:"Toque em ☆ na página de uma equipe para segui-la.",
 foot:"Pontuação: 4-3-2-1 pontos por regata, pontos em dobro na última regata de cada grupo (8-6-4-2). Os dois primeiros de cada grupo avançam. Os resultados são atualizados automaticamente a partir da página oficial da SSL. Ranking = SSL Nations Ranking no início da Final Series.",
 notes:{ocs:"* OCS (largada antecipada)  ** Penalidade padrão"},theme:{auto:"🌊 Matchboard",light:"☀️ Dia",dark:"🌙 Noite"},
 g23:{champ:"Campeã (Ouro)",second:"Vice (Prata)",third:"3º (Bronze)",fourth:"4º – Grande Final",sf:"Semifinais",qf:"Quartas de final",r8:"Oitavas de final",r16:"1/16 de final",r32:"1/32 de final",none:"Não disputou a Final Series de 2023"},
 ev:{asia:"Classificatória Asiática",afoc:"Classificatória África e Oceania",eu1:"Classificatória Europeia 1",eu2:"Classificatória Europeia 2",pan:"Classificatória Pan-Americana"},
 route:{won:(e,g)=>`Venceu a ${e}, Grupo ${g}`,pos:(p,e,g)=>`${p} na ${e}, Grupo ${g}`,lc:(e,g)=>`3º na ${e}, Grupo ${g}, depois venceu a regata Last Chance`,ranking:"Classificada pelo SSL Nations Ranking",host:"País-sede, pré-classificado para as oitavas de final",seeded:r=>`Pré-classificada para a ${r} pelo SSL Nations Ranking`},
 roles:{Helm:"Conduz o barco",Tactician:"Estratégia e decisões","Main Trimmer":"Vela grande",Trimmer:"Genoa e gennaker",Grinder:"Aciona os guinchos",Pit:"Adriças e controles","Mid-Bow":"Mastro e proa",Bow:"Proa e largadas",Floater:"Coringa / reserva"},
 back:"‹ Equipe",position:"Posição",team:"Equipe",indRank:"Ranking SSL",highlights:"Destaques",profile:"Perfil SSL ↗",findProfile:"Buscar perfil SSL ↗",ws:"World Sailing ↗",mates:"Companheiros de equipe",posTbc:"Posição a confirmar",noInfo:"Ainda não há mais detalhes publicados – os links abaixo buscam os perfis oficiais.",
 today:"Hoje",raceDay:(n,t)=>`dia de regata ${n} de ${t}`,finalDay:"Último dia – a última regata vale pontos em dobro",stream:"▶ Ao vivo",tracking:"Rastreamento",schedule:"Programação",adv:(a,b)=>`1º → ${a} · 2º → ${b}`,advSf:"1º–2º → Final · 3º–4º → Petit Final",clinched:"✓ classificado",elim:"eliminado",secNow:"Na rodada atual",secSeeded:r=>`Pré-classificadas – entram na ${r}`,secOut:"Eliminadas",lineup:"Escalação",
 howT:"Como funciona a Gold Cup",how:["Seleções nacionais, cada uma num SSL47 – todos os barcos são idênticos e fornecidos pela organização.","Grupos de quatro. 4-3-2-1 pontos por regata; a última regata do grupo vale em dobro (8-6-4-2).","Os dois primeiros de cada grupo avançam; as nações mais bem ranqueadas entram em rodadas posteriores.","Semifinais e finais têm uma única regata; a Grande Final decide o campeão mundial."],
 race:"Regata",nextRace:"Próxima regata",todayRaces:"Regatas de hoje",rioT:"horário do Rio",loc:"seu horário",onWater:"na água",done:"concluída",inX:m=>m<60?`em ${m} min`:`em ${Math.floor(m/60)} h ${String(m%60).padStart(2,"0")}`,firstStart:"Primeira largada",schedT:"Programação da rodada",schedNote:"Horários do Rio de Janeiro (UTC−3), conforme a programação oficial. Os grupos G1–G4 aparecem aqui como grupos A–D.",
 needT:"Antes da última regata (pontos em dobro)",need:{sure:"classificada, aconteça o que acontecer",gone:"eliminada, aconteça o que acontecer",win:"uma vitória basta",top:k=>`${k} lugar ou melhor basta`,mustWin:"precisa vencer",help:"e depende dos outros",maybe:k=>`${k} lugar pode bastar – depende dos outros`,iff:(k,c)=>`${k} lugar basta se ${c}`,mustIf:c=>`precisa vencer, e só se ${c}`,ahead:R=>`chegar à frente de ${R}`,behind:R=>`chegar atrás de ${R}`,notWin:R=>`${R} não vencer`,last:R=>`${R} terminar em último`,wins:R=>`${R} vencer`,tie:"empate em pontos possível – decide o critério de desempate"},needNote:"Calculado com a pontuação atual; ≈ indica possível empate, resolvido pelo critério oficial de desempate.",install:"Adicione à tela inicial para ter o ícone do app.",
 home:"Início",more:"Mais",sailors:"Velejadores",welcome:"Final Series · Rio de Janeiro",dates:"19 nov – 13 dez 2026 · Marina da Glória",progress:"Torneio",latest:"Últimos resultados",explore:"Explorar",tiles:{board:["Rodadas","Grupos, pontos, horários"],bracket:["Matchboard","A chave inteira num relance"],teams:["Equipes","40 nações, tripulações, ranking"],sailors:["Velejadores","Busque qualquer velejador"],qualifying:["Classificatórias","O caminho das equipes até o Rio"],gc2023:["Gold Cup 2023","A chave de 2023"]},
 showRound:"Abrir rodada ›",sailorsT:n=>`${n} velejadores`,sSearch:"Buscar velejador, equipe ou posição",withPhoto:"Com foto",allS:"Todos",moreT:"Mais",lang:"Idioma",design:"Tema",share:"Compartilhar app",shared:"Link copiado",links:"Links",about:"Sobre o app",aboutT:"App não oficial da SSL Gold Cup Rio 2026. Os resultados são atualizados automaticamente a partir da página oficial da SSL.",
 inst:{t:"Instalar o app",d:"Coloque a SSL Gold Cup na tela inicial – abre como um app, em tela cheia, com resultados ao vivo.",b:"Instalar",done:"Instalado ✓",ios:["Toque no botão Compartilhar","na parte de baixo do Safari (no iPad, no canto superior direito).","Role para baixo e toque em “Adicionar à Tela de Início”.","Toque em “Adicionar” – pronto."],iosOther:"No iPhone isso funciona no Safari: abra esta página primeiro no Safari.",android:["Toque no menu ⋮ no canto superior direito do navegador.","Toque em “Instalar app” ou “Adicionar à tela inicial”.","Confirme com “Instalar”."],desk:["Clique no ícone de instalação na barra de endereço,","ou abra o menu do navegador e escolha “Instalar SSL Gold Cup”."],how:"Como instalar o app",hide:"Agora não",installedNote:"Você está usando o app instalado."},
 fsT:"Final Series",qsT:"Qualifying Series",qsLeg:"Destacadas: classificadas por esta série. ● = no Rio pelo SSL Nations Ranking. Toque numa equipe que está no Rio para ver a página dela.",qsNote:"O vencedor de cada grupo classificatório (grupo C: os dois primeiros) foi sorteado para a 1/32 de final. 29 equipes se classificaram para a Final Series pelo SSL Ranking, com vagas por continente: 12 Europa, 8 Pan-América, 6 Ásia, 1 África, 2 Oceania.",reg:{asia:"Ásia",afoc:"África e Oceania",eur:"Europa",pam:"Pan-América"},fin:"Final",petit:"Petit F.",swipe:"Deslize para o lado para as próximas rodadas →",road2:"Caminho até o Rio",inRio:"No Rio pelo SSL Ranking",mbHint:"Os dois primeiros de cada grupo avançam. Toque numa equipe para ver tripulação e histórico."},

zh:{rounds:"轮次",bracket:"对阵图",teams:"队伍",official:"官方成绩",updated:"更新于",ago:m=>m<1?"刚刚":m<60?`${m} 分钟前`:`${Math.round(m/60)} 小时前`,rio:"里约时间",offline:"离线——上次保存的数据",
 rn:{r32:"1/32 决赛",r16:"1/16 决赛",r8:"1/8 决赛",r4:"四分之一决赛",sf:"半决赛",pf:"小决赛",f:"总决赛"},
 group:"小组",decided:"已决出",racing:"比赛中",open:"未开始",st:{done:"已结束",live:"进行中",up:"即将开始"},races:n=>`每组 ${n} 场比赛`,
 upNext:"下一轮",startsIn:d=>d<=0?"今天开始":d==1?"明天开始":`${d} 天后开始`,groupsOf4:n=>`${n} 个四队小组`,oneRace:"只赛一场——冲线顺序决定名次。",
 through:"晋级",out:"出局",toFinal:"进入决赛",toPetit:"进入小决赛",medals:["金牌","银牌","铜牌","第4名"],pts:"积分",
 outIn:(r,g,p)=>`在${r}出局（${g} 组，${p}）`,gf:m=>`总决赛：${m}`,finished:p=>`最终${p}`,thrTbc:"已晋级——下一轮小组待定",
 seeded:(r,g,d)=>`种子队——从${r}开始参赛，${g} 组，${d}`,racingNow:"正在比赛",
 nations:n=>`${n} 个国家`,stillIn:"仍在比赛",outN:"已出局",search:"搜索国家、昵称或帆手",all:"全部",chipIn:"仍在比赛",chipOut:"已出局",mine:"★ 我的队伍",sStatus:"状态",sRank:"排名",sAz:"A–Z",noTeam:"未找到队伍。",rank:"排名",
 captain:"队长",helm:"舵手",ranking:"SSL 国家排名",rankBoard:"查看排名 ↗",entered:"里约参赛起点",showRound:"查看该轮 ›",gc23:"2023 金杯",br23:"2023 对阵图 ›",status:"状态",stIn:"仍在比赛",stOut:"已出局",whereEnded:"止步之处 ›",curGroup:"当前小组 ›",
 background:"背景",road:"晋级之路",story:"故事",site:"队伍网站",qualRes:"资格赛成绩 ↗",sslRank:"SSL 国家排名 ↗",resRio:"里约成绩",photos:"船员照片",byPos:"按岗位的船员",leader:"队伍领队",wider:"扩展名单 · 岗位待定",
 squadNote:(n,p)=>`名单共 ${n} 人。每场比赛 8–10 人出海，阵容每天可能不同。岗位和号码来自官方队伍网站；肖像来自里约金杯赛事图形${p?"":"（该队暂无）"}。`,
 noSquad:"该队尚未公布名单。",showPath:"在对阵图中显示路线",copyLink:"复制链接",copied:"链接已复制",close:"关闭",jersey:"号码",numTbc:"号码待定",capTag:"队长",favOn:"已关注",favOff:"关注",
 brHint:"点击队伍查看船员和历史。左右滑动查看后续轮次。",h23:"2023 金杯",champ23:"大加那利岛 · 冠军",hl:"已高亮",tap26:"点击队伍查看其 2026 里约页面。",off23:"2023 官方成绩 ↗",
 myTeams:"我的队伍",myHint:"在队伍页面点击 ☆ 即可关注。",
 foot:"计分：每场 4-3-2-1 分，每组最后一场双倍积分（8-6-4-2）。每组前两名晋级。成绩自动从 SSL 官方成绩页更新。排名 = Final Series 开始时的 SSL 国家排名。",
 notes:{ocs:"* OCS（抢航）  ** 标准判罚"},theme:{auto:"🌊 Matchboard",light:"☀️ 日间",dark:"🌙 夜间"},
 g23:{champ:"冠军（金牌）",second:"亚军（银牌）",third:"季军（铜牌）",fourth:"第4名 – 总决赛",sf:"半决赛",qf:"四分之一决赛",r8:"1/8 决赛",r16:"1/16 决赛",r32:"1/32 决赛",none:"未参加 2023 年 Final Series"},
 ev:{asia:"亚洲资格赛",afoc:"非洲及大洋洲资格赛",eu1:"欧洲资格赛 1",eu2:"欧洲资格赛 2",pan:"泛美资格赛"},
 route:{won:(e,g)=>`赢得${e} ${g} 组`,pos:(p,e,g)=>`${e} ${g} 组${p}`,lc:(e,g)=>`${e} ${g} 组第3名，随后赢得“最后机会”赛`,ranking:"凭 SSL 国家排名获得资格",host:"东道主，直接进入 1/8 决赛",seeded:r=>`凭 SSL 国家排名直接进入${r}`},
 roles:{Helm:"掌舵",Tactician:"战术与决策","Main Trimmer":"主帆",Trimmer:"前帆与球帆",Grinder:"绞盘动力",Pit:"升帆索与控制","Mid-Bow":"桅杆与前甲板",Bow:"船首与起航",Floater:"替补 / 机动"},
 back:"‹ 队伍",position:"岗位",team:"队伍",indRank:"SSL 排名",highlights:"主要成就",profile:"SSL 资料 ↗",findProfile:"查找 SSL 资料 ↗",ws:"World Sailing ↗",mates:"队友",posTbc:"岗位待定",noInfo:"暂无更多公开信息——下方链接可搜索官方资料。",
 today:"今天",raceDay:(n,t)=>`第 ${n} / ${t} 比赛日`,finalDay:"最后一天——最后一场双倍积分",stream:"▶ 直播",tracking:"实时追踪",schedule:"赛程",adv:(a,b)=>`第1名 → ${a} · 第2名 → ${b}`,advSf:"第1–2名 → 决赛 · 第3–4名 → 小决赛",clinched:"✓ 已晋级",elim:"出局",secNow:"本轮参赛",secSeeded:r=>`种子队——从${r}开始`,secOut:"已出局",lineup:"阵容",
 howT:"金杯赛制",how:["国家队，每队一艘 SSL47——所有船只完全相同，由主办方提供。","四队一组。每场 4-3-2-1 分；每组最后一场双倍积分（8-6-4-2）。","每组前两名晋级；排名靠前的国家从后面的轮次开始参赛。","半决赛和决赛各只赛一场；总决赛决出世界冠军。"],
 race:"比赛",nextRace:"下一场",todayRaces:"今日比赛",rioT:"里约时间",loc:"你的时间",onWater:"正在比赛",done:"已结束",inX:m=>m<60?`${m} 分钟后`:`${Math.floor(m/60)} 小时 ${String(m%60).padStart(2,"0")} 分后`,firstStart:"首场起航",schedT:"本轮赛程",schedNote:"时间为里约热内卢时间（UTC−3），依据官方赛程。官方的 G1–G4 组在此显示为 A–D 组。",
 needT:"最后一场之前（双倍积分）",need:{sure:"无论如何都已晋级",gone:"无论如何都已出局",win:"获胜即可晋级",top:k=>`${k}或更好即可`,mustWin:"必须获胜",help:"并需要其他队帮忙",maybe:k=>`${k}可能足够——取决于其他队`,iff:(k,c)=>`${k}即可，前提是${c}`,mustIf:c=>`必须获胜，且只有在${c}时`,ahead:R=>`领先 ${R}`,behind:R=>`落后于 ${R}`,notWin:R=>`${R} 没有获胜`,last:R=>`${R} 最后一名`,wins:R=>`${R} 获胜`,tie:"可能同分——由打破平局规则决定"},needNote:"根据当前积分计算；≈ 表示可能同分，届时由官方打破平局规则决定。",install:"添加到主屏幕即可获得应用图标。",
 home:"首页",more:"更多",sailors:"帆手",welcome:"Final Series · 里约热内卢",dates:"2026年11月19日 – 12月13日 · Marina da Glória",progress:"赛事进度",latest:"最新成绩",explore:"浏览",tiles:{board:["轮次","小组、积分、时间"],bracket:["对阵图","一览完整赛程"],teams:["队伍","40 个国家、船员、排名"],sailors:["帆手","搜索所有帆手"],qualifying:["资格赛","各队如何晋级里约"],gc2023:["2023 金杯","上届对阵图"]},
 showRound:"打开该轮 ›",sailorsT:n=>`${n} 名帆手`,sSearch:"搜索帆手、队伍或岗位",withPhoto:"有照片",allS:"全部",moreT:"更多",lang:"语言",design:"主题",share:"分享应用",shared:"链接已复制",links:"链接",about:"关于本应用",aboutT:"SSL 金杯里约 2026 的非官方伴侣应用。成绩自动从 SSL 官方成绩页更新。",
 inst:{t:"安装应用",d:"把 SSL Gold Cup 添加到主屏幕——像应用一样全屏打开，实时查看成绩。",b:"安装",done:"已安装 ✓",ios:["点按分享按钮","（位于 Safari 底部，iPad 在右上角）。","向下滚动，点按“添加到主屏幕”。","点按“添加”——完成。"],iosOther:"在 iPhone 上请使用 Safari：先在 Safari 中打开此页面。",android:["点按浏览器右上角的 ⋮ 菜单。","点按“安装应用”或“添加到主屏幕”。","点按“安装”确认。"],desk:["点击地址栏中的安装图标，","或在浏览器菜单中选择“安装 SSL Gold Cup”。"],how:"如何安装应用",hide:"以后再说",installedNote:"你正在使用已安装的应用。"},
 fsT:"Final Series",qsT:"Qualifying Series",qsLeg:"高亮：通过该系列赛晋级。● = 凭 SSL 国家排名来到里约。点击已在里约的队伍查看其页面。",qsNote:"每个资格赛小组的冠军（C 组：前两名）被抽签进入 1/32 决赛。另有 29 支队伍凭 SSL 排名进入 Final Series，按大洲分配名额：欧洲 12、泛美 8、亚洲 6、非洲 1、大洋洲 2。",reg:{asia:"亚洲",afoc:"非洲及大洋洲",eur:"欧洲",pam:"泛美"},fin:"决赛",petit:"小决赛",swipe:"左右滑动查看后续轮次 →",road2:"晋级之路",inRio:"凭 SSL 排名来到里约",mbHint:"每组前两名晋级。点击队伍查看船员和历史。"},

ar:{rounds:"الأدوار",bracket:"Matchboard",teams:"الفرق",official:"النتائج الرسمية",updated:"آخر تحديث",ago:m=>m<1?"الآن":m<60?`قبل ${m} دقيقة`:`قبل ${Math.round(m/60)} ساعة`,rio:"توقيت ريو",offline:"دون اتصال – آخر بيانات محفوظة",
 rn:{r32:"نهائيات 1/32",r16:"نهائيات 1/16",r8:"نهائيات 1/8",r4:"ربع النهائي",sf:"نصف النهائي",pf:"النهائي الصغير",f:"النهائي الكبير"},
 group:"المجموعة",decided:"حُسمت",racing:"جارية",open:"لم تبدأ",st:{done:"منتهية",live:"جارية",up:"قادمة"},races:n=>`${n} سباقات لكل مجموعة`,
 upNext:"التالي",startsIn:d=>d<=0?"تبدأ اليوم":d==1?"تبدأ غدًا":`تبدأ بعد ${d} أيام`,groupsOf4:n=>`${n} مجموعات من أربعة فرق`,oneRace:"سباق واحد – ترتيب الوصول هو الحاسم.",
 through:"متأهل",out:"خارج",toFinal:"إلى النهائي",toPetit:"إلى النهائي الصغير",medals:["ذهبية","فضية","برونزية","الرابع"],pts:"نقاط",
 outIn:(r,g,p)=>`خرج في ${r} (المجموعة ${g}، ${p})`,gf:m=>`النهائي الكبير: ${m}`,finished:p=>`أنهى ${p}`,thrTbc:"متأهل – المجموعة التالية لم تُحدد بعد",
 seeded:(r,g,d)=>`مصنّف – يبدأ في ${r}، المجموعة ${g}، ${d}`,racingNow:"يتسابق الآن",
 nations:n=>`${n} دولة`,stillIn:"ما زالت في المنافسة",outN:"خارج المنافسة",search:"ابحث عن دولة أو لقب أو بحّار",all:"الكل",chipIn:"في المنافسة",chipOut:"خارج",mine:"★ فرقي",sStatus:"الحالة",sRank:"التصنيف",sAz:"أ–ي",noTeam:"لم يُعثر على فريق.",rank:"التصنيف",
 captain:"القائد",helm:"قائد الدفة",ranking:"تصنيف SSL للدول",rankBoard:"لوحة التصنيف ↗",entered:"بدأ في ريو من",showRound:"عرض ذلك الدور ›",gc23:"Gold Cup 2023",br23:"شجرة 2023 ›",status:"الحالة",stIn:"في المنافسة",stOut:"خارج",whereEnded:"أين انتهى ›",curGroup:"المجموعة الحالية ›",
 background:"نبذة",road:"الطريق إلى ريو",story:"القصة",site:"موقع الفريق",qualRes:"نتائج التصفيات ↗",sslRank:"تصنيف SSL للدول ↗",resRio:"النتائج في ريو",photos:"صور الطاقم",byPos:"الطاقم حسب المركز",leader:"قائد الفريق",wider:"القائمة الموسعة · المركز لم يُحدد",
 squadNote:(n,p)=>`${n} أسماء في القائمة. يبحر 8–10 في كل سباق وقد تتغير التشكيلة من يوم لآخر. المراكز والأرقام من الموقع الرسمي للفريق؛ الصور من رسومات Gold Cup ريو${p?"":" (لا توجد بعد لهذا الفريق)"}.`,
 noSquad:"لم تُنشر قائمة هذا الفريق بعد.",showPath:"عرض المسار في الشجرة",copyLink:"نسخ الرابط",copied:"تم نسخ الرابط",close:"إغلاق",jersey:"رقم القميص",numTbc:"الرقم لم يُحدد",capTag:"القائد",favOn:"تتابعه",favOff:"متابعة",
 brHint:"اضغط على فريق لرؤية الطاقم والتاريخ. اسحب لرؤية الأدوار التالية.",h23:"Gold Cup 2023",champ23:"غران كناريا · البطل",hl:"مُبرز",tap26:"اضغط على فريق لصفحته في ريو 2026.",off23:"النتائج الرسمية 2023 ↗",
 myTeams:"فرقي",myHint:"اضغط ☆ في صفحة الفريق لمتابعته.",
 foot:"النقاط: 4-3-2-1 لكل سباق، ونقاط مضاعفة في آخر سباق لكل مجموعة (8-6-4-2). يتأهل الأول والثاني من كل مجموعة. تُحدَّث النتائج تلقائيًا من صفحة نتائج SSL الرسمية. التصنيف = تصنيف SSL للدول عند بداية Final Series.",
 notes:{ocs:"* OCS (انطلاق مبكر)  ** عقوبة قياسية"},theme:{auto:"🌊 Matchboard",light:"☀️ نهاري",dark:"🌙 ليلي"},
 g23:{champ:"البطل (ذهبية)",second:"الوصيف (فضية)",third:"الثالث (برونزية)",fourth:"الرابع – النهائي الكبير",sf:"نصف النهائي",qf:"ربع النهائي",r8:"نهائيات 1/8",r16:"نهائيات 1/16",r32:"نهائيات 1/32",none:"لم يشارك في Final Series 2023"},
 ev:{asia:"التصفيات الآسيوية",afoc:"تصفيات أفريقيا وأوقيانوسيا",eu1:"التصفيات الأوروبية 1",eu2:"التصفيات الأوروبية 2",pan:"تصفيات الأمريكتين"},
 route:{won:(e,g)=>`فاز في ${e}، المجموعة ${g}`,pos:(p,e,g)=>`${p} في ${e}، المجموعة ${g}`,lc:(e,g)=>`الثالث في ${e}، المجموعة ${g}، ثم فاز بسباق الفرصة الأخيرة`,ranking:"تأهل عبر تصنيف SSL للدول",host:"البلد المضيف، مصنّف مباشرة في نهائيات 1/8",seeded:r=>`مصنّف مباشرة في ${r} عبر تصنيف SSL للدول`},
 roles:{Helm:"يقود القارب",Tactician:"الاستراتيجية والقرارات","Main Trimmer":"الشراع الرئيسي",Trimmer:"الشراع الأمامي والجيناكر",Grinder:"يشغّل الروافع",Pit:"الحبال وأدوات التحكم","Mid-Bow":"الصاري والسطح الأمامي",Bow:"المقدمة والانطلاق",Floater:"احتياطي / متعدد المهام"},
 back:"› الفريق",position:"المركز",team:"الفريق",indRank:"تصنيف SSL",highlights:"أبرز الإنجازات",profile:"ملف SSL ↗",findProfile:"ابحث عن ملف SSL ↗",ws:"World Sailing ↗",mates:"زملاء الفريق",posTbc:"المركز لم يُحدد",noInfo:"لم تُنشر تفاصيل أخرى بعد – الروابط أدناه تبحث في الملفات الرسمية.",
 today:"اليوم",raceDay:(n,t)=>`يوم السباق ${n} من ${t}`,finalDay:"اليوم الأخير – السباق الأخير بنقاط مضاعفة",stream:"▶ البث المباشر",tracking:"التتبع",schedule:"الجدول",adv:(a,b)=>`الأول ← ${a} · الثاني ← ${b}`,advSf:"الأول–الثاني ← النهائي · الثالث–الرابع ← النهائي الصغير",clinched:"✓ متأهل",elim:"خارج",secNow:"في الدور الحالي",secSeeded:r=>`مصنّفة – تبدأ في ${r}`,secOut:"خارج المنافسة",lineup:"التشكيلة",
 howT:"كيف تعمل Gold Cup",how:["منتخبات وطنية، لكل منها قارب SSL47 – جميع القوارب متطابقة ويوفرها المنظمون.","مجموعات من أربعة فرق. 4-3-2-1 نقاط لكل سباق؛ آخر سباق في كل مجموعة بنقاط مضاعفة (8-6-4-2).","يتأهل الأول والثاني من كل مجموعة؛ الدول الأعلى تصنيفًا تبدأ في أدوار لاحقة.","نصف النهائي والنهائي سباق واحد لكل منهما؛ النهائي الكبير يحدد بطل العالم."],
 race:"السباق",nextRace:"السباق التالي",todayRaces:"سباقات اليوم",rioT:"توقيت ريو",loc:"توقيتك",onWater:"في الماء",done:"انتهى",inX:m=>m<60?`بعد ${m} دقيقة`:`بعد ${Math.floor(m/60)} س ${String(m%60).padStart(2,"0")} د`,firstStart:"أول انطلاق",schedT:"جدول الدور",schedNote:"الأوقات بتوقيت ريو دي جانيرو (UTC−3) حسب الجدول الرسمي. تظهر مجموعاته G1–G4 هنا كمجموعات A–D.",
 needT:"قبل السباق الأخير (نقاط مضاعفة)",need:{sure:"متأهل مهما حدث",gone:"خارج مهما حدث",win:"الفوز يكفي",top:k=>`المركز ${k} أو أفضل يكفي`,mustWin:"يجب أن يفوز",help:"ويحتاج إلى مساعدة الآخرين",maybe:k=>`قد يكفي المركز ${k} – حسب نتائج الآخرين`,iff:(k,c)=>`المركز ${k} يكفي إذا ${c}`,mustIf:c=>`يجب أن يفوز، وفقط إذا ${c}`,ahead:R=>`أنهى أمام ${R}`,behind:R=>`أنهى خلف ${R}`,notWin:R=>`لم يفز ${R}`,last:R=>`أنهى ${R} أخيرًا`,wins:R=>`فاز ${R}`,tie:"تعادل في النقاط ممكن – تحسمه قاعدة كسر التعادل"},needNote:"محسوب من النقاط الحالية؛ ≈ تعني تعادلًا محتملًا تحسمه قاعدة كسر التعادل الرسمية.",install:"أضفه إلى الشاشة الرئيسية لتحصل على أيقونة التطبيق.",
 home:"الرئيسية",more:"المزيد",sailors:"البحّارة",welcome:"Final Series · ريو دي جانيرو",dates:"19 نوفمبر – 13 ديسمبر 2026 · مارينا دا غلوريا",progress:"البطولة",latest:"أحدث النتائج",explore:"استكشف",tiles:{board:["الأدوار","المجموعات والنقاط والأوقات"],bracket:["Matchboard","الشجرة كاملة بنظرة واحدة"],teams:["الفرق","40 دولة، الأطقم، التصنيف"],sailors:["البحّارة","ابحث عن أي بحّار"],qualifying:["التصفيات","طريق الفرق إلى ريو"],gc2023:["Gold Cup 2023","شجرة النسخة السابقة"]},
 showRound:"افتح الدور ›",sailorsT:n=>`${n} بحّارًا`,sSearch:"ابحث عن بحّار أو فريق أو مركز",withPhoto:"مع صورة",allS:"الكل",moreT:"المزيد",lang:"اللغة",design:"المظهر",share:"مشاركة التطبيق",shared:"تم نسخ الرابط",links:"روابط",about:"عن التطبيق",aboutT:"تطبيق مرافق غير رسمي لبطولة SSL Gold Cup ريو 2026. تُحدَّث النتائج تلقائيًا من صفحة نتائج SSL الرسمية.",
 inst:{t:"تثبيت التطبيق",d:"ضع SSL Gold Cup على شاشتك الرئيسية – يفتح كتطبيق بملء الشاشة مع النتائج المباشرة.",b:"تثبيت",done:"تم التثبيت ✓",ios:["اضغط زر المشاركة","أسفل Safari (أعلى اليمين في iPad).","مرّر للأسفل واضغط «إضافة إلى الشاشة الرئيسية».","اضغط «إضافة» – انتهى."],iosOther:"على iPhone يعمل ذلك في Safari: افتح هذه الصفحة في Safari أولًا.",android:["اضغط قائمة ⋮ في أعلى المتصفح.","اضغط «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».","أكّد بالضغط على «تثبيت»."],desk:["انقر أيقونة التثبيت في شريط العنوان،","أو افتح قائمة المتصفح واختر «تثبيت SSL Gold Cup»."],how:"كيفية تثبيت التطبيق",hide:"ليس الآن",installedNote:"أنت تستخدم التطبيق المثبّت."},
 fsT:"Final Series",qsT:"Qualifying Series",qsLeg:"المُبرز: تأهل عبر هذه السلسلة. ● = في ريو عبر تصنيف SSL للدول. اضغط على فريق موجود في ريو لصفحته.",qsNote:"سُحب الفائز بكل مجموعة تصفيات (المجموعة C: الأول والثاني) إلى نهائيات 1/32. وتأهل 29 فريقًا إلى Final Series عبر تصنيف SSL، مع مقاعد لكل قارة: 12 أوروبا، 8 الأمريكتان، 6 آسيا، 1 أفريقيا، 2 أوقيانوسيا.",reg:{asia:"آسيا",afoc:"أفريقيا وأوقيانوسيا",eur:"أوروبا",pam:"الأمريكتان"},fin:"النهائي",petit:"النهائي الصغير",swipe:"اسحب جانبًا لرؤية الأدوار التالية ←",road2:"الطريق إلى ريو",inRio:"في ريو عبر تصنيف SSL",mbHint:"يتأهل الأول والثاني من كل مجموعة. اضغط على فريق لرؤية الطاقم والتاريخ."},
};
for(const l in SL)S[l]=SL[l];
const SN={
en:{champT:"World Champion · Gold Cup 2026",standT:"Final standings",statsT:"In numbers",stRaces:"Races",stWins:"Race wins",stAvg:"Avg. place",stPts:"Points in Rio",stHist:"Race by race",calBtn:"📅 Races in my calendar",calT:"Races in your calendar",calSub:"Subscribe (iPhone, Mac, Outlook)",calG:"Add to Google Calendar",calDl:"Download file (.ics)",calAll:"All races in my calendar",calNote:"A subscription updates itself: when a team qualifies, its next races appear automatically.",wxT:"Wind forecast · Marina da Glória",wxSrc:"Forecast by Open-Meteo, not measured on the course.",trk:"Tracking",delayed:m=>`Results may be delayed – last successful check ${m} min ago.`,shareImg:"Share as image",imgDone:"Image ready"},
de:{champT:"Weltmeister · Gold Cup 2026",standT:"Endstand",statsT:"In Zahlen",stRaces:"Rennen",stWins:"Rennsiege",stAvg:"Ø Platz",stPts:"Punkte in Rio",stHist:"Rennen für Rennen",calBtn:"📅 Rennen in meinen Kalender",calT:"Rennen in deinen Kalender",calSub:"Abonnieren (iPhone, Mac, Outlook)",calG:"Zu Google Kalender hinzufügen",calDl:"Datei herunterladen (.ics)",calAll:"Alle Rennen in meinen Kalender",calNote:"Ein Abo aktualisiert sich selbst: Kommt ein Team weiter, erscheinen seine nächsten Rennen automatisch.",wxT:"Windvorhersage · Marina da Glória",wxSrc:"Vorhersage von Open-Meteo, nicht auf der Bahn gemessen.",trk:"Tracking",delayed:m=>`Ergebnisse evtl. verzögert – letzte erfolgreiche Prüfung vor ${m} Min.`,shareImg:"Als Bild teilen",imgDone:"Bild erstellt"},
fr:{champT:"Champion du monde · Gold Cup 2026",standT:"Classement final",statsT:"En chiffres",stRaces:"Courses",stWins:"Victoires",stAvg:"Place moy.",stPts:"Points à Rio",stHist:"Course par course",calBtn:"📅 Courses dans mon agenda",calT:"Les courses dans votre agenda",calSub:"S'abonner (iPhone, Mac, Outlook)",calG:"Ajouter à Google Agenda",calDl:"Télécharger le fichier (.ics)",calAll:"Toutes les courses dans mon agenda",calNote:"Un abonnement se met à jour tout seul : quand une équipe se qualifie, ses courses suivantes apparaissent.",wxT:"Prévision de vent · Marina da Glória",wxSrc:"Prévision Open-Meteo, non mesurée sur le plan d'eau.",trk:"Suivi",delayed:m=>`Résultats peut-être retardés – dernière vérification réussie il y a ${m} min.`,shareImg:"Partager en image",imgDone:"Image prête"},
es:{champT:"Campeón del mundo · Gold Cup 2026",standT:"Clasificación final",statsT:"En cifras",stRaces:"Regatas",stWins:"Victorias",stAvg:"Puesto medio",stPts:"Puntos en Río",stHist:"Regata a regata",calBtn:"📅 Regatas en mi calendario",calT:"Las regatas en tu calendario",calSub:"Suscribirse (iPhone, Mac, Outlook)",calG:"Añadir a Google Calendar",calDl:"Descargar archivo (.ics)",calAll:"Todas las regatas en mi calendario",calNote:"La suscripción se actualiza sola: cuando un equipo se clasifica, aparecen sus próximas regatas.",wxT:"Previsión de viento · Marina da Glória",wxSrc:"Previsión de Open-Meteo, no medida en el campo de regatas.",trk:"Tracking",delayed:m=>`Resultados quizá con retraso – última comprobación correcta hace ${m} min.`,shareImg:"Compartir como imagen",imgDone:"Imagen lista"},
pt:{champT:"Campeão mundial · Gold Cup 2026",standT:"Classificação final",statsT:"Em números",stRaces:"Regatas",stWins:"Vitórias",stAvg:"Média de posição",stPts:"Pontos no Rio",stHist:"Regata a regata",calBtn:"📅 Regatas na minha agenda",calT:"Regatas na sua agenda",calSub:"Assinar (iPhone, Mac, Outlook)",calG:"Adicionar ao Google Agenda",calDl:"Baixar arquivo (.ics)",calAll:"Todas as regatas na minha agenda",calNote:"A assinatura se atualiza sozinha: quando uma equipe se classifica, as próximas regatas aparecem automaticamente.",wxT:"Previsão de vento · Marina da Glória",wxSrc:"Previsão da Open-Meteo, não medida na raia.",trk:"Rastreamento",delayed:m=>`Resultados podem estar atrasados – última verificação bem-sucedida há ${m} min.`,shareImg:"Compartilhar como imagem",imgDone:"Imagem pronta"},
zh:{champT:"世界冠军 · 2026 金杯",standT:"最终排名",statsT:"数据",stRaces:"比赛",stWins:"分站胜场",stAvg:"平均名次",stPts:"里约积分",stHist:"逐场成绩",calBtn:"📅 把比赛加入日历",calT:"把比赛加入你的日历",calSub:"订阅（iPhone、Mac、Outlook）",calG:"添加到 Google 日历",calDl:"下载文件（.ics）",calAll:"把全部比赛加入日历",calNote:"订阅会自动更新：队伍晋级后，下一轮比赛会自动出现。",wxT:"风力预报 · Marina da Glória",wxSrc:"Open-Meteo 预报，并非赛场实测。",trk:"实时追踪",delayed:m=>`成绩可能延迟——上次成功检查是 ${m} 分钟前。`,shareImg:"分享为图片",imgDone:"图片已生成"},
ar:{champT:"بطل العالم · Gold Cup 2026",standT:"الترتيب النهائي",statsT:"بالأرقام",stRaces:"السباقات",stWins:"الانتصارات",stAvg:"متوسط المركز",stPts:"النقاط في ريو",stHist:"سباقًا بسباق",calBtn:"📅 السباقات في تقويمي",calT:"السباقات في تقويمك",calSub:"اشترك (iPhone وMac وOutlook)",calG:"أضف إلى تقويم Google",calDl:"تنزيل الملف (.ics)",calAll:"كل السباقات في تقويمي",calNote:"الاشتراك يتحدّث تلقائيًا: عندما يتأهل فريق تظهر سباقاته التالية.",wxT:"توقعات الرياح · مارينا دا غلوريا",wxSrc:"توقعات Open-Meteo، وليست قياسًا في موقع السباق.",trk:"التتبع",delayed:m=>`قد تتأخر النتائج – آخر تحقق ناجح قبل ${m} دقيقة.`,shareImg:"مشاركة كصورة",imgDone:"الصورة جاهزة"}};
for(const l in SN)Object.assign(S[l],SN[l]);
const SP={
en:{pT:"Notifications",pAll:"All results",pAllSub:"A notification after every race",pTeamOff:"🔔 Notify me about this team",pTeamOn:"🔔 Notifications on ✓",pTeams:"Your teams",pNone:"No team yet: open a team and tap 🔔.",pNote:"You only get race results and who goes through. Switch off here any time.",pIOS:"On iPhone, notifications only work in the installed app: install it, open it from the home screen, then switch them on here.",pDenied:"Notifications are blocked. Allow them for this app in your device settings.",pErr:"That didn't work – please try again in a moment.",pOnT:"Notifications on",pOffT:"Notifications off",pUnsup:"This browser can't receive notifications."},
de:{pT:"Mitteilungen",pAll:"Alle Ergebnisse",pAllSub:"Nach jedem Rennen eine Mitteilung",pTeamOff:"🔔 Mitteilungen für dieses Team",pTeamOn:"🔔 Mitteilungen an ✓",pTeams:"Deine Teams",pNone:"Noch kein Team: Öffne ein Team und tippe auf 🔔.",pNote:"Du bekommst nur Rennergebnisse und wer weiterkommt. Abschalten jederzeit hier.",pIOS:"Auf dem iPhone kommen Mitteilungen nur in der installierten App: App installieren, vom Home-Bildschirm öffnen und dann hier einschalten.",pDenied:"Mitteilungen sind blockiert. Erlaube sie in den Einstellungen deines Geräts für diese App.",pErr:"Hat gerade nicht geklappt – bitte gleich nochmal versuchen.",pOnT:"Mitteilungen an",pOffT:"Mitteilungen aus",pUnsup:"Dieser Browser kann keine Mitteilungen empfangen."},
fr:{pT:"Notifications",pAll:"Tous les résultats",pAllSub:"Une notification après chaque course",pTeamOff:"🔔 M'avertir pour cette équipe",pTeamOn:"🔔 Notifications activées ✓",pTeams:"Vos équipes",pNone:"Aucune équipe : ouvrez une équipe et touchez 🔔.",pNote:"Vous recevez seulement les résultats des courses et les qualifiés. Désactivable ici à tout moment.",pIOS:"Sur iPhone, les notifications ne fonctionnent que dans l'app installée : installez-la, ouvrez-la depuis l'écran d'accueil, puis activez-les ici.",pDenied:"Les notifications sont bloquées. Autorisez-les pour cette app dans les réglages de l'appareil.",pErr:"Ça n'a pas marché – réessayez dans un instant.",pOnT:"Notifications activées",pOffT:"Notifications désactivées",pUnsup:"Ce navigateur ne peut pas recevoir de notifications."},
es:{pT:"Notificaciones",pAll:"Todos los resultados",pAllSub:"Una notificación tras cada regata",pTeamOff:"🔔 Avisarme de este equipo",pTeamOn:"🔔 Notificaciones activadas ✓",pTeams:"Tus equipos",pNone:"Ningún equipo aún: abre un equipo y toca 🔔.",pNote:"Solo recibes resultados de regatas y quién se clasifica. Se desactiva aquí cuando quieras.",pIOS:"En iPhone, las notificaciones solo funcionan en la app instalada: instálala, ábrela desde la pantalla de inicio y actívalas aquí.",pDenied:"Las notificaciones están bloqueadas. Permítelas para esta app en los ajustes del dispositivo.",pErr:"No ha funcionado; inténtalo de nuevo en un momento.",pOnT:"Notificaciones activadas",pOffT:"Notificaciones desactivadas",pUnsup:"Este navegador no puede recibir notificaciones."},
pt:{pT:"Notificações",pAll:"Todos os resultados",pAllSub:"Uma notificação após cada regata",pTeamOff:"🔔 Avisar sobre esta equipe",pTeamOn:"🔔 Notificações ativadas ✓",pTeams:"Suas equipes",pNone:"Nenhuma equipe ainda: abra uma equipe e toque em 🔔.",pNote:"Você recebe apenas resultados das regatas e quem avança. Desative aqui quando quiser.",pIOS:"No iPhone, as notificações só funcionam no app instalado: instale, abra pela tela inicial e ative aqui.",pDenied:"As notificações estão bloqueadas. Permita-as para este app nas configurações do aparelho.",pErr:"Não funcionou – tente novamente daqui a pouco.",pOnT:"Notificações ativadas",pOffT:"Notificações desativadas",pUnsup:"Este navegador não recebe notificações."},
zh:{pT:"通知",pAll:"全部成绩",pAllSub:"每场比赛后推送通知",pTeamOff:"🔔 接收此队通知",pTeamOn:"🔔 已开启通知 ✓",pTeams:"你的队伍",pNone:"还没有关注队伍：打开一支队伍并点按 🔔。",pNote:"只推送比赛成绩和晋级信息。可随时在此关闭。",pIOS:"在 iPhone 上，通知仅在已安装的应用中可用：先安装应用，从主屏幕打开，再在此开启。",pDenied:"通知已被屏蔽。请在设备设置中允许此应用发送通知。",pErr:"操作未成功，请稍后再试。",pOnT:"已开启通知",pOffT:"已关闭通知",pUnsup:"此浏览器无法接收通知。"},
ar:{pT:"الإشعارات",pAll:"كل النتائج",pAllSub:"إشعار بعد كل سباق",pTeamOff:"🔔 أشعرني بنتائج هذا الفريق",pTeamOn:"🔔 الإشعارات مفعّلة ✓",pTeams:"فرقك",pNone:"لا يوجد فريق بعد: افتح فريقًا واضغط 🔔.",pNote:"تصلك فقط نتائج السباقات ومن يتأهل. يمكنك الإيقاف هنا في أي وقت.",pIOS:"على iPhone تعمل الإشعارات فقط في التطبيق المثبّت: ثبّت التطبيق، وافتحه من الشاشة الرئيسية، ثم فعّلها هنا.",pDenied:"الإشعارات محظورة. اسمح بها لهذا التطبيق من إعدادات جهازك.",pErr:"لم تنجح العملية – حاول مرة أخرى بعد قليل.",pOnT:"تم تفعيل الإشعارات",pOffT:"تم إيقاف الإشعارات",pUnsup:"هذا المتصفح لا يستقبل الإشعارات."}};
for(const l in SP)Object.assign(S[l],SP[l]);



const SZ={"en":{"fsT":"Final Series","qsT":"Qualifying Series","qsLeg":"Highlighted: qualified through this series. ● = in Rio via the SSL Nations Ranking. Tap a team in Rio for its page.","qsNote":"The winner of each qualifying group (group C: top two) was drawn into the 1/32 Finals. 29 teams qualified for the Final Series via the SSL Ranking, with spots per continent: 12 Europe, 8 Pan-America, 6 Asia, 1 Africa, 2 Oceania.","reg":{"asia":"Asia","afoc":"Africa & Oceania","eur":"Europe","pam":"Pan-America"},"fin":"Final","petit":"Petit F.","swipe":"Swipe sideways for later rounds →","road2":"Road to Rio","inRio":"In Rio via SSL Ranking","mbHint":"Top two of each group advance. Tap a team for crew and history."},"de":{"fsT":"Final Series","qsT":"Qualifying Series","qsLeg":"Hervorgehoben: über diese Serie qualifiziert. ● = über das SSL Nations Ranking in Rio. Team in Rio antippen für die Teamseite.","qsNote":"Der Sieger jeder Qualifikationsgruppe (Gruppe C: die ersten zwei) wurde in die 1/32-Finale gelost. 29 Teams kamen über das SSL Ranking in die Final Series, mit Plätzen je Kontinent: 12 Europa, 8 Panamerika, 6 Asien, 1 Afrika, 2 Ozeanien.","reg":{"asia":"Asien","afoc":"Afrika & Ozeanien","eur":"Europa","pam":"Panamerika"},"fin":"Finale","petit":"Kl. Finale","swipe":"Seitlich wischen für spätere Runden →","road2":"Weg nach Rio","inRio":"Über das SSL Ranking in Rio","mbHint":"Die ersten zwei jeder Gruppe kommen weiter. Team antippen für Crew und Historie."},"fr":{"fsT":"Final Series","qsT":"Qualifying Series","qsLeg":"En surbrillance : qualifiée par cette série. ● = à Rio via le classement SSL des nations. Touchez une équipe présente à Rio pour sa page.","qsNote":"Le vainqueur de chaque groupe de qualification (groupe C : les deux premiers) a été tiré au sort dans les 1/32 de finale. 29 équipes se sont qualifiées pour les Final Series via le classement SSL, avec des places par continent : 12 Europe, 8 Amériques, 6 Asie, 1 Afrique, 2 Océanie.","reg":{"asia":"Asie","afoc":"Afrique & Océanie","eur":"Europe","pam":"Amériques"},"fin":"Finale","petit":"Petite F.","swipe":"Balayez pour les tours suivants →","road2":"Route vers Rio","inRio":"À Rio via le classement SSL","mbHint":"Les deux premiers de chaque groupe passent. Touchez une équipe pour l'équipage et l'historique."},"es":{"fsT":"Final Series","qsT":"Qualifying Series","qsLeg":"Resaltado: clasificado en esta serie. ● = en Río por el Ranking SSL de naciones. Toca un equipo presente en Río para ver su página.","qsNote":"El ganador de cada grupo de clasificación (grupo C: los dos primeros) fue sorteado en los 1/32 de final. 29 equipos se clasificaron para las Final Series por el Ranking SSL, con plazas por continente: 12 Europa, 8 Panamérica, 6 Asia, 1 África, 2 Oceanía.","reg":{"asia":"Asia","afoc":"África y Oceanía","eur":"Europa","pam":"Panamérica"},"fin":"Final","petit":"Consolación","swipe":"Desliza para ver más rondas →","road2":"Camino a Río","inRio":"En Río por el Ranking SSL","mbHint":"Pasan los dos primeros de cada grupo. Toca un equipo para ver tripulación e historia."}};for(const l in SZ)Object.assign(S[l],SZ[l]);
const T=k=>S[lang][k]??S.en[k];
const ord=n=>ORD[lang](n);

/* ---------- names & flags ---------- */
const X={SLO:["SI"],BUL:["BG"],AUT:["AT"],FIN:["FI"],CRO:["HR"],NOR:["NO"],BER:["BM"],PHI:["PH"],VIE:["VN"],UAE:["AE"],KAZ:["KZ"],MAR:["MA"],MOZ:["MZ"],BEL:["BE"],SRB:["RS"],TUR:["TR"],PUR:["PR"],VEN:["VE"],MEX:["MX"],ESA:["SV"]};
const FC={"de":["#000001","#e50000","#e5b700"],"ae":["#e50000","#00732f","#000001"],"za":["#c22c23","#007847","#00075e"],"ch":["#e50000","#8e0000"],"es":["#aa151b","#e3b401"],"vn":["#ca221a","#7d1510"],"pe":["#d50f22","#840915"],"au":["#e50000","#00008b"],"kz":["#00abc2","#006a78"],"hr":["#e50001","#171796"],"ph":["#cca418","#0037a8","#ce1025"],"rs":["#b43136","#a16244","#0b3f76"],"sv":["#0f46af","#092c6c"],"mz":["#e50000","#19a217","#e5b500"],"nz":["#891640","#00247d"],"uy":["#0037a8","#002268"],"si":["#0000bf","#d50000"],"ee":["#0078e5","#000001"],"th":["#a51831","#2c294a"],"at":["#c8102d","#7b091c"],"se":["#e5b700","#005193"],"co":["#e5d000","#00138e","#da000f"],"sc":["#003d88","#e0b205","#c61f20"],"ua":["#0056b8","#e5c100"],"hu":["#cf3315","#378d00"],"mm":["#e5b700","#38ad37","#d11424"],"us":["#1a2f5d","#94515e","#ad373e"],"ar":["#2a76ba","#1a4973"],"fi":["#002e6c","#001d42"],"om":["#d5130f","#039027"],"cu":["#cb1515","#00298f"],"nl":["#ae1c27","#20458b"],"ma":["#be262c","#76171b"],"mx":["#006846","#ce1025"],"ca":["#c9281c","#7c1911"],"ag":["#050001","#ddb407","#ce1025"],"pr":["#004ce5","#e50000"],"lt":["#e3a201","#006a43","#be262c"],"bg":["#00966e","#d32511"],"pl":["#d21339","#820b23"],"bm":["#c91431","#88665d","#ce142a"],"kr":["#b92c39","#080809","#084699"],"fr":["#000091","#e1000e"],"it":["#009246","#bd2732"],"pt":["#036600","#e50000"],"jp":["#bc002c","#74001b"],"cz":["#10447e","#d11319"],"ve":["#e5b700","#00247d","#ce142a"],"no":["#002564","#d31121"],"tr":["#db0916","#88060d"],"cl":["#0038a6","#c9281c"],"dk":["#c8102d","#7b091c"],"pf":["#d61e0f","#841309"],"ec":["#e5d000","#271c70","#da000d"],"my":["#000066","#cb6b19","#cc0000"],"sg":["#df0000","#8a0000"],"gr":["#0d5dae","#083a6c"],"be":["#000001","#e5c100","#da0b21"],"gb":["#484f84","#c8102d"],"br":["#219e45","#dfcd06","#324fa3"]};
const iso=c=>INFO[c]?INFO[c].iso:(X[c]||[])[0];
const FIX={GBR:{en:"Great Britain",de:"Großbritannien",fr:"Grande-Bretagne",es:"Gran Bretaña",pt:"Grã-Bretanha",zh:"英国",ar:"بريطانيا العظمى"},TAH:{en:"Tahiti",de:"Tahiti",fr:"Tahiti",es:"Tahití",pt:"Taiti",zh:"塔希提",ar:"تاهيتي"},MYA:{en:"Myanmar",de:"Myanmar",fr:"Myanmar",es:"Myanmar",pt:"Mianmar",zh:"缅甸",ar:"ميانمار"},USA:{en:"USA",de:"USA",fr:"États-Unis",es:"EE. UU.",pt:"EUA",zh:"美国",ar:"الولايات المتحدة"}};
let DN=null;const dn=()=>{try{if(!DN||DN.l!=lang){DN=new Intl.DisplayNames([LOC()],{type:"region"});DN.l=lang}}catch(e){DN=null}return DN};
function NM(c){if(FIX[c])return FIX[c][lang];const i=iso(c);try{if(i&&dn())return dn().of(i)}catch(e){}return INFO[c]?INFO[c].name:c}
function FL(c){const i=iso(c);return i?`<img class="flg" src="img/fl/${i.toLowerCase()}.webp" alt="" width="22" height="16">`:""}
function FG(c){const i=iso(c),a=i&&FC[i.toLowerCase()];return a?`--fg:linear-gradient(90deg,${a.join(",")})`:""}
const MO={en:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],de:["Jan.","Feb.","März","Apr.","Mai","Juni","Juli","Aug.","Sep.","Okt.","Nov.","Dez."],fr:["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."],es:["ene","feb","mar","abr","may","jun","jul","ago","sept","oct","nov","dic"]};
const fmtD=iso=>{const p=iso.split("-");if(!MO[lang]){try{return new Date(iso+"T12:00:00Z").toLocaleDateString(LOC(),{day:"numeric",month:"short",timeZone:"UTC"})}catch(e){return iso}}return lang=="de"?`${+p[2]}. ${MO.de[p[1]-1]}`:`${+p[2]} ${MO[lang][p[1]-1]}`};
const range=r=>r.start===r.end?fmtD(r.start):!MO[lang]?`${fmtD(r.start)} – ${fmtD(r.end)}`:(r.start.slice(5,7)==r.end.slice(5,7)?`${+r.start.slice(8)}${lang=="de"?".":""}–${fmtD(r.end)}`:`${fmtD(r.start)} – ${fmtD(r.end)}`);
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
const locT=x=>{try{return new Date(at(x)).toLocaleTimeString(LOC(),{hour:"2-digit",minute:"2-digit",hourCycle:"h23"})}catch(e){return""}};
const wday=d=>{try{return new Date(d+"T12:00:00-03:00").toLocaleDateString(LOC(),{weekday:"short",day:"numeric",month:"short",timeZone:"America/Sao_Paulo"})}catch(e){return fmtD(d)}};
const rnd=id=>D.rounds.find(r=>r.id==id);
function raceDone(x){const r=rnd(x.rid),g=r&&r.groups.find(y=>y.id==x.g);if(!g)return false;const i=x.n-1;return g.rows.every(z=>String(z.r[i]??"").trim()!=="")}
function rState2(x){if(raceDone(x))return"done";const t=at(x),n=nowMs();if(n>=t-5*60e3&&n<t+75*60e3)return"now";if(n>=t+75*60e3)return"past";return"up"}
function nextFor(rid,gid){return SCH.filter(x=>x.rid==rid&&x.g==gid&&!raceDone(x)&&rState2(x)!="past").sort((a,b)=>at(a)-at(b))[0]}
function raceLi(x,nx){const st=rState2(x),r=rnd(x.rid),g=r&&r.groups.find(y=>y.id==x.g);
  const fl=g?g.rows.filter(z=>isTeam(z.team)).map(z=>FL(z.team)).join(""):"";
  const lbl=x.rid=="f"?RNm(rnd("f")):x.rid=="pf"?RNm(rnd("pf")):`${T("group")} ${x.g}`;
  const s=st=="done"?`✓ ${T("done")}`:st=="now"?T("onWater"):x===nx&&at(x)-nowMs()<12*36e5?T("inX")(Math.max(1,Math.round((at(x)-nowMs())/6e4))):"";
  return `<li class="${st=="done"||st=="past"?"past":st=="now"?"now":x===nx?"nxt":""}"><span class="ti">${x.t}${showLocal?`<small>${esc(locT(x))}</small>`:""}</span><span class="gt"><b>${esc(lbl)}</b><i>${["sf","pf","f"].includes(x.rid)?esc(RS[x.rid]):T("race")+" "+x.n}</i><span class="fls">${fl}</span>${trkUrl(x)&&st!="done"&&st!="past"?`<a class="trk" href="${esc(trkUrl(x))}" target="_blank" rel="noopener">📍 ${T("trk")}</a>`:""}</span><span class="s">${esc(s)}${wxAt(x)}</span></li>`}
const trkUrl=x=>{try{const u=TRK[x.rid][x.g][String(x.n)];return /^https:\/\/player\.georacing\.com\//.test(u)?u:""}catch(e){return""}};
/* wind forecast (Open-Meteo, no key) */
let WX=null;
async function loadWx(){try{const c=LS.get("wx",null);if(c&&Date.now()-c.at<30*6e4){WX=c.d;return}
  const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude=-22.9196&longitude=-43.1700&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn&timezone=America%2FSao_Paulo&forecast_days=7");
  if(!r.ok)return;const j=await r.json();if(!j.hourly||!Array.isArray(j.hourly.time))return;WX=j.hourly;LS.set("wx",{at:Date.now(),d:WX});if(view=="home")render(true)}catch(e){}}
function wxAt(x){if(!WX)return"";const k=`${x.d}T${x.t.slice(0,2)}:00`,i=WX.time.indexOf(k);if(i<0)return"";const w=Math.round(WX.wind_speed_10m[i]),gu=Math.round(WX.wind_gusts_10m[i]),dir=WX.wind_direction_10m[i];
  if(!isFinite(w))return"";return `<span class="wx" title="${esc(T("wxT"))}"><i class="wa" style="transform:rotate(${dir}deg)">↓</i>${w}<small>–${gu} kn</small></span>`}
function raceList(list){const nx=list.filter(x=>rState2(x)=="up").sort((a,b)=>at(a)-at(b))[0];return `<ul class="races">${list.sort((a,b)=>at(a)-at(b)).map(x=>raceLi(x,nx)).join("")}</ul>`}
function tzNote(){return `<small style="display:block;color:var(--mute);font-size:12px;margin-top:8px">${T("rioT")}${showLocal?` · ${T("loc")} (${esc(myTZ)})`:""}${WX?` · <span title="${esc(T("wxSrc"))}">↓ kn = ${esc(T("wxT"))}</span>`:""}</small>`}
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
      const cond=p=>{const L=at4[p];for(let j=0;j<4;j++){if(j==i)continue;const R=codes[j];const tests=[[o=>o.pos[j]>p,N.ahead(R)],[o=>o.pos[j]!=0,N.notWin(R)],[o=>o.pos[j]==3,N.last(R)],[o=>o.pos[j]==0,N.wins(R)],[o=>o.pos[j]<p,N.behind(R)]];
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
  return `<table><thead><tr><th>#</th><th>${T("team")}</th>${g.rows[0].r.map((_,i)=>`<th class="r">R${i+1}</th>`).join("")}<th>${T("pts")}</th></tr></thead><tbody>${
  g.rows.map((x,i)=>{const o=outcome(r.id,i+1,gs=="done"),tm=isTeam(x.team);const c=[o?(o[0]=="w"?"q":(o[2]===0&&r.id!="pf"?"x":"")):"",sel==x.team?"sel":"",clickable&&tm?"team":""].join(" ");
    const nm=tm?`<span class="fl">${FL(x.team)}</span><span class="n">${esc(NM(x.team))}</span>${star(x.team)}`:`<span class="ph">${esc(ph(x.team))}</span>`;
    const lt=lc&&lc[i]?`<span class="tag ${lc[i]=="clinch"?"w":"o"}">${T(lc[i]=="clinch"?"clinched":"elim")}</span>`:"";
    return `<tr class="${c}${gs!="done"&&i==1&&g.rows.length>2&&r.id!="f"&&r.id!="pf"?" qline":""}${lc&&lc[i]=="elim"?" x":""}" data-t="${esc(x.team)}"><td class="p">${i+1}</td><td class="t">${nm}${o?(o[0]=="w"&&["r32","r16","r8","r4","sf"].includes(r.id)?`<span class="bdg" title="${esc(o[1])}">${esc(ord(i+1))}</span>`:`<span class="tag ${o[0]}">${esc(o[1])}</span>`):lt}${clickable&&tm?`<span class="chev">›</span>`:""}</td>${x.r.map(v=>`<td class="r">${esc(v)||"–"}</td>`).join("")}<td class="tot">${String(x.total??"").trim()?esc(x.total):x.r.some(v=>String(v).trim()!=="")?`<span class="run" title="provisional">${x.r.reduce((s,v)=>s+num(v),0)}</span>`:"–"}</td></tr>`}).join("")
  }</tbody></table>${note(g)?`<div class="note">${esc(note(g))}</div>`:""}${clickable&&advText(r,g)?`<div class="adv">${esc(advText(r,g))}</div>`:""}`}
function mine(){if(!favs.size)return"";const TT=teams().filter(t=>favs.has(t.code));if(!TT.length)return"";
  return `<div class="mine"><h3>★ ${T("myTeams")}</h3>${TT.map(t=>`<button data-t="${esc(t.code)}" class="tmx"><span>${t.flag}</span><span><b>${esc(t.name)}</b><br><small>${esc(t.txt)}</small></span></button>`).join("")}</div>`}
function board(){const r=D.rounds.find(x=>x.id==round)||D.rounds[0],s=rState(r),n=r.groups[0].rows[0].r.length;
  let h=delayBanner()+mine();const td=today();
  h+=`<div class="rhead"><h2>${esc(RNm(r))}</h2><p>${esc(range(r))} · ${T("races")(n)} · ${s=="live"&&td>=r.start&&td<=r.end?T("raceDay")(...raceDay(r)):T("st")[s]}</p></div>`;
  return h+boardGroups(r)}
function todayCard(){let h="";const td=today(),tl=SCH.filter(x=>x.d==td);
  if(tl.length){const lr=rnd(tl[0].rid),[dn,dt]=raceDay(lr);
    h+=`<div class="next"><h3><span>${T("todayRaces")} · ${esc(RNm(lr))}</span><small>${esc(wday(td))} · ${T("raceDay")(dn,dt)}${dn==dt&&dt>1?` · <b class="cd">${T("finalDay")}</b>`:""}</small></h3>${raceList(tl)}${tzNote()}${LINKS()}</div>`}
  else{const up=SCH.filter(x=>x.d>td).sort((a,b)=>at(a)-at(b))[0];if(up){const ur=rnd(up.rid),d1=SCH.filter(x=>x.d==up.d);
    h+=`<div class="next"><h3><span>${T("upNext")}: ${esc(RNm(ur))}</span><small>${esc(wday(up.d))} · <span class="cd">${T("startsIn")(days(td,up.d))}</span></small></h3>${raceList(d1)}${tzNote()}${LINKS()}</div>`}}
  return h}
function boardGroups(r){let h="";
  if(r.id=="f"||r.id=="pf")h+=`<p class="warn">${T("oneRace")}</p>`;
  h+=`<div class="grid">`+r.groups.map(g=>{const gs=gState(g,r),nx=gs!="done"?nextFor(r.id,g.id):null;
    return `<section class="g"><div class="gh"><b>${r.groups.length>1?T("group")+" "+esc(g.id):esc(RNm(r))}</b><span class="st"><span class="dot ${gs=="done"?"done":gs=="live"?"live":""}"></span>${T(gs=="done"?"decided":gs=="live"?"racing":"open")}${gs!="up"?`<button class="shbtn" data-shimg="${r.id}|${esc(g.id)}" aria-label="${esc(T("shareImg"))}" title="${esc(T("shareImg"))}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1"/></svg></button>`:""}</span></div>${nx?`<div class="gnx">${T("nextRace")}: <b>${["sf","pf","f"].includes(nx.rid)?"":T("race")+" "+nx.n+" · "}${esc(wday(nx.d))} · ${nx.t}</b>${showLocal?` (${esc(locT(nx))} ${T("loc")})`:""}</div>`:""}${gtable(r,g,true)}${needBox(r,g)}</section>`}).join("")+`</div>`;
  return h+schedFor(r)}
const MBC={r32:"R1",r16:"R2",r8:"EF",r4:"QF",sf:"SF"};
const KO=["r32","r16","r8","r4","sf"];
function bcode(r,g){return r.id=="f"?T("fin"):r.id=="pf"?T("petit"):`${MBC[r.id]||RS[r.id]} ${g.id}`}
function phm(c){const m=c.match(phRe);return m?`${m[1]} ${m[2]}${m[3]}`:c}
function mrow(c,o){const tm=isTeam(c),w=o.w;return `<div class="mr${w?" w":""}${o.x?" x":""}${sel==c?" sel":""}${tm&&(o.click!==false)&&INFO[c]?" team":""}${o.me?" me":""}" data-t="${esc(c)}"${w&&tm?` style="${FG(c)}"`:""}>${tm?FL(c)+`<b>${esc(c)}</b>${star(c)}${o.dot?`<span class="rio" title="${esc(T("inRio"))}">●</span>`:""}`:`<i>${esc(phm(c))}</i>`}${o.v!=null?`<span class="v">${esc(o.v)}</span>`:""}</div>`}
function mbox(r,g,opt={}){const gs=gState(g,r),done=gs=="done",has=g.rows.some(x=>String(x.total??"").trim()!==""||x.r.some(v=>String(v).trim()!==""));
  const rows=g.rows.map((x,i)=>{const o=outcome(r.id,i+1,done);return mrow(x.team,{w:o&&o[0]=="w",x:o&&o[2]===0&&r.id!="pf",v:has?(String(x.total??"").trim()||String(x.r.reduce((s,v)=>s+num(v),0))):null,me:opt.me==x.team,click:!opt.me})}).join("");
  const bd=KO.includes(r.id)&&!opt.me&&!opt.nob?`<div class="bdgs" aria-hidden="true"><span>${esc(ord(1))}</span><span>${esc(ord(2))}</span></div>`:"";
  return `<div class="mb ${gs}"${opt.go?` data-go="${opt.go}" role="button" tabindex="0"`:""}>${bd}<div class="mh"><span>${esc(bcode(r,g))}</span>${gs=="live"?`<span class="dot live"></span>`:done?`<span class="ok">✓</span>`:""}</div>${rows}</div>`}
function mbNav(k){return `<nav class="seg">${[["bracket",T("fsT")],["qualifying",T("qsT")],["gc2023",T("gc23")]].map(([h,l])=>`<a href="#${h}"${k==h?` class="on" aria-current="page"`:""}>${esc(l)}</a>`).join("")}</nav>`}
function bracket(){const cols=KO.map(id=>D.rounds.find(r=>r.id==id)).filter(Boolean),fin=["f","pf"].map(id=>D.rounds.find(r=>r.id==id)).filter(Boolean);
  const head=r=>{const s=rState(r);return `<div class="mch"><b>${esc(RNm(r))}</b><small><span class="dot ${s=="done"?"done":s=="live"?"live":r.id==current()?"nx":""}"></span>${esc(range(r))}</small></div>`};
  let h=mbNav("bracket")+`<h2 class="pill">${T("fsT")}</h2><p class="warn mbh">${T("mbHint")} <span class="sw">${T("swipe")}</span></p><div class="mbw" dir="ltr"><div class="mbg">`;
  h+=cols.map(r=>`<div class="mc">${head(r)}<div class="mcb">${r.groups.map(g=>mbox(r,g)).join("")}</div></div>`).join("");
  if(fin.length)h+=`<div class="mc fin">${head(fin[0])}<div class="mcb">${fin.map(r=>r.groups.map(g=>mbox(r,g)).join("")).join("")}</div></div>`;
  return h+`</div></div>`}
const QS=[{id:"asia",d:"2025-12",loc:"TH",g:[["A","PHI,MYA*,KOR,VIE"],["B","OMA*,UAE,KAZ"]]},{id:"afoc",d:[["2026-06-02","2026-06-04"]],loc:"CH",g:[["C","TAH*,SEY*,MAR,MOZ"]]},{id:"eur",d:[["2026-06-08","2026-06-11"],["2026-07-14","2026-07-17"]],loc:"CH",g:[["D","EST*,AUT,SLO"],["E","LTU*,NOR,BEL,SRB"],["F","UKR*,FIN,GRE"],["G","POR*,TUR,BUL"]]},{id:"pam",d:[["2026-11-12","2026-11-16"]],loc:"BR",g:[["H","URU*,PUR,ANT*,VEN"],["I","CUB*,BER,MEX,ESA"]]}];
const cn=i=>{try{return dn().of(i)}catch(e){return i}};
const qdate=R=>typeof R.d=="string"?(MO[lang]?`${MO[lang][+R.d.slice(5)-1]} ${R.d.slice(0,4)}`:new Date(R.d+"-15T12:00:00Z").toLocaleDateString(LOC(),{month:"short",year:"numeric",timeZone:"UTC"})):R.d.map(([a,b])=>range({start:a,end:b})).join(" & ")+" "+R.d[0][0].slice(0,4);
function qsOf(c){for(const R of QS)for(const[id,l]of R.g){const L=l.split(",");if(L.some(e=>e.replace("*","")==c))return{R,id,L}}return null}
function qsBox(id,L,me){return `<div class="mb done"${me?` data-go="qualifying" role="button" tabindex="0"`:""}><div class="mh"><span>QS ${esc(id)}</span></div>${L.map(e=>{const c=e.replace("*",""),w=e.endsWith("*");return mrow(c,{w,me:me==c,click:!me,dot:!me&&!w&&!!INFO[c]})}).join("")}</div>`}
function qualifying(){let h=mbNav("qualifying")+`<h2 class="pill">${T("qsT")}</h2><p class="warn mbh">${T("qsLeg")}</p><div class="qsg">`;
  h+=QS.map(R=>`<section class="qreg"><div class="qrh"><b>${esc(T("reg")[R.id])}</b><small>${esc(qdate(R))} · ${esc(cn(R.loc))}</small></div><div class="qbx">${R.g.map(([id,l])=>qsBox(id,l.split(","))).join("")}</div></section>`).join("");
  return h+`</div><p class="warn qnote">* ${esc(T("qsNote"))}</p>`}
function road(code,TM){const q=qsOf(code);let h="";
  if(q)h+=qsBox(q.id,q.L,code);
  if(TM)h+=TM.path.map(s=>mbox(s.r,s.g,{me:code,go:"round-"+s.r.id})).join("");
  return h?`<div class="road" dir="ltr" aria-label="${esc(T("road2"))}">${h}</div>`:""}
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
  const fp=t=>{const l=t.path[t.path.length-1];return l.done&&l.r.id=="f"?l.pos:l.done&&l.r.id=="pf"?4+l.pos:99};
  const inn=list.filter(t=>!t.out),now=inn.filter(t=>t.path.some(p=>p.r.id==cur)||t.path[t.path.length-1].done).sort((a,b)=>fp(a)-fp(b)||by(a,b));
  now.forEach(t=>{const l=t.path[t.path.length-1],tot=String(l.g.rows[l.pos-1].total||"").trim();t.short=l.done?t.txt:`${RNm(l.r)} · ${T("group")} ${l.g.id}${tot?` · ${ord(l.pos)} · ${tot} ${T("pts")}`:""}`});add(T("secNow"),now);
  D.rounds.forEach(r=>{const a=inn.filter(t=>!now.includes(t)&&t.path[0].r.id==r.id).sort(by);a.forEach(t=>t.short=`${T("group")} ${t.path[0].g.id} · ${fmtD(r.start)}`);add(T("secSeeded")(RNm(r)),a)});
  add(T("secOut"),list.filter(t=>t.out).sort((a,b)=>b.lvl-a.lvl||by(a,b)));return G.join("")||`<p>${T("noTeam")}</p>`}
function card(t){{const img=capPhoto(t.code),nick=squad(t.code).n;
    return `<button class="tm ${t.out?"out":""}" data-t="${esc(t.code)}"><span class="avt">${img?`<img src="${esc(img)}" alt="" loading="lazy">`:t.flag}</span><span><b>${img?t.flag+" ":""}${esc(t.name)}${favs.has(t.code)?` <span class="star">★</span>`:""}</b>${nick?`<span class="nk">${esc(nick)}</span>`:""}<small>${esc(t.short||t.txt)}</small></span>${t.I.rank?`<span class="rk"><small>${T("rank")}</small>#${t.I.rank}</span>`:""}</button>`}}

/* ---------- home ---------- */
const TI={board:'<path d="M4 6h16M4 12h16M4 18h10"/>',bracket:'<rect x="2.5" y="3.5" width="6" height="5" rx="1"/><rect x="2.5" y="15.5" width="6" height="5" rx="1"/><rect x="15.5" y="9.5" width="6" height="5" rx="1"/><path d="M8.5 6H12v12H8.5M12 12h3.5"/>',teams:'<path d="M5 21V3.5M5 4h12l-2.5 4.5L17 13H5"/>',sailors:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',qualifying:'<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',gc2023:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3"/>'};
const svg=(p,cls="")=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
function latestRound(){const L=D.rounds.filter(r=>r.groups.some(g=>gState(g,r)!="up"&&g.rows.some(x=>x.r.some(v=>String(v).trim()!==""))));return L[L.length-1]}
function delayBanner(){const td=today(),tl=SCH.filter(x=>x.d==td);if(!tl.length)return"";const n=nowMs(),a=Math.min(...tl.map(at))-30*6e4,b=Math.max(...tl.map(at))+150*6e4;if(n<a||n>b)return"";
  const last=Date.parse(checkedAt&&Date.parse(checkedAt)>Date.parse(D.updatedAt)?checkedAt:D.updatedAt);if(!isFinite(last))return"";const m=Math.round((n-last)/6e4);if(m<15)return"";
  return `<div class="delay" role="status">⚠ ${esc(T("delayed")(m))} <a href="https://sslgoldcup.worldofsailors.com/results/" target="_blank" rel="noopener">${T("official")} ↗</a></div>`}
function champ(){const f=rnd("f");if(!f)return"";const g=f.groups[0];if(gState(g,f)!="done"||!isTeam(g.rows[0].team))return"";const pf=rnd("pf"),pg=pf&&pf.groups[0],pd=pg&&gState(pg,pf)=="done";const c=g.rows[0].team,M=["🥇","🥈","🥉"];
  return `<section class="champ"><div class="cup" aria-hidden="true">🏆</div><small>${T("champT")}</small><button class="cw team" data-t="${esc(c)}">${FL(c)}<b>${esc(NM(c))}</b></button><h4>${T("standT")}</h4><ol>${g.rows.map((x,i)=>`<li class="team" data-t="${esc(x.team)}"><span>${i<3?M[i]:i+1}</span>${FL(x.team)}${esc(NM(x.team))}</li>`).join("")}${pd?pg.rows.map((x,i)=>`<li class="team" data-t="${esc(x.team)}"><span>${i+5}</span>${FL(x.team)}${esc(NM(x.team))}</li>`).join(""):""}</ol></section>`}
function home(){let h=delayBanner()+champ()+`<section class="hero"><img src="icons/icon-192.png" alt="" width="64" height="64"><div><b>${T("welcome")}</b><span>${T("dates")}</span></div></section>`;
  h+=`<div class="prog" aria-label="${esc(T("progress"))}">${D.rounds.filter(r=>r.id!="pf").map(r=>{const s=rState(r);return `<button data-go="round-${r.id}" class="${s}${r.id==current()?" cur":""}"><i></i><span>${esc(RS[r.id]||r.short)}</span></button>`}).join("")}</div>`;
  h+=mine()+todayCard();
  const lr=latestRound();
  if(lr)h+=`<h3 class="sec">${T("latest")} · ${esc(RNm(lr))}</h3><div class="lat">${lr.groups.map(g=>mbox(lr,g,{go:"round-"+lr.id,nob:1})).join("")}</div><p class="more1"><a href="#round-${lr.id}">${T("showRound")}</a></p>`;
  h+=`<h3 class="sec">${T("explore")}</h3><div class="tiles">${["board","bracket","teams","sailors","qualifying","gc2023"].map(k=>`<button data-go="${k=="board"?"round-"+current():k}">${svg(TI[k])}<b>${esc(T("tiles")[k][0])}</b><small>${esc(T("tiles")[k][1])}</small></button>`).join("")}</div>`;
  return h}

/* ---------- install ---------- */
let BIP=null;const UA=navigator.userAgent||"";
const isIOS=/iPhone|iPad|iPod/.test(UA)||(/Macintosh/.test(UA)&&navigator.maxTouchPoints>1),isAndroid=/Android/.test(UA);
const isStandalone=()=>{try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(e){return false}};
const canInstall=()=>!isStandalone()&&(location.protocol=="https:"||location.hostname=="localhost")&&window.top===window;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();BIP=e;LS.set("installed",0);insBtn();if(view=="home"||view=="more")render(true)});
window.addEventListener("appinstalled",()=>{BIP=null;LS.set("installed",1);toast(T("inst").done);render(true)});
if(isStandalone())LS.set("installed",1);
function installCard(dismissable){if(!canInstall()||(dismissable&&LS.get("instHide",0)>Date.now()))return"";const I=T("inst");
  return `<section class="inst"><img src="icons/icon-192.png" alt="" width="52" height="52"><div><b>${I.t}</b><span>${I.d}</span></div><div class="ib"><button class="ibtn" data-inst="1">${BIP?I.b:I.how}</button>${dismissable?`<button class="ilater" data-insthide="1">${I.hide}</button>`:""}</div></section>`}
function installHelp(){const I=T("inst"),d=$("#tmd");let steps;
  const shareIc='<svg class="shr" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1"/></svg>';
  if(isIOS){const safari=!/CriOS|FxiOS|EdgiOS|GSA|Instagram|FBAN|FBAV|WhatsApp/.test(UA);
    steps=(safari?"":`<p class="warn">${I.iosOther}</p>`)+`<ol class="isteps"><li>${I.ios[0]} ${shareIc} ${I.ios[1]}</li><li>${I.ios[2]}</li><li>${I.ios[3]}</li></ol>`}
  else if(isAndroid)steps=`<ol class="isteps">${I.android.map(x=>`<li>${x}</li>`).join("")}</ol>`;
  else steps=`<ol class="isteps">${I.desk.map(x=>`<li>${x}</li>`).join("")}</ol>`;
  d.innerHTML=`<div class="th"><div><div class="nick">SSL Gold Cup</div><h2>${I.how}</h2></div><div class="thb"><button class="x" aria-label="${T("close")}">✕</button></div></div><div class="tb"><div class="ihero"><img src="icons/icon-192.png" alt="" width="72" height="72"><span>${I.d}</span></div>${steps}</div>`;
  d.querySelector(".x").onclick=()=>d.close();openCode=null;show(d)}
async function doInstall(){if(BIP){const e=BIP;BIP=null;try{await e.prompt();const c=await e.userChoice;if(c&&c.outcome=="accepted")LS.set("installed",1)}catch(x){}render(true)}else installHelp()}

/* ---------- more ---------- */
function more(){const I=T("inst");
  const row=(href,ic,t,sub)=>`<a class="mrow" href="${href}"${/^https?:/.test(href)?' target="_blank" rel="noopener"':""}>${svg(ic)}<span><b>${esc(t)}</b>${sub?`<small>${esc(sub)}</small>`:""}</span></a>`;
  let h=`<h2 class="pill">${T("moreT")}</h2>`;
  h+=isStandalone()?`<p class="warn">✓ ${I.installedNote}</p>`:installCard(false);
  h+=`<div class="mlist">${row("#sailors",TI.sailors,T("tiles").sailors[0],T("tiles").sailors[1])}${row("#qualifying",TI.qualifying,T("tiles").qualifying[0],T("tiles").qualifying[1])}${row("#gc2023",TI.gc2023,T("tiles").gc2023[0],T("tiles").gc2023[1])}<button class="mrow" data-calall="1">${svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>')}<span><b>${T("calAll")}</b></span></button><button class="mrow" data-share="1">${svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>')}<span><b>${T("share")}</b><small>${esc(location.href.split("#")[0])}</small></span></button></div>`;
  h+=pushMore();
  h+=`<h3 class="sec">${T("links")}</h3><div class="mlist">${row("https://www.youtube.com/@Starsailors/streams",'<path d="M5 4l14 8-14 8z"/>',T("stream").replace("▶ ",""),"YouTube")}${row("https://app.georacing.com/?application_id=46",'<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',T("tracking"),"Georacing")}${row("https://sslgoldcup.worldofsailors.com/results/",TI.board,T("official"),"sslgoldcup.worldofsailors.com")}${row("https://sslgoldcup.worldofsailors.com/schedule/",'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',T("schedule"),"")}</div>`;
  h+=`<h3 class="sec">${T("how")?T("howT"):""}</h3><div class="card pad"><ul class="howl">${T("how").map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;
  h+=`<h3 class="sec">${T("about")}</h3><div class="card pad"><p>${esc(T("aboutT"))}</p><p class="warn">${esc(T("foot"))}</p></div>`;
  return h}

/* ---------- sailors ---------- */
let sq2="",sPh=false;
function sailorsView(){const all=[];Object.keys(INFO).forEach(c=>{try{squad(c).ppl.forEach(p=>all.push({c,p}))}catch(e){}});
  const qq=sq2.trim().toLowerCase();
  let L=all.filter(x=>(!sPh||x.p.img)&&(!qq||(x.p.name+" "+x.c+" "+NM(x.c)+" "+(x.p.k||"")+" "+(squad(x.c).n||"")).toLowerCase().includes(qq)));
  L.sort((a,b)=>(b.p.img?1:0)-(a.p.img?1:0)||NM(a.c).localeCompare(NM(b.c),lang)||(+a.p.no||99)-(+b.p.no||99));
  const shown=L.slice(0,qq?200:120);
  return `<h2 class="pill">${T("sailors")}</h2><div class="tools"><input id="q2" type="search" placeholder="${esc(T("sSearch"))}" value="${esc(sq2)}" aria-label="${esc(T("sSearch"))}"></div><div class="tools"><button class="chip ${!sPh?"on":""}" data-sp="0">${T("allS")}</button><button class="chip ${sPh?"on":""}" data-sp="1">${T("withPhoto")}</button><span class="warn" style="margin:auto 0 auto 8px">${T("sailorsT")(L.length)}</span></div>
  <div class="slist">${shown.map(({c,p})=>`<button class="srow" data-sc="${esc(c)}" data-si="${p.i}">${av(p,1)}<span><b>${esc(p.name)}</b><small>${FL(c)}${esc(NM(c))}${p.k?" · "+esc(p.k):p.cap?" · "+esc(T("captain")):""}</small></span></button>`).join("")}</div>${L.length>shown.length?`<p class="warn">+${L.length-shown.length} …</p>`:""}`}

/* ---------- team numbers ---------- */
function teamStats(TM){if(!TM)return"";let races=0,wins=0,pl=[],pts=0;const hist=[];
  TM.path.forEach(s=>{const row=s.g.rows[s.pos-1];if(!row)return;const n=row.r.length;const H=[];
    row.r.forEach((v,i)=>{if(String(v).trim()==="")return;races++;const val=num(v);pts+=val;const m=(i==n-1&&n>1)?2:1,q=val/m;const place=Number.isInteger(q)&&q>=1&&q<=4?5-q:null;if(place){pl.push(place);if(place==1)wins++}H.push(place)});
    if(H.length)hist.push({r:s.r,H})});
  if(!races)return"";const avg=pl.length?(pl.reduce((a,b)=>a+b,0)/pl.length).toFixed(1):"–";
  return `<h3>${T("statsT")}</h3><div class="nums"><div><b>${races}</b><small>${T("stRaces")}</small></div><div><b>${wins}</b><small>${T("stWins")}</small></div><div><b>${avg}</b><small>${T("stAvg")}</small></div><div><b>${pts}</b><small>${T("stPts")}</small></div></div>
  <div class="hist" dir="ltr" aria-label="${esc(T("stHist"))}">${hist.map(x=>`<div><small>${esc(RS[x.r.id]||x.r.short)}</small><span>${x.H.map(p=>`<i class="p${p||0}">${p||"?"}</i>`).join("")}</span></div>`).join("")}</div>`}
/* ---------- calendar ---------- */
function calSheet(code){const d=$("#tmd"),base=location.href.split("#")[0].replace(/[^/]*$/,""),file=code?`cal/${code}.ics`:"races.ics",web=base.replace(/^https?:/,"webcal:")+file;
  d.innerHTML=`<div class="th">${code?`<button class="bk">${T("back")}</button>`:""}<div><div class="nick">SSL Gold Cup</div><h2>${T("calT")}</h2></div><div class="thb"><button class="x" aria-label="${T("close")}">✕</button></div></div><div class="tb">
  ${code?`<p class="tst">${FL(code)} <b>${esc(NM(code))}</b></p>`:""}<div class="mlist" style="margin-top:12px"><a class="mrow" href="${esc(web)}">${svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>')}<span><b>${T("calSub")}</b></span></a><a class="mrow" href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent(web)}" target="_blank" rel="noopener">${svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M12 14v4M10 16h4"/>')}<span><b>${T("calG")}</b></span></a><a class="mrow" href="${esc(file)}" download>${svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>')}<span><b>${T("calDl")}</b></span></a></div><p class="warn">${T("calNote")}</p></div>`;
  d.querySelector(".x").onclick=()=>d.close();const bk=d.querySelector(".bk");if(bk)bk.onclick=()=>openTeam(code);openCode=code||null;show(d)}
/* ---------- share a group as image ---------- */
function loadImg(src){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src})}
async function shareGroup(rid,gid){const r=rnd(rid),g=r&&r.groups.find(x=>x.id==gid);if(!g)return;
  try{await document.fonts.load('600 40px "General Sans"');await document.fonts.load('500 30px "General Sans"')}catch(e){}
  const W=1080,H=470+g.rows.length*150+150,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  const gr=x.createLinearGradient(0,0,W*.6,H);[["#1a4486",0],["#0a5590",.3],["#095d88",.52],["#0b6166",.76],["#255c2c",1]].forEach(([col,t])=>gr.addColorStop(t,col));x.fillStyle=gr;x.fillRect(0,0,W,H);
  const F='"General Sans",system-ui,sans-serif';const lk=await loadImg("brand/lockup.webp");if(lk)x.drawImage(lk,80,70,560,560*lk.height/lk.width);
  const ssl=await loadImg("brand/ssl.png");if(ssl)x.drawImage(ssl,W-80-120,90,120,120*ssl.height/ssl.width);
  x.fillStyle="#fff";x.font=`600 64px ${F}`;x.fillText(RNm(r),80,330);x.font=`500 40px ${F}`;x.fillStyle="rgba(255,255,255,.85)";x.fillText((r.groups.length>1?T("group")+" "+g.id+" · ":"")+range(r),80,390);
  const n=g.rows[0].r.length,y0=470,rh=150,gs=gState(g,r);
  {const cx=k=>W-60-130-72*(n-k)+36;x.font=`500 28px ${F}`;x.fillStyle="rgba(255,255,255,.7)";x.textAlign="center";for(let k=0;k<n;k++)x.fillText(n>1?"R"+(k+1):"",cx(k),y0-18);x.fillText(T("pts"),W-60-62,y0-18);x.textAlign="left"}
  for(let i=0;i<g.rows.length;i++){const row=g.rows[i],y=y0+i*rh,o=outcome(r.id,i+1,gs=="done"),w=o&&o[0]=="w";
    x.fillStyle=w?"rgba(255,255,255,.2)":"rgba(255,255,255,.08)";x.beginPath();x.roundRect?x.roundRect(60,y,W-120,rh-20,24):x.rect(60,y,W-120,rh-20);x.fill();
    x.fillStyle="#fff";x.font=`600 46px ${F}`;x.fillText(String(i+1),100,y+82);
    const iso2=iso(row.team);if(iso2){const fi=await loadImg(`img/fl/${iso2.toLowerCase()}.webp`);if(fi)x.drawImage(fi,160,y+38,72,54)}
    const cx=k=>W-60-130-72*(n-k)+36,maxW=cx(0)-36-256-16;let fs=46,nm=isTeam(row.team)?NM(row.team):ph(row.team)||row.team;x.font=`600 ${fs}px ${F}`;while(x.measureText(nm).width>maxW&&fs>30){fs-=2;x.font=`600 ${fs}px ${F}`}while(x.measureText(nm).width>maxW&&nm.length>4)nm=nm.slice(0,-2)+"…";x.fillText(nm,256,y+82);
    x.font=`500 38px ${F}`;x.fillStyle="rgba(255,255,255,.85)";row.r.forEach((v,k)=>{x.textAlign="center";x.fillText(String(v||"–"),cx(k),y+80)});
    x.font=`600 52px ${F}`;x.fillStyle="#ffd21f";const tot=String(row.total||"").trim()||String(row.r.reduce((s,v)=>s+num(v),0));x.textAlign="center";x.fillText(tot,W-60-62,y+82);x.textAlign="left"}
  x.font=`500 32px ${F}`;x.fillStyle="rgba(255,255,255,.8)";x.fillText(location.host+location.pathname.replace(/index\.html$/,""),80,H-70);
  const blob=await new Promise(res=>c.toBlob(res,"image/png"));if(!blob)return;const fn=`gold-cup-${rid}-${gid}.png`;
  try{const file=new File([blob],fn,{type:"image/png"});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"SSL Gold Cup"});return}}catch(e){if(e&&e.name=="AbortError")return}
  const u=URL.createObjectURL(blob),d=$("#tmd");d.innerHTML=`<div class="th"><div><div class="nick">SSL Gold Cup</div><h2>${T("imgDone")}</h2></div><div class="thb"><button class="x" aria-label="${T("close")}">✕</button></div></div><div class="tb"><img src="${u}" alt="" style="width:100%;border-radius:14px"><div class="tact"><a class="ibtn" href="${u}" download="${fn}" style="text-align:center;text-decoration:none">⬇ PNG</a></div></div>`;
  d.querySelector(".x").onclick=()=>d.close();openCode=null;show(d)}

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
  h+=`<div class="sstats"><a class="sl" href="https://worldofsailors.com/ranking/nation" target="_blank" rel="noopener"><small>${T("ranking")}</small><b>${I.rank?"#"+I.rank:"–"}</b><em>${T("rankBoard")}</em></a>${TM?`<button class="sl" data-go="round-${TM.path[0].r.id}"><small>${T("entered")}</small><b>${esc(RNm(TM.path[0].r))}</b><em>${T("showRound")}</em></button>`:""}<button class="sl" data-go="gc2023"><small>${T("gc23")}</small><b>${esc(T("g23")[I.gc23||"none"])}</b><em>${T("br23")}</em></button>${lastP?`<button class="sl" data-go="round-${lastP.r.id}"><small>${T("status")}</small><b>${lastP.done&&(lastP.r.id=="f"||lastP.r.id=="pf")?esc(TM.txt):TM.out?T("stOut"):T("stIn")}</b><em>${TM.out?T("whereEnded"):T("curGroup")}</em></button>`:""}</div>`;
  h+=teamStats(TM);
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
  h+=`<div class="tact">${pushShown()?`<button data-push="1" class="${pSet.has(code)?"on":""}" aria-pressed="${pSet.has(code)}">${T(pSet.has(code)?"pTeamOn":"pTeamOff")}</button>`:""}<button data-cal="${esc(code)}">${T("calBtn")}</button><button data-br="1">${T("showPath")}</button></div></div>`;
  d.innerHTML=h;
  d.querySelector(".x").onclick=()=>d.close();
  d.querySelector(".fv").onclick=()=>{favs.has(code)?favs.delete(code):favs.add(code);LS.set("favs",[...favs]);const y=d.scrollTop;openTeam(code);d.scrollTop=y;render(true)};
  d.querySelector(".ln").onclick=async()=>{const u=location.href.split("#")[0]+"#team-"+code;try{await navigator.clipboard.writeText(u);toast(T("copied"))}catch(e){toast(u)}};
  d.querySelector("[data-cal]").onclick=()=>calSheet(code);
  {const pb=d.querySelector("[data-push]");if(pb)pb.onclick=async()=>{pb.disabled=true;await pushToggle(code);if(d.open&&openCode==code){const y=d.scrollTop;openTeam(code);d.scrollTop=y}};}
  d.querySelector("[data-br]").onclick=()=>{d.close();sel=code;jump=true;go("bracket")};
  d.querySelectorAll("[data-go]").forEach(b=>{const f=()=>{d.close();sel=code;jump=true;go(b.dataset.go)};b.onclick=f;b.onkeydown=e=>{if(e.key=="Enter")f()}});
  d.querySelectorAll("[data-pi]").forEach(el=>{const f=()=>openSailor(code,+el.dataset.pi);el.onclick=f;el.onkeydown=e=>{if(e.key=="Enter")f()}});
  show(d)}
function show(d){if(!d.open){d.showModal();try{history.pushState({sheet:1},"")}catch(e){}}d.scrollTop=0;const th=d.querySelector(".th");if(th){th.tabIndex=-1;th.focus({preventScroll:true})}}
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

/* ---------- push notifications (OneSignal) + private visitor counter (GoatCounter); both off until config.js has a value ---------- */
const CFG=window.CFG||{};
const pushCan=()=>!!CFG.push&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window&&(location.protocol=="https:"||location.hostname=="localhost");
const pushShown=()=>!!CFG.push&&(pushCan()||isIOS);
const pushReady=()=>pushCan()&&!(isIOS&&!isStandalone());
let pSet=new Set(LS.get("push",[])),osP=null;
const OSL={en:"en",de:"de",fr:"fr",es:"es",pt:"pt",zh:"zh-Hans",ar:"ar"};
function loadOS(){if(osP)return osP;
  osP=new Promise((res,rej)=>{const to=setTimeout(()=>rej(new Error("timeout")),20000);
    window.OneSignalDeferred=window.OneSignalDeferred||[];
    window.OneSignalDeferred.push(async O=>{try{const base=location.pathname.replace(/[^/]*$/,"");
      await O.init({appId:CFG.push,path:base,serviceWorkerPath:"push/onesignal/OneSignalSDKWorker.js",serviceWorkerParam:{scope:base+"push/onesignal/"}});
      try{O.User.setLanguage(OSL[lang]||"en")}catch(e){}clearTimeout(to);res(O)}catch(e){clearTimeout(to);rej(e)}});
    if(!document.querySelector("script[data-os]")){const s=document.createElement("script");s.src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";s.defer=true;s.dataset.os=1;s.onerror=()=>{s.remove();clearTimeout(to);rej(new Error("load"))};document.head.appendChild(s)}});
  osP.catch(()=>{osP=null});return osP}
async function pushToggle(key){
  if(!pushReady()){pushHelp();return}
  const on=pSet.has(key),tag=key=="all"?"all":"team_"+key;let perm=Notification.permission;
  if(!on&&perm!=="granted"){if(perm==="denied"){toast(T("pDenied"));return}
    try{perm=await Notification.requestPermission()}catch(e){}   /* first await: the tap still counts as a user gesture */
    if(perm!=="granted"){toast(T(perm==="denied"?"pDenied":"pErr"));return}}
  try{const O=await loadOS();
    if(!on){await O.User.PushSubscription.optIn();O.User.addTag(tag,"1");pSet.add(key)}else{O.User.removeTag(tag);pSet.delete(key)}
    LS.set("push",[...pSet]);toast(T(on?"pOffT":"pOnT"));gcEvent(on?"push-off":"push-on")}
  catch(e){console.warn("push",e);toast(T("pErr"))}}
function pushHelp(){if(!(isIOS&&!isStandalone())){toast(T("pUnsup"));return}const d=$("#tmd");
  d.innerHTML=`<div class="th"><div><div class="nick">SSL Gold Cup</div><h2>${esc(T("pT"))}</h2></div><div class="thb"><button class="x" aria-label="${T("close")}">✕</button></div></div><div class="tb"><p>${esc(T("pIOS"))}</p><div class="tact"><button data-ih="1">${esc(T("inst").how)}</button></div></div>`;
  d.querySelector(".x").onclick=()=>d.close();d.querySelector("[data-ih]").onclick=()=>installHelp();openCode=null;show(d)}
function pushMore(){if(!pushShown())return"";const tl=[...pSet].filter(x=>x!="all"&&isTeam(x));
  return `<h3 class="sec">${T("pT")}</h3><div class="mlist"><button class="mrow" data-pall="1" role="switch" aria-checked="${pSet.has("all")}">${svg('<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 20a2 2 0 004 0"/>')}<span><b>${T("pAll")}</b><small>${T("pAllSub")}</small></span><i class="tgl${pSet.has("all")?" on":""}" aria-hidden="true"></i></button></div><div class="card pad"><p>${tl.length?`${esc(T("pTeams"))}: ${tl.map(c=>`<a href="#team-${esc(c)}">${FL(c)}${esc(NM(c))}</a>`).join(", ")}`:esc(T("pNone"))}</p><p class="warn">${esc(pushReady()?T("pNote"):T("pIOS"))}</p></div>`}
if(CFG.push&&pSet.size&&pushCan()){if(Notification.permission!=="granted"){pSet.clear();LS.set("push",[])}else setTimeout(()=>loadOS().catch(()=>{}),4000)}

/* visitor counter: anonymous, no cookies; dashboard only visible to the account owner */
function gcEvent(name){try{if(CFG.gc&&window.goatcounter&&goatcounter.count)goatcounter.count({path:name,title:name,event:true})}catch(e){}}
if(CFG.gc&&!/claude/.test(location.hostname)&&!navigator.webdriver){try{window.goatcounter={no_onload:true};const s=document.createElement("script");s.async=true;s.src="https://gc.zgo.at/count.js";s.dataset.goatcounter=`https://${CFG.gc}.goatcounter.com/count`;
  s.onload=()=>{try{goatcounter.count({path:location.pathname});gcEvent(isStandalone()?"start-app":"start-browser");gcEvent("lang-"+lang)}catch(e){}};document.head.appendChild(s)}catch(e){}}

/* ---------- chrome: header bar, theme, language ---------- */
function applyTheme(){const r=document.documentElement,t=theme=="auto"?"mb":theme;r.setAttribute("data-theme",t);let m=$("meta[name=theme-color]");if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content={mb:"#1a4486",light:"#192550",dark:"#0b1630"}[t]}
const ICO0=['<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="4" rx="1.5"/><rect x="3" y="10" width="18" height="4" rx="1.5"/><rect x="3" y="16" width="18" height="4" rx="1.5"/></svg>','<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="2.5" y="3.5" width="6" height="5" rx="1"/><rect x="2.5" y="15.5" width="6" height="5" rx="1"/><rect x="15.5" y="9.5" width="6" height="5" rx="1"/><path d="M8.5 6H12v12H8.5M12 12h3.5"/></svg>','<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 21V3.5M5 4h12l-2.5 4.5L17 13H5"/></svg>'];
$("#lang").onchange=e=>{lang=e.target.value;LS.set("lang",lang);if(osP)osP.then(O=>{try{O.User.setLanguage(OSL[lang]||"en")}catch(x){}}).catch(()=>{});for(const k in SQ)delete SQ[k];render();if($("#tmd").open&&openCode)openTeam(openCode)};
$("#thm").onclick=()=>{theme={auto:"light",light:"dark",dark:"auto"}[theme];LS.set("theme",theme);applyTheme();chrome()};
const ICO=['<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/></svg>',ICO0[0],ICO0[1],ICO0[2],'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>'];
function insBtn(){let b=$("#ins");const show=canInstall()&&!LS.get("installed",0);
  if(!show){if(b)b.remove();return}
  if(!b){b=document.createElement("button");b.id="ins";b.type="button";b.onclick=()=>doInstall();$(".bar").appendChild(b)}
  b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg><span>${esc(T("inst").b)}</span>`;b.title=T("inst").t}
function chrome(){insBtn();document.documentElement.lang=lang;document.documentElement.dir=lang=="ar"?"rtl":"ltr";$("#lang").value=lang;{const tl=T("theme")[theme],i=tl.indexOf(" ");$("#thm").innerHTML=`<span>${esc(tl.slice(0,i))}</span><span class="tht"> ${esc(tl.slice(i+1))}</span>`;$("#thm").title=tl.slice(i+1)}
  const tb=document.querySelectorAll(".tabs button");[T("home"),T("rounds"),T("bracket"),T("teams"),T("more")].forEach((l,i)=>{if(tb[i])tb[i].innerHTML=ICO[i]+`<span>${esc(l)}</span>`});
  $("#off").textContent=T("official");const F=$("#foot");const op=F.querySelector("details")?.open;F.innerHTML=`<details class="how"${op?" open":""}><summary>${esc(T("howT"))}</summary><ul>${T("how").map(x=>`<li>${esc(x)}</li>`).join("")}</ul></details><p>${esc(T("foot"))}</p>`;$("#tmd").setAttribute("aria-label",T("teams"));stand()}
function stand(){const u=new Date(checkedAt&&Date.parse(checkedAt)>Date.parse(D.updatedAt)?checkedAt:D.updatedAt);if(isNaN(u)){$("#stand").textContent="–";return}
  const m=Math.max(0,Math.round((Date.now()-u)/6e4)),abs=u.toLocaleString(LOC(),{timeZone:"America/Sao_Paulo",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  $("#stand").innerHTML=`${T("updated")} ${esc(abs)} · <span class="ago">${esc(T("ago")(m))}</span>${stale?" · "+esc(T("offline")):""}`}
applyTheme();

/* ---------- render & routing ---------- */
let GOOD=null;
function render(keepScroll){try{render0(keepScroll);GOOD=D}catch(e){console.error(e);if(GOOD&&GOOD!==D){D=GOOD;try{render0(keepScroll)}catch(e2){}}}}
function render0(keepScroll){const y=scrollY;chrome();
  document.querySelectorAll(".tabs button").forEach(b=>b.setAttribute("aria-selected",b.dataset.v==view||(b.dataset.v=="bracket"&&(view=="qualifying"||view=="gc2023"))||(b.dataset.v=="more"&&view=="sailors")));
  ladder();const M=$("#main");
  M.innerHTML=view=="home"?home():view=="more"?more():view=="sailors"?sailorsView():view=="board"?board():view=="bracket"?bracket():view=="qualifying"?qualifying():view=="gc2023"?gc23():teamView();
  document.body.dataset.view=view;
  if(jump){jump=false;const sr=M.querySelector("tr.sel,.bx .sel,.mr.sel");if(sr)setTimeout(()=>sr.scrollIntoView({block:"center",inline:"center"}),60);else scrollTo(0,0)}else if(keepScroll)scrollTo(0,y);
  const i=$("#q");if(i)i.oninput=e=>{q=e.target.value;const p=i.selectionStart;render(true);const n=$("#q");n.focus();n.setSelectionRange(p,p)};
  const i2=$("#q2");if(i2)i2.oninput=e=>{sq2=e.target.value;const p=i2.selectionStart;render(true);const n=$("#q2");n.focus();n.setSelectionRange(p,p)}}
function route(){const h=location.hash.slice(1);let m;
  if(["bracket","teams","gc2023","qualifying","home","more","sailors"].includes(h))view=h;
  else if(!h||!/^(round|runde)-/.test(h)&&!/^team-/.test(h)){view="home"}
  else if(m=h.match(/^team-([A-Z]{3})$/)){if(view=="board"&&!round)view="teams";render();openTeam(m[1]);return}
  else if(/^(round|runde)-/.test(h)){view="board";m=h.match(/^(?:round|runde)-(\w+)$/);round=m&&D.rounds.some(r=>r.id==m[1])?m[1]:(round||current())}
  LS.set("view",h);render()}
const go=h=>{if(location.hash.slice(1)!==h){try{if(history.state&&history.state.sheet)location.replace("#"+h);else location.hash=h;return}catch(e){}}route()};

document.querySelector(".tabs").addEventListener("click",e=>{const b=e.target.closest("button");if(b){if(b.dataset.v==view&&scrollY>0)scrollTo({top:0,behavior:"smooth"});go(b.dataset.v=="board"?"round-"+(round||current()):b.dataset.v)}});
$("#ladder").addEventListener("click",e=>{const b=e.target.closest("button");if(b){round=b.dataset.r;go("round-"+round)}});
$("#main").addEventListener("click",e=>{
  const ins=e.target.closest("[data-inst]");if(ins){doInstall();return}
  const ih=e.target.closest("[data-insthide]");if(ih){LS.set("instHide",Date.now()+3*864e5);render(true);return}
  const sh=e.target.closest("[data-share]");if(sh){const u=location.href.split("#")[0];(async()=>{try{if(navigator.share){await navigator.share({title:"SSL Gold Cup",url:u});return}}catch(x){return}try{await navigator.clipboard.writeText(u);toast(T("shared"))}catch(x){toast(u)}})();return}
  const si=e.target.closest("[data-shimg]");if(si){const[a,b]=si.dataset.shimg.split("|");shareGroup(a,b);return}
  const ca=e.target.closest("[data-calall]");if(ca){calSheet(null);return}
  const pa=e.target.closest("[data-pall]");if(pa){pa.disabled=true;pushToggle("all").finally(()=>render(true));return}
  const sp=e.target.closest("[data-sp]");if(sp){sPh=sp.dataset.sp=="1";render(true);return}
  const sr=e.target.closest("[data-sc]");if(sr){openSailor(sr.dataset.sc,+sr.dataset.si);return}
  const g=e.target.closest("[data-go]");if(g&&!e.target.closest(".mr.team")){go(g.dataset.go);return}
  const f=e.target.closest("[data-f]");if(f){filt=f.dataset.f;render(true);return}
  const s=e.target.closest("[data-s]");if(s){sortBy=s.dataset.s;render(true);return}
  const t=e.target.closest(".team,.tm,.tmx");if(t)openTeam(t.dataset.t)});
$("#tmd").addEventListener("click",e=>{if(e.target.id=="tmd")e.target.close()});
$("#tmd").addEventListener("close",()=>{openCode=null;try{if(history.state&&history.state.sheet)history.back()}catch(e){}});
window.addEventListener("popstate",()=>{const d=$("#tmd");if(d.open)d.close()});
window.addEventListener("hashchange",route);
document.addEventListener("keydown",e=>{if(e.target.matches("input,select,textarea")||$("#tmd").open)return;
  if(e.key=="/"){const i=$("#q");if(i){e.preventDefault();i.focus()}}
  if(view=="board"&&(e.key=="ArrowRight"||e.key=="ArrowLeft")){const ids=D.rounds.map(r=>r.id),i=ids.indexOf(round)+(e.key=="ArrowRight"?1:-1);if(ids[i]){round=ids[i];go("round-"+round)}}});
setInterval(()=>{stand();if((view=="board"||view=="home")&&!$("#tmd").open&&!document.hidden&&!(document.activeElement&&document.activeElement.matches("input,select")))render(true)},60000);
setInterval(async()=>{if(document.hidden)return;if(await pullFile()){render(true);if($("#tmd").open&&openCode){const y=$("#tmd").scrollTop;openTeam(openCode);$("#tmd").scrollTop=y}}else stand()},60000);
document.addEventListener("visibilitychange",async()=>{if(!document.hidden&&await pullFile())render(true)});
await pullFile();live=true;loadWx();setInterval(loadWx,30*6e4);
round=current();
if(!location.hash){const v=LS.get("view","");if(v&&!/^team-/.test(v))try{location.hash=v}catch(e){}}
route();

/* ---------- app updates: reload automatically when a new version is published ---------- */
let VER=null,NEWVER=false;
async function checkVer(){try{const r=await fetch("version.json?t="+Date.now(),{cache:"no-store"});if(!r.ok)return;const v=(await r.json()).v;if(!v)return;if(VER==null)VER=v;else if(v!==VER)NEWVER=true}catch(e){}tryReload()}
function tryReload(){if(!NEWVER||document.hidden||$("#tmd").open||(document.activeElement&&document.activeElement.matches("input,select")))return;NEWVER=false;location.reload()}
checkVer();setInterval(checkVer,120000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkVer()});
$("#tmd").addEventListener("close",()=>setTimeout(tryReload,300));

/* ---------- offline / home-screen app (own hosting only; artifact frames refuse service workers) ---------- */
try{if("serviceWorker" in navigator&&window.top===window&&location.protocol=="https:"&&!/claude/.test(location.hostname))navigator.serviceWorker.register("sw.js").catch(()=>{})}catch(e){}

/* ---------- live data ---------- */
(async()=>{try{const db=await window.claude?.use?.("db");if(!db)return;
  const timer=setTimeout(()=>{if(!live){stale=true;stand()}},10000);
  db.doc("gc/results").onSnapshot(s=>{if(s.exists){const d=s.data();if(d&&d.checkedAt)checkedAt=d.checkedAt;if(okData(d)&&(!D.updatedAt||Date.parse(d.updatedAt)>=Date.parse(D.updatedAt))){D=JSON.parse(JSON.stringify(d));live=true;
      if(!D.rounds.some(r=>r.id==round))round=current();render(true);if($("#tmd").open&&openCode){const y=$("#tmd").scrollTop;openTeam(openCode);$("#tmd").scrollTop=y}}}
    if(!s.metadata.fromCache)clearTimeout(timer)},()=>clearTimeout(timer))}catch(e){}})();
})();
