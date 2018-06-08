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
    if (message.type == "wordToGuess"){}
});

socket.addEventListener("open", () => {
    sendMessage("subscribe", {});
});

function sendMessage(type, payload) {
    const message = { type, payload, channel: CURRENT_CHANNEL };
    socket.send(JSON.stringify(message));
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
const $messageInput = $("#guess");


$("#valider").on("click", e => {
    e.preventDefault();
    sendMessage("message", { message: $messageInput.val() });
});

$("#clearcanvas").on("click", e => {clearScreen()});

function clearScreen()
{
    var context = canvas.context;
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function usernameAsk() {
    $('.grey-out').fadeIn(500);
    $('.user').fadeIn(500);
    $('.user').submit(function(){
        event.preventDefault();
        user = $('#username').val().trim();

        if (user == '') {
            return false
        };

        var index = users.indexOf(user);

        if (index > -1) {
            alert(user + ' already exists');
            return false
        };
        
        socket.emit('join', user);
        $('.grey-out').fadeOut(300);
        $('.user').fadeOut(300);
        $('input.guess-input').focus();
    });
};

var guesser = function() {
    clearScreen();
    click = false;
    console.log('draw status: ' + click);
    $('.draw').hide();
    $('#guesses').empty();
    console.log('You are a guesser');
    $('#guess').show();
    $('.guess-input').focus();

    $('#guess').on('submit', function() {
        event.preventDefault();
        var guess = $('.guess-input').val();

        if (guess == '') {
            return false
        };

        console.log(user + "'s guess: " + guess);
        socket.emit('guessword', {username: user, guessword: guess});
        $('.guess-input').val('');
    });
};

var guessword = function(data){
    $('#guesses').text(data.username + "'s guess: " + data.guessword);

    if (click == true && data.guessword == $('span.word').text() ) {
        console.log('guesser: ' + data.username + ' draw-word: ' + $('span.word').text());
        socket.emit('correct answer', {username: data.username, guessword: data.guessword});
        socket.emit('swap rooms', {from: user, to: data.username});
        click = false;
    }
};

var drawWord = function(word) {
    $('span.word').text(word);
    console.log('Your word to draw is: ' + word);
};

var users = [];

var userlist = function(names) {
    users = names;
    var html = '<p class="chatbox-header">' + 'Players' + '</p>';
    for (var i = 0; i < names.length; i++) {
        html += '<li>' + names[i] + '</li>';
    };
    $('ul').html(html);
};

var newDrawer = function() {
    socket.emit('new drawer', user);
    clearScreen();
    $('#guesses').empty();
};

var correctAnswer = function(data) {
    $('#guesses').html('<p>' + data.username + ' guessed correctly!' + '</p>');
};

var reset = function(name) {
    clearScreen();
    $('#guesses').empty();
    console.log('New drawer: ' + name);
    $('#guesses').html('<p>' + name + ' is the new drawer' + '</p>');
};

$(document).ready(function() {

    canvas = $('#canvas');
    context = canvas[0].getContext('2d');

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



	
	