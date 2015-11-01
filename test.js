var request     = require("supertest");
var should      = require("chai").should();

var mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/quizzr");
require("./models/quiz");
var Quiz = mongoose.model("Quiz");

request         = request('http://localhost:8000');

 /**
 /*   Vanwege tijdsgebrek geen tijd gehad om alles te testen. Hoop dat ik ten minste heb laten zien dat ik weet
 /*   hoe het moet.
 */


describe("QUIZ API", function(){

    describe("GET /api/quiz/new", function(){
        it("responds with the uid of the new quiz", function(done){
            request
                .get("/api/quiz/new")
                .expect(function(res){
                    res.body.should.have.property("id");
                })
                .end(function(err, res){
                    if (err) return done(err);
                    done();
                });
        });
    });

    describe("GET /api/quiz/:id", function(){
        it("responds with an object with the right setup", function(done){
            request
                .get("/api/quiz/new")
                .end(function(err, res){
                    var id = res.body.id;
                    request
                        .get("/api/quiz/" + id)
                        .expect(function(res){
                            res.body.uid.should.equal(id);
                            res.body.should.have.property("started");
                            res.body.should.have.property("ended");
                            res.body.should.have.property("teams");
                            res.body.should.have.property("currentround");
                        })
                        .end(function(err, res){
                            if (err) return done(err);
                            done();
                        });
                });
        });
    });

    describe("POST /api/quiz/:id/team", function(){
        it("should return that the team has applied.", function(done){
            request
                .get("/api/quiz/new")
                .end(function(err, res){
                    var id = res.body.id;
                    request
                        .post("/api/quiz/" + id + "/team")
                        .send({
                            name: "testteam"
                        })
                        .expect(function(res){
                            res.body.should.have.property("applied");
                            res.body.applied.should.equal("yes");
                        })
                        .end(function(err, res){
                            if (err) return done(err);
                            done();
                        });
                });
        });
    });

});

describe("QUIZ mongoose model", function() {

    describe("Quiz.save()", function() {
        it("should save when valid data is provided", function(done) {
            var quiz = new Quiz({
                uid: "wefef",
                started: false,
                ended: false,
                startdate: Date.now(),
                totalrounds: 0
            });
            quiz.save(function(err) {
                if(err) return done(err);
                done();
            })
        });
        it("should not save when not all required fields are provided", function(done) {
            var quiz = new Quiz({
                started: false,
                startdate: Date.now(),
                totalrounds: 0
            });
            quiz.save(function(err) {
                err.message.should.equal("Quiz validation failed");
                done();
            });
        });
    })

});