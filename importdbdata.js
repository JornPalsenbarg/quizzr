var fs = require("fs");
var mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/quizzr");

require("models/category");

var Category = mongoose.model("Category");

fs.readFile("data/questions.json", function(err,jsondata){
    if(err) throw err;
    if(jsondata){
        var cats = {};
        var data = JSON.parse(jsondata);
        data.forEach(function(question){
            if(!cats[question.category]){
                cats[question.category] = {
                    category: question.category,
                    questions: [
                        {
                            question: question.question,
                            answer: question.answer
                        }
                    ]
                }
            } else {
                cats[question.category].questions.push({
                    question: question.question,
                    answer: question.answer
                });
            }
        });
        var keys = Object.keys(cats);
        keys.forEach(function(key){
            var newCat = new Category();
            newCat.category = cats[key].category;
            newCat.questions = cats[key].questions;
            newCat.save(function(err){
                if(err) throw err;
                console.log("finished.");
            });
        });
    }
});