var http        = require('http');
var ws          = require('ws');
var express     = require('express');
var path        = require('path');

var event = require('events').EventEmitter();

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

    event.on("newApplicant", function(qid) {
        if(!socket.qid) console.log("QID not found...");
        if(qid == socket.qid) {
            socket.send(JSON.stringify({
                event: "newApplicant"
            }));
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