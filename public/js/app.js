var socket = io();
let isPressingCanvas = false;
let color;
let size = 6;

// Ratio width/height for the canvas to draw on
const CANVAS_RATIO = 300 / 200;

// La channel actuelle est stoqué dans le hash
const CURRENT_CHANNEL = location.pathname.slice(1);

// Prepare the canvas
const canvas = document.createElement("canvas");
const container = document.getElementById("canvas-container");

//Info Form
var nickname = document.getElementById("nickname");

canvas.id = "CursorLayer";
canvas.width = container.clientWidth;
canvas.height = canvas.width / CANVAS_RATIO;
container.appendChild(canvas);

const ctx = canvas.getContext("2d");
const wordToDiscover = document.getElementById("wordToGuess");

// Draw in the canvas for draw message received
const socket = new WebSocket(location.origin.replace(/^http/, 'ws'), "protocolOne");

socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);

    if (message.channel != CURRENT_CHANNEL) {
        throw new Error(
            "On ne devrait pas recevoir de message depuis ce channel"
        );
        return;
    }

    if (message.type == "draw") {
        drawInCanvas(
            ctx,
            message.payload.x,
            message.payload.y,
            message.payload.color,
            message.payload.size
        );
    }

    if(message.type == "message")
    {
       sendName();
    }

});

socket.addEventListener("open", () => {
    sendMessage("subscribe", {});
});

function sendMessage(type, payload) {
    const message = { type, payload, channel: CURRENT_CHANNEL };
    socket.send(JSON.stringify(message));
    
}

function sendName()
{
    
    Namevalue = nickname.value;
    
    
    socket.send(JSON.stringify(Namevalue));
     
}

function drawInCanvas(ctx, x, y, color, size) {
    const circle = new Path2D();
    circle.moveTo(x, y);
    circle.arc(x, y, size, 0, 2 * Math.PI);

    ctx.fillStyle = color;
    ctx.fill(circle);
}

// Bind event listener to color picker
document.querySelectorAll(".color").forEach(colorButton => {
    const style = window.getComputedStyle(colorButton);
    const colorValue = style.getPropertyValue("background-color");

    colorButton.addEventListener(
        "click",
        () => {
            color = colorValue;
        },
        false
    );

    color = colorValue;
});

// Bind event listeners for canvas
const onMouseMove = event => {
    if (!isPressingCanvas) {
        return;
    }

    const x = event.pageX - canvas.offsetLeft;
    const y = event.pageY - canvas.offsetTop;

    drawInCanvas(ctx, x, y, color, size);

    sendMessage("draw", {
        x,
        y,
        color,
        size
    });
};

const onMouseDown = event => {
    isPressingCanvas = true;
    onMouseMove(event);
};

const onMouseUp = () => {
    isPressingCanvas = false;
};

canvas.addEventListener("mousemove", onMouseMove, false);
canvas.addEventListener("mousedown", onMouseDown, false);
canvas.addEventListener("mouseup", onMouseUp, false);

  

function clearScreen()
{
    var context = canvas.context;
    context.clearRect(0, 0, canvas.width, canvas.height);
}
    

$(document).ready(function() {

    canvas = $('#canvas');
    context = canvas[0].getContext('2d');
    canvas[0].width = canvas[0].offsetWidth;
    canvas[0].height = canvas[0].offsetHeight;

    usernameAsk();

    socket.on('userlist', userlist);
    socket.on('guesser', guesser);
    socket.on('guessword', guessword);
    socket.on('draw', draw);
    socket.on('draw word', drawWord);
    socket.on('drawer', pictionary);
    socket.on('new drawer', newDrawer);
    socket.on('correct answer', correctAnswer);
    socket.on('reset', reset);
    socket.on('clear screen', clearScreen);

});