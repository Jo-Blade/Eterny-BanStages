let room = 0;
let stagesList = "darso1AJTI";

const stageNoms = ['Battlefield', 'Castle Siege', 'Dream Land', 'Final Destination', 'Fountain of Dreams', 'Frigate Orpheon', 'Halberd', 'Hollow Bastion', 'Kalos Pokemon League', 'Lylat Cruise', 'Mementos', 'Midgar', 'Northern Cave', 'Pokemon Stadium', 'Pokemon Stadium 2', 'Rainbow Cruise', 'Skyloft', 'Small Battlefield', 'Smashville', 'Town and City', 'Unova Pokemon League', 'WarioWare, Inc.', 'Wily Castle', 'Wuhu Island', "Yggdrasil's Altar", "Yoshi's Island (Brawl)", "Yoshi's Story"];

var url = new URL(location);
const room_param =  url.searchParams.get("room");
const title_param =  url.searchParams.get("title");
const stages_param =  url.searchParams.get("stages");
const stream_param =  url.searchParams.get("stream");

if (Number(stream_param) == 1)
  document.body.classList.add("stream");
if (room_param)
  room = Number(room_param);
if (stages_param)
  stagesList = stages_param;
if (title_param) {
  const title = decodeURIComponent(title_param);
  document.getElementsByTagName('title')[0].innerHTML = title;
  document.getElementById('title').innerHTML = title;
}


let ws;

function wsConnect () {
  if (window.location.protocol == "https:")
    ws = new WebSocket("wss://" + location.host);
  else
    ws = new WebSocket("ws://" + location.host);

  ws.addEventListener("open", () =>{
    console.log("We are connected");

    const req = {
      "room": 0,
      "code": 0,
      "value": room
    };

    ws.send(JSON.stringify(req));
  });

  // reconnect if client lost connection
  ws.addEventListener("close", () =>{
    console.log("websocket connection lost");
    // try reconnect after 1s
    setTimeout(wsConnect, 1000)
  });

  ws.addEventListener('message', function (event) {
    console.log(event.data);
    const data = JSON.parse(event.data);

    switch (data.code) {
      case 0:
        room = data.value;
        break;
      case 1: {
        const stage = document.getElementById("stage-" + data.value);
        stage.classList.add("checked");
        updateAndValidate(stage);
        break;
      }
      case 2: {
        const stage = document.getElementById("stage-" + data.value);
        stage.classList.remove("checked");
        updateAndValidate(stage);
        break;
      }
      case 3:
        // renvoyer toutes les infos pour chaque stage (ex: nouveau client join la room)
        console.log("renvoyer infos");
        renvoyerInfos();
        break;
      case 4:
        stagesList = data.value;
        changerStages();
        break;
      case 5: {
        const title = decodeURIComponent(data.value);
        document.getElementsByTagName('title')[0].innerHTML = title;
        document.getElementById('title').innerHTML = title;
        break;
      }
    }
  });
}

wsConnect();

function renvoyerInfos() {
  // renvoyer la liste de stages
  const reqStages = {
    "room": room,
    "code": 4,
    "value": stagesList
  };

  ws.send(JSON.stringify(reqStages));

  // on doit sauvegarder l’état actuel de chaque stage (checked ou unchecked)
  // car les objets vont etre supprimes lors de la mise a jour
  const stages = document.querySelectorAll('.stage');
  stages.forEach(el => {
    const id = Number(el.id.split('-')[1]);

    let req = {
      "room": room,
      "code": 2,
      "value": id
    };

    if(el.classList.contains("checked"))
      req["code"] = 1;


    ws.send(JSON.stringify(req));
  });

  // renvoyer le titre
  const reqTitre = {
    "room": room,
    "code": 5,
    "value": encodeURIComponent(document.getElementById('title').innerHTML)
  };

  ws.send(JSON.stringify(reqTitre));
}

function isCounterpickStage (letter) {
  return ('A' <= letter && letter <= 'Z');
}

function letterValue (letter) {
  if ('A' <= letter && letter <= 'Z')
    return letter.charCodeAt() - 65;
  else
    return letter.charCodeAt() - 97;
}

// on a pas besoin de verifier les erreurs sur la chaine de caractere car le serveur
// a deja verifie qu'elle est conforme au format attendu
function changerStages () {
  document.getElementById("starters").innerHTML = "";
  document.getElementById("counterpicks").innerHTML = "";

  let i = 0;
  while (i < stagesList.length) {
    if ('0' <= stagesList[i] && stagesList[i] <= '9') {
      ajouterStage(isCounterpickStage(stagesList[i+1]), Number(stagesList[i])*26 + letterValue(stagesList[i+1]), i);
      i += 2;
    }
    else {
      ajouterStage(isCounterpickStage(stagesList[i]), letterValue(stagesList[i]), i);
      i++;
    }
  }

  if (document.getElementById("counterpicks").childNodes.length === 0) {
    document.getElementsByTagName('h2')[0].style.display = "none";
    document.getElementsByTagName('h2')[1].style.display = "none";
  }
  else {
    document.getElementsByTagName('h2')[0].style.display = "";
    document.getElementsByTagName('h2')[1].style.display = "";
  }
}

function ajouterStage(isCounter, stageId, i) {
  const nom = stageNoms[stageId];
  let newStage = document.createElement("li");

  newStage.setAttribute("class", "stage");
  newStage.setAttribute("id", "stage-" + i);
  newStage.innerHTML = '<img src="images/' + nom + '.jpg" alt="' + nom + ' stage"> <p>' + nom + '</p>';

  if (isCounter)
    document.getElementById("counterpicks").appendChild(newStage);
  else
    document.getElementById("starters").appendChild(newStage);

  // add click event
  newStage.addEventListener('click', () => {

    let req = {
      "room": room,
      "code": 1,
      "value": i
    };

    if(newStage.classList.contains("checked"))
      req["code"] = 2;

    ws.send(JSON.stringify(req));
    console.log("toggle check");
  });

  // double click pour valider directement le stage sélectionné
  newStage.addEventListener('dblclick', () => {
    const stages = document.querySelectorAll('.stage');
    stages.forEach(el => {
      if (el == newStage) {
        const req = {
          "room": room,
          "code": 2,
          "value": el.id.split('-')[1]
        };
        ws.send(JSON.stringify(req));
      }
      else {
        const req = {
          "room": room,
          "code": 1,
          "value": el.id.split('-')[1]
        };
        ws.send(JSON.stringify(req));
      }
    });
  });
}

// boutons en pied de page
document.getElementById("linkBtn").onclick = function() {
  copyTextToClipboard(location.protocol + location.host + "?title=" + document.getElementsByTagName('title')[0].innerHTML + "&stages=" + stagesList + "&room=" + room);
}

document.getElementById("resetBtn").onclick = resetStages;

document.getElementById("editBtn").onclick = function() {
  if (document.getElementsByTagName("aside")[0].style.display == "none")
    document.getElementsByTagName("aside")[0].style.display = "";
  else
    document.getElementsByTagName("aside")[0].style.display = "none";
}

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert('Text copied to clipboard');
  } catch(err) {
    alert('Error in copying text: ', err);
  }
}

function resetStages () {
  const stages = document.querySelectorAll('.stage');
  stages.forEach(el => {
    const req = {
      "room": room,
      "code": 2,
      "value": el.id.split('-')[1]
    };
    ws.send(JSON.stringify(req));
  });
}

// obtenir le code avec 2 lettres pour un stage
function idCode (id, isCounter) {
  let txt = "";
  if (parseInt(id / 26, 10) > 0)
    txt += parseInt(id / 26, 10);

  if (isCounter)
    txt += String.fromCharCode(id % 26 + 65)
  else
    txt += String.fromCharCode(id % 26 + 97)
  return txt;
}

function genOptionsList (parentEl, isCounter) {
  let newSelect = document.createElement("select");
  newSelect.setAttribute("class", "editStage");
  newSelect.innerHTML = '<option value="null">None</option>';
  for (let i = 0; i < stageNoms.length; i++)
    newSelect.innerHTML += '<option value="' + idCode(i, isCounter) + '">' + stageNoms[i] + '</option>';

  parentEl.appendChild(newSelect);
}

const editStartersEl = document.getElementById("editStarters");
const editCounterpicksEl = document.getElementById("editCounterpicks");
for (let i = 0; i < 10; i++) {
  genOptionsList(editStartersEl, false);
  genOptionsList(editCounterpicksEl, true);
}

function newStageList () {
  let txt ="";
  const editStages = document.querySelectorAll('.editStage');
  editStages.forEach(el => {
    if (el.value != "null")
      txt += el.value
  });
  return txt;
}

// bouton pour editer la page
document.getElementById("applyBtn").onclick = function() {
  const reqStages = {
    "room": room,
    "code": 4,
    "value": newStageList()
  };

  ws.send(JSON.stringify(reqStages));
}

// ajouter la class update pendant 3s et valider si un
// seul stage restant
function updateAndValidate (stage) {
  stage.classList.add("update");
  setTimeout(function () {
    stage.classList.remove("update");
  }, 3000);

  const stagesValidated = document.querySelectorAll('.stageValidated');
  stagesValidated.forEach(el => {
    el.classList.remove("stageValidated");
  });

  let stagesUnchecked = [];
  const stages = document.querySelectorAll('.stage');
  stages.forEach(el => {
    if (!el.classList.contains("checked"))
      stagesUnchecked.push(el);
  });
  if (stagesUnchecked.length == 1) {
    stagesUnchecked[0].classList.add("stageValidated");
    stages.forEach(el => {
      el.classList.remove("update");
    });

  }
}
