if(process.env.NODE_ENV != "production"){
    require('dotenv').config();
}

const express= require("express");
const app=express();
const mongoose=require("mongoose");
const path=require("path");
const methodOverride=require("method-override");
const ejsMate=require("ejs-mate");
const ExpressError=require("./utils/ExpressError.js");
const session=require("express-session");
const MongoStore = require('connect-mongo');
const flash=require("connect-flash");
const passport= require("passport");
const LocalStrategy= require("passport-local");
const User=require("./models/user.js");

const listingRouter= require("./routes/listing.js");
const reviewRouter=require("./routes/review.js");
const userRouter=require("./routes/user.js");


const dbUrl=process.env.ATLASDB_URL;

main()
.then(()=>{
    console.log("connected DB");
})
.catch((err)=>{
    console.log(err);
});
async function main(){
    await mongoose.connect(dbUrl);
}

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname,"/public")));
require('dotenv').config(); 

const store=MongoStore.create({
    mongoUrl:dbUrl,
    crypto:{
        secret:process.env.SECRET,
    },
    touchAfter:24 * 3600,

});

store.on("error",(err)=>{
    console.log("ERROR in MONGO SESSION STORE",err);
});


const sessionOptions={
    store,
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    expires:Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge:7 * 24 * 60 * 60 * 1000,
    httpOnly:true,
  };

// app.get("/",(req,res)=>{
//     res.send("Hi, I am root");
// });

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser=req.user;
    next();
})

// app.get("/demouser",async(req,res)=>{
//         let fakeUser= new User({
//             email:"student@gmail.com",
//             username:"alpha -student",
//         });

//         let registeredUser=await User.register(fakeUser,"Helloworld");
//         res.send(registeredUser);
// });

app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter);
app.use("/",userRouter);


app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page Not Fond!"));
});

//middlewares
app.use((err,req,res,next)=>{
    let{statusCode=500,message="Something Went Wrong!"}=err;
    if (res.headersSent) {
        return next(err);  
    }
    res.status(statusCode).render("error.ejs",{message});
    //res.status(statusCode).send(message);
});

app.listen(8080,()=>{
    console.log("server listening the port 8080");
});

// const validateListing=(req,res,next)=>{
//     let {error}=listingSchema.validate(req.body);
//     if(error){
//         let errMsg=error.details.map((el)=>el.message).join(",");
//         throw new ExpressError(400,errMsg);
//     }else{
//         next();
//     }
// };

// const validateReview=(req,res,next)=>{
//     let {error}=reviewSchema.validate(req.body);
//     if(error){
//         let errMsg=error.details.map((el)=>el.message).join(",");
//         throw new ExpressError(400,errMsg);
//     }else{
//         next();
//     }
// };

// //index route
// app.get("/listings",wrapAsync(async(req,res)=>{
//     const allListings=await Listing.find({});
//     res.render("listings/index.ejs",{allListings});
// }));

// //new route
// app.get("/listings/new",wrapAsync(async(req,res)=>{
//     res.render("listings/new.ejs");
// }));

// //show route
// app.get("/listings/:id",wrapAsync(async(req,res)=>{
//     let {id}=req.params;
//     const listing=await Listing.findById(id).populate("reviews");
//     // if (!listing) {
//     //     return next(new ExpressError(404, "Listing not found"));
//     // }
//     res.render("listings/show.ejs",{listing});
// }));

// //create route
// app.post("/listings",validateListing,wrapAsync(async(req,res)=>{
//     // try{
//     //let{title,description,image,price,location,country}=req.body;
//     // let listing =req.body.listing;
//     // console.log(listing);
//     // if(!req.body.listing){
//     //     throw new ExpressError(400,"Send Valid data for Listing");
//     // }

//     const newListing=new Listing(req.body.listing);
//     await newListing.save();
//     // console.log(newListing);
//     res.redirect("/listings");
//     // }catch(err){
//     //     next(err);
//     // }
    
// }));

// //edit route
// app.get("/listings/:id/edit",wrapAsync(async(req,res)=>{
//     let {id}=req.params;
//     const listing=await Listing.findById(id);
//     res.render("listings/edit.ejs",{listing});
// }));

// //update route
// app.put("/listings/:id",validateListing,wrapAsync(async(req,res)=>{
//     let {id}=req.params;
//     await Listing.findByIdAndUpdate(id,{...req.body.listing});
//     res.redirect("/listings");
// }));

// //delete rouute
// app.delete("/listings/:id",wrapAsync(async(req,res)=>{
//     let {id}=req.params;
//     let deletedListing=await Listing.findByIdAndDelete(id);
//     console.log(deletedListing);
//     res.redirect("/listings");
// }));



//reviews
//post review route
// app.post("/listings/:id/reviews",validateReview,wrapAsync(async(req,res)=>{
//     let listing=await Listing.findById(req.params.id);
//     let newReview=new Review(req.body.review);

//     listing.reviews.push(newReview);

//     await newReview.save();
//     await listing.save();

//     res.redirect(`/listings/${listing._id}`);

// }));

// //delete review route
// app.delete("/listings/:id/reviews/:reviewId",wrapAsync(async (req,res)=>{
//     let {id, reviewId}=req.params;
//     await Listing.findByIdAndUpdate(id,{$pull: {reviews: reviewId}});
//     await Review.findByIdAndDelete(reviewId);

//     res.redirect(`/listings/${id}`);
// }))

// app.get("/testListing",async(req,res)=>{
//     let sampleListing=new Listing({
//         title:"My new Villa",
//         description:"By The Beach",
//         price:1200,
//         location:"goa",
//         country:"India"
//     });

//     await sampleListing.save();
//     console.log("sample was saved");
//     res.send("sucessfully testing");

// });

// app.all("*",(req,res,next)=>{
//     next(new ExpressError(404,"Page Not Fond!"));
// });

// //middlewares
// app.use((err,req,res,next)=>{
//     let{statusCode=500,message="Something Went Wrong!"}=err;
//     if (res.headersSent) {
//         return next(err);  
//     }
//     res.status(statusCode).render("error.ejs",{message});
//     //res.status(statusCode).send(message);
// });

// app.listen(8080,()=>{
//     console.log("server listening the port 8080");
// });