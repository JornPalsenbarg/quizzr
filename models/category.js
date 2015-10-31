var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var categorySchema = new Schema({
    category: {
        type: String,
        required: true
    },
    questions: [{
        question: {
            type: String,
            required: true
        },
        answer: {
            type: String,
            required: true
        }
    }]
});

var Category = mongoose.model("Category", categorySchema);