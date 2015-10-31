'use strict';
var app = angular.module("Quizzr", ["ngRoute"]);

app.config(["$routeProvider", function($rp){
    $rp
        .when("/", {
            templateUrl: "templates/home.html",
            controller: "homeController",
            controllerAs: "hc"
        })
        .when("/new", {
            templateUrl: "templates/newquiz.html",
            controller: "newQuizController",
            controllerAs: "nqc"
        })
        .when("/:qid/team/:name/apply", {
            templateUrl: "templates/apply.html",
            controller: "applyController",
            controllerAs: "ac"
        })
        .when("/:qid/team/:name/rejected", {
            templateUrl: "templates/rejected.html",
            controller: "rejectController"
        })
        .when("/:qid/team/:name/play", {
            templateUrl: "templates/team.html",
            controller: "playController",
            controllerAs: "play"
        })
        .when("/:qid/quizmaster/accept", {
            templateUrl: "templates/qm-accept.html",
            controller: "acceptTeamsController",
            controllerAs: "atc"
        })
        .when("/:qid/quizmaster/choosecats", {
            templateUrl: "templates/qm-choosecats.html",
            controller: "chooseCategoriesController",
            controllerAs: "ccc"
        })
        .when("/:qid/quizmaster/choosequestion", {
            templateUrl: "templates/qm-choosequestion.html",
            controller: "chooseQuestionController",
            controllerAs: "cqc"
        })
        .when("/:qid/quizmaster/judgeanswers", {
            templateUrl: "templates/qm-judgeanswers.html"
        })
        .otherwise({
            redirectTo: "/"
        })
}]);

app.factory("webSocketProvider", ["$routeParams","quizProvider", "$rootScope",function($routeParams,qp,$rootScope){
    var socketService = {};

    var ws = new WebSocket("ws://localhost:8000/socket");

    ws.onopen = function(e) {
        ws.send(JSON.stringify({
            msgtype: "INITIATE",
            qid: $routeParams.qid
        }));
    };

    socketService.send = function(theString) {
        ws.send(theString);
    };

    socketService.onclose = null;

    ws.onclose = function(arg) {
        if(socketService.onclose != null) {
            socketService.onclose(arg);
        }
        $rootScope.$apply();
    };

    socketService.onmessage = null;

    ws.onmessage = function(arg) {
        console.log(JSON.parse(arg.data));
        if(socketService.onmessage != null) {
            socketService.onmessage(arg.data);
        }
        $rootScope.$apply();
    };

    socketService.onerror = null;

    ws.onerror = function(arg) {
        if(socketService.onerror != null) {
            socketService.onerror(arg);
        }
        $rootScope.$apply();
    };

    return socketService;
}]);

app.factory("quizProvider", ["$http", "$routeParams", function($http,$rp){
    var quizProvider = {};

    quizProvider.id = $rp.qid || "";

    quizProvider.thisTeam = {
        name: "test",
        roundpoints: 0,
        accepted: false,
        currentanswer: "",
        rightanswers: 0
    };

    quizProvider.teams = [];

    quizProvider.startNew = function() {
        return new Promise(
            function resolver (resolve, reject) {
                $http.get("/api/quiz/new")
                    .success(function(data){
                        quizProvider.id = data.id;
                        resolve(data.id);
                    })
                    .error(function(err){
                        reject(err);
                    });
            }
        );
    };

    quizProvider.getTeam = function(qid, teamname) {
        teamname.replace(" ", "_");
        return new Promise(
            function resolver (resolve, reject) {
                $http.get("/api/quiz/" + qid + "/team/" + teamname)
                    .success(function(data){
                        resolve(data);
                    })
                    .error(function(err){
                        reject(err);
                    })
            }
        );
    };

    quizProvider.apply = function(id,teamname) {
        return new Promise(
            function(resolve, reject){
                $http.post("/api/quiz/" + id + "/team", JSON.stringify({
                    name: teamname
                })).success(function(data){
                    if(data.applied == "yes") {
                        resolve(true);
                    } else {
                        reject(new Error("Applying failed."));
                    }
                }).error(function(err){
                    reject(err);
                })
            }
        );
    };

    quizProvider.acceptTeam = function(teamname) {
        var qp = this;
        teamname = teamname.replace(" ", "_");
        return new Promise(
            function(resolve, reject) {
                $http.put("/api/quiz/" + qp.id + "/team/" + teamname, {
                    changeType: "accept"
                })
                    .success(function(data){
                        resolve(data);
                    })
                    .error(function(err){
                        console.error(err);
                        reject(err);
                    });
            }
        );
    };

    quizProvider.denyTeam = function(teamname) {
        var qp = this;
        teamname = teamname.replace(" ", "_");
        return new Promise(
            function(resolve, reject) {
                $http.put("/api/quiz/" + qp.id + "/team/" + teamname, {
                    changeType: "deny"
                })
                    .success(function(data){
                        resolve(data);
                    })
                    .error(function(err){
                        console.error(err);
                        reject(err);
                    });
            }
        );
    };

    quizProvider.getTeams = function() {
        var qp = this;
        $http.get("/api/quiz/" + qp.id + "/teams")
            .success(function(data){
                if(data) {
                    qp.teams.length = 0;
                    data.forEach(function(team){
                        qp.teams.push(team);
                    });
                }
            })
            .error(function(err){
                console.error(err);
            })
    };

    quizProvider.getAcceptedTeams = function() {
        var total = 0;
        this.teams.forEach(function(team){
            team.accepted && total++;
        });
        return total;
    };

    quizProvider.startGame = function() {
        $http.put("api/quiz/" + $rp.qid, {method: "start"})
            .success(function(data){
                console.log(data);
            })
            .error(function(err){
                console.error(err);
            });
    };

    quizProvider.getCategories = function() {
        return new Promise(
            function(resolve,reject) {
                $http.get("/api/categories")
                    .success(function(data){
                        resolve(data);
                    })
                    .error(function(err){
                        console.error(err);
                        reject(err);
                    });
            }
        );
    };

    quizProvider.startRound = function(categories) {
        return new Promise(
            function(resolve, reject) {
                $http.put("/api/quiz/" + $rp.qid, {
                    method: "startRound",
                    categories: categories
                })
                    .success(function(data){
                        resolve(data);
                    })
                    .error(function(err){
                        console.error(err);
                        reject(err);
                    })
            }
        );
    };

    quizProvider.getQuestions = function() {
        return new Promise(
            function(resolve, reject) {
                $http.get("api/quiz/" + $rp.qid + "/questions")
                    .success(function(data){
                        resolve(data);
                    })
                    .error(function(err){
                        console.error(err);
                        reject(err);
                    })
            }
        );
    };

    quizProvider.chooseQuestion = function(question) {
        return new Promise(
            function(resolve, reject) {
                $http.put("/api/quiz/" + $rp.qid, {
                    method: "startQuestion",
                    question: question
                })
                    .success(function(data){
                        resolve(data);
                    })
                    .error(function(err){
                        console.error(err);
                        reject(err);
                    })
            }
        );
    };

    quizProvider.getCurrentQuestion = function() {
        return new Promise(
            function(resolve, reject) {
                $http.get("/api/quiz/" + $rp.qid + "/question")
                    .success(function(data){
                        resolve(data);
                    })
                    .error(function(err){
                        console.log(err);
                        reject(err);
                    })
            }
        );
    };

    quizProvider.postAnswer = function(answer) {
        return new Promise(
            function(resolve, reject) {
                $http.put("/api/quiz/" + $rp.qid + "/team/" +$rp.name + "/answer", {
                    answer: answer
                })
                    .success(function(data){
                        resolve(data);
                    })
                    .error(function(err){
                        reject(data);
                    });
            }
        );
    };

    return quizProvider;
}]);

app.controller("homeController", ["quizProvider","$location","$scope",function(qp,$l,$s){
    var hc = this;
    hc.qid = "";
    hc.teamname = "";

    hc.applyToQuiz = function() {
        if(!hc.qid || !hc.teamname) return Materialize.toast('Not everything is filled in.', 4000);
        if(hc.teamname.indexOf("_") != -1) return Materialize.toast('You cant use underscores in a team name.', 4000);
        qp.id = hc.qid;
        var safename = hc.teamname.replace(" ","_");
        qp.getTeam(hc.qid,hc.teamname)
            .then(function(data){
                if(data) {
                    Materialize.toast('This teamname does already exist.', 4000);
                } else {
                    qp.apply(hc.qid, hc.teamname)
                        .then(function(){
                            qp.thisTeam.name = hc.teamname;
                            $l.path("/" + hc.qid + "/team/" + safename + "/apply");
                            $s.$apply();
                        })
                        .catch(function(e){
                            Materialize.toast('Cannot apply for this QuizZ.', 4000);
                        });
                }
            })
            .catch(function(err){
                console.error(err);
            })
    };
}]);

app.controller("applyController", ["quizProvider", "webSocketProvider", "$routeParams", "$location", function(qp, wsp, $rp, $location){
    wsp.onmessage = function(msg) {
        var data = JSON.parse(msg);
        if(data.event == "newAccepted" && data.extra && data.extra.teamname && data.extra.teamname == $rp.name.replace("_"," ") ) {
            $location.path("/" + $rp.qid + "/team/" + $rp.name + "/play");
        } else if(data.event == "gameStarted") {
            $location.path("/" + $rp.qid + "/team/" + $rp.name + "/rejected");
        }
    };
}]);

app.controller("rejectController", ["$location", "$timeout", function($location, $timeout){
    $timeout(function(){
        $location.path("/");
    }, 5000);
}]);

app.controller("playController", ["quizProvider","$routeParams","$location", "$timeout","webSocketProvider", "$scope",function(qp,$rp,$location,$timeout,wsp, $scope){
    var play = this;
    play.questionopen = false;
    play.currentquestion = "";
    play.currentanswer = "";

    var name = $rp.name.replace("_", " ");
    qp.getTeam($rp.qid,name)
        .then(function(data){
            if(!data){
                Materialize.toast('This team does not exist, you will be redirected to the homepage.', 4000);
                $timeout(function(){
                    $location.path("/");
                });
            }
        });

    qp.getCurrentQuestion()
        .then(function(data){
            if(data.err && data.err == "NO QUESTION") return false;
            play.currentquestion = data.question;
            play.questionopen = true;
            $scope.$apply();
        })
        .catch(function(err){
            console.error(err);
        });

    play.postAnswer = function(answer) {
        if(!answer) return Materialize.toast('Input field is empty', 4000);
        qp.postAnswer(answer)
            .then(function(data){
                play.currentanswer = answer;
            })
            .catch(function(err){
                console.error(err);
            });
    };

    wsp.onmessage = function(msg) {
        var data = JSON.parse(msg);
        if(data.event == "newDenied" && data.extra && data.extra.teamname && data.extra.teamname == $rp.name.replace("_"," ")) {
            $location.path("/" + $rp.qid + "/team/" + $rp.name + "/rejected");
        } else if(data.event == "questionStarted") {
            qp.getCurrentQuestion()
                .then(function(data){
                    play.currentquestion = data.question;
                    play.questionopen = true;
                    $scope.$apply();
                })
                .catch(function(err){
                    console.error(err);
                });
        } else if(data.event == "questionStopped") {
            play.questionopen = false;
            $scope.$apply();
        }
    }

}]);

app.controller("newQuizController", ["quizProvider","$location","$scope",function(qp, $l, $s){
    var nqc = this;

    nqc.startQuiz = function(){
        qp.startNew()
            .then(function(qid) {
                $l.path("/" + qid + "/quizmaster/accept");
                $s.$apply();
            })
            .catch(function(err) {
               console.error(err);
            });
    };

}]);

app.controller("acceptTeamsController", ["quizProvider", "$routeParams", "webSocketProvider", "$location", "$scope", function(qp,$rp, wsp, $location, $scope){
    var atc = this;
    atc.quizID = $rp.qid;
    atc.teams = qp.teams;

    qp.getTeams();

    wsp.onmessage = function(msg) {
        var data = JSON.parse(msg);
        if(data.event == "newApplicant" || data.event == "newAccepted" || data.event == "newDenied") {
            qp.getTeams();
        } else if(data.event == "quizStarted") {
            $location.path("/" + $rp.qid + "/quizmaster/choosecats");
            $scope.$apply();
        }
    };

    atc.acceptTeam = function(name) {
        qp.acceptTeam(name)
            .then(function(data){
                console.log(data);
            });
    };

    atc.denyTeam = function(name) {
        qp.denyTeam(name)
            .then(function(data){
                console.log(data);
            });
    };

    atc.startGame = function() {
        if(qp.getAcceptedTeams() < 2 || qp.getAcceptedTeams() > 6) return Materialize.toast('The amount of teams have to be between 2 and 6.', 4000);
        qp.startGame();
    };

}]);

app.controller("chooseCategoriesController", ["quizProvider", "$scope", "$location", "$routeParams", function(qp, $scope, $l, $rp){
    var ccc = this;
    ccc.firstCat = "";
    ccc.secondCat = "";
    ccc.thirdCat = "";

    ccc.categories = [];

    qp.getCategories()
        .then(function(data){
            data.forEach(function(cat){
                ccc.categories.push({
                    _id: cat._id,
                    category: cat.category
                });
            });
            $scope.$apply();
            $('select').material_select();
        })
        .catch(function(err){
            console.error(err);
        });

    ccc.startRound = function() {
        if(!ccc.firstCat || !ccc.secondCat || !ccc.thirdCat) return Materialize.toast('Not all 3 categories selected.', 4000);
        if( ccc.firstCat == ccc.secondCat ||
            ccc.firstCat == ccc.thirdCat ||
            ccc.secondCat == ccc.thirdCat){
            return Materialize.toast('You have to choose 3 unique categories.', 4000);
        }
        qp.startRound({
            first: ccc.firstCat,
            second: ccc.secondCat,
            third: ccc.thirdCat
        })
            .then(function(data) {
                $l.path("/" + $rp.qid + "/quizmaster/choosequestion");
                $scope.$apply();
            })
            .catch(function(err){
                console.error(err);
            })
    };

    ccc.endRound = function() {
        // TODO end round
        console.log("YOU TRIED TO END THE ROUND.");
    };

}]);

app.controller("chooseQuestionController", ["quizProvider","$scope", "$location","$routeParams",function(qp, $scope, $l, $rp){
    var cqc = this;
    cqc.firstQ = [];
    cqc.secondQ = [];
    cqc.thirdQ = [];

    cqc.firstC = "";
    cqc.secondC = "";
    cqc.thirdC = "";

    qp.getQuestions()
        .then(function(data){
            cqc.firstQ = data.first;
            cqc.secondQ = data.second;
            cqc.thirdQ = data.third;
            $scope.$apply();
            $('select').material_select();
        });

    cqc.chooseQuestion = function() {
        var question = "";
        if(cqc.firstC == "" && cqc.secondC == "" && cqc.thirdC != "") {
            question = cqc.thirdC;
        } else if(cqc.firstC == "" && cqc.secondC != "" && cqc.thirdC == "") {
            question = cqc.secondC;
        } else if(cqc.firstC != "" && cqc.secondC == "" && cqc.thirdC == "") {
            question = cqc.firstC;
        } else {
            return Materialize.toast('You have to choose a minimum and maximum of 1 question.', 4000);
        }
        question = JSON.parse(question);
        qp.chooseQuestion(question)
            .then(function(data){
                console.log(data);
                $l.path("/" + $rp.qid + "/quizmaster/judgeanswers");
                $scope.$apply();
            })
            .catch(function(err) {
                console.error(err);
            })
    };
}]);