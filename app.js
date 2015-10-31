var http        = require('http');
var ws          = require('ws');
var express     = require('express');
var path        = require('path');

var apiRouter   = require("./routers/api");

//require("./models/quiz");
//require("./models/category");

var app             = express();
var httpServer      = http.createServer(app);
var wss = new ws.Server({
    server: httpServer,
    path: "/socket"
});

wss.on("connection", function(socket) {

    socket.on("message", function(msg){
        var data = JSON.parse(msg);
        switch(data.msgtype) {
            case "INITIATE":
                socket.qid = data.qid;
                break;
        }
    });

});

app.on("webSockEvent", function(data) {
    var sendData = {};
    if(data.event) {
        sendData.event = data.event;
    }
    if(data.extra) {
        sendData.extra = data.extra;
    }
    wss.clients.forEach(function(socket){
        if(!socket.qid) return false;
        if(data.qid == socket.qid) {
            socket.send(JSON.stringify(sendData));
        }
    });
});

var port = 8000;

app.use("/api", apiRouter);
app.use(express.static(path.join(__dirname, 'client-side')));

app.use(function(err,req,res,next){
    console.log(err);
    res.status(500);
    res.send("Error");
});

httpServer.listen(port, function () {
    console.log('Listening on ' + httpServer.address().port);
});