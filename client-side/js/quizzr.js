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
        .when("/:qid/apply", {
            templateUrl: "templates/apply.html",
            controller: "applyController",
            controllerAs: "ac"
        })
        .when("/:qid/team", {
            templateUrl: "templates/team.html"
        })
        .when("/:qid/quizmaster/accept", {
            templateUrl: "templates/qm-accept.html",
            controller: "acceptTeamsController",
            controllerAs: "atc"
        })
        .when("/:qid/quizmaster/choosecats", {
            templateUrl: "templates/qm-choosecats.html"
        })
        .when("/:qid/quizmaster/choosequestion", {
            templateUrl: "templates/qm-choosequestion.html"
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
                        resolve(true);
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

    return quizProvider;
}]);

app.controller("homeController", ["quizProvider","$location","$scope",function(qp,$l,$s){
    var hc = this;
    hc.qid = "";
    hc.teamname = "";

    hc.applyToQuiz = function() {
        if(!hc.qid || !hc.teamname) return alert("Not everything is filled in.");
        if(hc.teamname.indexOf("_") != -1) return alert("You cant use underscores in a team name.");
        qp.id = hc.qid;

        qp.getTeam(hc.qid,hc.teamname)
            .then(function(data){
                if(data) {
                    alert("This teamname does already exist.");
                } else {
                    qp.apply(hc.qid, hc.teamname)
                        .then(function(){
                            qp.thisTeam.name = hc.teamname;
                            $l.path("/" + hc.qid + "/apply");
                            $s.$apply();
                        })
                        .catch(function(e){
                            console.error(e);
                        });
                }
            })
            .catch(function(err){
                console.error(err);
            })
    };
}]);

app.controller("applyController", ["quizProvider", "webSocketProvider", function(qp, wsp){
    wsp.onmessage = function(msg) {
        var data = JSON.parse(msg);
        if(data.event == "newAccepted") {
            console.log("new accepted");
            // todo dingen hier, route aanpassen zodat naam in de url zit.
        }
    };
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

app.controller("acceptTeamsController", ["quizProvider", "$routeParams", "webSocketProvider", "$timeout", function(qp,$rp, wsp, $t){
    var atc = this;
    atc.quizID = $rp.qid;
    atc.teams = qp.teams;

    qp.getTeams();

    wsp.onmessage = function(msg) {
        var data = JSON.parse(msg);
        if(data.event == "newApplicant" || data.event == "newAccepted") {
            qp.getTeams();
        }
    };

    atc.acceptTeam = function(name) {
        qp.acceptTeam(name)
            .then(function(data){
                console.log(data);
            });
    };

}]);