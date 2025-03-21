const Listing = require("../models/listing.js");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    })
    .populate("owner");
  // if (!listing) {
  //     return next(new ExpressError(404, "Listing not found"));
  // }
  if (!listing) {
    req.flash("error", "You Requested Listing does not exists!");
    res.redirect("/listings");
  }
  console.log(listing);
  res.render("listings/show.ejs", { listing });
};

module.exports.showSearch = (async (req,res)=>{
 
  const searchedCountry = req.query.searchedCountry;
  // console.log(searchedCountry);

  const regexPattern = new RegExp(searchedCountry, 'i');

  // Find listings matching the regex pattern for the country
  const allListings = await Listing.find({ country: { $regex: regexPattern } });
  // console.log(allListings);


  if(allListings.length==0){
      req.flash("error","No listings found for the specified country.");
      res.redirect("/listings");
  }else{
      let country = allListings[0].country;
      res.render("listings/searchCountry.ejs",{ allListings, country })
  }
}); 

module.exports.createListting = async (req, res) => {
  // try{
  //let{title,description,image,price,location,country}=req.body;
  // let listing =req.body.listing;
  // console.log(listing);
  // if(!req.body.listing){
  //     throw new ExpressError(400,"Send Valid data for Listing");
  // }
  let response = await geocodingClient
    .forwardGeocode({
      query: req.body.listing.location,
      limit: 1,
    })
    .send();

  let url = req.file.path;
  let filename = req.file.filename;

  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = { url, filename };

  newListing.geometry=response.body.features[0].geometry;

  let savedListing=await newListing.save();
  console.log(savedListing);
  req.flash("success", "New Listing created");
  res.redirect("/listings");
  // }catch(err){
  //     next(err);
  // }
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "You Requested Listing does not exists!");
    res.redirect("/listings");
  }
  let originalImage = listing.image.url;
  originalImageUrl = originalImage.replace("/upload", "/upload/w_250");
  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

  if (typeof req.file != "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
    await listing.save();
  }
  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};
