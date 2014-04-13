var materialized = require ("../lib/materialized");
var mongoose = require ("mongoose");
var Schema = mongoose.Schema;

mongoose.connect("mongodb://localhost/test");

var ItemSchema = Schema({
  name : String
});

ItemSchema.plugin(materialized, {});

var Item = mongoose.model("Item", ItemSchema);

var root = new Item({ name : ""});
var home = new Item({ name : "home"});
var docs = new Item({ name : "docs"});
var docs = new Item({ name : "docs"});

Item.remove(function(){
  root.save(function(){

    root.attach(home, function(err, node){

      node.attach(new Item({ name : "diorahman"}), function(err, subnode){
        
        subnode.attach(new Item({ name : "docs"}), function(err, subsubnode){
          
          root.descendants (function(err, data){
            console.log (data);
          });

        });

      });
    });
  });  
});

