// Importing the required modules
import { stripHtml } from "string-strip-html";
import { WebSocketServer } from "ws";


import express from "express";
import * as http from "http";

const app = express();
const port = 8002;

app.use(express.static('.'));

const server = http.createServer(app);

server.listen(port, () => {
  console.log("Server turned on, port number:" + port);
});
// ------
 
// Creating a new websocket server
const wss = new WebSocketServer({ server })

var rooms = {};


function RemoveWS (ws) {
  Object.keys(rooms).forEach(key => RemoveElementList(rooms[key], ws));
}

function RemoveElementList (list, element) {
  const index = list.indexOf(element);
  if (index >= 0)
    list.splice(index, 1);
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function isEmpty(room) {
  return typeof rooms[room] == "undefined" || rooms[room].length == 0;
}

// Creating connection using websocket
wss.on("connection", ws => {
  console.log("new client connected");

  ws.on("message", msg => {
    console.log("Client has sent us:" + msg);

    try {
      const data = JSON.parse(msg);

      let req = {
        "code": Number(data.code),
        "value": -1
      };
      const room = Number(data.room);


      switch (req.code) {
        case 0:
          // obtenir une room vide aleatoire si on demande la room nulle
          req.value = Number(data.value);

          if (req.value == 0) {
            do
              req.value = getRandomInt(100000);
            while (!isEmpty(req.value));
          }

          // créer la liste si elle n'existe pas déjà
          if (isEmpty(req.value))
            rooms[req.value] = [];

          // supprimer le client de la room ou il est deja si besoin
          RemoveWS (ws);
          // rajouter le client dans la nouvelle room
          rooms[req.value].push(ws);
          ws.send(JSON.stringify(req));

          // demander de renvoyer les infos pour sync les clients
          req["code"] = 3;
          rooms[req.value][0].send(JSON.stringify(req));
          break;
        case 1:
        case 2:
          req.value = Number(data.value);
          sendRoom(room, req);
          break;
        case 4: {
          // tester si la valeur respecte le format pour la config des stages
          const regex = new RegExp('([0-9][a-z|A-Z]|[a-z|A-Z])+');
          if (data.value == regex.exec(data.value)[0]) {
            req.value = data.value;
            sendRoom(room, req);
          }
          else
            console.error("Invalid stage list:" + data.value );
          break; }
        case 5:
          req.value = encodeURIComponent(stripHtml(decodeURIComponent(data.value)).result);
          sendRoom(room, req);
          break;
      }
    } catch (e) {
      console.error("Invalid message received: " + e );
    }

  });


  // handling what to do when clients disconnects from server
  ws.on("close", () => {
    console.log("the client has disconnected");
    RemoveWS (ws);
  });
  // handling client connection error
  ws.onerror = function () {
    console.log("Some Error occurred");
    RemoveWS (ws);
  }
});
console.log("The WebSocket server is running on port " + port);

function sendRoom(room, req) {
  if (room == 0) // 0 est la room indépendante
    ws.send(JSON.stringify(req));
  else if (!isEmpty(room)) {
    rooms[room].forEach(client => {
      client.send(JSON.stringify(req));
    });
  }
}
