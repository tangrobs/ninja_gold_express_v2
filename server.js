const express = require('express')
const app = express()
const body_parser = require("body-parser")
const session = require("express-session")
const path = require("path")
const mongoose = require('mongoose')
const flash = require('express-flash');


app.use(body_parser.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname, "./static")))

app.set("views", path.join(__dirname, "./views"))
app.set("view engine","ejs")

app.use(session({
    secret:"mysecretkey",
    resave:false,
    saveUninitialized:true
}))
app.use(flash())
mongoose.connect("mongodb://localhost/ninja_gold")
const NinjaSchema = new mongoose.Schema({
    name:{type:String, required:[true,"A name is required!"]},
    dan:Number,
    gold:Number
})
NinjaSchema.path('name').validate({
    isAsync:true,
    validator:function(value,respond){
        this.model('Ninja').count({name:value}, function(err, count){
            respond(!count)
        })
    },
    message: "Name is already taken!"
})
var Ninja = mongoose.model('Ninja', NinjaSchema);


app.get('/', function(req,res){
    res.render("login")
})

app.post('/login', function(req,res){
    let ninja = new Ninja(req.body)
    console.log(ninja);
    ninja.save(function(err,ninja){
        if(err){
            console.log("we have an error here!");
            for(var key in err.errors){
                req.flash('login',err.errors[key].message)
            }
            res.redirect('/')
        } else{
            req.session.name = ninja.name
            req.session.ninja_id = ninja._id
            res.redirect('/ninjagold')
        }
    })
})
app.get('/save', function(req,res){
    console.log(typeof req.session.gold);
    Ninja.findByIdAndUpdate(req.session.ninja_id, {$set:{gold:req.session.gold}}, {new:true}, function(err,ninja){
        if(err){
            console.log("something went wrong");
            res.redirect('/ninjagold')
        } else{
            console.log("this is the ninja",ninja);
            res.redirect('/scoreboard')
        }
    })
})
app.get('/scoreboard', function(req,res){
    Ninja.find({}).sort({gold:-1}).limit(10).exec(function(err,ninjas){
        if(err){
            res.send("something went wrong")
        }else{
            res.render('scoreboard',{data:ninjas})
        }
    })
})
app.get("/ninjagold", function(req, res){
    if(!req.session.gold || !req.session.activities){
        req.session.gold = 0;
        req.session.activities = []
    }
    res.render("ninjagold", {gold:req.session.gold, activities:req.session.activities, name:req.session.name})
})

app.post("/process_money",function(req, res){
    let building = req.body.area
    if(building == "farm"){
        let goldmade = getRndInteger(10,20)
        req.session.gold += goldmade
        req.session.activities.push(["won","Earned " + goldmade + " at the farm"])
    }
    else if(building == "cave"){
        let goldmade = getRndInteger(5,10)
        req.session.gold += goldmade
        req.session.activities.push(["won","Earned " + goldmade + " gold at the cave"])
    }
    else if(building == "house"){
        let goldmade = getRndInteger(2,5)
        req.session.gold += goldmade
        req.session.activities.push(["won","Earned " + goldmade + " gold at the house"])
    }
    else if(building == "casino"){
        let goldmade = getRndInteger(-50,50)
        req.session.gold += goldmade
        if(goldmade >= 0){
            req.session.activities.push(["won","Entered a casino and won " + goldmade + " gold. Yay!"])
        }
        else{
            req.session.activities.push(["lost","Entered a casino and lost " + (-1*goldmade) + " gold... ouch..."])
        }
    }
    res.redirect('/ninjagold')
})

app.listen(8000, function(){
    console.log("breakdancing on port 8000");
})


function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}
