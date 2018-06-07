const path = require("path");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const uuidv4 = require("uuid/v4");
const Redis = require("redis");

const app = express();
app.use(express.static('public'));

const client = Redis.createClient();
const redisPublisher = Redis.createClient();
const redisSubscriber = Redis.createClient();

const PUBLIC_FOLDER = path.join(__dirname, "../public");
const PORT = process.env.PORT || 5000;

const socketsPerChannels /* Map<string, Set<WebSocket>> */ = new Map();
const channelsPerSocket /* WeakMap<WebSocket, Set<string> */ = new WeakMap();

// Initialize a simple http server
const server = http.createServer(app);

// Words for the game 
var users = [];

var words = [
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

//retourne un nom aléatoire
function NouveauMot() {
	wordcount = Math.floor(Math.random() * (words.length));
	return words[wordcount];
};



// Initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

redisSubscriber.on("message", function(channel, data) {
  broadcastToSockets(channel, data);
});
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
}

/*
 * Unsubscribe a socket from a specific channel.
 */
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

/*
 * Broadcast a message to all sockets connected to this server.
 */
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

server.listen(PORT, () => {
    console.log(`Server started on port ${server.address().port}`);
});
