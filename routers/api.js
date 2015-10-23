var express = require("express");
var router = express.Router();
var bodyParser = require("body-parser");
var Hashids = require("hashids");

var mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/quizzr")

var hashids = new Hashids("tastes a bit salty", 4);

require("../models/quiz");
require("../models/category");

var Quiz = mongoose.model("Quiz");

router.use(bodyParser.json());

router.get("/quiz/new", function(req,res){
    console.log("getting");
    function generateUid() {
        var charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var randomString = '';
        for (var i = 0; i < 3; i++) {
            var randomPoz = Math.floor(Math.random() * charSet.length);
            randomString += charSet.substring(randomPoz,randomPoz+1);
        }
        var timestamp = new Date().getUTCMilliseconds();
        return hashids.encode(timestamp) + randomString;
    }

    var uid = generateUid();

    var newQ = new Quiz({
        uid: uid,
        started: false,
        ended: false,
        startdate: Date.now(),
        totalrounds: 0
    });

    newQ.save(function(err){
        if(err){
            console.log("error creating new quiz: ", err.message);
            res.status(500);
            res.send({
                err: "Not able to save new quiz"
            });
        } else {
            console.log("new quiz created with uid: " + uid);
            res.send({
                id: uid
            });
        }
    });
});

router.get("/quiz/:id/teams", function(req,res){
    Quiz.findOne({
        uid: req.params.id
    }, function(err, doc){
        if(err) {
            console.log(err);
            res.status(500);
            res.send({err: err.message});
        } else {
            if(doc && doc.teams) {
                res.send(doc.teams);
            } else {
                res.send("");
            }
        }
    });
});

router.post("/quiz/:id/team", function(req,res){
    Quiz.findOne({
       uid: req.params.id
    }, function(err, doc){
        if(err) {
            console.log(err);
            res.status(500);
            res.send({err: err.message});
        } else {
            doc.teams.push({
                name: req.body.name,
                roundpoints: 0,
                accepted: false,
                currentanswer: "",
                rightanswers: 0
            });
            doc.save(function(err){
               if(err) {
                   res.status(500);
                   res.send({err: err.message});
               } else {
                   res.app.emit("webSockEvent", {
                       qid: req.params.id,
                       event: "newApplicant"
                   });
                   res.send({ applied: "yes" });
               }
            });
        }
    });
});

router.get("/quiz/:id/team/:name", function(req,res){
    req.params.name.replace("_", " ");
    Quiz.findOne({
        $and: [
            {
                uid: req.params.id
            },
            {
                teams: {
                    $elemMatch: {
                        name: req.params.name
                    }
                }
            }
        ]
    }, function(err, docs){
        if(err) {
            console.log(err);
            res.status(500);
            res.send({err: err.message});
        } else {
            res.send(docs);
        }
    });
});

router.put("/quiz/:id/team/:name", function(req,res) {
    if(!req.body.changeType) return console.log("Error: No changetype served.");
    req.params.name.replace("_", " ");

    switch(req.body.changeType) {
        case "accept":
            Quiz.findOne({
                $and: [
                    {
                        uid: req.params.id
                    },
                    {
                        teams: {
                            $elemMatch: {
                                name: req.params.name
                            }
                        }
                    }
                ]
            }, function(err, docs){
                if(err) {
                    console.log(err);
                    res.status(500);
                    res.send({err: err.message});
                } else {
                    docs.teams.forEach(function(team) {
                        if(team.name == req.params.name) {
                            docs.teams[docs.teams.indexOf(team)].accepted = true;
                        }
                    });
                    docs.save(function(err){
                        if(err){
                            res.status(500);
                            res.send({err: err.message});
                        } else {
                            res.app.emit("webSockEvent", {
                                qid: req.params.id,
                                event: "newAccepted"
                            });
                            res.send({
                                accepted: "yes"
                            });
                        }
                    });
                }
            });
            break;
    }
});

module.exports = router;