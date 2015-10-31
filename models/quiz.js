var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var QuizSchema = new Schema({
    uid: {
        type: String,
        required: true
    },
    started: {
        type: Boolean,
        required: true
    },
    ended: {
        type: Boolean,
        required: true
    },
    startdate: {
        type: Date,
        required: true
    },
    enddate: Date,
    totalrounds: {
        type: Number,
        required: true
    },
    teams: [{
        name: {
            type: String,
            required: true
        },
        roundpoints: {
            type: Number,
            required: true
        },
        accepted: {
            type: Boolean,
            required: true
        },
        currentanswer: String,
        rightanswers: Number
    }],
    currentround: {
        categories: {
            first: Schema.Types.ObjectId,
            second: Schema.Types.ObjectId,
            third: Schema.Types.ObjectId
        },
        pastquestions: [String],
        currentcategory: String,
        questionopen: Boolean,
        currentquestion: {
            question: String,
            answer: String
        },
        totalquestions: Number
    }
});

var Quiz = mongoose.model("Quiz", QuizSchema);

//module.exports = {
//    Quiz: Quiz
//};