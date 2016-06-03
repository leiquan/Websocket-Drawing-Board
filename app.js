var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(8080);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/views/index.html');
});
app.get('/lib/socket.io-1.4.5.js', function (req, res) {
    res.sendFile(__dirname + '/views/lib/socket.io-1.4.5.js');
});
app.get('/lib/snap.svg-min.js', function (req, res) {
    res.sendFile(__dirname + '/views/lib/snap.svg-min.js');
});
app.get('/lib/Painter.js', function (req, res) {
    res.sendFile(__dirname + '/views/lib/Painter.js');
});
app.get('/css/style.css', function (req, res) {
    res.sendFile(__dirname + '/views/css/style.css');
});

io.on('connection', function (socket) {

    console.log('Server conneced!');

    socket.emit('init', {userid: Math.random() * 1000});

    socket.on('draw', function (data) {
        socket.broadcast.emit('draw', data);
    });

    socket.on('config', function (data) {
        socket.broadcast.emit('config', data);
    });

});