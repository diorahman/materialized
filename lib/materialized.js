
"use strict";

// find all descendants from root "/" { $regex : /^\// }}

var mongoose = require("mongoose");
var async = require("async");
var Schema = mongoose.Schema;

module.exports = materialized

function materialized (schema, options) {

  schema.add ({
    path : String,
    required : false
  });

  schema.add ({
    parentId : Schema.Types.ObjectId,
    required : false
  });

  /**
   * Get all ancestors
   */
  schema.method ("ancestors", function (cb){
    
    var model = this.constructor;
    var paths = this.path.split("/");
    var i = paths.length;
    var path = "";
    var name = "";
    var query = { $or : []};

    while (i--) {
      name = paths.pop();
      path = paths.join("/");
      var q = { path : path == "" && name != "" ? "/" : path, name : name };
      if (q.path == "" && q.name == "") delete q.path;
      query.$or.push(q);
    }

    model.find(query, cb);

  });

  /**
   * children are a level descendants
   */
  schema.method ("children", function (cb){
    var model = this.constructor;
    model.find({ parentId : this._id }, cb);
  });

  /**
   * descendants is multi levels descendants
   */
  schema.method ("descendants", function (cb){
    var model = this.constructor;
    var expr = this.path ? new RegExp("^\\" + this.path + "\\/") : /^\//;
    model.find({ path : expr }, cb);
  });

  /**
   * Attach a node to `this` node
   * Including its descendants
   */
  schema.method("attach", function (node, cb){

    var path = this.path || "/";

    node.path = (path == "/" ? "/" : path + "/") + this.name;
    node.parentId = this._id;

    var query = { $and : [{ path : node.path}, { name : node.name }] };

    this.constructor.findOne(query, function(err, existing){

      if (err) return cb (err);

      if (existing) {
        return cb (new Error ("already exists"));
      }
      node.save(cb);
    });
  });

  /**
   * Copy `this` node to `to` node
   * Including its descendants
   */
  schema.method ("copy", function (to, cb) {
    var self = this;

    function cpy (obj){
      var tmp = obj.toJSON();
      delete tmp._id;
      return new self.constructor(tmp);      
    }

    self.descendants(function(err, nodes){
      if (err) return cb (err);

      to.attach(cpy(self), function (err, attached) {

        if (err) return cb (err);

        function copy (node, fn){
          attached.attach (cpy(node), fn);
        };

        async.map (nodes, copy, cb);

      });
    });

  });

  /**
   * Rename `this.name` of `this` node to `name`
   * Its descendants will be re-attached
   */
  schema.method ("rename", function (name, cb) {
    var self = this;

    self.name = name;

    self.descendants(function(err, nodes){
      if (err) return cb (err);

      self.save(function(err, renamed){
        if (err) return cb (err);

        function attach (node, fn){
          renamed.attach(node, fn);
        }
        async.map (nodes, attach, cb);
      });
    });
  });

  /**
   * Move `this` node to `to` node
   * Its descendants will be re-attached
   */
  schema.method ("move", function (to, cb) {
    var self = this;

    self.descendants(function(err, nodes){
      if (err) return cb (err);

      to.attach(self, function (err, attached) {

        if (err) return cb (err);

        function move (node, fn){
          attached.attach (node, fn);
        };

        async.map (nodes, move, cb);

      });
    });
  });

  /**
   * Detach, or remove `this` node
   * Its descendants will be removed
   */
  schema.method ("detach", function (cb){
    var self = this;

    function remove (node, fn){
      node.remove(fn);
    };

    this.descendants(function(err, nodes){
      if (err) return cb (err);
      async.map (nodes, remove, function(err){
        if (err) return cb (err);
        self.remove(cb);
      });
    });

  });
}
