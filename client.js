let room = 0;
let stagesList = "darso1AJTI";

const stageNoms = ['Battlefield', 'Castle Siege', 'Dream Land', 'Final Destination', 'Fountain of Dreams', 'Frigate Orpheon', 'Halberd', 'Hollow Bastion', 'Kalos Pokemon League', 'Lylat Cruise', 'Mementos', 'Midgar', 'Northern Cave', 'Pokemon Stadium', 'Pokemon Stadium 2', 'Rainbow Cruise', 'Skyloft', 'Small Battlefield', 'Smashville', 'Town and City', 'Unova Pokemon League', 'WarioWare, Inc.', 'Wily Castle', 'Wuhu Island', "Yggdrasil's Altar", "Yoshi's Island (Brawl)", "Yoshi's Story"];

var url = new URL(location);
const room_param =  url.searchParams.get("room");
const title_param =  url.searchParams.get("title");
const stages_param =  url.searchParams.get("stages");

if (room_param)
  room = Number(room_param);
if (stages_param)
  stagesList = stages_param;
if (title_param) {
  const title = decodeURIComponent(title_param);
  document.getElementsByTagName('title')[0].innerHTML = title;
  document.getElementById('title').innerHTML = title;
}



const ws = new WebSocket("ws://" + location.host);
ws.addEventListener("open", () =>{
  console.log("We are connected");

  const req = {
    "room": 0,
    "code": 0,
    "value": room
  };

  ws.send(JSON.stringify(req));
});

ws.addEventListener('message', function (event) {
  console.log(event.data);
  const data = JSON.parse(event.data);

  switch (data.code) {
    case 0:
      room = data.value;
      break;
    case 1:
      document.getElementById("stage-" + data.value).classList.add("checked");
      break;
    case 2:
      document.getElementById("stage-" + data.value).classList.remove("checked");
      break;
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
}
