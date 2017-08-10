const express = require("express");
const exphbs = require("express-handlebars");
const db = require("../models");
const path = require("path");
const dbOrm = require("../db/databaseQuery");
const f2fOrm = require("../api/food2fork/api-Orm");
const rpOrm = require("../api/recipe-puppy/api-Orm");
const acctManager = require("../password_auth/acctManager");


const buildScriptTag = (scriptName)=>{
    let scriptTag = '<script src="public/asset/js/${scriptName}"></script>'
    return scriptTag;
}

let router =express.Router();


router.post("/addStar", (req, res)=>{
    let starData = {
        UserId: req.body.user_id,
        RecipeId: req.body.recipe_id
    }
    let token = req.body.token;
    dbOrm.addStar(starData, token, (results, err)=>{
        if(err){ 
            console.log(results)
            res.json({
                err:results,
                success:false
            })
        } else{
            res.json(results)
        }
        
    })
})

router.post("/addRecipe", (req, res)=>{
    let recipe = {
        title:req.body.title,
        ingredients:req.body.ingredients,
        recipe_steps:req.body.recipe_steps,
        user_recipe:true,
        UserId: req.body.user_id
    }
    let token = req.body.token;
    req.body.img_url?recipe.img_url=req.body.img_url:null;
    dbOrm.addRecipe(recipe, token, (results, err)=>{
        if(err){ 
            res.json({
                err:results,
                success:false
            })
        } else{
            res.json(results)
        }
    })
});

router.post("/addComment", (req, res)=>{
    let comment = {
        UserId: req.body.user_id,
        comment: req.body.comment,
        reply_to:req.body.reply_to
    }
    let token = req.body.token;
    dbOrm.findRecipeId({
            title:req.body.title,
            ingredients:req.body.ingredients,
            img_url:req.body.img_url,
            source_url:req.body.source_url
          }, token,  (results)=>{
            comment.RecipeId = results;
            addComment(comment, (results, err)=>{
                if(err){
                    res.json({
                        err:results,
                        success:false
                    })
                } else{
                    res.json(results)
                }
            })
          })
});

// Get highest rated recipes from food2fork api
router.get("/topRecipes", (req, res)=>{
    f2fOrm.topRecipes((results)=>{
        res.render(results);
    });
});

// Get trending recipes from food2fork api
router.get("/trendingRecipes", (req, res)=>{
    f2f.Orm.trendingRecipes((results)=>{
        res.render(results);
    });
});

// Initial routing to occur when user has option to search by all 3 parameters
router.get("/search/:recipe/:ingredients/:username/:page?", (req, res)=>{
    
    let recipe = req.params.recipe==="null"?null:req.params.recipe;
    let ingredients = req.params.ingredients==="null"?null:req.params.ingredients.split(",");
    let username = req.params.username==="null"?null:req.params.username;
    let offset = parseInt(req.params.page);
    let totalOffset = offset*10;
    let singlePageOffset = totalOffset%30;
    totalOffset = totalOffset/30;
    let nextUrl = `/api/search/${req.params.recipe}/${req.params.ingredients}/${req.params.username}/${offset+1}`;

    if(!recipe&&!ingredients&&!username){
        //send error
        console.log("Null");
    } else if(recipe && ingredients && username){
        //search with all
        console.log("Searching by recipe, ingredients, and username");
    }else if(recipe){   
        if(ingredients){
            //search recipe/ingredidents
            console.log("Searching by recipe and ingredients");
            console.log("Recipe: " + recipe);
            rpOrm.searchByRecipeAndIngredients(recipe, ingredients, offset, (results)=>{
            console.log("results", results);
            results = results.map(ele=>{
                console.log(ele.thumbnail, ele.thumbnail === "");
                ele.thumbnail =  (ele.thumbnail !== "") ? ele.thumbnail: "https://www.bbcgoodfood.com/sites/default/files/styles/carousel_medium/public/recipe-collections/collection-image/2013/05/frying-pan-pizza-easy-recipe-collection.jpg?itok=naGPMoRQ"
                return ele;
            });
                       console.log("results", results);
                if (results === null) {
                    res.render("no_results");
                }
                else {
                    res.render("recipe_search", {
                recipe:results,
                nextPage: nextUrl
            });   
                }
            });
        } else if(username){
            //search recipe/username
            console.log("Searching by username and recipe");
        } else{
            // search recipe
            console.log("Searching by recipe only1")
            var recipeArr = req.params.recipe.split(",");
            rpOrm.searchByRecipe(recipeArr,offset, (results1)=>{
                f2fOrm.userSearch(recipeArr,totalOffset, (results2)=>{
                    var combinedResults = [];
                    for (var i = 0; i < 5; i++) {
                       results1[i].thumbnail =  (results1[i].thumbnail) ? results1[i].thumbnail: "https://www.bbcgoodfood.com/sites/default/files/styles/carousel_medium/public/recipe-collections/collection-image/2013/05/frying-pan-pizza-easy-recipe-collection.jpg?itok=naGPMoRQ"
                        results2[i].thumbnail =(results2[i].thumbnail) ? results2[i].thumbnail :"https://www.bbcgoodfood.com/sites/default/files/styles/carousel_medium/public/recipe-collections/collection-image/2013/05/frying-pan-pizza-easy-recipe-collection.jpg?itok=naGPMoRQ"
                        combinedResults.push(results1[i]);
                        combinedResults.push(results2[i+singlePageOffset]);

                    }
                    if (results1 === null || results2 === null) {
                        res.render("no_results");
                    }
                    else {
                        res.render("recipe_search", {
                            recipe:combinedResults,
                            nextPage:nextUrl
                        });
                    }
                });
            });
        }
    } else if(ingredients){
        if(username){
            //search ingredidents/username
            console.log("Searching by username and ingredients");
        }else{
            //search ingredidents
            console.log("Searching by ingredients only");
            rpOrm.searchByIngredients(req.params.ingredients, offset, (results)=>{
                results = results.map(ele=>{
                    ele.thumbnail =  (ele.thumbnail) ? ele.thumbnail: "https://www.bbcgoodfood.com/sites/default/files/styles/carousel_medium/public/recipe-collections/collection-image/2013/05/frying-pan-pizza-easy-recipe-collection.jpg?itok=naGPMoRQ"
                });
                console.log(results);
                if (results === null) {
                    res.render("no_results");
                }
                else {
                    res.render("recipe_search", {
                recipe:results,
                nextPage: nextUrl
            });   
                }
            });
        }
    } else{
        //username
        console.log("Searching by username only");
        dbOrm.findUserRecipe(req.params.username, (results)=>{ 
            if (results === null) {
                res.render("no_results");
            }
            else {
                res.render("recipe_search", {
                recipe:results,
                nextPage: nextUrl
            });   
            }
        });
    }

});

module.exports = router;