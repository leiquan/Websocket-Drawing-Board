var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');
var ejs = require('ejs');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('.html', ejs.__express);
app.set('view engine', 'html');

app.use(express.static(path.join(__dirname, 'public')));

server.listen(8080);

app.get('/', function (req, res, next) {
    res.render('index');
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