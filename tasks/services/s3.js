// Generated by CoffeeScript 1.6.2
"use strict";
var AWS, BaseService, S3Service, async, fs, glob, mime, util, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseService = require("./common/base-service");

glob = require("glob-manifest");

AWS = require("aws-sdk");

async = require("async");

fs = require("fs");

_ = require("lodash");

mime = require("mime");

util = require("util");

S3Service = (function(_super) {
  __extends(S3Service, _super);

  S3Service.prototype.name = 's3';

  S3Service.prototype.defaults = {
    access: 'public-access',
    endpoint: 's3-ap-southeast-2.amazonaws.com',
    concurrent: 20
  };

  function S3Service(grunt, opts, data, done) {
    var config,
      _this = this;

    this.grunt = grunt;
    this.opts = opts;
    this.data = data;
    this.done = done;
    _.bindAll(this);
    this.debug = this.grunt.option('aws') === 'debug';
    config = _.pick(this.opts, 'endpoint');
    this.s3 = new AWS.S3(config).client;
    this.stats = {
      puts: 0,
      dels: 0
    };
    if (!this.data.put) {
      this.data.put = [];
    }
    if (!this.data.del) {
      this.data.del = [];
    }
    async.series([
      function(cb) {
        return _this.runGlob(_this.data.del, _this.deleteObject, cb);
      }, function(cb) {
        return _this.runGlob(_this.data.put, _this.putObject, cb);
      }
    ], this.complete);
  }

  S3Service.prototype.runGlob = function(globs, method, methodsComplete) {
    var _this = this;

    if (!(globs && globs.length)) {
      return methodsComplete();
    }
    return glob(globs, function(err, files) {
      if (err) {
        return methodsComplete(err);
      }
      return async.eachLimit(files, _this.opts.concurrent, method, methodsComplete);
    });
  };

  S3Service.prototype.deleteObject = function(file, callback) {
    var _this = this;

    return fs.readFile(file, function(err, buffer) {
      var key, object;

      key = _this.calcKey(file);
      if (!key) {
        return callback();
      }
      object = {
        Bucket: _this.opts.bucket,
        Key: key
      };
      return _this.s3.deleteObject(object, function(err, data) {
        if (err) {
          return callback(err);
        }
        _this.grunt.log.ok("Deleted: " + key);
        _this.stats.dels++;
        return callback();
      });
    });
  };

  S3Service.prototype.putObject = function(file, callback) {
    var _this = this;

    return fs.readFile(file, function(err, buffer) {
      var key, object, putSuccess;

      key = _this.calcKey(file);
      if (!key) {
        return callback();
      }
      object = {
        ACL: _this.opts.access,
        Body: buffer,
        Bucket: _this.opts.bucket,
        Key: key,
        ContentType: _this.opts.contentType || mime.lookup(file)
      };
      putSuccess = function(err, data) {
        if (err) {
          return callback(err);
        }
        _this.grunt.log.ok("" + (_this.debug ? 'DEBUG ' : '') + "Put: " + key);
        _this.stats.puts++;
        return callback();
      };
      if (_this.debug) {
        return putSuccess(null, {});
      } else {
        return _this.s3.putObject(object, putSuccess);
      }
    });
  };

  S3Service.prototype.calcKey = function(file) {
    if (!this.opts.fileFilter) {
      return file;
    }
    return this.opts.fileFilter(file);
  };

  S3Service.prototype.complete = function(err) {
    if (err) {
      this.grunt.fail.warn("Deployment Error: " + err);
    } else {
      this.grunt.log.ok("Deployment Complete (" + this.stats.puts + " puts, " + this.stats.dels + " dels)");
    }
    return this.done();
  };

  return S3Service;

})(BaseService);

module.exports = S3Service;
