const express = require('express');
const Redis = require("redis");
const path = require("path");
var users = []
let guestId = 0;
let drawer = "";
const app = express();
const http = require("http");
const uuidv4 = require("uuid/v4");
const WebSocket = require("ws");

let sockets = [];
const client = Redis.createClient();
const redisPublisher = Redis.createClient();
const redisSubscriber = Redis.createClient();

const PUBLIC_FOLDER = path.join(__dirname, "../public");
const PORT = process.env.PORT || 5000;

const socketsPerChannels /* Map<string, Set<WebSocket>> */ = new Map();
const channelsPerSocket /* WeakMap<WebSocket, Set<string> */ = new WeakMap();

// Initialize a simple http server
const server = http.createServer(app);

// Initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });
wss.room=[];

  /*
   * Subscribe a socket to a specific channel.
   */
  function subscribe(socket, channel) {
      let socketSubscribed = socketsPerChannels.get(channel) || new Set();
      let channelSubscribed = channelsPerSocket.get(socket) || new Set();
  
      if (socketSubscribed.size == 0) {
          redisSubscriber.subscribe(channel);
      }
  
      socketSubscribed = socketSubscribed.add(socket);
      channelSubscribed = channelSubscribed.add(channel);
  
      socketsPerChannels.set(channel, socketSubscribed);
      channelsPerSocket.set(socket, channelSubscribed);

      // Increment user id of incoming connections
        guestId++;
    
        socket.nickname = "Guest_" + guestId;
        var clientName = socket.nickname;
       
        users.push(clientName);
    
        sockets.push(socket);
    
        // Broadcast to others excluding this socket
        socket.on('connect', function () {
            status.text('status: online | Click Ready to draw! button to start drawing');
            chatinput.removeProp('disabled');
            chatinput.focus();
    
            
        });     
        // Log it to the server output
        console.log(clientName + ' joined this game.\n');
        
        if(users.length < 2)
        {               
            PartieComplete = false;
            console.log("il manque des joueur");
            console.log("La partie va commencer, en attente d'autre joueur");
        }
        else{
            
            PartieComplete = true;
            server.emit('userlist', users);
            var	words = [
                "Pomme", "Soleil", "Lune", "Voiture", "Stylo", "Police", "Chien",
                "Son", "Eau", "baguette", "statue", "maison", "main", "vache",
                "loup", "chaise", "poubelle", "monde", "tete", "banane", "ecole",
                "fleure", "champignon", "oeil", "arbre", "ferme", "livre", "mer", "nuit", "jour", 
                "vie", "nord", "sud", "est", "ouest", "mort", "velo", 
                "chat", "guitarre", "pile", "bateau", "Power Rangers", "pied", "ordinateur", "telephone", 
                "internet", "ami", "idea", "poisson", "montagne", "cheval", "montre", "bouclier", "argent", 
                "bois", "list", "oiseau", "body", "famille", "song", "porte", "foret", "vent", "avion", "parachute",
                "pierre", "Captain Planet", "feu", "ours", "roi", "espace", "baleine", "epee", "plume", "pigeon"
            ];
    
            function newWord() {
                wordcount = Math.floor(Math.random() * (words.length));
                return words[wordcount];
            };
    
            if(users.length == 4){
                let randomUser = Math.floor(Math.random()*users.length);
                console.log(randomUser);
                let listeguesser = users.splice(0,randomUser); 
                console.log("La Partie va commencer");
                console.log(users[randomUser] + ' is a drawer');
                drawer = users[randomUser];
                if(drawer != null){
                    wss.room.push('drawer');
                    // place user into 'drawer' room
                    wss.room.join('drawer');
                    // server submits the 'drawer' event to this user
                    //server.in(socket.username).emit('drawer', socket.username);
                    // send the random word to the user inside the 'drawer' room
                    //server.in(socket.username).emit('draw word', newWord());
                    console.log(users[randomUser] + "'s draw word : " + newWord());
                    if(listeguesser != null){
                        // server submits the 'guesser' event to this user
                        //server.in(socket.username).emit('guesser', socket.username);
                        console.log(listeguesser + ' are a guesser');
                        listeguesser.forEach(function(){
                            wss.room.push('guesser');
                            // additional users will join the 'guesser' room
                            wss.room.join('guesser');
                        });
                    } 
                }
            }
            // update all clients with the list of users
            server.emit('userlist', users);
    
            // submit drawing on canvas to other clients
            socket.on('draw', function(obj) {
                socket.broadcast.emit('draw', obj);
            });
        
            // submit each client's guesses to all clients
            socket.on('guessword', function(data) {
                server.emit('guessword', { username: data.username, guessword: data.guessword})
                console.log('guessword event triggered on server from: ' + data.username + ' with word: ' + data.guessword);
            });

            // When client sends data
            redisSubscriber.on("message", function(channel, data) {
                broadcastToSockets(channel, data);
              });
        }
    
    }

function unsubscribe(socket, channel) {
    let socketSubscribed = socketsPerChannels.get(channel) || new Set();
    let channelSubscribed = channelsPerSocket.get(socket) || new Set();

    socketSubscribed.delete(socket);
    channelSubscribed.delete(channel);

    if (socketSubscribed.size == 0) {
        redisSubscriber.unsubscribe(channel);
    }

    socketsPerChannels.set(channel, socketSubscribed);
    channelsPerSocket.set(socket, channelSubscribed);
}

/*
 * Subscribe a socket from all channels.
 */
function unsubscribeAll(socket) {
    const channelSubscribed = channelsPerSocket.get(socket) || new Set();

    channelSubscribed.forEach(channel => {
        unsubscribe(socket, channel);
    });
}

function broadcastToSockets(channel, data) {
    const socketSubscribed = socketsPerChannels.get(channel) || new Set();

    // redisPublisher.publish(channel, data);

    socketSubscribed.forEach(client => {
        client.send(data);
    });
}

// Broadcast message from client
wss.on("connection", ws => {
    ws.on('close', () => {
        unsubscribeAll(ws);
    });

    ws.on("message", data => {
        const message = JSON.parse(data.toString());
        switch (message.type) {
            case 'subscribe':
                client.lrange(message.channel, 0, 100, (err, result) => {
                    result.map(data => ws.send(data));
                });
                subscribe(ws, message.channel);
                break;
            default:
                client.lpush(message.channel, data);
                redisPublisher.publish(message.channel, data);
                broadcastToSockets(message.channel, data);
                break;
        }
    });
});

// Assign a random channel to people opening the application
app.get("/", (req, res) => {
    res.redirect(`/${uuidv4()}`);
});

app.get("/:channel", (req, res, next) => {
    res.sendFile(path.join(PUBLIC_FOLDER, "index.html"), {}, err => {
        if (err) {
            next(err);
        }
    });
});

app.use(express.static(PUBLIC_FOLDER));

// Listening for any problems with the server
server.on('error', function(error) {
	console.log("So we got problems!", error.message);
});

// Listen for a port to telnet to
// then in the terminal just run 'telnet localhost [port]'
server.listen(PORT, function() {
	console.log("Server listening at http://localhost:" + PORT);
});



    

