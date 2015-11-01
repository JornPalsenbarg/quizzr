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
var Category = mongoose.model("Category");

router.use(bodyParser.json());

router.get("/quiz/:id", function(req,res){
    Quiz.findOne({
        uid: req.params.id
    }, function(err, doc){
        if(err) {
            console.log(err);
            res.status(500);
            res.send({
                err: err.message
            });
        } else {
            if(doc) {
                res.send(doc);
            } else {
                res.status(404);
                res.send({
                    err: "No QuizZ found."
                });
            }
        }
    });
});

router.use("/quiz/:id",function(req,res, next) {
    if(req.params.id) {
        Quiz.findOne({
            uid: req.params.id
        }, function (err, doc) {
            if (err) {
                console.log(err);
                res.status(500);
                res.send({
                    err: err.message
                });
            } else {
                if (doc && doc.ended) {
                    res.send({
                        err: "GAME ENDED"
                    })
                } else {
                    next();
                }
            }
        });
    } else {
        next();
    }
});

router.get("/quiz/new", function(req,res){
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

router.put("/quiz/:id", function(req,res) {
    if(!req.body.method) return console.log("Error: No method served.");
    switch(req.body.method) {
        case "start":
            Quiz.findOne({
                uid: req.params.id
            }, function(err, doc){
                doc.teams.forEach(function(team){
                    if(team.accepted === false) {
                        var index = doc.teams.indexOf(team);
                        doc.teams.splice(index,1);
                    }
                });
                doc.started = true;
                doc.save(function(err){
                    if(err) {
                        console.log("error: ", err);
                        res.status(500);
                        res.send({
                            err: err.message
                        })
                    } else {
                        console.log("QuizZ with id " + req.params.id + " has started.");
                        res.app.emit("webSockEvent", {
                            qid: req.params.id,
                            event: "quizStarted"
                        });
                        res.send({
                            started: "yes"
                        });
                    }
                });
            });
            break;
        case "startRound":
            // mongoose.Types.ObjectId
            Quiz.findOne({
                uid: req.params.id
            }, function(err, doc){
                if(err){
                    console.log(err);
                    res.status(500);
                    res.send({
                        err: err.message
                    });
                } else {
                    doc.currentround = {
                        categories: {
                            first: mongoose.Types.ObjectId(req.body.categories.first),
                            second: mongoose.Types.ObjectId(req.body.categories.second),
                            third: mongoose.Types.ObjectId(req.body.categories.third)
                        },
                        currentcategory: "",
                        questionopen: false,
                        currentquestion: {
                            question: "",
                            answer: ""
                        },
                        totalquestions: 0
                    };
                    doc.save(function(err){
                        if(err) {
                            console.log(err);
                            res.status(500);
                            res.send({
                                err: err.message
                            });
                        } else {
                            res.app.emit("webSockEvent", {
                                qid: req.params.id,
                                event: "roundStarted"
                            });
                            res.send({
                                roundstarted: "yes"
                            });
                        }
                    })
                }
            });
            break;
        case "startQuestion":
            Quiz.findOne({
                uid: req.params.id
            }, function(err, doc){
                if(err){
                    console.log(err);
                    res.status(500);
                    res.send({
                        err: err.message
                    });
                } else {
                    doc.currentround.currentcategory = req.body.question.category;
                    doc.currentround.currentquestion = req.body.question;
                    doc.currentround.questionopen = true;
                    doc.currentround.totalquestions += 1;
                    doc.currentround.pastquestions.push(req.body.question.question);
                    doc.save(function(err){
                        if(err){
                            console.log(err);
                            res.status(500);
                            res.send({
                                err: err.message
                            });
                        } else {
                            res.app.emit("webSockEvent", {
                                qid: req.params.id,
                                event: "questionStarted"
                            });
                            res.send({
                                questionStarted: "yes"
                            });
                        }
                    })
                }
            });
            break;
        case "stopAnswerAccepting":
            Quiz.findOne({
                uid: req.params.id
            }, function(err, doc){
                if(err){
                    console.log(err);
                    res.status(500);
                    res.send({
                        err: err.message
                    });
                } else {
                    doc.currentround.questionopen = false;
                    doc.save(function(err){
                        if(err){
                            console.log(err);
                            res.status(500);
                            res.send({
                                err: err.message
                            });
                        } else {
                            res.app.emit("webSockEvent", {
                                qid: req.params.id,
                                event: "questionStopped"
                            });
                            res.send({
                                questionStopped: "yes"
                            });
                        }
                    })
                }
            });
            break;
        case "next":
            Quiz.findOne({
                uid: req.params.id
            }, function(err, doc){
                if(err){
                    console.log(err);
                    res.status(500);
                    res.send({
                        err: err.message
                    });
                } else {
                    doc.teams.forEach(function(team){
                        var i = doc.teams.indexOf(team);
                        if(team.judged == "right") {
                            doc.teams[i].rightanswers += 1;
                        }
                        doc.teams[i].judged = "no";
                        doc.teams[i].currentanswer = "";
                    });
                    doc.currentround.currentcategory = "";
                    doc.currentround.currentquestion = {
                        question: "",
                        answer: ""
                    };

                    // 40, 20, 10, 1

                    var nextVar = "";
                    if(doc.currentround.totalquestions >= 3) {
                        var rps = [40,20,10,1,1,1];

                        doc.teams.sort(function(a,b) {
                            return b.rightanswers - a.rightanswers;
                        });

                        doc.teams.forEach(function(team){
                            var i = doc.teams.indexOf(team);
                            console.log(team.name, i);
                            doc.teams[i].rightanswers = 0;
                            doc.teams[i].roundpoints += rps[i];
                        });

                        doc.teams.sort(function(a,b) {
                            return b.roundpoints - a.roundpoints;
                        });

                        doc.currentround.categories = {};
                        doc.currentround.totalquestions = 0;
                        nextVar = "round";
                    } else {
                        nextVar = "question";
                    }

                    doc.save(function(err){
                        if(err){
                            console.log(err);
                            res.status(500);
                            res.send({
                                err: err.message
                            });
                        } else {
                            res.app.emit("webSockEvent", {
                                qid: req.params.id,
                                event: "next"
                            });
                            res.send({
                                next: nextVar
                            });
                        }
                    })
                }
            });
            break;
        case "end":
            Quiz.findOne({
                uid: req.params.id
            }, function(err, doc){
                if(err){
                    console.log(err);
                    res.status(500);
                    res.send({
                        err: err.message
                    });
                } else {
                    doc.ended = true;
                    doc.enddate = Date.now();
                    doc.save(function(err){
                        if(err){
                            console.log(err);
                            res.status(500);
                            res.send({
                                err: err.message
                            });
                        } else {
                            res.app.emit("webSockEvent", {
                                qid: req.params.id,
                                event: "gameEnded"
                            });
                            res.send({
                                gameEnded: "yes"
                            });
                        }
                    })
                }
            });
            break;
    }
});

router.get("/quiz/:id/question", function(req,res) {
    Quiz.findOne({
        uid: req.params.id
    }, function(err,doc) {
        if(err){
            console.log(err);
            res.status(500);
            res.send({
                err: err.message
            });
        } else {
            if(doc.currentround.currentquestion && doc.currentround.questionopen) {
                res.send(doc.currentround.currentquestion);
            } else {
                res.send({
                    err: "NO QUESTION"
                });
            }
        }
    });
});

router.get("/quiz/:id/questions", function(req,res) {
    Quiz.findOne({
        uid: req.params.id
    }, function(err, doc){
        var currentround = doc.currentround;
        if(err){
            console.log(err);
            res.status(500);
            res.send({
                err: err.message
            });
        } else {
            if(doc.currentround.categories) {
               Category.find({
                   $or: [
                       {
                           _id: doc.currentround.categories.first
                       },
                       {
                           _id: doc.currentround.categories.second
                       },
                       {
                           _id: doc.currentround.categories.third
                       }
                   ]
               }, function(err, docs){
                   if(err){
                       console.log(err);
                       res.status(500);
                       res.send({
                           err: err.message
                       });
                   } else {
                        var noquestion = currentround.pastquestions;

                        if(!docs[0] || !docs[0].questions) return res.send({err: "no doc found"});

                        var first = [];
                        var i = 0;
                        while (i < 5) {
                           var q = docs[0].questions[Math.floor(Math.random()*docs[0].questions.length)];
                           if(noquestion.indexOf(q.question) == -1) {
                               first.push(q);
                               noquestion.push(q.question);
                               i++;
                           }
                        }

                        var second = [];
                        var y = 0;
                        while (y < 3) {
                           var w = docs[1].questions[Math.floor(Math.random()*docs[1].questions.length)];
                           if(noquestion.indexOf(w.question) == -1) {
                               second.push(w);
                               noquestion.push(w.question);
                               y++;
                           }
                        }

                        var third = [];
                        var x = 0;
                        while (x < 3) {
                           var e = docs[2].questions[Math.floor(Math.random()*docs[2].questions.length)];
                           if(noquestion.indexOf(e.question) == -1) {
                               third.push(e);
                               noquestion.push(e.question);
                               x++;
                           }
                        }

                        var response = {
                           first: {
                               category: docs[0].category,
                               questions: first
                           },
                           second: {
                               category: docs[1].category,
                               questions: second
                           },
                           third: {
                               category: docs[2].category,
                               questions: third
                           }
                        };
                        res.send(response);
                   }
               });
            } else {
               console.log("No categories found?");
            }
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
            if(!doc) return res.send({err: "NO QUIZ FOUND"});
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
    req.params.name = req.params.name.replace("_", " ");

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
    req.params.name = req.params.name.replace("_", " ");

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
                    if(docs.teams && docs.teams.length > 1) {
                        docs.teams.forEach(function (team) {
                            if (team.name == req.params.name) {
                                docs.teams[docs.teams.indexOf(team)].accepted = true;
                            }
                        });
                    } else if(docs.teams && docs.teams[0].name == req.params.name) {
                        docs.teams[0].accepted = true;
                    }
                    docs.save(function(err){
                        if(err){
                            res.status(500);
                            res.send({err: err.message});
                        } else {
                            res.app.emit("webSockEvent", {
                                qid: req.params.id,
                                event: "newAccepted",
                                extra: {
                                    teamname: req.params.name
                                }
                            });
                            res.send({
                                accepted: "yes"
                            });
                        }
                    });
                }
            });
            break;
        case "deny":
            Quiz.findOne({
                uid: req.params.id
            }, function(err, docs){
                if(err) {
                    console.log(err);
                    res.status(500);
                    res.send({err: err.message});
                } else {
                    if(docs.teams.length > 1) {
                        docs.teams.forEach(function (team) {
                            if (team.name == req.params.name) {
                                docs.teams.splice(docs.teams.indexOf(team),1);
                            }
                        });
                    } else if(docs.teams && docs.teams[0].name == req.params.name) {
                        docs.teams.splice(0,1);
                    }
                    docs.save(function(err){
                        if(err){
                            res.status(500);
                            res.send({err: err.message});
                        } else {
                            res.app.emit("webSockEvent", {
                                qid: req.params.id,
                                event: "newDenied",
                                extra: {
                                    teamname: req.params.name
                                }
                            });
                            res.send({
                                denied: "yes"
                            });
                        }
                    });
                }
            });
            break;
        case "judgeAnswer":
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
                    if(docs.teams && docs.teams.length > 1) {
                        docs.teams.forEach(function (team) {
                            if (team.name == req.params.name) {
                                docs.teams[docs.teams.indexOf(team)].judged = req.body.judge;
                            }
                        });
                    } else if(docs.teams && docs.teams[0].name == req.params.name) {
                        docs.teams[0].judged = req.body.judge;
                    }
                    docs.save(function(err){
                        if(err){
                            res.status(500);
                            res.send({err: err.message});
                        } else {
                            res.app.emit("webSockEvent", {
                                qid: req.params.id,
                                event: "answerAcceptDeny",
                                extra: {
                                    teamname: req.params.name
                                }
                            });
                            res.send({
                                done: "yes"
                            });
                        }
                    });
                }
            });
            break;
    }
});

router.put("/quiz/:id/team/:name/answer", function(req,res) {
    req.params.name = req.params.name.replace("_", " ");
    Quiz.findOne({
        uid: req.params.id
    }, function(err, docs){
        if(err) {
            console.log(err);
            res.status(500);
            res.send({err: err.message});
        } else {
            if(docs.teams.length > 0) {
                var found = false;
                docs.teams.forEach(function (team) {
                    if (team.name == req.params.name) {
                        docs.teams[docs.teams.indexOf(team)].currentanswer = req.body.answer;
                        found = true;
                    }
                });
                if(!found) {
                    res.send({err: "No team found"});
                }
            } else {
                res.send({err: "No team found"});
            }
            docs.save(function(err){
                if(err){
                    res.status(500);
                    res.send({err: err.message});
                } else {
                    res.app.emit("webSockEvent", {
                        qid: req.params.id,
                        event: "newAnswer"
                    });
                    res.send({
                        accepted: "yes"
                    });
                }
            });
        }
    });
});

router.get("/categories", function(req,res){
    Category.find({}, function(err,docs){
        if(err){
            console.log(err);
            res.status(500);
            res.send({
                err: err.message
            });
        } else {
            res.send(docs);
        }
    });
});

module.exports = router;